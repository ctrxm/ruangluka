import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import session from "express-session";
import ConnectPgSimple from "connect-pg-simple";
import multer from "multer";
import path from "path";
import fs from "fs";
import bcrypt from "bcryptjs";
import { storage } from "./storage";
import { pool } from "./db";
import { registerSchema, loginSchema, insertPostSchema, insertCommentSchema, insertAdSchema, updateProfileSchema } from "../shared/schema";

const PgStore = ConnectPgSimple(session);

const isVercelEnv = !!process.env.VERCEL;
const uploadDir = isVercelEnv ? "/tmp/uploads" : path.join(process.cwd(), "client", "public", "uploads");

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
      cb(null, uploadDir);
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `avatar-${Date.now()}${ext}`);
    },
  }),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Hanya file gambar yang diperbolehkan"));
  },
});

declare module "express-session" {
  interface SessionData {
    userId: number;
  }
}

const wsClients = new Map<number, Set<WebSocket>>();

function sendToUser(userId: number, data: any) {
  const clients = wsClients.get(userId);
  if (clients) {
    const msg = JSON.stringify(data);
    clients.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) ws.send(msg);
    });
  }
}

function paramStr(val: string | string[]): string {
  return Array.isArray(val) ? val[0] : val;
}

function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) return res.status(401).json({ message: "Tidak terautentikasi" });
  next();
}

async function maintenanceCheck(req: Request, res: Response, next: NextFunction) {
  if (req.path.startsWith("/api/auth") || req.path.startsWith("/api/admin")) return next();
  try {
    const settings = await storage.getSettings();
    const maintenance = settings.find(s => s.key === "maintenance_mode");
    if (maintenance?.value === "true") {
      if (req.session.userId) {
        const user = await storage.getUserById(req.session.userId);
        if (user?.isAdmin) return next();
      }
      return res.status(503).json({ message: "Situs sedang dalam mode maintenance. Silakan coba lagi nanti." });
    }
  } catch {}
  next();
}

async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) return res.status(401).json({ message: "Tidak terautentikasi" });
  const user = await storage.getUserById(req.session.userId);
  if (!user?.isAdmin) return res.status(403).json({ message: "Akses ditolak" });
  next();
}

export async function registerRoutes(httpServer: Server, app: Express, options?: { serverless?: boolean }): Promise<Server> {
  const isProduction = process.env.NODE_ENV === "production";
  const isServerless = options?.serverless || !!process.env.VERCEL;
  const pgStoreOptions: any = {
    pool,
    tableName: "session",
    schemaName: "public",
    pruneSessionInterval: 60 * 15,
    errorLog: console.error.bind(console),
  };

  if (isServerless) {
    pgStoreOptions.createTableIfMissing = false;
  } else {
    pgStoreOptions.createTableIfMissing = true;
  }

  const sessionMiddleware = session({
    store: new PgStore(pgStoreOptions),
    secret: process.env.SESSION_SECRET || "ruangluka-secret-key-change-in-production",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: isProduction || isServerless,
      httpOnly: true,
      maxAge: 30 * 24 * 60 * 60 * 1000,
      sameSite: isServerless ? "none" as const : "lax" as const,
    },
    proxy: isProduction || isServerless,
  });

  app.use(sessionMiddleware);
  app.use(maintenanceCheck);

  // Auth routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const data = registerSchema.parse(req.body);
      const existingEmail = await storage.getUserByEmail(data.email);
      if (existingEmail) return res.status(400).json({ message: "Email sudah digunakan" });
      const existingUsername = await storage.getUserByUsername(data.username);
      if (existingUsername) return res.status(400).json({ message: "Username sudah digunakan" });
      const user = await storage.createUser(data);
      req.session.userId = user.id;
      res.json({ ...user, password: undefined });
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Gagal mendaftar" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const data = loginSchema.parse(req.body);
      const user = await storage.getUserByEmail(data.email);
      if (!user) return res.status(400).json({ message: "Email atau password salah" });
      const valid = await bcrypt.compare(data.password, user.password);
      if (!valid) return res.status(400).json({ message: "Email atau password salah" });
      req.session.userId = user.id;
      res.json({ ...user, password: undefined });
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Gagal masuk" });
    }
  });

  app.get("/api/auth/me", async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ message: "Tidak terautentikasi" });
    const user = await storage.getUserById(req.session.userId);
    if (!user) return res.status(401).json({ message: "User tidak ditemukan" });
    res.json({ ...user, password: undefined });
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy(() => {
      res.json({ message: "Berhasil keluar" });
    });
  });

  app.patch("/api/auth/profile", requireAuth, async (req, res) => {
    try {
      const data = updateProfileSchema.parse(req.body);
      if (data.username) {
        const existing = await storage.getUserByUsername(data.username);
        if (existing && existing.id !== req.session.userId) {
          return res.status(400).json({ message: "Username sudah digunakan" });
        }
      }
      const user = await storage.updateUserProfile(req.session.userId!, data);
      res.json({ ...user, password: undefined });
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.post("/api/auth/avatar", requireAuth, upload.single("avatar"), async (req, res) => {
    if (!req.file) return res.status(400).json({ message: "File tidak ditemukan" });
    const avatarUrl = `/uploads/${req.file.filename}`;
    const user = await storage.updateUserAvatar(req.session.userId!, avatarUrl);
    res.json({ ...user, password: undefined });
  });

  // User routes
  app.get("/api/users/:username", async (req, res) => {
    const profile = await storage.getUserProfile(paramStr(req.params.username), req.session.userId);
    if (!profile) return res.status(404).json({ message: "User tidak ditemukan" });
    res.json({ ...profile, password: undefined });
  });

  app.get("/api/users/:username/posts", async (req, res) => {
    const posts = await storage.getUserPosts(paramStr(req.params.username), req.session.userId);
    res.json(posts);
  });

  app.post("/api/users/:id/follow", requireAuth, async (req, res) => {
    try {
      const targetId = parseInt(paramStr(req.params.id));
      const followed = await storage.toggleFollow(req.session.userId!, targetId);
      if (followed) {
        const currentUser = await storage.getUserById(req.session.userId!);
        await storage.createNotification({
          userId: targetId,
          type: "follow",
          fromUserId: req.session.userId,
          message: `${currentUser?.displayName} mulai mengikuti kamu`,
        });
        sendToUser(targetId, { type: "notification" });
      }
      res.json({ followed });
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  // Post routes
  app.get("/api/feed", requireAuth, async (req, res) => {
    const posts = await storage.getFeed(req.session.userId!);
    res.json(posts);
  });

  app.get("/api/posts/explore", async (req, res) => {
    const posts = await storage.getExplorePosts(req.session.userId);
    res.json(posts);
  });

  app.get("/api/posts/:id", async (req, res) => {
    const post = await storage.getPost(parseInt(paramStr(req.params.id)), req.session.userId);
    if (!post) return res.status(404).json({ message: "Post tidak ditemukan" });
    res.json(post);
  });

  app.post("/api/posts", requireAuth, async (req, res) => {
    try {
      const data = insertPostSchema.parse(req.body);
      const post = await storage.createPost(req.session.userId!, data);
      res.json(post);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.delete("/api/posts/:id", requireAuth, async (req, res) => {
    const postId = parseInt(paramStr(req.params.id));
    const post = await storage.getPost(postId);
    if (!post) return res.status(404).json({ message: "Post tidak ditemukan" });
    const user = await storage.getUserById(req.session.userId!);
    if (post.userId !== req.session.userId && !user?.isAdmin) {
      return res.status(403).json({ message: "Tidak diizinkan" });
    }
    await storage.deletePost(postId);
    res.json({ message: "Post dihapus" });
  });

  app.post("/api/posts/:id/like", requireAuth, async (req, res) => {
    const postId = parseInt(paramStr(req.params.id));
    const liked = await storage.toggleLike(req.session.userId!, postId);
    if (liked) {
      const post = await storage.getPost(postId);
      if (post && post.userId !== req.session.userId) {
        const currentUser = await storage.getUserById(req.session.userId!);
        await storage.createNotification({
          userId: post.userId,
          type: "like",
          fromUserId: req.session.userId,
          postId,
          message: `${currentUser?.displayName} menyukai curhat kamu`,
        });
        sendToUser(post.userId, { type: "notification" });
      }
    }
    res.json({ liked });
  });

  app.post("/api/posts/:id/repost", requireAuth, async (req, res) => {
    try {
      const postId = parseInt(paramStr(req.params.id));
      const repost = await storage.repostPost(req.session.userId!, postId);
      const originalPost = await storage.getPost(postId);
      if (originalPost && originalPost.userId !== req.session.userId) {
        const currentUser = await storage.getUserById(req.session.userId!);
        await storage.createNotification({
          userId: originalPost.userId,
          type: "repost",
          fromUserId: req.session.userId,
          postId,
          message: `${currentUser?.displayName} me-repost curhat kamu`,
        });
        sendToUser(originalPost.userId, { type: "notification" });
      }
      res.json(repost);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  // Comments
  app.get("/api/posts/:id/comments", async (req, res) => {
    const comments = await storage.getPostComments(parseInt(paramStr(req.params.id)));
    res.json(comments);
  });

  app.post("/api/posts/:id/comments", requireAuth, async (req, res) => {
    try {
      const postId = parseInt(paramStr(req.params.id));
      const data = insertCommentSchema.parse({ ...req.body, postId });
      const comment = await storage.createComment(req.session.userId!, data);
      const post = await storage.getPost(postId);
      if (post && post.userId !== req.session.userId) {
        const currentUser = await storage.getUserById(req.session.userId!);
        await storage.createNotification({
          userId: post.userId,
          type: "comment",
          fromUserId: req.session.userId,
          postId,
          message: `${currentUser?.displayName} mengomentari curhat kamu`,
        });
        sendToUser(post.userId, { type: "notification" });
      }
      res.json(comment);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  // Notifications
  app.get("/api/notifications", requireAuth, async (req, res) => {
    const notifs = await storage.getUserNotifications(req.session.userId!);
    res.json(notifs);
  });

  app.post("/api/notifications/read-all", requireAuth, async (req, res) => {
    await storage.markAllNotificationsRead(req.session.userId!);
    res.json({ message: "Semua notifikasi ditandai dibaca" });
  });

  app.get("/api/notifications/unread-count", requireAuth, async (req, res) => {
    const count = await storage.getUnreadNotificationCount(req.session.userId!);
    res.json({ count });
  });

  // Search
  app.get("/api/search/:query", async (req, res) => {
    const results = await storage.searchUsersAndPosts(paramStr(req.params.query), req.session.userId);
    res.json(results);
  });

  // Ads
  app.get("/api/ads/active", async (_req, res) => {
    const activeAds = await storage.getActiveAds();
    res.json(activeAds);
  });

  // Admin routes
  app.get("/api/admin/users", requireAdmin, async (_req, res) => {
    const allUsers = await storage.getAllUsers();
    res.json(allUsers.map(u => ({ ...u, password: undefined })));
  });

  app.post("/api/admin/users/:id/verify", requireAdmin, async (req, res) => {
    const user = await storage.toggleUserVerified(parseInt(paramStr(req.params.id)));
    res.json({ ...user, password: undefined });
  });

  app.post("/api/admin/users/:id/admin", requireAdmin, async (req, res) => {
    const user = await storage.toggleUserAdmin(parseInt(paramStr(req.params.id)));
    res.json({ ...user, password: undefined });
  });

  app.delete("/api/admin/users/:id", requireAdmin, async (req, res) => {
    await storage.deleteUser(parseInt(paramStr(req.params.id)));
    res.json({ message: "User dihapus" });
  });

  app.get("/api/admin/ads", requireAdmin, async (_req, res) => {
    const allAds = await storage.getAllAds();
    res.json(allAds);
  });

  app.post("/api/admin/ads", requireAdmin, async (req, res) => {
    try {
      const data = insertAdSchema.parse(req.body);
      const ad = await storage.createAd(data);
      res.json(ad);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.post("/api/admin/ads/:id/toggle", requireAdmin, async (req, res) => {
    const ad = await storage.toggleAd(parseInt(paramStr(req.params.id)));
    res.json(ad);
  });

  app.delete("/api/admin/ads/:id", requireAdmin, async (req, res) => {
    await storage.deleteAd(parseInt(paramStr(req.params.id)));
    res.json({ message: "Iklan dihapus" });
  });

  app.get("/api/admin/settings", requireAdmin, async (_req, res) => {
    const settings = await storage.getSettings();
    res.json(settings);
  });

  app.post("/api/admin/settings", requireAdmin, async (req, res) => {
    const { key, value } = req.body;
    const setting = await storage.upsertSetting(key, value);
    res.json(setting);
  });

  if (!isServerless) {
    const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

    wss.on("connection", async (ws, req) => {
      try {
        const mockRes = { getHeader: () => {}, setHeader: () => {}, end: () => {} } as any;
        await new Promise<void>((resolve, reject) => {
          sessionMiddleware(req as any, mockRes, (err?: any) => {
            if (err) reject(err);
            else resolve();
          });
        });

        const userId = (req as any).session?.userId;
        if (!userId) {
          ws.close();
          return;
        }

        if (!wsClients.has(userId)) wsClients.set(userId, new Set());
        wsClients.get(userId)!.add(ws);

        const unreadCount = await storage.getUnreadNotificationCount(userId);
        ws.send(JSON.stringify({ type: "unread_count", count: unreadCount }));

        ws.on("close", () => {
          const clients = wsClients.get(userId);
          if (clients) {
            clients.delete(ws);
            if (clients.size === 0) wsClients.delete(userId);
          }
        });

        ws.on("error", () => {
          const clients = wsClients.get(userId);
          if (clients) {
            clients.delete(ws);
            if (clients.size === 0) wsClients.delete(userId);
          }
        });
      } catch (err) {
        ws.close();
      }
    });
  }

  return httpServer;
}
