import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const checks: Record<string, any> = {
    status: "ok",
    timestamp: new Date().toISOString(),
    env: {
      hasSupabaseUrl: !!process.env.SUPABASE_DATABASE_URL,
      hasDatabaseUrl: !!process.env.DATABASE_URL,
      hasSessionSecret: !!process.env.SESSION_SECRET,
      nodeEnv: process.env.NODE_ENV,
      vercel: process.env.VERCEL,
    },
  };

  try {
    const { Pool } = await import("pg");
    const dbUrl = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;
    if (!dbUrl) {
      checks.db = { error: "No database URL configured" };
    } else {
      const pool = new Pool({
        connectionString: dbUrl,
        ssl: { rejectUnauthorized: false },
        max: 1,
        connectionTimeoutMillis: 5000,
      });
      const result = await pool.query("SELECT NOW() as time");
      checks.db = { connected: true, time: result.rows[0].time };
      await pool.end();
    }
  } catch (err: any) {
    checks.db = { connected: false, error: err.message };
  }

  try {
    const express = (await import("express")).default;
    checks.express = { loaded: true, version: "5.x" };
  } catch (err: any) {
    checks.express = { loaded: false, error: err.message };
  }

  try {
    await import("../server/routes");
    checks.routes = { loaded: true };
  } catch (err: any) {
    checks.routes = { loaded: false, error: err.message };
  }

  res.status(200).json(checks);
}
