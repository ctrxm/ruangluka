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
    try {
      const { expressApp, httpServer } = createApp();

      expressApp.get("/api/health", (_req, res) => {
        res.json({ status: "ok", timestamp: new Date().toISOString() });
      });

      await registerRoutes(httpServer, expressApp, { serverless: true });

      try {
        await seedDatabase();
      } catch (seedErr) {
        console.error("Seed failed (non-fatal):", seedErr);
      }

      expressApp.use((err: any, _req: Request, res: Response, next: NextFunction) => {
        const status = err.status || err.statusCode || 500;
        const message = err.message || "Internal Server Error";
        console.error("Express error:", err);
        if (res.headersSent) return next(err);
        return res.status(status).json({ message });
      });

      app = expressApp;
      initialized = true;
    } catch (err) {
      console.error("Init failed:", err);
      initPromise = null;
      throw err;
    }
  })();

  return initPromise;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    await ensureInitialized();

    if (req.url && !req.url.startsWith("/api")) {
      const pathParam = req.query.path;
      if (pathParam) {
        const pathSegments = Array.isArray(pathParam) ? pathParam : [pathParam];
        const rawUrl = req.url || "";
        const qIdx = rawUrl.indexOf("?");
        const queryString = qIdx >= 0 ? rawUrl.substring(qIdx) : "";
        req.url = "/api/" + pathSegments.join("/") + queryString;
      }
    }

    return app!(req as any, res as any);
  } catch (err: any) {
    console.error("Serverless handler error:", err);
    res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
}
