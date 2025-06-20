import { Pool } from 'pg';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

// Use a global symbol to store the connection singleton
const globalForDb = global as unknown as {
  conn: Pool | undefined;
  drizzle: NodePgDatabase<typeof schema> | undefined;
};

// Create a memoized connection pool
const createConnection = () => {
  if (!process.env.DATABASE_URL) {
    console.warn(
      "DATABASE_URL is not set. Database functionality will be disabled. This is for UI testing only.",
    );
    return null;
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    // Supabase specific configuration
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    // Connection pool settings
    max: 20, // Maximum number of clients in the pool
    idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
    connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
  });

  // Handle pool errors
  pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
  });

  console.log('✅ Database connected to Supabase');
  return pool;
};

// Create singleton connection - reuse in development to prevent HMR connection leaks
const conn = globalForDb.conn ?? createConnection();
if (process.env.NODE_ENV !== 'production') {
  globalForDb.conn = conn;
}

// Create a single, memoized drizzle instance
// This is the key change: we export a single 'db' object
export const db = conn ? (globalForDb.drizzle ?? drizzle(conn, { schema })) : null;

if (process.env.NODE_ENV !== 'production' && db) {
  globalForDb.drizzle = db;
}

// Export pool for backward compatibility
export const pool = conn;

// Graceful shutdown
process.on('SIGINT', async () => {
  if (conn) {
    console.log('Closing database pool...');
    await conn.end();
  }
  process.exit(0);
});