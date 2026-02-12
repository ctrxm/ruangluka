import type { VercelRequest, VercelResponse } from "@vercel/node";
import { pool } from "../server/db";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const checks: Record<string, any> = {
    status: "ok",
    timestamp: new Date().toISOString(),
    env: {
      hasSupabaseUrl: !!process.env.SUPABASE_DATABASE_URL,
      hasDatabaseUrl: !!process.env.DATABASE_URL,
      hasSessionSecret: !!process.env.SESSION_SECRET,
      nodeEnv: process.env.NODE_ENV,
    },
  };

  try {
    const result = await pool.query("SELECT NOW() as time");
    checks.db = { connected: true, time: result.rows[0].time };
  } catch (err: any) {
    checks.db = { connected: false, error: err.message };
  }

  res.status(200).json(checks);
}
