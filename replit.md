# Ruang Luka - Platform Curhat Online

## Overview
Ruang Luka is an Indonesian online confessional/venting social platform where users can share their stories, feelings, and thoughts either openly or anonymously. Built with Express + React + PostgreSQL (Supabase).

## Recent Changes
- 2026-02-12: Added 9 major features: categories, bookmarks, reactions, trending, DMs, auto theme, profile stats, reporting, ranked feed
- 2026-02-12: Added post categories (Percintaan, Keluarga, Pekerjaan, etc.) with category selector in create post
- 2026-02-12: Multi-type reactions: peluk, semangat, ikut_sedih, bangga with picker UI
- 2026-02-12: Bookmark system with dedicated bookmarks page
- 2026-02-12: Direct messaging with conversations list and real-time chat
- 2026-02-12: Trending topics widget on feed showing top 5 categories by engagement
- 2026-02-12: Auto theme scheduling (light 6am-6pm, dark otherwise) with manual toggle
- 2026-02-12: Profile stats: totalSupport (likes+reactions+comments received), streak (consecutive days posting)
- 2026-02-12: Content reporting system with reasons
- 2026-02-12: Twitter-style ranked feed algorithm based on engagement scoring
- 2026-02-12: Complete UI redesign - deep purple/violet color scheme (262 hue), dark mode default
- 2026-02-12: Migrated database from Replit PostgreSQL to Supabase with SSL

## Architecture
- **Frontend**: React 18 + Vite + TailwindCSS + Shadcn UI + Wouter routing
- **Backend**: Express 5 + PostgreSQL (Supabase) + Drizzle ORM + express-session
- **Auth**: Email/password with bcrypt hashing, session-based
- **Real-time**: WebSocket for notification delivery, polling fallback
- **File uploads**: Multer for avatar uploads to /uploads/
- **Database**: Supabase PostgreSQL with SSL, connection via SUPABASE_DATABASE_URL env var

## Key Features
- User registration/login with email + password
- Text-only posts with anonymous option and category tags
- Comments, likes, reposts
- Multi-type reactions (peluk, semangat, ikut_sedih, bangga)
- Bookmark posts for later
- Follow/unfollow system
- Direct messaging between users
- Real-time notifications via WebSocket
- User profiles with avatar upload, bio, edit, stats (totalSupport, streak)
- DM button on other users' profiles
- Verified badge system (admin-managed)
- Admin panel: user management, ads management, site settings
- Ad system (text/image ads)
- Search users and posts
- Trending topics by category engagement
- Auto dark/light theme scheduling with manual toggle (light/dark/auto)
- Twitter-style ranked feed algorithm
- Content reporting system
- Mobile-responsive design with bottom nav

## Database
- Supabase PostgreSQL with Drizzle ORM
- Tables: users, posts, comments, likes, follows, notifications, ads, site_settings, reactions, bookmarks, reports, conversations, conversation_members, messages
- Session store: connect-pg-simple
- Connection: SUPABASE_DATABASE_URL env var with SSL enabled

## Feed Algorithm
- Score = (likes x 1 + comments x 3 + reposts x 4 + reactions x 2) x 0.4 + recency_decay x 10 + follow_boost + own_post_boost + diversity_boost

## Default Admin Account
- Email: admin@ruangluka.id
- Password: admin123

## API Routes
- Auth: POST /api/auth/register, /api/auth/login, /api/auth/logout, GET /api/auth/me, PATCH /api/auth/profile, POST /api/auth/avatar
- Posts: GET /api/feed, /api/posts/explore, /api/posts/:id, POST /api/posts, DELETE /api/posts/:id
- Interactions: POST /api/posts/:id/like, /api/posts/:id/repost, /api/posts/:id/comments, /api/posts/:id/react, /api/posts/:id/bookmark, /api/posts/:id/report
- Comments: GET /api/posts/:id/comments
- Users: GET /api/users/:username, /api/users/:username/posts, POST /api/users/:id/follow
- Notifications: GET /api/notifications, POST /api/notifications/read-all
- Search: GET /api/search/:query
- Bookmarks: GET /api/bookmarks
- Trending: GET /api/trending
- Conversations: GET /api/conversations, POST /api/conversations, GET /api/conversations/:id/messages, POST /api/conversations/:id/messages, POST /api/conversations/:id/read
- Ads: GET /api/ads/active
- Admin: GET/POST/DELETE /api/admin/users, /api/admin/ads, /api/admin/settings

## File Structure
- client/src/pages/ - Page components (auth, feed, profile, notifications, explore, admin, post-detail, messages, bookmarks)
- client/src/components/ - Reusable components (post-card, create-post, ad-banner, verified-badge, theme-toggle)
- client/src/lib/ - Auth context, theme provider, WebSocket provider, query client
- server/ - Express backend (routes, storage, db, seed)
- shared/schema.ts - Database schema and types

## User Preferences
- Language: Indonesian (Bahasa Indonesia)
- Deployment target: Vercel (planned)
- Database: Supabase PostgreSQL
