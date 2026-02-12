import { sql } from "drizzle-orm";
import { pgTable, text, varchar, boolean, integer, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

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

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, isVerified: true, isAdmin: true });
export const loginSchema = z.object({ email: z.string().email(), password: z.string().min(6) });
export const registerSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(20).regex(/^[a-zA-Z0-9_]+$/),
  displayName: z.string().min(1).max(50),
  password: z.string().min(6),
});
export const insertPostSchema = createInsertSchema(posts).omit({ id: true, createdAt: true, userId: true });
export const insertCommentSchema = createInsertSchema(comments).omit({ id: true, createdAt: true, userId: true });
export const insertAdSchema = createInsertSchema(ads).omit({ id: true, createdAt: true });
export const updateProfileSchema = z.object({
  displayName: z.string().min(1).max(50).optional(),
  bio: z.string().max(500).optional(),
  username: z.string().min(3).max(20).regex(/^[a-zA-Z0-9_]+$/).optional(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Post = typeof posts.$inferSelect;
export type InsertPost = z.infer<typeof insertPostSchema>;
export type Comment = typeof comments.$inferSelect;
export type InsertComment = z.infer<typeof insertCommentSchema>;
export type Like = typeof likes.$inferSelect;
export type Follow = typeof follows.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type Ad = typeof ads.$inferSelect;
export type InsertAd = z.infer<typeof insertAdSchema>;
export type SiteSetting = typeof siteSettings.$inferSelect;

export type PostWithAuthor = Post & {
  author: Pick<User, "id" | "username" | "displayName" | "avatarUrl" | "isVerified"> | null;
  likesCount: number;
  commentsCount: number;
  repostsCount: number;
  isLiked: boolean;
  isReposted: boolean;
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
};
