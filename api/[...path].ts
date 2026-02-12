import type { VercelRequest, VercelResponse } from "@vercel/node";

let app: any = null;
let initialized = false;

async function getApp() {
  if (initialized && app) return app;

  const express = (await import("express")).default;
  const { createServer } = await import("http");
  const { registerRoutes } = await import("../server/routes");
  const { seedDatabase } = await import("../server/seed");

  app = express();
  const httpServer = createServer(app);

  app.set("trust proxy", 1);

  app.use(
    express.json({
      verify: (req: any, _res: any, buf: any) => {
        req.rawBody = buf;
      },
    }),
  );

  app.use(express.urlencoded({ extended: false }));

  app.use((_req: any, res: any, next: any) => {
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    next();
  });

  await registerRoutes(httpServer, app, { serverless: true });
  await seedDatabase();

  app.use((err: any, _req: any, res: any, next: any) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    console.error("Express error:", err);
    if (res.headersSent) return next(err);
    return res.status(status).json({ message });
  });

  initialized = true;
  return app;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const expressApp = await getApp();
    return expressApp(req, res);
  } catch (err: any) {
    console.error("Serverless handler error:", err);
    res.status(500).json({
      message: "Server error",
      error: err.message,
      stack: process.env.NODE_ENV !== "production" ? err.stack : undefined,
    });
  }
}
