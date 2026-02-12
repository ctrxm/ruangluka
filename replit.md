# Ruang Luka - Platform Curhat Online

## Overview
Ruang Luka is an Indonesian online confessional/venting social platform where users can share their stories, feelings, and thoughts either openly or anonymously. Built with Express + React + PostgreSQL (Supabase).

## Recent Changes
- 2026-02-12: Migrated database from Replit PostgreSQL to Supabase with SSL
- 2026-02-12: Fixed TypeScript errors (Express 5 params typing, drizzle-zod schema types)
- 2026-02-12: Database connection uses SUPABASE_DATABASE_URL env var (falls back to DATABASE_URL)

## Architecture
- **Frontend**: React 18 + Vite + TailwindCSS + Shadcn UI + Wouter routing
- **Backend**: Express 5 + PostgreSQL (Supabase) + Drizzle ORM + express-session
- **Auth**: Email/password with bcrypt hashing, session-based
- **Real-time**: WebSocket for notification delivery
- **File uploads**: Multer for avatar uploads to /uploads/
- **Database**: Supabase PostgreSQL with SSL, connection via SUPABASE_DATABASE_URL env var

## Key Features
- User registration/login with email + password
- Text-only posts with anonymous option
- Comments, likes, reposts
- Follow/unfollow system
- Real-time notifications via WebSocket
- User profiles with avatar upload, bio, edit
- Verified badge system (admin-managed)
- Admin panel: user management, ads management, site settings
- Ad system (text/image ads, Google AdSense style)
- Search users and posts
- Dark/light theme toggle
- Mobile-responsive design

## Database
- Supabase PostgreSQL with Drizzle ORM
- Tables: users, posts, comments, likes, follows, notifications, ads, site_settings
- Session store: connect-pg-simple
- Connection: SUPABASE_DATABASE_URL env var with SSL enabled

## Default Admin Account
- Email: admin@ruangluka.id
- Password: admin123

## API Routes
- Auth: POST /api/auth/register, /api/auth/login, /api/auth/logout, GET /api/auth/me, PATCH /api/auth/profile, POST /api/auth/avatar
- Posts: GET /api/feed, /api/posts/explore, /api/posts/:id, POST /api/posts, DELETE /api/posts/:id
- Interactions: POST /api/posts/:id/like, /api/posts/:id/repost, /api/posts/:id/comments
- Comments: GET /api/posts/:id/comments
- Users: GET /api/users/:username, /api/users/:username/posts, POST /api/users/:id/follow
- Notifications: GET /api/notifications, POST /api/notifications/read-all
- Search: GET /api/search/:query
- Ads: GET /api/ads/active
- Admin: GET/POST/DELETE /api/admin/users, /api/admin/ads, /api/admin/settings

## File Structure
- client/src/pages/ - Page components (auth, feed, profile, notifications, explore, admin, post-detail)
- client/src/components/ - Reusable components (post-card, create-post, ad-banner, verified-badge, theme-toggle)
- client/src/lib/ - Auth context, theme provider, WebSocket provider, query client
- server/ - Express backend (routes, storage, db, seed)
- shared/schema.ts - Database schema and types

## User Preferences
- Language: Indonesian (Bahasa Indonesia)
- Deployment target: Vercel (planned)
- Database: Supabase PostgreSQL
