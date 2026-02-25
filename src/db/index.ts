import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

// Create a PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
  // Connection pool settings for production stability
  max: 20, // Maximum number of connections in the pool
  idleTimeoutMillis: 30000, // Close idle connections after 30 seconds
  connectionTimeoutMillis: 10000, // Return an error after 10 seconds if connection could not be established
  keepAlive: true, // Keep connections alive to prevent Railway proxy from closing them
  keepAliveInitialDelayMillis: 10000, // Start sending keep-alive probes after 10 seconds
});

// Handle pool errors to prevent unhandled promise rejections
pool.on("error", (err) => {
  console.error("Unexpected database pool error:", err);
});

// Create the drizzle database instance with schema
export const db = drizzle(pool, { schema });

// Export the pool for manual queries if needed
export { pool };

// Export schema for easy access
export * from "./schema";
