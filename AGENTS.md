# CLAUDE.md

This file provides guidance to AI when working with code in this repository.

## Project Overview

ZMAIL is a 24-hour temporary email service built on Cloudflare's edge infrastructure. The frontend and backend are integrated into a single Cloudflare Worker for deployment.

## Development Commands

```bash
# Install dependencies (uses pnpm workspaces)
pnpm install

# Start frontend dev server (Vite on localhost:5173)
pnpm dev:frontend

# Start backend dev server (Wrangler local)
pnpm dev:backend

# Build frontend for production
pnpm build

# Deploy to Cloudflare Workers
pnpm deploy

# Type-check worker code
pnpm --filter @zmail/worker run check

# Lint frontend code
pnpm --filter @zmail/frontend run lint
```

## Architecture

### Monorepo Structure
- `frontend/` - React SPA with Vite, TypeScript, Tailwind CSS
- `worker/` - Cloudflare Worker backend using Hono framework

### Backend (worker/src/)
- `index.ts` - Worker entry point handling HTTP requests, email events, and scheduled cleanup tasks
- `routes.ts` - Hono API routes for mailbox and email CRUD operations
- `email-handler.ts` - Processes incoming emails via Cloudflare Email Workers using postal-mime
- `database.ts` - D1 database operations with auto-initialization and cleanup logic

### Frontend (frontend/src/)
- `contexts/MailboxContext.tsx` - Central state management for mailbox, emails, and caching
- `utils/api.ts` - API client functions with localStorage persistence
- `config.ts` - Configuration including API base URL and refresh intervals

### Data Flow
1. Emails arrive via Cloudflare Email Routing -> `email` handler in `index.ts`
2. `email-handler.ts` parses with postal-mime, matches to mailbox by address prefix
3. Frontend polls `/api/mailboxes/:address/emails` with auto-refresh
4. Email details cached in localStorage per mailbox

### Database Schema (Cloudflare D1)
- `mailboxes` - Temporary mailboxes with 24h expiry, keyed by address prefix
- `emails` - Received emails with foreign key to mailboxes (CASCADE delete)
- `attachments` - Email attachments, chunked storage for large files (>500KB)
- `attachment_chunks` - Stores large attachment content in pieces

### Scheduled Tasks
Hourly cron (`0 * * * *`) runs cleanup for:
- Expired mailboxes (>24h old)
- Expired emails (>24h old)
- Read emails (marked as read)

## Key Configuration

- `VITE_EMAIL_DOMAIN` - Comma-separated list of email domains (set via GitHub secrets or build vars)
- D1 database binding: `DB`
- Assets served from `frontend/dist` with SPA fallback

## API Endpoints

- `POST /api/mailboxes` - Create mailbox (random or custom address)
- `GET /api/mailboxes/:address` - Get mailbox info
- `DELETE /api/mailboxes/:address` - Delete mailbox
- `GET /api/mailboxes/:address/emails` - List emails
- `GET /api/emails/:id` - Get email detail (marks as read)
- `GET /api/emails/:id/attachments` - List attachments
- `GET /api/attachments/:id?download=true` - Download attachment
