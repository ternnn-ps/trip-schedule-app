import { NextRequest, NextResponse } from "next/server";
import { apiError, failed, hasText, success } from "@/lib/server/api-response";
import { query } from "@/lib/server/database";
import {
  addTripPlan,
  addTripUser,
  createCustomer,
  createTrip,
  createUser,
  deleteCustomer,
  deleteTrip,
  deleteTripPlan,
  deleteUser,
  getTripById,
  listNotifications,
  loginUser,
  markAllNotificationsRead,
  markNotificationRead,
  requestTripJoin,
  searchCustomers,
  searchTrips,
  searchUsers,
  updateCustomer,
  updateTrip,
  updateTripPlan,
  updateUser,
  updateUserLocation,
} from "@/lib/server/travel-api";
import { TripInput, TripPlanInput } from "@/lib/server/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ path: string[] }> };

async function body(request: NextRequest) {
  try {
    return await request.json() as Record<string, unknown>;
  } catch {
    return {};
  }
}

function numberParam(value: string | null, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function sortParams(searchParams: URLSearchParams) {
  return searchParams.getAll("sort");
}

function isPrivateImageHost(hostname: string) {
  const host = hostname.toLowerCase();

  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local")) return true;
  if (host === "::1" || host === "0.0.0.0") return true;

  const ipv4 = host.split(".").map(Number);
  if (ipv4.length !== 4 || ipv4.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;

  return ipv4[0] === 10
    || ipv4[0] === 127
    || (ipv4[0] === 169 && ipv4[1] === 254)
    || (ipv4[0] === 172 && ipv4[1] >= 16 && ipv4[1] <= 31)
    || (ipv4[0] === 192 && ipv4[1] === 168);
}

async function proxyImage(urlValue: string | null) {
  if (!urlValue) return new NextResponse("Image URL is required", { status: 400 });

  let imageUrl: URL;
  try {
    imageUrl = new URL(urlValue);
  } catch {
    return new NextResponse("Invalid image URL", { status: 400 });
  }

  if (!/^https?:$/.test(imageUrl.protocol) || isPrivateImageHost(imageUrl.hostname)) {
    return new NextResponse("Unsupported image URL", { status: 400 });
  }

  const response = await fetch(imageUrl, {
    headers: { accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8" },
    redirect: "error",
    signal: AbortSignal.timeout(8_000),
  });
  const contentType = response.headers.get("content-type") ?? "";
  const contentLength = Number(response.headers.get("content-length") ?? 0);

  if (!response.ok || !contentType.startsWith("image/") || contentLength > 6_000_000) {
    return new NextResponse("Image is unavailable", { status: 422 });
  }

  const image = await response.arrayBuffer();
  if (image.byteLength > 6_000_000) {
    return new NextResponse("Image is too large", { status: 413 });
  }

  return new NextResponse(image, {
    headers: {
      "cache-control": "public, max-age=86400, s-maxage=86400",
      "content-type": contentType,
    },
  });
}

export async function GET(request: NextRequest, context: Context) {
  try {
    const { path } = await context.params;
    const search = request.nextUrl.searchParams;
    if (path.join("/") === "media/image") return proxyImage(search.get("url"));
    if (path.join("/") === "ping") {
      await query("SELECT 1");
      return new NextResponse("OK", { headers: { "content-type": "text/plain" } });
    }
    if (path.join("/") === "user/search") return success(await searchUsers(search.get("keyword")?.trim() ?? "", numberParam(search.get("page"), 0), numberParam(search.get("size"), 10), sortParams(search)));
    if (path.join("/") === "customer/search") return success(await searchCustomers(search.get("keyword")?.trim() ?? "", numberParam(search.get("page"), 0), numberParam(search.get("size"), 10)));
    if (path.join("/") === "trip/search") return success(await searchTrips(search.get("keyword")?.trim() ?? "", numberParam(search.get("page"), 0), numberParam(search.get("size"), 10)));
    if (path[0] === "trip" && path.length === 2) {
      const trip = await getTripById(path[1]);
      return trip ? success(trip) : failed("Trip not found");
    }
    if (path.join("/") === "notifications") {
      const userName = search.get("userName");
      return hasText(userName) ? success(await listNotifications(userName)) : failed("User name is required");
    }
    return failed("API endpoint not found");
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: NextRequest, context: Context) {
  try {
    const { path } = await context.params;
    const route = path.join("/");
    const input = await body(request);
    if (route === "user/login") {
      const loginIdentifier = typeof input.loginIdentifier === "string" ? input.loginIdentifier : "";
      const password = typeof input.password === "string" ? input.password : "";
      if (!loginIdentifier.trim() || !password.trim()) return failed("Username/email and password are required");
      const user = await loginUser(loginIdentifier.trim(), password.trim());
      return user ? success(user) : failed("Invalid username/email or password");
    }
    if (route === "user/create") {
      const result = await createUser(input);
      return result.user ? success(result.user) : failed(result.error ?? "Unable to create user");
    }
    if (route === "customer/create") {
      const result = await createCustomer(input);
      return result.customer ? success(result.customer) : failed(result.error ?? "Unable to create customer");
    }
    if (route === "customer/delete") {
      const customer = await deleteCustomer(Number(input.customerId));
      return customer ? success(customer) : failed("Customer not found");
    }
    if (route === "user/delete") {
      const user = await deleteUser(Number(input.userId));
      return user ? success(user) : failed("User not found");
    }
    if (route === "user/location") {
      const userId = Number(input.userId);
      const latitude = Number(input.latitude);
      const longitude = Number(input.longitude);
      if (!Number.isFinite(userId) || !Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) return failed("Valid user ID, latitude, and longitude are required");
      const user = await updateUserLocation(userId, latitude, longitude);
      return user ? success(user) : failed("Record not found");
    }
    if (route === "trip/create") return success(await createTrip(input as TripInput));
    if (route === "trip/delete") {
      const trip = await deleteTrip(typeof input.id === "string" ? input.id : "");
      return trip ? success(trip) : failed("Trip not found");
    }
    if (path[0] === "trip" && path[2] === "users" && path.length === 3) {
      const trip = await addTripUser(path[1], typeof input.userName === "string" ? input.userName : "");
      return trip ? success(trip) : failed("Trip not found");
    }
    if (path[0] === "trip" && path[2] === "join-requests" && path.length === 3) {
      const userName = typeof input.userName === "string" ? input.userName : "";
      if (!userName.trim()) return failed("User name is required");
      const trip = await requestTripJoin(path[1], userName);
      return trip ? success(trip) : failed("Trip not found");
    }
    if (path[0] === "trip" && path[2] === "plans" && path.length === 3) {
      const trip = await addTripPlan(path[1], input as TripPlanInput);
      return trip ? success(trip) : failed("Trip not found");
    }
    if (path[0] === "trip" && path[2] === "plans" && path[4] === "delete" && path.length === 5) {
      const trip = await deleteTripPlan(path[1], path[3]);
      return trip ? success(trip) : failed("Plan not found");
    }
    if (route === "notifications/read-all") {
      const userName = request.nextUrl.searchParams.get("userName");
      return hasText(userName) ? success(await markAllNotificationsRead(userName)) : failed("User name is required");
    }
    if (path[0] === "notifications" && path[2] === "read" && path.length === 3) {
      const notification = await markNotificationRead(path[1]);
      return notification ? success(notification) : failed("Notification not found");
    }
    return failed("API endpoint not found");
  } catch (error) {
    return apiError(error);
  }
}

export async function PUT(request: NextRequest, context: Context) {
  try {
    const { path } = await context.params;
    const route = path.join("/");
    const input = await body(request);
    if (route === "user/update") {
      const result = await updateUser(input);
      return result.user ? success(result.user) : failed(result.error ?? "Record not found");
    }
    if (route === "customer/update") {
      const result = await updateCustomer(input);
      return result.customer ? success(result.customer) : failed(result.error ?? "Customer not found");
    }
    if (route === "trip/update") {
      const trip = await updateTrip(input as TripInput);
      return trip ? success(trip) : failed("Trip not found");
    }
    if (path[0] === "trip" && path[2] === "plans" && path.length === 4) {
      const trip = await updateTripPlan(path[1], path[3], input as TripPlanInput);
      return trip ? success(trip) : failed("Plan not found");
    }
    return failed("API endpoint not found");
  } catch (error) {
    return apiError(error);
  }
}
