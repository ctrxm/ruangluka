import type { VercelRequest, VercelResponse } from "@vercel/node";
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "../server/routes";
import { createServer } from "http";
import { seedDatabase } from "../server/seed";

let app: ReturnType<typeof express> | null = null;
let initialized = false;
let initPromise: Promise<void> | null = null;

function createApp() {
  const expressApp = express();
  const httpServer = createServer(expressApp);

  expressApp.set("trust proxy", 1);

  expressApp.use(
    express.json({
      verify: (req: any, _res: any, buf: any) => {
        req.rawBody = buf;
      },
    }),
  );

  expressApp.use(express.urlencoded({ extended: false }));

  expressApp.use((_req: any, res: any, next: any) => {
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    next();
  });

  return { expressApp, httpServer };
}

async function ensureInitialized() {
  if (initialized) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const { expressApp, httpServer } = createApp();

    await registerRoutes(httpServer, expressApp, { serverless: true });
    await seedDatabase();

    expressApp.use((err: any, _req: Request, res: Response, next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      console.error("Express error:", err);
      if (res.headersSent) return next(err);
      return res.status(status).json({ message });
    });

    app = expressApp;
    initialized = true;
  })();

  return initPromise;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    await ensureInitialized();
    return app!(req as any, res as any);
  } catch (err: any) {
    console.error("Serverless handler error:", err);
    res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
}
