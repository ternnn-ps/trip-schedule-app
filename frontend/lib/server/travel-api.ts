import bcrypt from "bcryptjs";
import { PoolClient } from "pg";
import { query, transaction } from "@/lib/server/database";
import { ApiUser, TripInput, TripPlanInput } from "@/lib/server/types";

type TripRow = {
  id: string;
  name: string;
  destination: string;
  date_range: string;
  notes: string | null;
  host_user_name: string | null;
  all_users: boolean | null;
};

type PlanRow = {
  id: string;
  day: string;
  time: string;
  detail: string;
  place: string;
  location_name: string | null;
  latitude: string | null;
  longitude: string | null;
  google_map_url: string | null;
  completed: boolean | null;
};

type UserRow = ApiUser & { passwordHash?: string };

function normalize(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function uniqueNames(values: unknown, include?: string) {
  const names = Array.isArray(values) ? values.map(normalize).filter(Boolean) : [];
  if (include) names.unshift(include);

  return names.filter((name, index) => (
    names.findIndex((candidate) => candidate.toLowerCase() === name.toLowerCase()) === index
  ));
}

function makeId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

function mapUser(row: UserRow): ApiUser {
  return {
    userId: Number(row.userId),
    userName: row.userName,
    userFullName: row.userFullName,
    email: row.email,
    phone: row.phone ?? "",
    website: row.website ?? "",
    lastLatitude: row.lastLatitude,
    lastLongitude: row.lastLongitude,
    lastLocationUpdatedAt: row.lastLocationUpdatedAt,
  };
}

async function getTrip(client: PoolClient, id: string) {
  const tripResult = await client.query<TripRow>(
    `SELECT id, name, destination, date_range, notes, host_user_name, all_users
       FROM ms_trip
      WHERE id = $1 AND record_status = 'A'`,
    [id],
  );
  const trip = tripResult.rows[0];
  if (!trip) return null;

  const [usersResult, pendingResult, plansResult] = await Promise.all([
    client.query<{ user_name: string }>(
      "SELECT user_name FROM ms_trip_user WHERE trip_id = $1 ORDER BY sort_order ASC",
      [id],
    ),
    client.query<{ user_name: string }>(
      "SELECT user_name FROM ms_trip_pending_user WHERE trip_id = $1 ORDER BY sort_order ASC",
      [id],
    ),
    client.query<PlanRow>(
      `SELECT id, plan_day AS day, plan_time AS time, detail, place, location_name, latitude, longitude,
              google_map_url, completed
         FROM ms_trip_plan
        WHERE trip_id = $1 AND record_status = 'A'
        ORDER BY created_date ASC`,
      [id],
    ),
  ]);

  return {
    id: trip.id,
    name: trip.name,
    destination: trip.destination,
    dateRange: trip.date_range,
    notes: trip.notes ?? "",
    hostUserName: trip.host_user_name ?? usersResult.rows[0]?.user_name ?? "Admin",
    allUsers: Boolean(trip.all_users),
    users: usersResult.rows.map((row) => row.user_name),
    pendingUsers: pendingResult.rows.map((row) => row.user_name),
    plans: plansResult.rows.map((plan) => ({
      id: plan.id,
      day: plan.day,
      time: plan.time,
      detail: plan.detail,
      place: plan.place,
      locationName: plan.location_name ?? "",
      latitude: plan.latitude ?? "",
      longitude: plan.longitude ?? "",
      googleMapUrl: plan.google_map_url ?? "",
      completed: Boolean(plan.completed),
    })),
  };
}

async function updateOrderedNames(
  client: PoolClient,
  table: "ms_trip_user" | "ms_trip_pending_user",
  tripId: string,
  names: string[],
) {
  await client.query(`DELETE FROM ${table} WHERE trip_id = $1`, [tripId]);

  for (const [index, name] of names.entries()) {
    await client.query(
      `INSERT INTO ${table} (trip_id, user_name, sort_order) VALUES ($1, $2, $3)`,
      [tripId, name, index],
    );
  }
}

async function writePlan(client: PoolClient, tripId: string, plan: TripPlanInput, now: Date) {
  const id = normalize(plan.id) || makeId("plan");
  await client.query(
    `INSERT INTO ms_trip_plan (
      id, plan_day, plan_time, detail, place, location_name, latitude, longitude, google_map_url,
      completed, trip_id, created_date, updated_date, record_status
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $12, 'A')`,
    [
      id,
      normalize(plan.day),
      normalize(plan.time),
      normalize(plan.detail),
      normalize(plan.place),
      normalize(plan.locationName),
      normalize(plan.latitude),
      normalize(plan.longitude),
      normalize(plan.googleMapUrl),
      Boolean(plan.completed),
      tripId,
      now,
    ],
  );
}

async function createNotification(
  client: PoolClient,
  recipientUserName: string,
  actorUserName: string,
  tripId: string,
  tripName: string,
  type: string,
  message: string,
) {
  if (!recipientUserName) return;

  await client.query(
    `INSERT INTO ms_notification (
      id, recipient_user_name, actor_user_name, trip_id, trip_name, type, message,
      read_flag, created_date, record_status
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, false, NOW(), 'A')`,
    [makeId("notification"), recipientUserName, actorUserName, tripId, tripName, type, message],
  );
}

export async function searchTrips(keyword: string, page: number, size: number) {
  const safePage = Math.max(page, 0);
  const safeSize = Math.min(Math.max(size, 1), 100);
  const condition = keyword
    ? "AND (LOWER(name) LIKE $1 OR LOWER(destination) LIKE $1)"
    : "";
  const values = keyword ? [`%${keyword.toLowerCase()}%`] : [];
  const countResult = await query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM ms_trip WHERE record_status = 'A' ${condition}`,
    values,
  );
  const rowsResult = await query<{ id: string }>(
    `SELECT id FROM ms_trip WHERE record_status = 'A' ${condition}
       ORDER BY created_date DESC NULLS LAST, id ASC
       LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
    [...values, safeSize, safePage * safeSize],
  );

  const trips = await transaction(async (client) => Promise.all(
    rowsResult.rows.map((row) => getTrip(client, row.id)),
  ));
  const totalElements = Number(countResult.rows[0]?.count ?? 0);

  return {
    content: trips.filter(Boolean),
    page: safePage,
    size: safeSize,
    totalElements,
    totalPages: Math.ceil(totalElements / safeSize),
  };
}

export async function getTripById(id: string) {
  return transaction((client) => getTrip(client, id));
}

export async function createTrip(input: TripInput) {
  return transaction(async (client) => {
    const id = normalize(input.id) || makeId("trip");
    const hostUserName = normalize(input.hostUserName) || uniqueNames(input.users)[0] || "Admin";
    const users = uniqueNames(input.users, hostUserName);
    const pendingUsers = uniqueNames(input.pendingUsers);
    const now = new Date();

    await client.query(
      `INSERT INTO ms_trip (
        id, name, destination, date_range, notes, host_user_name, all_users, created_by,
        created_date, updated_by, updated_date, record_status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'Admin', $8, 'Admin', $8, 'A')`,
      [id, normalize(input.name), normalize(input.destination), normalize(input.dateRange), normalize(input.notes), hostUserName, Boolean(input.allUsers), now],
    );
    await updateOrderedNames(client, "ms_trip_user", id, users);
    await updateOrderedNames(client, "ms_trip_pending_user", id, pendingUsers);
    for (const plan of input.plans ?? []) await writePlan(client, id, plan, now);

    return getTrip(client, id);
  });
}

export async function updateTrip(input: TripInput) {
  const id = normalize(input.id);
  if (!id) return null;

  return transaction(async (client) => {
    const existing = await getTrip(client, id);
    if (!existing) return null;
    const hostUserName = normalize(input.hostUserName) || existing.hostUserName;
    const users = uniqueNames(input.users, hostUserName);

    await client.query(
      `UPDATE ms_trip SET name = $2, destination = $3, date_range = $4, notes = $5,
        host_user_name = $6, all_users = $7, updated_by = 'Admin', updated_date = NOW()
       WHERE id = $1`,
      [id, normalize(input.name), normalize(input.destination), normalize(input.dateRange), normalize(input.notes), hostUserName, Boolean(input.allUsers)],
    );
    await updateOrderedNames(client, "ms_trip_user", id, users);
    return getTrip(client, id);
  });
}

export async function deleteTrip(id: string) {
  return transaction(async (client) => {
    const existing = await getTrip(client, id);
    if (!existing) return null;
    await client.query("UPDATE ms_trip SET record_status = 'D', updated_by = 'Admin', updated_date = NOW() WHERE id = $1", [id]);
    await client.query("UPDATE ms_trip_plan SET record_status = 'D', updated_date = NOW() WHERE trip_id = $1", [id]);
    return existing;
  });
}

export async function addTripUser(tripId: string, userName: string) {
  return transaction(async (client) => {
    const trip = await getTrip(client, tripId);
    if (!trip) return null;
    const normalizedName = normalize(userName);
    const users = uniqueNames([...trip.users, normalizedName]);
    const pendingUsers = trip.pendingUsers.filter((name) => name.toLowerCase() !== normalizedName.toLowerCase());
    await updateOrderedNames(client, "ms_trip_user", tripId, users);
    await updateOrderedNames(client, "ms_trip_pending_user", tripId, pendingUsers);
    await client.query("UPDATE ms_trip SET updated_by = 'Admin', updated_date = NOW() WHERE id = $1", [tripId]);
    if (normalizedName && !trip.users.some((name) => name.toLowerCase() === normalizedName.toLowerCase())) {
      await createNotification(client, normalizedName, trip.hostUserName, tripId, trip.name, "TRIP_INVITE", `${trip.hostUserName} invited you to ${trip.name}`);
    }
    return getTrip(client, tripId);
  });
}

export async function requestTripJoin(tripId: string, userName: string) {
  return transaction(async (client) => {
    const trip = await getTrip(client, tripId);
    if (!trip) return null;
    const normalizedName = normalize(userName);
    if (!normalizedName || trip.allUsers || trip.users.some((name) => name.toLowerCase() === normalizedName.toLowerCase())) return trip;
    const pendingUsers = uniqueNames([...trip.pendingUsers, normalizedName]);
    await updateOrderedNames(client, "ms_trip_pending_user", tripId, pendingUsers);
    await client.query("UPDATE ms_trip SET updated_by = $2, updated_date = NOW() WHERE id = $1", [tripId, normalizedName]);
    if (!trip.pendingUsers.some((name) => name.toLowerCase() === normalizedName.toLowerCase())) {
      await createNotification(client, trip.hostUserName, normalizedName, tripId, trip.name, "TRIP_JOIN_REQUEST", `${normalizedName} requested to join ${trip.name}`);
    }
    return getTrip(client, tripId);
  });
}

export async function addTripPlan(tripId: string, plan: TripPlanInput) {
  return transaction(async (client) => {
    const trip = await getTrip(client, tripId);
    if (!trip) return null;
    await writePlan(client, tripId, plan, new Date());
    await client.query("UPDATE ms_trip SET updated_by = 'Admin', updated_date = NOW() WHERE id = $1", [tripId]);
    return getTrip(client, tripId);
  });
}

export async function updateTripPlan(tripId: string, planId: string, plan: TripPlanInput) {
  return transaction(async (client) => {
    const trip = await getTrip(client, tripId);
    if (!trip) return null;
    const existing = trip.plans.find((item) => item.id === planId);
    if (!existing) return undefined;
    await client.query(
      `UPDATE ms_trip_plan SET plan_day = $3, plan_time = $4, detail = $5, place = $6, location_name = $7,
        latitude = $8, longitude = $9, google_map_url = $10, completed = $11, updated_date = NOW()
       WHERE id = $1 AND trip_id = $2 AND record_status = 'A'`,
      [planId, tripId, normalize(plan.day), normalize(plan.time), normalize(plan.detail), normalize(plan.place), normalize(plan.locationName), normalize(plan.latitude), normalize(plan.longitude), normalize(plan.googleMapUrl), Boolean(plan.completed)],
    );
    await client.query("UPDATE ms_trip SET updated_by = 'Admin', updated_date = NOW() WHERE id = $1", [tripId]);
    return getTrip(client, tripId);
  });
}

export async function deleteTripPlan(tripId: string, planId: string) {
  return transaction(async (client) => {
    const trip = await getTrip(client, tripId);
    if (!trip) return null;
    if (!trip.plans.some((plan) => plan.id === planId)) return undefined;
    await client.query("DELETE FROM ms_trip_plan WHERE id = $1 AND trip_id = $2", [planId, tripId]);
    await client.query("UPDATE ms_trip SET updated_by = 'Admin', updated_date = NOW() WHERE id = $1", [tripId]);
    return getTrip(client, tripId);
  });
}

export async function searchUsers(keyword: string, page: number, size: number, sort: string[]) {
  const safePage = Math.max(page, 0);
  const safeSize = Math.min(Math.max(size, 1), 100);
  const fieldMap: Record<string, string> = { userId: "user_id", userName: "user_name", userFullName: "user_full_name", email: "email", phone: "phone", website: "website" };
  const order = sort.map((item) => {
    const [field, direction] = item.split(",");
    return fieldMap[field] ? `${fieldMap[field]} ${direction?.toLowerCase() === "desc" ? "DESC" : "ASC"}` : "";
  }).filter(Boolean).join(", ") || "user_id ASC";
  const condition = keyword ? "AND (LOWER(user_name) LIKE $1 OR LOWER(user_full_name) LIKE $1 OR LOWER(email) LIKE $1)" : "";
  const values = keyword ? [`%${keyword.toLowerCase()}%`] : [];
  const [count, rows] = await Promise.all([
    query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM ms_user WHERE record_status = 'A' ${condition}`, values),
    query<UserRow>(
      `SELECT user_id AS "userId", user_name AS "userName", user_full_name AS "userFullName", email, phone, website,
              last_latitude AS "lastLatitude", last_longitude AS "lastLongitude", last_location_updated_at AS "lastLocationUpdatedAt"
         FROM ms_user WHERE record_status = 'A' ${condition}
        ORDER BY ${order} LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
      [...values, safeSize, safePage * safeSize],
    ),
  ]);
  const totalElements = Number(count.rows[0]?.count ?? 0);
  return { content: rows.rows.map(mapUser), page: safePage, size: safeSize, totalElements, totalPages: Math.ceil(totalElements / safeSize) };
}

export async function loginUser(loginIdentifier: string, password: string) {
  const login = normalize(loginIdentifier);
  const rows = await query<UserRow>(
    `SELECT user_id AS "userId", user_name AS "userName", user_full_name AS "userFullName", email, phone, website,
            password_hash AS "passwordHash", last_latitude AS "lastLatitude", last_longitude AS "lastLongitude",
            last_location_updated_at AS "lastLocationUpdatedAt"
       FROM ms_user
      WHERE record_status = 'A' AND (LOWER(user_name) = LOWER($1) OR LOWER(email) = LOWER($1)) LIMIT 1`,
    [login],
  );
  const user = rows.rows[0];
  if (!user?.passwordHash) return null;
  const valid = user.passwordHash.startsWith("$2")
    ? await bcrypt.compare(password, user.passwordHash)
    : password === user.passwordHash;
  if (!valid) return null;
  if (!user.passwordHash.startsWith("$2")) {
    await query("UPDATE ms_user SET password_hash = $2, updated_by = 'Login', updated_date = NOW() WHERE user_id = $1", [user.userId, await bcrypt.hash(password, 12)]);
  }
  return mapUser(user);
}

export async function updateUserLocation(userId: number, latitude: number, longitude: number) {
  const result = await query<UserRow>(
    `UPDATE ms_user SET last_latitude = $2, last_longitude = $3, last_location_updated_at = NOW(),
       updated_by = 'Location', updated_date = NOW()
     WHERE user_id = $1 AND record_status = 'A'
     RETURNING user_id AS "userId", user_name AS "userName", user_full_name AS "userFullName", email, phone, website,
       last_latitude AS "lastLatitude", last_longitude AS "lastLongitude", last_location_updated_at AS "lastLocationUpdatedAt"`,
    [userId, latitude, longitude],
  );
  return result.rows[0] ? mapUser(result.rows[0]) : null;
}

type UserInput = {
  userId?: number;
  userName?: string;
  userFullName?: string;
  email?: string;
  phone?: string;
  website?: string;
  password?: string;
};

function validateUserInput(input: UserInput, passwordRequired: boolean) {
  if (!normalize(input.userName)) return "Username is required";
  if (!normalize(input.userFullName)) return "Full Name is required";
  if (!normalize(input.email)) return "E-mail is required";
  if (passwordRequired && !normalize(input.password)) return "Password is required";
  if (normalize(input.password) && normalize(input.password).length < 8) return "Password must be at least 8 characters";
  return null;
}

export async function createUser(input: UserInput) {
  const validation = validateUserInput(input, true);
  if (validation) return { error: validation };
  const duplicate = await query<{ exists: boolean }>(
    "SELECT EXISTS(SELECT 1 FROM ms_user WHERE LOWER(user_name) = LOWER($1) AND record_status = 'A') AS exists",
    [normalize(input.userName)],
  );
  if (duplicate.rows[0]?.exists) return { error: "Duplicate User Name" };
  const result = await query<UserRow>(
    `INSERT INTO ms_user (
      user_name, user_full_name, email, phone, website, password_hash, created_by, created_date,
      updated_by, updated_date, record_status
    ) VALUES ($1, $2, $3, $4, $5, $6, 'Admin', NOW(), 'Admin', NOW(), 'A')
    RETURNING user_id AS "userId", user_name AS "userName", user_full_name AS "userFullName", email, phone, website,
      last_latitude AS "lastLatitude", last_longitude AS "lastLongitude", last_location_updated_at AS "lastLocationUpdatedAt"`,
    [normalize(input.userName), normalize(input.userFullName), normalize(input.email), normalize(input.phone), normalize(input.website), await bcrypt.hash(normalize(input.password), 12)],
  );
  return { user: mapUser(result.rows[0]) };
}

export async function updateUser(input: UserInput) {
  const validation = validateUserInput(input, false);
  if (validation) return { error: validation };
  if (!Number.isFinite(input.userId)) return { error: "Record not found" };
  const duplicate = await query<{ exists: boolean }>(
    "SELECT EXISTS(SELECT 1 FROM ms_user WHERE LOWER(user_name) = LOWER($1) AND user_id <> $2 AND record_status = 'A') AS exists",
    [normalize(input.userName), input.userId],
  );
  if (duplicate.rows[0]?.exists) return { error: "Duplicate User Name" };
  const password = normalize(input.password);
  const result = await query<UserRow>(
    `UPDATE ms_user SET user_name = $2, user_full_name = $3, email = $4, phone = $5, website = $6,
      password_hash = CASE WHEN $7 <> '' THEN $8 ELSE password_hash END, updated_by = 'Admin', updated_date = NOW()
     WHERE user_id = $1 AND record_status = 'A'
     RETURNING user_id AS "userId", user_name AS "userName", user_full_name AS "userFullName", email, phone, website,
      last_latitude AS "lastLatitude", last_longitude AS "lastLongitude", last_location_updated_at AS "lastLocationUpdatedAt"`,
    [input.userId, normalize(input.userName), normalize(input.userFullName), normalize(input.email), normalize(input.phone), normalize(input.website), password, password ? await bcrypt.hash(password, 12) : ""],
  );
  return result.rows[0] ? { user: mapUser(result.rows[0]) } : { error: "Record not found" };
}

export async function deleteUser(userId: number) {
  const result = await query<UserRow>(
    `UPDATE ms_user SET record_status = 'D', updated_by = 'Admin', updated_date = NOW()
      WHERE user_id = $1 AND record_status = 'A'
      RETURNING user_id AS "userId", user_name AS "userName", user_full_name AS "userFullName", email, phone, website,
        last_latitude AS "lastLatitude", last_longitude AS "lastLongitude", last_location_updated_at AS "lastLocationUpdatedAt"`,
    [userId],
  );
  return result.rows[0] ? mapUser(result.rows[0]) : null;
}

type CustomerInput = {
  customerId?: number;
  customerCode?: string;
  customerName?: string;
  address?: string;
  telNo?: string;
};

function mapCustomer(row: {
  customerId: number;
  customerCode: string | null;
  customerName: string;
  address: string | null;
  telNo: string | null;
}) {
  return {
    customerId: Number(row.customerId),
    customerCode: row.customerCode ?? "",
    customerName: row.customerName,
    address: row.address ?? "",
    telNo: row.telNo ?? "",
  };
}

export async function searchCustomers(keyword: string, page: number, size: number) {
  const safePage = Math.max(page, 0);
  const safeSize = Math.min(Math.max(size, 1), 100);
  const condition = keyword ? "AND LOWER(customer_name) LIKE $1" : "";
  const values = keyword ? [`%${keyword.toLowerCase()}%`] : [];
  const [count, rows] = await Promise.all([
    query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM ms_customer WHERE record_status = 'A' ${condition}`, values),
    query<{
      customerId: number;
      customerCode: string | null;
      customerName: string;
      address: string | null;
      telNo: string | null;
    }>(
      `SELECT customer_id AS "customerId", customer_code AS "customerCode", customer_name AS "customerName", address, tel_no AS "telNo"
         FROM ms_customer WHERE record_status = 'A' ${condition}
        ORDER BY customer_id ASC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
      [...values, safeSize, safePage * safeSize],
    ),
  ]);
  const totalElements = Number(count.rows[0]?.count ?? 0);
  return { content: rows.rows.map(mapCustomer), page: safePage, size: safeSize, totalElements, totalPages: Math.ceil(totalElements / safeSize) };
}

export async function createCustomer(input: CustomerInput) {
  const customerName = normalize(input.customerName);
  if (!customerName) return { error: "Customer name is required" };
  const duplicate = await query<{ exists: boolean }>(
    "SELECT EXISTS(SELECT 1 FROM ms_customer WHERE customer_name = $1 AND record_status = 'A') AS exists",
    [customerName],
  );
  if (duplicate.rows[0]?.exists) return { error: "Duplicate Customer Name" };
  const result = await query<{
    customerId: number;
    customerCode: string | null;
    customerName: string;
    address: string | null;
    telNo: string | null;
  }>(
    `INSERT INTO ms_customer (customer_code, customer_name, address, tel_no, created_by, created_date, updated_by, updated_date, record_status)
     VALUES ($1, $2, $3, $4, 'Admin', NOW(), 'Admin', NOW(), 'A')
     RETURNING customer_id AS "customerId", customer_code AS "customerCode", customer_name AS "customerName", address, tel_no AS "telNo"`,
    [normalize(input.customerCode), customerName, normalize(input.address), normalize(input.telNo)],
  );
  return { customer: mapCustomer(result.rows[0]) };
}

export async function updateCustomer(input: CustomerInput) {
  const customerId = Number(input.customerId);
  const customerName = normalize(input.customerName);
  if (!Number.isFinite(customerId) || !customerName) return { error: "Customer not found" };
  const result = await query<{
    customerId: number;
    customerCode: string | null;
    customerName: string;
    address: string | null;
    telNo: string | null;
  }>(
    `UPDATE ms_customer SET customer_name = $2, address = $3, tel_no = $4, updated_by = 'Admin', updated_date = NOW()
      WHERE customer_id = $1 AND record_status = 'A'
      RETURNING customer_id AS "customerId", customer_code AS "customerCode", customer_name AS "customerName", address, tel_no AS "telNo"`,
    [customerId, customerName, normalize(input.address), normalize(input.telNo)],
  );
  return result.rows[0] ? { customer: mapCustomer(result.rows[0]) } : { error: "Customer not found" };
}

export async function deleteCustomer(customerId: number) {
  const result = await query<{
    customerId: number;
    customerCode: string | null;
    customerName: string;
    address: string | null;
    telNo: string | null;
  }>(
    `UPDATE ms_customer SET record_status = 'D', updated_by = 'Admin', updated_date = NOW()
      WHERE customer_id = $1 AND record_status = 'A'
      RETURNING customer_id AS "customerId", customer_code AS "customerCode", customer_name AS "customerName", address, tel_no AS "telNo"`,
    [customerId],
  );
  return result.rows[0] ? mapCustomer(result.rows[0]) : null;
}

export async function listNotifications(userName: string) {
  const result = await query(
    `SELECT id, recipient_user_name AS "recipientUserName", actor_user_name AS "actorUserName", trip_id AS "tripId",
       trip_name AS "tripName", type, message, read_flag AS "readFlag", created_date AS "createdDate"
     FROM ms_notification WHERE LOWER(recipient_user_name) = LOWER($1) AND record_status = 'A'
     ORDER BY created_date DESC LIMIT 50`,
    [userName],
  );
  return result.rows;
}

export async function markNotificationRead(id: string) {
  const result = await query(
    `UPDATE ms_notification SET read_flag = true WHERE id = $1 AND record_status = 'A'
     RETURNING id, recipient_user_name AS "recipientUserName", actor_user_name AS "actorUserName", trip_id AS "tripId",
       trip_name AS "tripName", type, message, read_flag AS "readFlag", created_date AS "createdDate"`,
    [id],
  );
  return result.rows[0] ?? null;
}

export async function markAllNotificationsRead(userName: string) {
  await query("UPDATE ms_notification SET read_flag = true WHERE LOWER(recipient_user_name) = LOWER($1) AND read_flag = false AND record_status = 'A'", [userName]);
  return listNotifications(userName);
}
