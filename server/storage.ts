import { db } from "./db";
import { eq, desc, and, or, like, sql, ne, count, isNull } from "drizzle-orm";
import {
  users, posts, comments, likes, follows, notifications, ads, siteSettings,
  type User, type InsertUser, type Post, type InsertPost, type Comment, type InsertComment,
  type Ad, type InsertAd, type PostWithAuthor, type CommentWithAuthor, type UserProfile,
  type Notification, type SiteSetting,
} from "../shared/schema";
import bcrypt from "bcryptjs";

export interface IStorage {
  createUser(data: { email: string; username: string; displayName: string; password: string }): Promise<User>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserById(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserProfile(username: string, currentUserId?: number): Promise<UserProfile | undefined>;
  updateUserProfile(userId: number, data: { displayName?: string; bio?: string; username?: string }): Promise<User>;
  updateUserAvatar(userId: number, avatarUrl: string): Promise<User>;
  getAllUsers(): Promise<User[]>;
  deleteUser(userId: number): Promise<void>;
  toggleUserVerified(userId: number): Promise<User>;
  toggleUserAdmin(userId: number): Promise<User>;

  createPost(userId: number, data: InsertPost): Promise<Post>;
  getPost(postId: number, currentUserId?: number): Promise<PostWithAuthor | undefined>;
  getFeed(currentUserId: number): Promise<PostWithAuthor[]>;
  getExplorePosts(currentUserId?: number): Promise<PostWithAuthor[]>;
  getUserPosts(username: string, currentUserId?: number): Promise<PostWithAuthor[]>;
  deletePost(postId: number): Promise<void>;
  repostPost(userId: number, originalPostId: number): Promise<Post>;

  createComment(userId: number, data: InsertComment): Promise<Comment>;
  getPostComments(postId: number): Promise<CommentWithAuthor[]>;

  toggleLike(userId: number, postId: number): Promise<boolean>;
  toggleFollow(followerId: number, followingId: number): Promise<boolean>;

  createNotification(data: { userId: number; type: string; fromUserId?: number; postId?: number; message: string }): Promise<Notification>;
  getUserNotifications(userId: number): Promise<(Notification & { fromUser?: Pick<User, "id" | "username" | "displayName" | "avatarUrl"> | null })[]>;
  markAllNotificationsRead(userId: number): Promise<void>;
  getUnreadNotificationCount(userId: number): Promise<number>;

  getActiveAds(): Promise<Ad[]>;
  getAllAds(): Promise<Ad[]>;
  createAd(data: InsertAd): Promise<Ad>;
  toggleAd(adId: number): Promise<Ad>;
  deleteAd(adId: number): Promise<void>;

  getSettings(): Promise<SiteSetting[]>;
  upsertSetting(key: string, value: string): Promise<SiteSetting>;

  searchUsersAndPosts(query: string, currentUserId?: number): Promise<{ users: User[]; posts: PostWithAuthor[] }>;
}

async function enrichPost(post: Post, currentUserId?: number): Promise<PostWithAuthor> {
  const author = post.isAnonymous ? null : await db.select({
    id: users.id, username: users.username, displayName: users.displayName,
    avatarUrl: users.avatarUrl, isVerified: users.isVerified,
  }).from(users).where(eq(users.id, post.userId)).then(r => r[0] || null);

  const [likesResult] = await db.select({ count: count() }).from(likes).where(eq(likes.postId, post.id));
  const [commentsResult] = await db.select({ count: count() }).from(comments).where(eq(comments.postId, post.id));
  const [repostsResult] = await db.select({ count: count() }).from(posts).where(eq(posts.originalPostId, post.id));

  let isLiked = false;
  let isReposted = false;
  if (currentUserId) {
    const likeExists = await db.select().from(likes).where(and(eq(likes.postId, post.id), eq(likes.userId, currentUserId))).then(r => r.length > 0);
    isLiked = likeExists;
    const repostExists = await db.select().from(posts).where(and(eq(posts.originalPostId, post.id), eq(posts.userId, currentUserId))).then(r => r.length > 0);
    isReposted = repostExists;
  }

  let originalPost: PostWithAuthor | null = null;
  if (post.originalPostId) {
    const orig = await db.select().from(posts).where(eq(posts.id, post.originalPostId)).then(r => r[0]);
    if (orig) originalPost = await enrichPost(orig, currentUserId);
  }

  return {
    ...post,
    author: post.isAnonymous ? null : author,
    likesCount: likesResult.count,
    commentsCount: commentsResult.count,
    repostsCount: repostsResult.count,
    isLiked,
    isReposted,
    originalPost,
  };
}

export class DatabaseStorage implements IStorage {
  async createUser(data: { email: string; username: string; displayName: string; password: string }): Promise<User> {
    const hashedPassword = await bcrypt.hash(data.password, 10);
    const [user] = await db.insert(users).values({
      email: data.email,
      username: data.username,
      displayName: data.displayName,
      password: hashedPassword,
    }).returning();
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return db.select().from(users).where(eq(users.email, email)).then(r => r[0]);
  }

  async getUserById(id: number): Promise<User | undefined> {
    return db.select().from(users).where(eq(users.id, id)).then(r => r[0]);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return db.select().from(users).where(eq(users.username, username)).then(r => r[0]);
  }

  async getUserProfile(username: string, currentUserId?: number): Promise<UserProfile | undefined> {
    const user = await this.getUserByUsername(username);
    if (!user) return undefined;

    const [followersResult] = await db.select({ count: count() }).from(follows).where(eq(follows.followingId, user.id));
    const [followingResult] = await db.select({ count: count() }).from(follows).where(eq(follows.followerId, user.id));
    const [postsResult] = await db.select({ count: count() }).from(posts).where(and(eq(posts.userId, user.id), eq(posts.isAnonymous, false)));

    let isFollowing = false;
    if (currentUserId && currentUserId !== user.id) {
      isFollowing = await db.select().from(follows).where(and(eq(follows.followerId, currentUserId), eq(follows.followingId, user.id))).then(r => r.length > 0);
    }

    return {
      ...user,
      followersCount: followersResult.count,
      followingCount: followingResult.count,
      postsCount: postsResult.count,
      isFollowing,
    };
  }

  async updateUserProfile(userId: number, data: { displayName?: string; bio?: string; username?: string }): Promise<User> {
    const updateData: any = {};
    if (data.displayName) updateData.displayName = data.displayName;
    if (data.bio !== undefined) updateData.bio = data.bio;
    if (data.username) updateData.username = data.username;
    const [user] = await db.update(users).set(updateData).where(eq(users.id, userId)).returning();
    return user;
  }

  async updateUserAvatar(userId: number, avatarUrl: string): Promise<User> {
    const [user] = await db.update(users).set({ avatarUrl }).where(eq(users.id, userId)).returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users).orderBy(desc(users.createdAt));
  }

  async deleteUser(userId: number): Promise<void> {
    await db.delete(follows).where(or(eq(follows.followerId, userId), eq(follows.followingId, userId)));
    await db.delete(notifications).where(or(eq(notifications.userId, userId), eq(notifications.fromUserId, userId)));
    const userPosts = await db.select({ id: posts.id }).from(posts).where(eq(posts.userId, userId));
    for (const p of userPosts) {
      await db.delete(likes).where(eq(likes.postId, p.id));
      await db.delete(comments).where(eq(comments.postId, p.id));
    }
    await db.delete(likes).where(eq(likes.userId, userId));
    await db.delete(comments).where(eq(comments.userId, userId));
    await db.delete(posts).where(eq(posts.userId, userId));
    await db.delete(users).where(eq(users.id, userId));
  }

  async toggleUserVerified(userId: number): Promise<User> {
    const user = await this.getUserById(userId);
    if (!user) throw new Error("User not found");
    const [updated] = await db.update(users).set({ isVerified: !user.isVerified }).where(eq(users.id, userId)).returning();
    return updated;
  }

  async toggleUserAdmin(userId: number): Promise<User> {
    const user = await this.getUserById(userId);
    if (!user) throw new Error("User not found");
    const [updated] = await db.update(users).set({ isAdmin: !user.isAdmin }).where(eq(users.id, userId)).returning();
    return updated;
  }

  async createPost(userId: number, data: InsertPost): Promise<Post> {
    const [post] = await db.insert(posts).values({
      content: data.content,
      isAnonymous: data.isAnonymous,
      originalPostId: data.originalPostId,
      userId,
    }).returning();
    return post;
  }

  async getPost(postId: number, currentUserId?: number): Promise<PostWithAuthor | undefined> {
    const post = await db.select().from(posts).where(eq(posts.id, postId)).then(r => r[0]);
    if (!post) return undefined;
    return enrichPost(post, currentUserId);
  }

  async getFeed(currentUserId: number): Promise<PostWithAuthor[]> {
    const followedIds = await db.select({ id: follows.followingId }).from(follows).where(eq(follows.followerId, currentUserId));
    const userIds = [currentUserId, ...followedIds.map(f => f.id)];

    const feedPosts = await db.select().from(posts)
      .where(or(...userIds.map(id => eq(posts.userId, id))))
      .orderBy(desc(posts.createdAt))
      .limit(50);

    return Promise.all(feedPosts.map(p => enrichPost(p, currentUserId)));
  }

  async getExplorePosts(currentUserId?: number): Promise<PostWithAuthor[]> {
    const allPosts = await db.select().from(posts).orderBy(desc(posts.createdAt)).limit(50);
    return Promise.all(allPosts.map(p => enrichPost(p, currentUserId)));
  }

  async getUserPosts(username: string, currentUserId?: number): Promise<PostWithAuthor[]> {
    const user = await this.getUserByUsername(username);
    if (!user) return [];
    const userPosts = await db.select().from(posts)
      .where(and(eq(posts.userId, user.id), eq(posts.isAnonymous, false)))
      .orderBy(desc(posts.createdAt));
    return Promise.all(userPosts.map(p => enrichPost(p, currentUserId)));
  }

  async deletePost(postId: number): Promise<void> {
    await db.delete(likes).where(eq(likes.postId, postId));
    await db.delete(comments).where(eq(comments.postId, postId));
    await db.delete(posts).where(eq(posts.originalPostId, postId));
    await db.delete(posts).where(eq(posts.id, postId));
  }

  async repostPost(userId: number, originalPostId: number): Promise<Post> {
    const existing = await db.select().from(posts).where(and(eq(posts.userId, userId), eq(posts.originalPostId, originalPostId))).then(r => r[0]);
    if (existing) throw new Error("Sudah di-repost");
    const original = await db.select().from(posts).where(eq(posts.id, originalPostId)).then(r => r[0]);
    if (!original) throw new Error("Post tidak ditemukan");

    const [repost] = await db.insert(posts).values({
      userId,
      content: original.content,
      isAnonymous: false,
      originalPostId,
    }).returning();
    return repost;
  }

  async createComment(userId: number, data: InsertComment): Promise<Comment> {
    const [comment] = await db.insert(comments).values({
      content: data.content,
      postId: data.postId,
      userId,
    }).returning();
    return comment;
  }

  async getPostComments(postId: number): Promise<CommentWithAuthor[]> {
    const allComments = await db.select().from(comments).where(eq(comments.postId, postId)).orderBy(comments.createdAt);
    return Promise.all(allComments.map(async (c) => {
      const author = await db.select({
        id: users.id, username: users.username, displayName: users.displayName,
        avatarUrl: users.avatarUrl, isVerified: users.isVerified,
      }).from(users).where(eq(users.id, c.userId)).then(r => r[0]);
      return { ...c, author };
    }));
  }

  async toggleLike(userId: number, postId: number): Promise<boolean> {
    const existing = await db.select().from(likes).where(and(eq(likes.postId, postId), eq(likes.userId, userId))).then(r => r[0]);
    if (existing) {
      await db.delete(likes).where(eq(likes.id, existing.id));
      return false;
    }
    await db.insert(likes).values({ postId, userId });
    return true;
  }

  async toggleFollow(followerId: number, followingId: number): Promise<boolean> {
    if (followerId === followingId) throw new Error("Tidak bisa mengikuti diri sendiri");
    const existing = await db.select().from(follows).where(and(eq(follows.followerId, followerId), eq(follows.followingId, followingId))).then(r => r[0]);
    if (existing) {
      await db.delete(follows).where(eq(follows.id, existing.id));
      return false;
    }
    await db.insert(follows).values({ followerId, followingId });
    return true;
  }

  async createNotification(data: { userId: number; type: string; fromUserId?: number; postId?: number; message: string }): Promise<Notification> {
    const [notif] = await db.insert(notifications).values(data).returning();
    return notif;
  }

  async getUserNotifications(userId: number) {
    const notifs = await db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt)).limit(50);
    return Promise.all(notifs.map(async (n) => {
      let fromUser = null;
      if (n.fromUserId) {
        fromUser = await db.select({
          id: users.id, username: users.username, displayName: users.displayName, avatarUrl: users.avatarUrl,
        }).from(users).where(eq(users.id, n.fromUserId)).then(r => r[0] || null);
      }
      return { ...n, fromUser };
    }));
  }

  async markAllNotificationsRead(userId: number): Promise<void> {
    await db.update(notifications).set({ isRead: true }).where(eq(notifications.userId, userId));
  }

  async getUnreadNotificationCount(userId: number): Promise<number> {
    const [result] = await db.select({ count: count() }).from(notifications).where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
    return result.count;
  }

  async getActiveAds(): Promise<Ad[]> {
    return db.select().from(ads).where(eq(ads.isActive, true));
  }

  async getAllAds(): Promise<Ad[]> {
    return db.select().from(ads).orderBy(desc(ads.createdAt));
  }

  async createAd(data: InsertAd): Promise<Ad> {
    const [ad] = await db.insert(ads).values({
      title: data.title,
      type: data.type,
      content: data.content,
      imageUrl: data.imageUrl,
      linkUrl: data.linkUrl,
      isActive: data.isActive,
    }).returning();
    return ad;
  }

  async toggleAd(adId: number): Promise<Ad> {
    const ad = await db.select().from(ads).where(eq(ads.id, adId)).then(r => r[0]);
    if (!ad) throw new Error("Ad not found");
    const [updated] = await db.update(ads).set({ isActive: !ad.isActive }).where(eq(ads.id, adId)).returning();
    return updated;
  }

  async deleteAd(adId: number): Promise<void> {
    await db.delete(ads).where(eq(ads.id, adId));
  }

  async getSettings(): Promise<SiteSetting[]> {
    return db.select().from(siteSettings);
  }

  async upsertSetting(key: string, value: string): Promise<SiteSetting> {
    const existing = await db.select().from(siteSettings).where(eq(siteSettings.key, key)).then(r => r[0]);
    if (existing) {
      const [updated] = await db.update(siteSettings).set({ value }).where(eq(siteSettings.id, existing.id)).returning();
      return updated;
    }
    const [created] = await db.insert(siteSettings).values({ key, value }).returning();
    return created;
  }

  async searchUsersAndPosts(query: string, currentUserId?: number) {
    const searchPattern = `%${query}%`;
    const foundUsers = await db.select().from(users).where(
      or(like(users.username, searchPattern), like(users.displayName, searchPattern))
    ).limit(10);

    const foundPosts = await db.select().from(posts).where(like(posts.content, searchPattern)).orderBy(desc(posts.createdAt)).limit(10);
    const enrichedPosts = await Promise.all(foundPosts.map(p => enrichPost(p, currentUserId)));

    return { users: foundUsers, posts: enrichedPosts };
  }
}

export const storage = new DatabaseStorage();
