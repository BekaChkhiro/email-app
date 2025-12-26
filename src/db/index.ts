import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

// Create a PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

// Create the drizzle database instance with schema
export const db = drizzle(pool, { schema });

// Export the pool for manual queries if needed
export { pool };

// Export schema for easy access
export * from "./schema";
