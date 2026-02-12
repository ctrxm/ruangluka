import type { VercelRequest, VercelResponse } from "@vercel/node";
import { pool } from "../server/db";
import * as schema from "../shared/schema";

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  const checks: Record<string, any> = {
    status: "ok",
    timestamp: new Date().toISOString(),
    env: {
      hasSupabaseUrl: !!process.env.SUPABASE_DATABASE_URL,
      hasSessionSecret: !!process.env.SESSION_SECRET,
    },
    schema: Object.keys(schema).slice(0, 5),
  };

  try {
    const result = await pool.query("SELECT 1 as ok");
    checks.db = "connected";
  } catch (err: any) {
    checks.db = "error: " + err.message;
    checks.status = "error";
  }

  return res.status(200).json(checks);
}
