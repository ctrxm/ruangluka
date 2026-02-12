import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  const checks: Record<string, any> = {
    status: "checking",
    timestamp: new Date().toISOString(),
    env: {
      hasSupabaseUrl: !!process.env.SUPABASE_DATABASE_URL,
      hasDatabaseUrl: !!process.env.DATABASE_URL,
      hasSessionSecret: !!process.env.SESSION_SECRET,
      nodeEnv: process.env.NODE_ENV,
      vercel: !!process.env.VERCEL,
    },
    steps: [],
  };

  try {
    checks.steps.push("1. Testing pg import...");
    const { Pool } = await import("pg");
    checks.steps.push("1. OK");

    checks.steps.push("2. Testing db connection...");
    const dbUrl = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;
    if (!dbUrl) {
      checks.steps.push("2. FAIL - No database URL found!");
      checks.status = "error";
      return res.status(200).json(checks);
    }
    const testPool = new Pool({
      connectionString: dbUrl,
      ssl: { rejectUnauthorized: false },
      max: 1,
      connectionTimeoutMillis: 5000,
    });
    const result = await testPool.query("SELECT 1 as ok");
    await testPool.end();
    checks.steps.push("2. OK - DB connected");

    checks.steps.push("3. Testing schema import...");
    const schema = await import("../shared/schema");
    checks.steps.push("3. OK - Schema has: " + Object.keys(schema).slice(0, 5).join(", "));

    checks.steps.push("4. Testing express import...");
    const express = await import("express");
    checks.steps.push("4. OK");

    checks.steps.push("5. Testing routes import...");
    const routes = await import("../server/routes");
    checks.steps.push("5. OK");

    checks.status = "all_ok";
  } catch (err: any) {
    checks.steps.push("FAILED: " + err.message);
    checks.status = "error";
    checks.error = err.message;
    checks.stack = err.stack;
  }

  return res.status(200).json(checks);
}
