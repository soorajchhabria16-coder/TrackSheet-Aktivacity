# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Aktivacity TrackSheet** is a static HTML5 + vanilla JavaScript studio task dashboard backed by Supabase (PostgreSQL + Auth). There is no build step, no framework, and no package.json.

## Running Locally

```bash
python3 -m http.server 3000
# or
npx serve .
```

Open `http://localhost:3000` — Vercel config redirects `/` to `Login.html`.

## Architecture

### Stack
- **Frontend**: Pure HTML5, CSS3, ES6+ JavaScript (no framework)
- **Backend**: Supabase (PostgreSQL + Auth), loaded via CDN
- **Deployment**: Vercel with clean URLs (`vercel.json`)

### Page Routing
Static HTML files. Navigation is handled by direct `window.location.href` links. Pages: `Login.html`, `Dashboard.html`, `Production Tasks.html`, `Team.html`, `Task Detail.html`, `Admin.html`, `Settings.html`, `Notifications.html`, `New Task.html`.

### Shared Modules (loaded on every page)
- **`db.js`** — Initializes Supabase client; exposes `window.fetchTasks()`, `window.fetchProfiles()`, `window.inviteUser()`, `window.removeUser()`
- **`sidebar.js`** — Renders sidebar (`window.renderSidebar(activePage)`) and topbar (`window.renderTopbar(title, subtitle)`); runs `checkAuth()` (redirects to Login if no session) and `initializeDashboardData()` (populates `window.TASKS` and `window.OWNERS`)
- **`logic.js`** — Client-side filter engine: `window.getFilteredTasks()`, `window.setFilter(key, value, cb)`, `window.debounce()`
- **`shared.css`** — Design tokens (CSS variables: `--primary`, `--border`, `--success`, etc.)
- **`icons.html`** — Inline SVG sprite; each page includes `<div id="icons"></div>` which sidebar.js populates

### Global State
All shared state lives on `window`:
- `window.TASKS[]` — current task list from Supabase
- `window.OWNERS[]` — team members; `window.OWNER_COLORS` — gradient map
- `window.FilterState` — `{ search, department, status, priority, assignee }`

### Auth Pattern
Every page calls `checkAuth()` (inside `sidebar.js`) on load. It calls `supabase.auth.getSession()` and redirects to `Login.html` if no active session. Logout: `window.handleLogout()`.

### Data Flow
1. Page loads → `sidebar.js` fires `initializeDashboardData()` → calls `db.js` functions → populates `window.TASKS` / `window.OWNERS`
2. Rendering functions read from those globals and write to DOM directly
3. Filters call `window.setFilter()` → triggers re-render callback
4. Fallback to static mock data if Supabase is unreachable

### Design System
- Layout: 240px fixed sidebar + `1fr` main content
- Fonts: Inter (body), Space Grotesk (display headings) via Google Fonts
- All color/spacing tokens are in `shared.css` CSS variables — never hardcode colors

## Supabase Tables
- `tasks` — production tasks with status, priority, assignee, department
- `profiles` — team members (users)
