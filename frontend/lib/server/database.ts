import { Pool, PoolClient, QueryResultRow } from "pg";

const connectionString = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;

if (!connectionString && process.env.NODE_ENV === "production") {
  console.warn("Database connection is not configured. Set DATABASE_URL or POSTGRES_URL.");
}

const globalForDatabase = globalThis as unknown as { travelDatabasePool?: Pool };

export const database = globalForDatabase.travelDatabasePool ?? new Pool({
  connectionString,
  ssl: connectionString ? { rejectUnauthorized: false } : undefined,
  max: 5,
});

if (process.env.NODE_ENV !== "production") {
  globalForDatabase.travelDatabasePool = database;
}

export async function query<Row extends QueryResultRow = QueryResultRow>(
  text: string,
  values: unknown[] = [],
) {
  return database.query<Row>(text, values);
}

export async function transaction<T>(action: (client: PoolClient) => Promise<T>) {
  const client = await database.connect();

  try {
    await client.query("BEGIN");
    const result = await action(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
