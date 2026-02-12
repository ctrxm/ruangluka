import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "../shared/schema";

const databaseUrl = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;

const isServerless = !!process.env.VERCEL;

export const pool = new Pool({
  connectionString: databaseUrl || "postgresql://localhost:5432/placeholder",
  ssl: databaseUrl ? { rejectUnauthorized: false } : undefined,
  max: isServerless ? 3 : 10,
  idleTimeoutMillis: isServerless ? 10000 : 30000,
  connectionTimeoutMillis: 10000,
});

export const db = drizzle(pool, { schema });
