# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Aktivacity TrackSheet** is a production-ready Next.js 14+ application for studio task management, backed by Supabase (PostgreSQL + Auth). It has been migrated from a vanilla HTML/JS prototype to a modern framework architecture.

## Running Locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Architecture

### Stack
- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Styling**: Vanilla CSS Modules (maintaining the original Dark Premium aesthetic)
- **Backend**: Supabase (PostgreSQL + Auth)
- **Deployment**: Vercel

### Core Structure
- `src/app`: App Router pages and layouts.
- `src/components`: Reusable UI components (Sidebar, Topbar, Icons).
- `src/lib`: Shared utilities (Supabase clients, contexts).
- `_legacy_html`: Archive of the original vanilla HTML/JS prototype.

### State Management
- **Auth**: Handled via `src/lib/auth-context.tsx` and Supabase SSR.
- **Navigation**: Managed through `src/lib/mobile-nav-context.tsx`.
- **Data Fetching**: Primarily server-side components with client-side interactivity where needed.

### Design System
- **Theme**: Dark Premium (glassmorphism, vibrant gradients).
- **Typography**: Inter (body), Space Grotesk (display).
- **Icons**: Centralized SVG component in `src/components/Icons.tsx`.

## Deployment

The project is configured for deployment on **Vercel**.

### Required Environment Variables
- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: Your Supabase publishable key (sb_publishable_...).

## Data Schema
- `tasks`: Task management data (status, priority, assignee, etc.).
- `profiles`: User profile data.
