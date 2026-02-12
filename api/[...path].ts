import type { VercelRequest, VercelResponse } from "@vercel/node";
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "../server/routes";
import { createServer } from "http";
import { seedDatabase } from "../server/seed";

const app = express();
const httpServer = createServer(app);

app.set("trust proxy", 1);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

app.use((_req, res, next) => {
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  next();
});

let initialized = false;

async function ensureInitialized() {
  if (initialized) return;
  await registerRoutes(httpServer, app, { serverless: true });
  await seedDatabase();
  
  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    console.error("Internal Server Error:", err);
    if (res.headersSent) {
      return next(err);
    }
    return res.status(status).json({ message });
  });

  initialized = true;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    await ensureInitialized();
    return app(req as any, res as any);
  } catch (err: any) {
    console.error("Handler error:", err);
    return res.status(500).json({ message: "Server initialization failed", error: err.message });
  }
}
