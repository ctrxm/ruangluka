import { db } from "./db";
import { eq, desc, and, or, like, sql, ne, count, isNull, inArray, gte } from "drizzle-orm";
import {
  users, posts, comments, likes, follows, notifications, ads, siteSettings,
  reactions, bookmarks, reports, conversations, conversationMembers, messages,
  type User, type InsertUser, type Post, type InsertPost, type Comment, type InsertComment,
  type Ad, type InsertAd, type PostWithAuthor, type CommentWithAuthor, type UserProfile,
  type Notification, type SiteSetting, type ReactionType, type ReactionSummary,
  type Reaction, type Bookmark, type Report, type ReportWithDetails,
  type Conversation, type ConversationWithDetails, type Message, type MessageWithSender,
  type TrendingTopic, REACTION_TYPES,
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
  getRankedFeed(currentUserId: number): Promise<PostWithAuthor[]>;
  getExplorePosts(currentUserId?: number): Promise<PostWithAuthor[]>;
  getUserPosts(username: string, currentUserId?: number): Promise<PostWithAuthor[]>;
  deletePost(postId: number): Promise<void>;
  repostPost(userId: number, originalPostId: number): Promise<Post>;

  createComment(userId: number, data: InsertComment): Promise<Comment>;
  getPostComments(postId: number): Promise<CommentWithAuthor[]>;

  toggleLike(userId: number, postId: number): Promise<boolean>;
  toggleFollow(followerId: number, followingId: number): Promise<boolean>;

  toggleReaction(userId: number, postId: number, type: ReactionType): Promise<{ added: boolean; type: ReactionType }>;
  toggleBookmark(userId: number, postId: number): Promise<boolean>;
  getBookmarkedPosts(userId: number): Promise<PostWithAuthor[]>;

  createReport(reporterId: number, postId: number, reason: string): Promise<Report>;
  getReports(status?: string): Promise<ReportWithDetails[]>;
  updateReportStatus(reportId: number, status: string): Promise<Report>;

  getOrCreateConversation(userId1: number, userId2: number): Promise<Conversation>;
  getUserConversations(userId: number): Promise<ConversationWithDetails[]>;
  getConversationMessages(conversationId: number, userId: number): Promise<MessageWithSender[]>;
  sendMessage(conversationId: number, senderId: number, content: string): Promise<Message>;
  markMessagesRead(conversationId: number, userId: number): Promise<void>;

  getTrendingTopics(): Promise<TrendingTopic[]>;

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

  const reactionRows = await db.select({ type: reactions.type, cnt: count() })
    .from(reactions).where(eq(reactions.postId, post.id)).groupBy(reactions.type);
  const reactionsCount: ReactionSummary = { peluk: 0, semangat: 0, ikut_sedih: 0, bangga: 0 };
  for (const row of reactionRows) {
    if (row.type in reactionsCount) reactionsCount[row.type as ReactionType] = row.cnt;
  }

  let isLiked = false;
  let isReposted = false;
  let isBookmarked = false;
  let userReaction: ReactionType | null = null;
  if (currentUserId) {
    isLiked = await db.select().from(likes).where(and(eq(likes.postId, post.id), eq(likes.userId, currentUserId))).then(r => r.length > 0);
    isReposted = await db.select().from(posts).where(and(eq(posts.originalPostId, post.id), eq(posts.userId, currentUserId))).then(r => r.length > 0);
    isBookmarked = await db.select().from(bookmarks).where(and(eq(bookmarks.postId, post.id), eq(bookmarks.userId, currentUserId))).then(r => r.length > 0);
    const userReactionRow = await db.select().from(reactions).where(and(eq(reactions.postId, post.id), eq(reactions.userId, currentUserId))).then(r => r[0]);
    if (userReactionRow) userReaction = userReactionRow.type as ReactionType;
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
    reactionsCount,
    isLiked,
    isReposted,
    isBookmarked,
    userReaction,
    originalPost,
  };
}

export class DatabaseStorage implements IStorage {
  async createUser(data: { email: string; username: string; displayName: string; password: string }): Promise<User> {
    const hashedPassword = await bcrypt.hash(data.password, 10);
    const [user] = await db.insert(users).values({
      email: data.email, username: data.username, displayName: data.displayName, password: hashedPassword,
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

    const [likesReceived] = await db.select({ count: count() }).from(likes)
      .innerJoin(posts, eq(likes.postId, posts.id))
      .where(eq(posts.userId, user.id));
    const [reactionsReceived] = await db.select({ count: count() }).from(reactions)
      .innerJoin(posts, eq(reactions.postId, posts.id))
      .where(eq(posts.userId, user.id));
    const [commentsReceived] = await db.select({ count: count() }).from(comments)
      .innerJoin(posts, eq(comments.postId, posts.id))
      .where(and(eq(posts.userId, user.id), ne(comments.userId, user.id)));
    const totalSupport = likesReceived.count + reactionsReceived.count + commentsReceived.count;

    const userPosts = await db.select({ createdAt: posts.createdAt })
      .from(posts).where(eq(posts.userId, user.id))
      .orderBy(desc(posts.createdAt)).limit(30);
    let streak = 0;
    if (userPosts.length > 0) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      let checkDate = new Date(today);
      for (let i = 0; i < 30; i++) {
        const dayStart = new Date(checkDate);
        const dayEnd = new Date(checkDate);
        dayEnd.setDate(dayEnd.getDate() + 1);
        const hasPost = userPosts.some(p => {
          const postDate = new Date(p.createdAt!);
          return postDate >= dayStart && postDate < dayEnd;
        });
        if (hasPost) {
          streak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else if (i === 0) {
          checkDate.setDate(checkDate.getDate() - 1);
          continue;
        } else {
          break;
        }
      }
    }

    return {
      ...user,
      followersCount: followersResult.count,
      followingCount: followingResult.count,
      postsCount: postsResult.count,
      isFollowing,
      totalSupport,
      streak,
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
    await db.delete(bookmarks).where(eq(bookmarks.userId, userId));
    await db.delete(reactions).where(eq(reactions.userId, userId));
    await db.delete(follows).where(or(eq(follows.followerId, userId), eq(follows.followingId, userId)));
    await db.delete(notifications).where(or(eq(notifications.userId, userId), eq(notifications.fromUserId, userId)));
    const userPosts = await db.select({ id: posts.id }).from(posts).where(eq(posts.userId, userId));
    for (const p of userPosts) {
      await db.delete(likes).where(eq(likes.postId, p.id));
      await db.delete(comments).where(eq(comments.postId, p.id));
      await db.delete(reactions).where(eq(reactions.postId, p.id));
      await db.delete(bookmarks).where(eq(bookmarks.postId, p.id));
      await db.delete(reports).where(eq(reports.postId, p.id));
    }
    await db.delete(likes).where(eq(likes.userId, userId));
    await db.delete(comments).where(eq(comments.userId, userId));
    await db.delete(reports).where(eq(reports.reporterId, userId));
    await db.delete(messages).where(eq(messages.senderId, userId));
    await db.delete(conversationMembers).where(eq(conversationMembers.userId, userId));
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
      category: data.category,
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
    return this.getRankedFeed(currentUserId);
  }

  async getRankedFeed(currentUserId: number): Promise<PostWithAuthor[]> {
    const followedIds = await db.select({ id: follows.followingId }).from(follows).where(eq(follows.followerId, currentUserId));
    const followedSet = new Set(followedIds.map(f => f.id));
    const userIds = [currentUserId, ...followedIds.map(f => f.id)];

    const candidatePosts = await db.select().from(posts)
      .orderBy(desc(posts.createdAt))
      .limit(100);

    const enrichedPosts = await Promise.all(candidatePosts.map(p => enrichPost(p, currentUserId)));

    const now = Date.now();
    const scoredPosts = enrichedPosts.map(post => {
      const ageHours = (now - new Date(post.createdAt!).getTime()) / (1000 * 60 * 60);
      const recencyDecay = Math.max(0, 1 - (ageHours / 168));

      const totalReactions = Object.values(post.reactionsCount).reduce((a, b) => a + b, 0);
      const engagementScore =
        (post.likesCount * 1) +
        (post.commentsCount * 3) +
        (post.repostsCount * 4) +
        (totalReactions * 2);

      const isFollowed = followedSet.has(post.userId);
      const followBoost = isFollowed ? 5 : 0;

      const isOwnPost = post.userId === currentUserId;
      const ownBoost = isOwnPost ? 3 : 0;

      const diversityBoost = post.isAnonymous ? 1 : 0;

      const score = (engagementScore * 0.4) + (recencyDecay * 10) + followBoost + ownBoost + diversityBoost;

      return { post, score };
    });

    scoredPosts.sort((a, b) => b.score - a.score);
    return scoredPosts.slice(0, 50).map(s => s.post);
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
    await db.delete(reactions).where(eq(reactions.postId, postId));
    await db.delete(bookmarks).where(eq(bookmarks.postId, postId));
    await db.delete(reports).where(eq(reports.postId, postId));
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
      userId, content: original.content, isAnonymous: false, originalPostId, category: original.category,
    }).returning();
    return repost;
  }

  async createComment(userId: number, data: InsertComment): Promise<Comment> {
    const [comment] = await db.insert(comments).values({ content: data.content, postId: data.postId, userId }).returning();
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

  async toggleReaction(userId: number, postId: number, type: ReactionType): Promise<{ added: boolean; type: ReactionType }> {
    const existing = await db.select().from(reactions).where(and(eq(reactions.postId, postId), eq(reactions.userId, userId))).then(r => r[0]);
    if (existing) {
      if (existing.type === type) {
        await db.delete(reactions).where(eq(reactions.id, existing.id));
        return { added: false, type };
      }
      await db.update(reactions).set({ type }).where(eq(reactions.id, existing.id));
      return { added: true, type };
    }
    await db.insert(reactions).values({ postId, userId, type });
    return { added: true, type };
  }

  async toggleBookmark(userId: number, postId: number): Promise<boolean> {
    const existing = await db.select().from(bookmarks).where(and(eq(bookmarks.postId, postId), eq(bookmarks.userId, userId))).then(r => r[0]);
    if (existing) {
      await db.delete(bookmarks).where(eq(bookmarks.id, existing.id));
      return false;
    }
    await db.insert(bookmarks).values({ postId, userId });
    return true;
  }

  async getBookmarkedPosts(userId: number): Promise<PostWithAuthor[]> {
    const userBookmarks = await db.select({ postId: bookmarks.postId })
      .from(bookmarks).where(eq(bookmarks.userId, userId))
      .orderBy(desc(bookmarks.createdAt));
    const enriched = [];
    for (const bm of userBookmarks) {
      const post = await db.select().from(posts).where(eq(posts.id, bm.postId)).then(r => r[0]);
      if (post) enriched.push(await enrichPost(post, userId));
    }
    return enriched;
  }

  async createReport(reporterId: number, postId: number, reason: string): Promise<Report> {
    const [report] = await db.insert(reports).values({ postId, reporterId, reason }).returning();
    return report;
  }

  async getReports(status?: string): Promise<ReportWithDetails[]> {
    let query = db.select().from(reports).orderBy(desc(reports.createdAt));
    const allReports = status
      ? await db.select().from(reports).where(eq(reports.status, status)).orderBy(desc(reports.createdAt))
      : await db.select().from(reports).orderBy(desc(reports.createdAt));

    return Promise.all(allReports.map(async (r) => {
      const reporter = await db.select({ id: users.id, username: users.username, displayName: users.displayName })
        .from(users).where(eq(users.id, r.reporterId)).then(res => res[0]);
      const post = await db.select({ id: posts.id, content: posts.content, userId: posts.userId })
        .from(posts).where(eq(posts.id, r.postId)).then(res => res[0]);
      return { ...r, reporter, post };
    }));
  }

  async updateReportStatus(reportId: number, status: string): Promise<Report> {
    const [updated] = await db.update(reports).set({ status }).where(eq(reports.id, reportId)).returning();
    return updated;
  }

  async getOrCreateConversation(userId1: number, userId2: number): Promise<Conversation> {
    const user1Convos = await db.select({ conversationId: conversationMembers.conversationId })
      .from(conversationMembers).where(eq(conversationMembers.userId, userId1));

    for (const c of user1Convos) {
      const hasMember = await db.select().from(conversationMembers)
        .where(and(eq(conversationMembers.conversationId, c.conversationId), eq(conversationMembers.userId, userId2)))
        .then(r => r.length > 0);
      if (hasMember) {
        return db.select().from(conversations).where(eq(conversations.id, c.conversationId)).then(r => r[0]);
      }
    }

    const [convo] = await db.insert(conversations).values({}).returning();
    await db.insert(conversationMembers).values([
      { conversationId: convo.id, userId: userId1 },
      { conversationId: convo.id, userId: userId2 },
    ]);
    return convo;
  }

  async getUserConversations(userId: number): Promise<ConversationWithDetails[]> {
    const memberRows = await db.select({ conversationId: conversationMembers.conversationId })
      .from(conversationMembers).where(eq(conversationMembers.userId, userId));

    const result: ConversationWithDetails[] = [];
    for (const m of memberRows) {
      const convo = await db.select().from(conversations).where(eq(conversations.id, m.conversationId)).then(r => r[0]);
      if (!convo) continue;

      const otherMember = await db.select({ userId: conversationMembers.userId })
        .from(conversationMembers)
        .where(and(eq(conversationMembers.conversationId, convo.id), ne(conversationMembers.userId, userId)))
        .then(r => r[0]);
      if (!otherMember) continue;

      const otherUser = await db.select({
        id: users.id, username: users.username, displayName: users.displayName,
        avatarUrl: users.avatarUrl, isVerified: users.isVerified,
      }).from(users).where(eq(users.id, otherMember.userId)).then(r => r[0]);
      if (!otherUser) continue;

      const lastMessage = await db.select().from(messages)
        .where(eq(messages.conversationId, convo.id))
        .orderBy(desc(messages.createdAt)).limit(1).then(r => r[0] || null);

      const [unreadResult] = await db.select({ count: count() }).from(messages)
        .where(and(
          eq(messages.conversationId, convo.id),
          ne(messages.senderId, userId),
          eq(messages.isRead, false)
        ));

      result.push({ ...convo, otherUser, lastMessage, unreadCount: unreadResult.count });
    }

    result.sort((a, b) => {
      const aTime = a.lastMessage?.createdAt || a.createdAt;
      const bTime = b.lastMessage?.createdAt || b.createdAt;
      return new Date(bTime!).getTime() - new Date(aTime!).getTime();
    });

    return result;
  }

  async getConversationMessages(conversationId: number, userId: number): Promise<MessageWithSender[]> {
    const isMember = await db.select().from(conversationMembers)
      .where(and(eq(conversationMembers.conversationId, conversationId), eq(conversationMembers.userId, userId)))
      .then(r => r.length > 0);
    if (!isMember) throw new Error("Bukan anggota percakapan");

    const msgs = await db.select().from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.createdAt);

    return Promise.all(msgs.map(async (m) => {
      const sender = await db.select({
        id: users.id, username: users.username, displayName: users.displayName, avatarUrl: users.avatarUrl,
      }).from(users).where(eq(users.id, m.senderId)).then(r => r[0]);
      return { ...m, sender };
    }));
  }

  async sendMessage(conversationId: number, senderId: number, content: string): Promise<Message> {
    const isMember = await db.select().from(conversationMembers)
      .where(and(eq(conversationMembers.conversationId, conversationId), eq(conversationMembers.userId, senderId)))
      .then(r => r.length > 0);
    if (!isMember) throw new Error("Bukan anggota percakapan");

    const [msg] = await db.insert(messages).values({ conversationId, senderId, content }).returning();
    await db.update(conversations).set({ updatedAt: new Date() }).where(eq(conversations.id, conversationId));
    return msg;
  }

  async markMessagesRead(conversationId: number, userId: number): Promise<void> {
    await db.update(messages).set({ isRead: true })
      .where(and(eq(messages.conversationId, conversationId), ne(messages.senderId, userId), eq(messages.isRead, false)));
  }

  async getTrendingTopics(): Promise<TrendingTopic[]> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const categorizedPosts = await db.select({
      category: posts.category,
      postCount: count(),
    }).from(posts)
      .where(and(
        sql`${posts.category} IS NOT NULL`,
        sql`${posts.category} != ''`,
        gte(posts.createdAt, sevenDaysAgo),
      ))
      .groupBy(posts.category)
      .orderBy(desc(count()));

    const trending: TrendingTopic[] = [];
    for (const cp of categorizedPosts) {
      if (!cp.category) continue;
      const categoryPosts = await db.select({ id: posts.id }).from(posts)
        .where(and(eq(posts.category, cp.category), gte(posts.createdAt, sevenDaysAgo)));
      let engagementScore = cp.postCount;
      for (const p of categoryPosts.slice(0, 20)) {
        const [lc] = await db.select({ count: count() }).from(likes).where(eq(likes.postId, p.id));
        const [cc] = await db.select({ count: count() }).from(comments).where(eq(comments.postId, p.id));
        const [rc] = await db.select({ count: count() }).from(reactions).where(eq(reactions.postId, p.id));
        engagementScore += lc.count + cc.count * 2 + rc.count;
      }
      trending.push({ category: cp.category, postCount: cp.postCount, engagementScore });
    }

    trending.sort((a, b) => b.engagementScore - a.engagementScore);
    return trending.slice(0, 10);
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
      title: data.title, type: data.type, content: data.content,
      imageUrl: data.imageUrl, linkUrl: data.linkUrl, isActive: data.isActive,
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

    const foundPosts = await db.select().from(posts).where(
      or(like(posts.content, searchPattern), like(posts.category, searchPattern))
    ).orderBy(desc(posts.createdAt)).limit(10);
    const enrichedPosts = await Promise.all(foundPosts.map(p => enrichPost(p, currentUserId)));

    return { users: foundUsers, posts: enrichedPosts };
  }
}

export const storage = new DatabaseStorage();
