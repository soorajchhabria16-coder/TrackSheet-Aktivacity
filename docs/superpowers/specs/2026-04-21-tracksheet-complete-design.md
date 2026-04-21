# TrackSheet — Complete App Design
**Date:** 2026-04-21
**Project:** Aktivacity TrackSheet
**Stack:** Static HTML5 + Vanilla JS + Supabase (PostgreSQL + Auth)

---

## Overview

Refine the existing TrackSheet app from a partially functional shell into a complete production task management tool. The work covers three categories: bug fixes, role-based access control, and new collaboration features (comments + notifications).

---

## 1. Bug Fixes

These are broken in the current app and must be fixed before any new features land.

| Issue | Fix |
|---|---|
| Sidebar navigation links broken | Audit all `href` values in `sidebar.js`; fix paths to match actual filenames |
| Sidebar task count hardcoded to 12 | Compute dynamically from `window.TASKS.length` after data loads |
| Filters (search, department, status, priority, assignee) non-functional | Wire `logic.js` filter engine to each filter control on Production Tasks and Dashboard pages; ensure re-render fires on every change |
| Invite User navigates to Profile Settings | Replace with a modal that calls Supabase Auth invite flow |
| Admin Panel is display-only mockup | Replace with functional user management (see Section 4) |

---

## 2. Role System

### Roles

| Role | Value stored in DB |
|---|---|
| Admin | `admin` |
| Project Manager | `pm` |
| Team Member | `member` |

### Database Change

Add two columns to the `profiles` table:
- `role text DEFAULT 'member'` — values: `'admin'`, `'pm'`, `'member'`
- `status text DEFAULT 'active'` — values: `'active'`, `'pending'` (pending = invite sent, not yet accepted)

### Access Rules

| Capability | Admin | PM | Member |
|---|---|---|---|
| Invite / remove users | ✅ | — | — |
| Change user roles | ✅ | — | — |
| Create & assign tasks | ✅ | ✅ | — |
| View all tasks | ✅ | ✅ | — |
| View own tasks only | ✅ | ✅ | ✅ |
| Update task status | ✅ | ✅ | Own tasks |
| Add comments | ✅ | ✅ | Own tasks |
| View Dashboard & reports | ✅ | ✅ | — |
| Access Admin Panel | ✅ | — | — |
| Manage Settings | ✅ | — | — |

### Sidebar per role

- **Admin:** Dashboard, Production Tasks, Team, Admin Panel, Notifications, Settings
- **PM:** Dashboard, Production Tasks, Team (view only), Notifications, Settings
- **Member:** My Tasks, Notifications, Settings

### Enforcement

Role is read from `profiles` after login and stored in a `window.CURRENT_USER` object `{ id, name, role }`. Every page checks this on load:
- If the user's role does not have access to the page, redirect to the appropriate landing page (Member → `Production Tasks.html`, PM/Admin → `Dashboard.html`).
- The Production Tasks page filters `window.TASKS` to `assignee === currentUser.id` for Members before rendering.
- Admin Panel renders only if `window.CURRENT_USER.role === 'admin'`.

---

## 3. New Database Tables

### `comments`

```sql
id          uuid PRIMARY KEY DEFAULT gen_random_uuid()
task_id     uuid REFERENCES tasks(id) ON DELETE CASCADE
user_id     uuid REFERENCES profiles(id)
content     text NOT NULL
created_at  timestamptz DEFAULT now()
```

### `notifications`

```sql
id          uuid PRIMARY KEY DEFAULT gen_random_uuid()
user_id     uuid REFERENCES profiles(id)
task_id     uuid REFERENCES tasks(id) ON DELETE CASCADE
type        text NOT NULL  -- 'assigned' | 'status_change' | 'comment'
message     text NOT NULL
read        boolean DEFAULT false
created_at  timestamptz DEFAULT now()
```

---

## 4. Admin Panel (Functional)

Replaces the current display-only mockup. Only accessible to `admin` role.

### Layout

- Stats row: Total Users / Active / Pending Invite counts (computed from `profiles`)
- User table: Name, Email, Department, Role (editable dropdown), Status, Actions

### Actions

| Action | Behaviour |
|---|---|
| **Invite User** | Modal: Name, Email, Department, Role → inserts `profiles` row with `status: 'pending'` → calls `supabase.auth.signInWithOtp({ email })` to send a magic-link email. User clicks link, lands on Login, and their profile row is matched by email and activated. |
| **Change Role** | Inline role dropdown → calls `updateProfile(id, { role })` → takes effect on next login of that user |
| **Remove User** | Confirmation prompt → deletes row from `profiles` table. Auth account remains (Supabase admin API not available client-side) but the user can no longer access the app since every page requires a matching `profiles` row. |
| **Revoke Invite** | Deletes pending `profiles` row |

### Pending invites

Invited users appear in the table with `status: 'pending'` and a placeholder avatar until they accept and complete signup.

---

## 5. Task Detail — Comments & Activity Feed

The right column of `Task Detail.html` gains a unified activity feed.

### What appears in the feed

- Task assigned (system event)
- Status changed (who changed it, from → to)
- Comment posted (author + message text)

All events are stored in `comments` (for comment text) and `notifications` (for status/assignment events). The feed merges both, sorted by `created_at` ascending.

### Status Change (Team Member)

A status dropdown sits at the top of the right column. Changing it:
1. Calls `window.updateTask(id, { status })` in `db.js`
2. Inserts a notification row for the task's assigned PM with `type: 'status_change'`
3. Appends the event to the activity feed immediately (optimistic update)

### Comment Post

A textarea + Post button at the bottom of the feed. Submitting:
1. Inserts a row into `comments`
2. Inserts a notification row for the other party with `type: 'comment'`
3. Appends the comment to the feed immediately

---

## 6. Notifications

### Bell Icon (topbar)

Displays a red badge with the count of unread `notifications` rows for `window.CURRENT_USER.id`. Count is fetched on page load and decremented as items are read.

### Notifications Page

- Lists all notifications for the current user, newest first
- Unread: purple dot + highlighted background row
- Read: dimmed, no dot
- Clicking a row: navigates to the task (`Task Detail.html?id=<task_id>`) and marks the notification `read = true`
- "Mark all as read" button: sets all unread to `read = true` for current user

### Notification Triggers

| Event | Who gets notified | Type |
|---|---|---|
| Task assigned to Member | The assigned Member | `assigned` |
| Member changes task status | All users with role `pm` or `admin` | `status_change` |
| PM/Admin comments on a task | The assigned Member | `comment` |
| Member comments on a task | All users with role `pm` or `admin` | `comment` |

---

## 7. Data Flow Changes

`sidebar.js` sets `window.CURRENT_USER = { id, name, role, email }` inside `initializeDashboardData()` after fetching the current session and matching it to a `profiles` row. All pages depend on this being set before rendering.

`db.js` gains five new functions:

- `window.fetchComments(taskId)` — fetches comments for a task ordered by `created_at`
- `window.createComment(taskId, content)` — inserts comment + triggers notification
- `window.fetchNotifications()` — fetches all notifications for current user
- `window.markNotificationRead(id)` — sets `read = true`
- `window.markAllNotificationsRead()` — bulk update for current user

`sidebar.js` gains role-aware rendering: `renderSidebar(activePage)` reads `window.CURRENT_USER.role` and only outputs nav items the role can access.

---

## 8. Out of Scope

The following are explicitly excluded from this implementation:

- File attachments on tasks
- Time tracking / hour logging
- Email notifications (in-app only)
- Mobile-responsive layout changes
- Real-time push (Supabase subscriptions) — polling on page load is sufficient for now

---

## Success Criteria

- [ ] All sidebar links navigate correctly on every page
- [ ] All filters (search, department, status, priority, assignee) work on Production Tasks
- [ ] Logging in as Admin shows Admin Panel; logging in as Member hides it
- [ ] Member only sees tasks assigned to them
- [ ] Admin can invite a user by email and the invite email is delivered
- [ ] Admin can change a user's role from the Admin Panel
- [ ] Team Member can change task status; PM receives a notification
- [ ] PM can assign a task; Team Member receives a notification
- [ ] Comments post and appear in the activity feed for both parties
- [ ] Bell icon shows correct unread count; clicking a notification opens the task
