import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

let pool: Pool | null = null;
let db: ReturnType<typeof drizzle> | null = null;

if (process.env.DATABASE_URL) {
  // Create connection pool for Supabase PostgreSQL
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    // Supabase specific configuration
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    // Connection pool settings
    max: 20, // Maximum number of clients in the pool
    idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
    connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
  });

  // Initialize Drizzle ORM with the connection pool and schema
  db = drizzle(pool, { schema });

  // Handle pool errors
  pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
  });

  console.log('✅ Database connected to Supabase');
} else {
  console.warn(
    "DATABASE_URL is not set. Database functionality will be disabled. This is for UI testing only.",
  );
}

// Graceful shutdown
process.on('SIGINT', async () => {
  if (pool) {
    console.log('Closing database pool...');
    await pool.end();
  }
  process.exit(0);
});

export { pool, db };