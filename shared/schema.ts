import { sql } from "drizzle-orm";
import { pgTable, text, varchar, boolean, integer, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const POST_CATEGORIES = [
  "Percintaan",
  "Keluarga",
  "Pekerjaan",
  "Persahabatan",
  "Kesehatan Mental",
  "Pendidikan",
  "Keuangan",
  "Lainnya",
] as const;

export const REACTION_TYPES = ["peluk", "semangat", "ikut_sedih", "bangga"] as const;
export type ReactionType = typeof REACTION_TYPES[number];

export const REACTION_LABELS: Record<ReactionType, string> = {
  peluk: "Peluk",
  semangat: "Semangat",
  ikut_sedih: "Ikut Sedih",
  bangga: "Bangga",
};

export const users = pgTable("users", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  username: text("username").notNull().unique(),
  displayName: text("display_name").notNull(),
  bio: text("bio").default(""),
  avatarUrl: text("avatar_url"),
  isVerified: boolean("is_verified").default(false),
  isAdmin: boolean("is_admin").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const posts = pgTable("posts", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  isAnonymous: boolean("is_anonymous").default(false),
  originalPostId: integer("original_post_id"),
  category: text("category"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const comments = pgTable("comments", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  postId: integer("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const likes = pgTable("likes", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  postId: integer("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id),
}, (table) => [
  uniqueIndex("likes_unique").on(table.postId, table.userId),
]);

export const reactions = pgTable("reactions", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  postId: integer("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id),
  type: text("type").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  uniqueIndex("reactions_unique").on(table.postId, table.userId),
]);

export const bookmarks = pgTable("bookmarks", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  postId: integer("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  uniqueIndex("bookmarks_unique").on(table.postId, table.userId),
]);

export const reports = pgTable("reports", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  postId: integer("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
  reporterId: integer("reporter_id").notNull().references(() => users.id),
  reason: text("reason").notNull(),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const conversations = pgTable("conversations", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const conversationMembers = pgTable("conversation_members", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  conversationId: integer("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id),
}, (table) => [
  uniqueIndex("conversation_members_unique").on(table.conversationId, table.userId),
]);

export const messages = pgTable("messages", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  conversationId: integer("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  senderId: integer("sender_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const follows = pgTable("follows", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  followerId: integer("follower_id").notNull().references(() => users.id),
  followingId: integer("following_id").notNull().references(() => users.id),
}, (table) => [
  uniqueIndex("follows_unique").on(table.followerId, table.followingId),
]);

export const notifications = pgTable("notifications", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id").notNull().references(() => users.id),
  type: text("type").notNull(),
  fromUserId: integer("from_user_id").references(() => users.id),
  postId: integer("post_id"),
  message: text("message").notNull(),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const ads = pgTable("ads", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  type: text("type").notNull().default("text"),
  title: text("title").notNull(),
  content: text("content"),
  imageUrl: text("image_url"),
  linkUrl: text("link_url"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const siteSettings = pgTable("site_settings", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
});

export const loginSchema = z.object({ email: z.string().email(), password: z.string().min(6) });
export const registerSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(20).regex(/^[a-zA-Z0-9_]+$/),
  displayName: z.string().min(1).max(50),
  password: z.string().min(6),
});
export const insertPostSchema = z.object({
  content: z.string().min(1),
  isAnonymous: z.boolean().optional().default(false),
  originalPostId: z.number().optional(),
  category: z.string().optional(),
});
export const insertCommentSchema = z.object({
  postId: z.number(),
  content: z.string().min(1),
});
export const insertAdSchema = z.object({
  type: z.string().default("text"),
  title: z.string().min(1),
  content: z.string().optional(),
  imageUrl: z.string().optional(),
  linkUrl: z.string().optional(),
  isActive: z.boolean().optional().default(true),
});
export const updateProfileSchema = z.object({
  displayName: z.string().min(1).max(50).optional(),
  bio: z.string().max(500).optional(),
  username: z.string().min(3).max(20).regex(/^[a-zA-Z0-9_]+$/).optional(),
});
export const insertReactionSchema = z.object({
  type: z.enum(REACTION_TYPES),
});
export const insertReportSchema = z.object({
  reason: z.string().min(1).max(500),
});
export const insertMessageSchema = z.object({
  content: z.string().min(1).max(2000),
});

export type User = typeof users.$inferSelect;
export type InsertUser = { email: string; username: string; displayName: string; password: string };
export type Post = typeof posts.$inferSelect;
export type InsertPost = z.infer<typeof insertPostSchema>;
export type Comment = typeof comments.$inferSelect;
export type InsertComment = z.infer<typeof insertCommentSchema>;
export type Like = typeof likes.$inferSelect;
export type Reaction = typeof reactions.$inferSelect;
export type Bookmark = typeof bookmarks.$inferSelect;
export type Report = typeof reports.$inferSelect;
export type Conversation = typeof conversations.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type Follow = typeof follows.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type Ad = typeof ads.$inferSelect;
export type InsertAd = z.infer<typeof insertAdSchema>;
export type SiteSetting = typeof siteSettings.$inferSelect;

export type ReactionSummary = Record<ReactionType, number>;

export type PostWithAuthor = Post & {
  author: Pick<User, "id" | "username" | "displayName" | "avatarUrl" | "isVerified"> | null;
  likesCount: number;
  commentsCount: number;
  repostsCount: number;
  reactionsCount: ReactionSummary;
  isLiked: boolean;
  isReposted: boolean;
  isBookmarked: boolean;
  userReaction: ReactionType | null;
  originalPost?: PostWithAuthor | null;
};

export type CommentWithAuthor = Comment & {
  author: Pick<User, "id" | "username" | "displayName" | "avatarUrl" | "isVerified">;
};

export type UserProfile = User & {
  followersCount: number;
  followingCount: number;
  postsCount: number;
  isFollowing: boolean;
  totalSupport: number;
  streak: number;
};

export type ConversationWithDetails = Conversation & {
  otherUser: Pick<User, "id" | "username" | "displayName" | "avatarUrl" | "isVerified">;
  lastMessage: Message | null;
  unreadCount: number;
};

export type MessageWithSender = Message & {
  sender: Pick<User, "id" | "username" | "displayName" | "avatarUrl">;
};

export type ReportWithDetails = Report & {
  reporter: Pick<User, "id" | "username" | "displayName">;
  post: Pick<Post, "id" | "content" | "userId">;
};

export type TrendingTopic = {
  category: string;
  postCount: number;
  engagementScore: number;
};
