# TrackSheet Complete App — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all broken features and add role-based access (Admin/PM/Member), functional Admin Panel, task comments + activity feed, and in-app notifications to the Aktivacity TrackSheet studio dashboard.

**Architecture:** All nine HTML pages share `db.js` (Supabase data layer) and `sidebar.js` (auth gate + global state). The plan extends both files and adds targeted inline JavaScript to individual pages. No build step — direct HTML/JS edits throughout. A new `window.authReady` promise exported from `sidebar.js` solves the race condition where pages render before Supabase data arrives.

**Tech Stack:** HTML5, Vanilla JS ES6+, CSS3, Supabase v2 (PostgreSQL + Auth), Vercel static hosting.

---

## File Map

| File | Change type | Responsibility after |
|---|---|---|
| `db.js` | Modify | Add `updateProfile`, `sendMagicLink`, `fetchComments`, `createComment`, `createNotification`, `notifyManagers`, `fetchNotifications`, `markNotificationRead`, `markAllNotificationsRead` |
| `sidebar.js` | Modify | Export `window.authReady` promise; set `window.CURRENT_USER`; role-aware nav; dynamic task count; add Notifications nav item |
| `Production Tasks.html` | Modify | Await `authReady`; filter tasks to own assignments for Member role |
| `Dashboard.html` | Modify | Await `authReady`; redirect Members to Production Tasks |
| `Team.html` | Modify | Await `authReady`; redirect Members |
| `Admin.html` | Rewrite content + script | Functional user table, invite modal, role change, remove user |
| `Task Detail.html` | Modify | Working status dropdown; dynamic activity feed; wired comment submission |
| `Notifications.html` | Modify | Add missing script imports; replace static array with live Supabase data |

---

### Task 1: Run SQL Migrations in Supabase

**Files:**
- No file changes — run SQL in the Supabase Dashboard SQL Editor

- [ ] **Step 1: Open the SQL editor**

Go to https://supabase.com/dashboard → your project → SQL Editor → New query.

- [ ] **Step 2: Run the migration**

```sql
-- Add access control and invite-status columns to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS user_role text DEFAULT 'member',
  ADD COLUMN IF NOT EXISTS status    text DEFAULT 'active';

-- Set your own admin role (replace email if needed)
UPDATE profiles SET user_role = 'admin' WHERE email = 'synaryverse@gmail.com';

-- Comments table
CREATE TABLE IF NOT EXISTS comments (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id    uuid REFERENCES tasks(id)    ON DELETE CASCADE,
  user_id    uuid REFERENCES profiles(id) ON DELETE SET NULL,
  content    text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid REFERENCES profiles(id) ON DELETE CASCADE,
  task_id    uuid REFERENCES tasks(id)    ON DELETE CASCADE,
  type       text NOT NULL,  -- 'assigned' | 'status_change' | 'comment'
  message    text NOT NULL,
  read       boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
```

- [ ] **Step 3: Verify**

Run in SQL Editor:
```sql
SELECT id, name, email, user_role FROM profiles LIMIT 5;
```

Expected: rows with `user_role` column. Your admin account shows `user_role = 'admin'`.

- [ ] **Step 4: Commit**

```bash
git commit --allow-empty -m "feat: add user_role/status to profiles, create comments and notifications tables"
```

---

### Task 2: db.js — Add New Functions

**Files:**
- Modify: `db.js`

- [ ] **Step 1: Append new functions after `window.updateTask`**

Open `db.js`. After the last function (`window.updateTask`, ends around line 100), add:

```javascript
/**
 * Updates a profile row by id.
 */
window.updateProfile = async function(id, updates) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('profiles').update(updates).eq('id', id).select();
  if (error) throw error;
  return data?.[0] || null;
};

/**
 * Sends a magic-link invite email via Supabase Auth OTP.
 */
window.sendMagicLink = async function(email) {
  if (!supabase) return { error: new Error('Supabase not available') };
  return await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: window.location.origin + '/Login.html' }
  });
};

/**
 * Fetches comments for a task, joined with commenter name.
 */
window.fetchComments = async function(taskId) {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('comments')
    .select('*, profiles(id, name)')
    .eq('task_id', taskId)
    .order('created_at', { ascending: true });
  return error ? [] : (data || []);
};

/**
 * Posts a comment on a task and notifies the other party.
 */
window.createComment = async function(taskId, content) {
  if (!supabase || !window.CURRENT_USER) return null;
  const { data, error } = await supabase
    .from('comments')
    .insert([{ task_id: taskId, user_id: window.CURRENT_USER.id, content }])
    .select('*, profiles(id, name)');
  if (error) throw error;
  const comment = data?.[0];

  const task  = (window.TASKS || []).find(t => String(t.id) === String(taskId));
  const title = task ? (task.title || task.name || 'a task') : 'a task';
  const role  = (window.CURRENT_USER.user_role || 'member');

  if (role === 'member') {
    await window.notifyManagers(taskId, 'comment',
      `${window.CURRENT_USER.name} commented on "${title}"`);
  } else {
    const assignee = (window.OWNERS || []).find(
      o => o.oi === task?.oi || o.name === task?.owner
    );
    if (assignee?.id) {
      await window.createNotification(assignee.id, taskId, 'comment',
        `${window.CURRENT_USER.name} commented on "${title}"`);
    }
  }
  return comment;
};

/**
 * Inserts a single notification row.
 */
window.createNotification = async function(userId, taskId, type, message) {
  if (!supabase || !userId) return;
  const { error } = await supabase
    .from('notifications')
    .insert([{ user_id: userId, task_id: taskId, type, message }]);
  if (error) console.warn('createNotification failed:', error);
};

/**
 * Notifies all users with user_role 'pm' or 'admin'.
 */
window.notifyManagers = async function(taskId, type, message) {
  const managers = (window.OWNERS || []).filter(
    p => ['pm', 'admin'].includes(p.user_role)
  );
  await Promise.all(
    managers.map(m => window.createNotification(m.id, taskId, type, message))
  );
};

/**
 * Fetches all notifications for the current user, newest first.
 */
window.fetchNotifications = async function() {
  if (!supabase || !window.CURRENT_USER) return [];
  const { data, error } = await supabase
    .from('notifications')
    .select('*, tasks(title)')
    .eq('user_id', window.CURRENT_USER.id)
    .order('created_at', { ascending: false });
  return error ? [] : (data || []);
};

/**
 * Marks a single notification as read.
 */
window.markNotificationRead = async function(id) {
  if (!supabase) return;
  await supabase.from('notifications').update({ read: true }).eq('id', id);
};

/**
 * Marks all unread notifications as read for the current user.
 */
window.markAllNotificationsRead = async function() {
  if (!supabase || !window.CURRENT_USER) return;
  await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', window.CURRENT_USER.id)
    .eq('read', false);
};
```

- [ ] **Step 2: Verify**

Start server: `python3 -m http.server 3000`. Open browser devtools console on any page and run:

```javascript
typeof window.fetchComments      // 'function'
typeof window.createComment      // 'function'
typeof window.fetchNotifications // 'function'
typeof window.notifyManagers     // 'function'
```

Expected: all return `'function'`.

- [ ] **Step 3: Commit**

```bash
git add db.js
git commit -m "feat: add comments, notifications, profile update, and magic-link functions to db.js"
```

---

### Task 3: sidebar.js — authReady Promise + CURRENT_USER + Role-Aware Nav

**Files:**
- Modify: `sidebar.js`

- [ ] **Step 1: Replace `renderSidebar` (lines 1–45) with role-aware version**

Replace the entire `window.renderSidebar = function(active){...}` block with:

```javascript
window.renderSidebar = function(active) {
  const role = (window.CURRENT_USER && window.CURRENT_USER.user_role) || 'member';

  const allItems = [
    { key:'dashboard', label:'Dashboard',        href:'Dashboard.html',        icon:'i-grid',     roles:['admin','pm'] },
    { key:'tasks',     label:'Production Tasks', href:'Production Tasks.html', icon:'i-list',     roles:['admin','pm','member'] },
    { key:'team',      label:'Team',             href:'Team.html',             icon:'i-users',    roles:['admin','pm'] },
    { key:'admin',     label:'Admin Panel',      href:'Admin.html',            icon:'i-activity', roles:['admin'] },
    { key:'notifs',    label:'Notifications',    href:'Notifications.html',    icon:'i-bell',     roles:['admin','pm','member'] },
  ];

  const items = allItems.filter(it => it.roles.includes(role));

  const activeTasks = (window.TASKS || []).filter(t => {
    if (t.status === 'completed') return false;
    if (role === 'member') {
      return t.oi === (window.CURRENT_USER || {}).oi ||
             t.owner === (window.CURRENT_USER || {}).name;
    }
    return true;
  }).length;

  const cu = window.CURRENT_USER || {};
  const roleLabel = role === 'admin' ? 'Admin' : role === 'pm' ? 'Project Manager' : 'Team Member';

  return `
    <aside class="sidebar">
      <div class="brand">
        <div class="brand-mark" aria-hidden="true"></div>
        <div class="brand-name">Aktivacity</div>
      </div>
      <div class="nav-section-label">Workspace</div>
      <nav class="nav">
        ${items.map(it => `
          <a class="nav-item ${it.key === active ? 'active' : ''}" href="${it.href}">
            <svg class="icon"><use href="#${it.icon}"/></svg>
            <span>${it.label}</span>
            ${it.key === 'tasks' ? `<span class="count">${activeTasks}</span>` : ''}
          </a>
        `).join('')}
      </nav>
      <div class="sidebar-foot">
        <a class="settings" href="Settings.html">
          <svg class="icon" style="width:18px;height:18px"><use href="#i-cog"/></svg>
          <span>Settings</span>
        </a>
        <div class="user-chip">
          <div class="avatar">${cu.oi || 'ME'}</div>
          <div class="user-info">
            <span class="name">${cu.name || 'Loading…'}</span>
            <span class="role">${roleLabel}</span>
          </div>
          <button class="icon-btn" onclick="handleLogout()" title="Sign Out"
            style="margin-left:auto;border:0;background:none;cursor:pointer;color:var(--muted)">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>
            </svg>
          </button>
        </div>
      </div>
    </aside>
  `;
};
```

- [ ] **Step 2: Replace `renderTopbar` (lines 47–66) with badge-ready version**

Replace the entire `window.renderTopbar = function(title, subtitle){...}` block with:

```javascript
window.renderTopbar = function(title, subtitle) {
  return `
    <header class="topbar">
      <div class="greeting">
        <h1 class="display">${title}</h1>
        <p>${subtitle}</p>
      </div>
      <div class="topbar-right">
        <a class="icon-btn" aria-label="Notifications" href="Notifications.html"
          style="position:relative" id="notif-btn">
          <svg width="16" height="16"><use href="#i-bell"/></svg>
          <span id="notif-badge" style="display:none;position:absolute;top:-5px;right:-5px;
            background:#EF4444;color:#fff;font-size:9px;font-weight:700;border-radius:999px;
            min-width:16px;height:16px;padding:0 3px;align-items:center;
            justify-content:center;border:2px solid #fff">0</span>
        </a>
        <div class="account">
          <div class="avatar">${(window.CURRENT_USER && window.CURRENT_USER.oi) || 'ME'}</div>
          <svg width="14" height="14" class="caret"><use href="#i-chev-down"/></svg>
        </div>
      </div>
    </header>
  `;
};
```

- [ ] **Step 3: Replace `checkAuth()` (lines ~171–184) with `window.authReady` promise**

Find the `async function checkAuth() {` block and its `checkAuth();` call at the bottom, and replace both with:

```javascript
window.authReady = (async function () {
  if (typeof supabase === 'undefined' || !supabase) return;

  const { data: { session } } = await supabase.auth.getSession();
  const isLoginPage = window.location.pathname.includes('Login.html') ||
                      window.location.href.includes('Login.html');

  if (!session) {
    if (!isLoginPage) window.location.href = 'Login.html';
    return;
  }

  await initializeDashboardData();

  // Match session email to a profiles row to get role + id
  const profile = (window.OWNERS || []).find(p => p.email === session.user.email);
  window.CURRENT_USER = profile
    ? { ...profile, user_role: profile.user_role || 'member' }
    : {
        id:        session.user.id,
        email:     session.user.email,
        user_role: 'member',
        name:      session.user.email.split('@')[0],
        oi:        session.user.email.slice(0, 2).toUpperCase(),
      };

  // Update notification badge
  if (typeof window.fetchNotifications === 'function') {
    window.fetchNotifications().then(notifs => {
      const count = (notifs || []).filter(n => !n.read).length;
      const badge = document.getElementById('notif-badge');
      if (badge && count > 0) {
        badge.textContent = count > 99 ? '99+' : count;
        badge.style.display = 'flex';
      }
    }).catch(() => {});
  }
})();
```

- [ ] **Step 4: Verify**

Reload any authenticated page. In the browser console:

```javascript
await window.authReady;
console.log(window.CURRENT_USER.user_role); // 'admin', 'pm', or 'member'
console.log(window.CURRENT_USER.name);      // your name from profiles
```

Expected: both values print correctly.

- [ ] **Step 5: Verify role-aware sidebar**

Confirm the sidebar shows/hides items based on `user_role`:
- Admin account → Dashboard, Production Tasks, Team, Admin Panel, Notifications all visible
- Member account → only Production Tasks and Notifications visible

- [ ] **Step 6: Commit**

```bash
git add sidebar.js
git commit -m "feat: authReady promise, CURRENT_USER, role-aware sidebar, dynamic task count, notification badge"
```

---

### Task 4: Update Each Page to Await authReady + Add Role Guards

**Files:**
- Modify: `Production Tasks.html`, `Dashboard.html`, `Team.html`, `Task Detail.html`, `Notifications.html`

Each page's `init()` must await `window.authReady` before rendering so that `CURRENT_USER` and `TASKS` are ready.

- [ ] **Step 1: Production Tasks.html**

Find the `async function init(){` block (around line 1245). Replace the opening lines up to `showSkeletons()`:

OLD:
```javascript
async function init(){
  document.getElementById('sidebar-slot').outerHTML = renderSidebar('tasks');
  document.getElementById('topbar-slot').outerHTML  = renderTopbar('Production Tasks','Control room — sorted by urgency.');

  showSkeletons();

  if(window.TASKS.length===0) await initializeDashboardData();
  if(window.TASKS.length===0) window.TASKS = mockTasks();
```

NEW:
```javascript
async function init(){
  showSkeletons();
  await window.authReady;

  // Member role: only show tasks assigned to them
  if ((window.CURRENT_USER || {}).user_role === 'member') {
    window.TASKS = (window.TASKS || []).filter(t =>
      t.oi === window.CURRENT_USER.oi || t.owner === window.CURRENT_USER.name
    );
  }

  if (window.TASKS.length === 0) window.TASKS = mockTasks();

  document.getElementById('sidebar-slot').outerHTML = renderSidebar('tasks');
  document.getElementById('topbar-slot').outerHTML  = renderTopbar('Production Tasks', 'Control room — sorted by urgency.');
```

- [ ] **Step 2: Dashboard.html**

Find `async function init()` (or `function init()`) in Dashboard.html. Add at the very start of the function body:

```javascript
  await window.authReady;
  if ((window.CURRENT_USER || {}).user_role === 'member') {
    window.location.href = 'Production Tasks.html';
    return;
  }
```

- [ ] **Step 3: Team.html**

Find `function init()` or `async function init()` in Team.html. Add at the very start:

```javascript
  await window.authReady;
  if ((window.CURRENT_USER || {}).user_role === 'member') {
    window.location.href = 'Production Tasks.html';
    return;
  }
```

Make the function `async` if it isn't already: change `function init()` → `async function init()`.

- [ ] **Step 4: Task Detail.html**

Find `async function init(){` (around line 464). Add as the very first line inside it:

```javascript
  await window.authReady;
```

- [ ] **Step 5: Notifications.html — add missing imports + authReady**

Replace the entire `<script src="sidebar.js"></script>` block (currently there is no db.js or Supabase import on this page) with:

```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="db.js"></script>
<script src="sidebar.js"></script>
<script src="logic.js"></script>
```

Then inside the existing `function init(){`, add `await window.authReady;` as the first line and make it `async`:

OLD:
```javascript
  function init(){
    document.getElementById('sidebar-slot').outerHTML = renderSidebar('dashboard');
```

NEW:
```javascript
  async function init(){
    await window.authReady;
    document.getElementById('sidebar-slot').outerHTML = renderSidebar('notifs');
```

- [ ] **Step 6: Verify role guards**

1. Log in as a Member-role account.
2. Manually navigate to `http://localhost:3000/Dashboard.html` — confirm immediate redirect to Production Tasks.
3. Manually navigate to `http://localhost:3000/Team.html` — confirm redirect.
4. Confirm Production Tasks page shows only tasks where `oi` or `owner` matches the Member's profile.

- [ ] **Step 7: Commit**

```bash
git add "Production Tasks.html" "Dashboard.html" "Team.html" "Task Detail.html" "Notifications.html"
git commit -m "feat: authReady await and role guards across all pages"
```

---

### Task 5: Admin Panel — Functional User Management

**Files:**
- Modify: `Admin.html` (full content area + script replacement)

- [ ] **Step 1: Replace the `<div class="content">` section**

Find `<div class="content">` in Admin.html and replace everything inside it with:

```html
      <div class="content">

        <!-- Stats row -->
        <div class="admin-grid">
          <div class="stat-card">
            <div class="lbl">Total Users</div>
            <div class="val" id="stat-total">—</div>
          </div>
          <div class="stat-card">
            <div class="lbl">Active</div>
            <div class="val" id="stat-active" style="color:var(--success)">—</div>
          </div>
          <div class="stat-card">
            <div class="lbl">Pending Invite</div>
            <div class="val" id="stat-pending" style="color:#B45309">—</div>
          </div>
        </div>

        <!-- User table -->
        <div class="audit-log" style="margin-bottom:24px">
          <div class="audit-header">
            <span style="font-family:'Space Grotesk',sans-serif;font-size:16px;font-weight:700">Team Members</span>
            <button class="btn btn-primary btn-sm" onclick="openInviteModal()"
              style="display:inline-flex;align-items:center;gap:6px;padding:8px 14px;background:var(--primary);
              color:#fff;border:0;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer">
              + Invite User
            </button>
          </div>
          <div id="user-table-body"></div>
        </div>

      </div>

      <!-- Invite Modal -->
      <div id="invite-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.45);
        align-items:center;justify-content:center;z-index:1000">
        <div style="background:#fff;border-radius:16px;padding:28px 32px;width:420px;max-width:90vw;
          box-shadow:0 20px 60px rgba(0,0,0,.25)">
          <h3 style="font-family:'Space Grotesk',sans-serif;font-size:18px;margin:0 0 20px">Invite Team Member</h3>
          <div style="display:flex;flex-direction:column;gap:14px">
            <div>
              <label style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--muted);
                display:block;margin-bottom:4px">Full Name</label>
              <input id="inv-name" type="text" placeholder="e.g. Zara Ali"
                style="width:100%;padding:10px 12px;border:1px solid var(--border);border-radius:8px;
                font-size:14px;font-family:inherit;box-sizing:border-box"/>
            </div>
            <div>
              <label style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--muted);
                display:block;margin-bottom:4px">Email</label>
              <input id="inv-email" type="email" placeholder="e.g. zara@studio.com"
                style="width:100%;padding:10px 12px;border:1px solid var(--border);border-radius:8px;
                font-size:14px;font-family:inherit;box-sizing:border-box"/>
            </div>
            <div>
              <label style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--muted);
                display:block;margin-bottom:4px">Department</label>
              <input id="inv-dept" type="text" placeholder="e.g. Design"
                style="width:100%;padding:10px 12px;border:1px solid var(--border);border-radius:8px;
                font-size:14px;font-family:inherit;box-sizing:border-box"/>
            </div>
            <div>
              <label style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--muted);
                display:block;margin-bottom:4px">Role</label>
              <select id="inv-role"
                style="width:100%;padding:10px 12px;border:1px solid var(--border);border-radius:8px;
                font-size:14px;font-family:inherit;box-sizing:border-box">
                <option value="member">Team Member</option>
                <option value="pm">Project Manager</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
          <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:22px">
            <button onclick="closeInviteModal()"
              style="padding:9px 16px;background:#F1F5F9;border:1px solid var(--border);
              border-radius:8px;font-size:13px;font-weight:600;cursor:pointer">Cancel</button>
            <button id="inv-submit" onclick="submitInvite()"
              style="padding:9px 16px;background:var(--primary);color:#fff;border:0;
              border-radius:8px;font-size:13px;font-weight:600;cursor:pointer">Send Invite</button>
          </div>
        </div>
      </div>
```

- [ ] **Step 2: Replace the entire script block in Admin.html**

Remove all existing `<script>` tags in Admin.html and replace with:

```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="db.js"></script>
<script src="sidebar.js"></script>
<script>
fetch('icons.html').then(r=>r.text()).then(t=>document.getElementById('icons').innerHTML=t)
  .catch(()=>{}).finally(init);

async function init() {
  await window.authReady;
  if ((window.CURRENT_USER || {}).user_role !== 'admin') {
    window.location.href = 'Dashboard.html';
    return;
  }
  document.getElementById('sidebar-slot').outerHTML = renderSidebar('admin');
  document.getElementById('topbar-slot').outerHTML  = renderTopbar('Admin Panel', 'Manage users, roles, and access.');
  await renderUserTable();
}

function esc(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function avatarGrad(oi) {
  const G = {
    SH:'linear-gradient(135deg,#F472B6,#DB2777)',
    SB:'linear-gradient(135deg,#FBBF24,#D97706)',
    TM:'linear-gradient(135deg,#34D399,#059669)',
    IN:'linear-gradient(135deg,#60A5FA,#2563EB)',
    ZA:'linear-gradient(135deg,#A78BFA,#6D28D9)',
    MK:'linear-gradient(135deg,#F87171,#B91C1C)',
  };
  return G[oi] || 'linear-gradient(135deg,#6B7FD7,#4B5EAA)';
}

async function renderUserTable() {
  const profiles = await fetchProfiles();
  const active  = profiles.filter(p => (p.status || 'active') === 'active');
  const pending = profiles.filter(p => p.status === 'pending');

  document.getElementById('stat-total').textContent   = profiles.length;
  document.getElementById('stat-active').textContent  = active.length;
  document.getElementById('stat-pending').textContent = pending.length;

  const rlLabel = r => r === 'admin' ? 'Admin' : r === 'pm' ? 'Project Manager' : 'Member';

  document.getElementById('user-table-body').innerHTML = profiles.map(p => {
    const oi       = p.oi || (p.name || p.email || '?').split(/\s+/).map(w=>w[0]).join('').toUpperCase().slice(0,2);
    const isSelf   = p.email === (window.CURRENT_USER || {}).email;
    const isPend   = p.status === 'pending';
    const uRole    = p.user_role || 'member';

    return `
      <div class="audit-item" style="align-items:center">
        <div style="width:36px;height:36px;border-radius:10px;background:${avatarGrad(oi)};
          display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;
          font-size:12px;flex-shrink:0">${esc(oi)}</div>
        <div style="flex:1;min-width:0;padding:0 12px">
          <div style="font-weight:600;color:var(--text)">${esc(p.name || p.email)}</div>
          <div style="font-size:11px;color:var(--muted-2)">${esc(p.email || '')}</div>
        </div>
        <div style="width:110px;flex-shrink:0;color:var(--muted);font-size:13px">
          ${esc(p.department || '—')}
        </div>
        <div style="width:160px;flex-shrink:0">
          ${isSelf
            ? `<span style="font-size:12px;font-weight:700;background:#ede9fe;color:#4c1d95;
                padding:3px 10px;border-radius:999px">${rlLabel(uRole)}</span>`
            : `<select onchange="changeRole('${esc(p.id)}',this.value)"
                style="font-size:12px;font-weight:600;border:1px solid var(--border);
                border-radius:6px;padding:4px 8px;background:#f8fafc;color:var(--text);cursor:pointer">
                <option value="admin"  ${uRole==='admin' ?'selected':''}>Admin</option>
                <option value="pm"     ${uRole==='pm'    ?'selected':''}>Project Manager</option>
                <option value="member" ${uRole==='member'?'selected':''}>Member</option>
              </select>`
          }
        </div>
        <div style="width:80px;flex-shrink:0">
          ${isPend
            ? `<span style="color:#B45309;font-size:12px;font-weight:600">● Pending</span>`
            : `<span style="color:var(--success);font-size:12px;font-weight:600">● Active</span>`
          }
        </div>
        <div style="width:70px;flex-shrink:0;text-align:right">
          ${isSelf ? '' : `
            <button onclick="removeUser('${esc(p.id)}')"
              style="font-size:12px;color:var(--danger);background:none;border:0;cursor:pointer;font-weight:500">
              ${isPend ? 'Revoke' : 'Remove'}
            </button>`
          }
        </div>
      </div>`;
  }).join('');
}

async function changeRole(id, newRole) {
  try {
    await window.updateProfile(id, { user_role: newRole });
    const p = (window.OWNERS || []).find(o => String(o.id) === String(id));
    if (p) p.user_role = newRole;
  } catch(e) {
    alert('Could not update role: ' + e.message);
    await renderUserTable();
  }
}

async function removeUser(id) {
  if (!confirm('Remove this user? They will lose access immediately.')) return;
  try {
    await window.removeUser(id);
    window.OWNERS = (window.OWNERS || []).filter(o => String(o.id) !== String(id));
    await renderUserTable();
  } catch(e) {
    alert('Could not remove user: ' + e.message);
  }
}

function openInviteModal()  { document.getElementById('invite-modal').style.display = 'flex'; }
function closeInviteModal() {
  document.getElementById('invite-modal').style.display = 'none';
  ['inv-name','inv-email','inv-dept'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('inv-role').value = 'member';
}

async function submitInvite() {
  const name  = document.getElementById('inv-name').value.trim();
  const email = document.getElementById('inv-email').value.trim();
  const dept  = document.getElementById('inv-dept').value.trim();
  const role  = document.getElementById('inv-role').value;

  if (!name || !email) { alert('Name and email are required.'); return; }

  const btn = document.getElementById('inv-submit');
  btn.disabled = true; btn.textContent = 'Sending…';

  try {
    const parts = name.trim().split(/\s+/);
    const oi    = ((parts[0]?.[0] || '') + (parts[1]?.[0] || parts[0]?.[1] || '')).toUpperCase();
    await window.inviteUser({ name, email, department: dept, user_role: role, status: 'pending', oi });
    const { error } = await window.sendMagicLink(email);
    if (error) throw error;
    closeInviteModal();
    await renderUserTable();
    alert(`Invite sent to ${email}. They will receive a magic-link email.`);
  } catch(e) {
    alert('Could not send invite: ' + e.message);
  } finally {
    btn.disabled = false; btn.textContent = 'Send Invite';
  }
}
</script>
```

- [ ] **Step 3: Verify**

1. Log in as Admin → navigate to Admin Panel.
2. Confirm user table loads with correct names, roles, and status.
3. Change a user's role using the dropdown → reload the page → confirm change persisted in Supabase.
4. Click "Invite User" → fill out the form → submit → confirm pending row appears in the table.
5. Log in as a PM account → navigate to `Admin.html` → confirm redirect to Dashboard.

- [ ] **Step 4: Commit**

```bash
git add "Admin.html"
git commit -m "feat: replace Admin Panel mockup with functional user management"
```

---

### Task 6: Task Detail — Dynamic Status, Activity Feed, Comments

**Files:**
- Modify: `Task Detail.html`

Three targeted changes: replace the static Status field with a working dropdown, add a dynamic activity feed, and wire the comment textarea to post.

- [ ] **Step 1: Replace the static Status field HTML in the aside**

Find in `Task Detail.html` (around line 380–387):

```html
          <div class="field">
            <div class="lbl">Status <span class="tiny">auto</span></div>
            <div class="select">
              <span class="status overdue"><svg class="icon"><use href="#i-alert"/></svg> Overdue</span>
              <svg width="14" height="14" style="color:var(--muted)"><use href="#i-chev-down"/></svg>
            </div>
          </div>
```

Replace with:

```html
          <div class="field">
            <div class="lbl">Status</div>
            <select id="status-select" onchange="changeStatus(this.value)"
              style="width:100%;padding:9px 12px;border:1px solid var(--border);border-radius:8px;
              font-size:13px;font-weight:600;font-family:inherit;background:#FBFCFD;
              color:var(--text);cursor:pointer">
              <option value="pending">To Do</option>
              <option value="in-progress">In Progress</option>
              <option value="review">Review</option>
              <option value="completed">Done</option>
            </select>
          </div>
```

- [ ] **Step 2: Replace the static Activity section in the aside**

Find (around lines 434–443):

```html
          <div class="field act">
            <div class="lbl">Activity</div>
            <ul>
              <li><b>Sooraj</b> added a comment<small>4 hours ago</small></li>
              ...
            </ul>
          </div>
```

Replace with:

```html
          <div class="field act">
            <div class="lbl">Activity</div>
            <div id="activity-feed" style="display:flex;flex-direction:column;gap:10px;
              max-height:280px;overflow-y:auto;padding-right:2px">
              <div style="font-size:12px;color:var(--muted-2)">Loading…</div>
            </div>
          </div>
```

- [ ] **Step 3: Add id to the comment textarea and wire the Post button**

Find:
```html
                <textarea placeholder="Write a comment… Use @ to mention someone."></textarea>
```
Replace with:
```html
                <textarea id="comment-input" placeholder="Write a comment…"></textarea>
```

Find:
```html
                  <button class="btn btn-primary btn-sm">Add comment</button>
```
Replace with:
```html
                  <button class="btn btn-primary btn-sm" id="comment-btn" onclick="postComment()">Add comment</button>
```

- [ ] **Step 4: Add helper functions to the Task Detail script block**

Inside the existing `<script>` block (after the `markTaskComplete` function), add:

```javascript
  function fmtRelTime(isoStr) {
    if (!isoStr) return '';
    const diff = Date.now() - new Date(isoStr).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1)  return 'just now';
    if (m < 60) return m + 'm ago';
    const h = Math.floor(m / 60);
    if (h < 24) return h + 'h ago';
    return Math.floor(h / 24) + 'd ago';
  }

  function commentAvatarGrad(oi) {
    const G = {
      SH:'linear-gradient(135deg,#F472B6,#DB2777)',SB:'linear-gradient(135deg,#FBBF24,#D97706)',
      TM:'linear-gradient(135deg,#34D399,#059669)',IN:'linear-gradient(135deg,#60A5FA,#2563EB)',
      ZA:'linear-gradient(135deg,#A78BFA,#6D28D9)',MK:'linear-gradient(135deg,#F87171,#B91C1C)',
    };
    return G[oi] || 'linear-gradient(135deg,#818CF8,#4F46E5)';
  }

  async function loadActivity(taskId) {
    const feed = document.getElementById('activity-feed');
    if (!feed || typeof window.fetchComments !== 'function') return;
    const comments = await window.fetchComments(taskId);
    if (!comments.length) {
      feed.innerHTML = '<div style="font-size:12px;color:var(--muted-2)">No activity yet.</div>';
      return;
    }
    feed.innerHTML = comments.map(c => {
      const name = c.profiles?.name || 'Unknown';
      const oi   = name.split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2);
      return `
        <div style="display:flex;gap:10px;align-items:flex-start">
          <div style="width:26px;height:26px;border-radius:7px;flex-shrink:0;display:flex;
            align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:9px;
            background:${commentAvatarGrad(oi)}">${oi}</div>
          <div style="flex:1">
            <div style="font-size:12px;color:var(--text)"><strong>${name}</strong></div>
            <div style="font-size:12px;color:var(--muted);background:#F8FAFC;border:1px solid var(--border);
              border-radius:7px;padding:7px 10px;margin-top:3px;line-height:1.5">${c.content}</div>
            <div style="font-size:11px;color:var(--muted-2);margin-top:3px">${fmtRelTime(c.created_at)}</div>
          </div>
        </div>`;
    }).join('');
  }

  async function changeStatus(newStatus) {
    const id  = getId();
    const sel = document.getElementById('status-select');
    sel.disabled = true;
    try {
      await window.updateTask(id, { status: newStatus });
      const task     = (window.TASKS || []).find(t => String(t.id) === String(id));
      const taskName = task ? (task.title || task.name || 'a task') : 'a task';
      const labels   = { pending:'To Do', 'in-progress':'In Progress', review:'Review', completed:'Done' };
      if ((window.CURRENT_USER || {}).user_role === 'member' &&
          typeof window.notifyManagers === 'function') {
        await window.notifyManagers(id, 'status_change',
          `${window.CURRENT_USER.name} changed "${taskName}" to ${labels[newStatus] || newStatus}`);
      }
    } catch(e) {
      alert('Could not update status: ' + e.message);
    } finally {
      sel.disabled = false;
    }
  }

  async function postComment() {
    const input   = document.getElementById('comment-input');
    const btn     = document.getElementById('comment-btn');
    const content = input?.value?.trim();
    if (!content) return;
    btn.disabled = true; btn.textContent = 'Posting…';
    try {
      await window.createComment(getId(), content);
      input.value = '';
      await loadActivity(getId());
    } catch(e) {
      alert('Could not post comment: ' + e.message);
    } finally {
      btn.disabled = false; btn.textContent = 'Add comment';
    }
  }
```

- [ ] **Step 5: Initialize status dropdown and load activity from init()**

Inside the existing `init()` function, after the task's `effStatus` is computed and the DOM is updated (around line 520, after the `markTaskComplete` button logic), add:

```javascript
    // Set status dropdown to current task value
    const sel = document.getElementById('status-select');
    if (sel) {
      const sv = t.status === 'completed' ? 'completed'
               : t.status === 'in-progress' ? 'in-progress'
               : t.status === 'review' ? 'review'
               : 'pending';
      sel.value = sv;
      // Disable for Members who don't own this task
      const role  = (window.CURRENT_USER || {}).user_role || 'member';
      const isOwn = t.oi === (window.CURRENT_USER || {}).oi ||
                    t.owner === (window.CURRENT_USER || {}).name;
      if (role === 'member' && !isOwn) sel.disabled = true;
    }

    // Load activity feed
    await loadActivity(t.id);
```

- [ ] **Step 6: Verify**

1. Open any task → confirm Status dropdown shows the current status.
2. Change the status → reload the task → confirm the new status persists.
3. Post a comment → confirm it appears in the Activity feed without a page reload.
4. Log in as a PM and post a comment → log in as the assigned Member → navigate to Notifications → confirm the notification appeared.

- [ ] **Step 7: Commit**

```bash
git add "Task Detail.html"
git commit -m "feat: dynamic status dropdown, activity feed, and comment posting on Task Detail"
```

---

### Task 7: Notifications.html — Live Data

**Files:**
- Modify: `Notifications.html`

- [ ] **Step 1: Replace the entire script block**

Remove the existing `<script src="sidebar.js"></script>` and the inline `<script>...</script>` and replace with:

```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="db.js"></script>
<script src="sidebar.js"></script>
<script>
fetch('icons.html').then(r=>r.text()).then(t=>document.getElementById('icons').innerHTML=t)
  .catch(()=>{}).finally(init);

async function init() {
  await window.authReady;
  document.getElementById('sidebar-slot').outerHTML = renderSidebar('notifs');
  document.getElementById('topbar-slot').outerHTML  = renderTopbar('Notifications', 'Stay updated with studio activity.');
  await renderNotifs(false);

  document.querySelectorAll('.inbox-tab').forEach((tab, i) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.inbox-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      renderNotifs(i === 1);
    });
  });
}

function fmtRelTime(isoStr) {
  if (!isoStr) return '';
  const diff = Date.now() - new Date(isoStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'just now';
  if (m < 60) return m + 'm ago';
  const h = Math.floor(m / 60);
  if (h < 24) return h + 'h ago';
  return Math.floor(h / 24) + 'd ago';
}

async function renderNotifs(unreadOnly) {
  const list = document.getElementById('notification-list');
  list.innerHTML = '<div style="padding:24px;color:var(--muted);font-size:13px">Loading…</div>';

  const all   = await window.fetchNotifications();
  const items = unreadOnly ? all.filter(n => !n.read) : all;
  const unreadCount = all.filter(n => !n.read).length;

  if (!items.length) {
    list.innerHTML = '<div style="padding:40px 24px;text-align:center;color:var(--muted);font-size:13px">No notifications yet.</div>';
    return;
  }

  list.innerHTML =
    (unreadCount > 0
      ? `<div style="padding:10px 24px;border-bottom:1px solid var(--border);display:flex;justify-content:flex-end">
           <button onclick="markAll()"
             style="font-size:12px;color:var(--primary);font-weight:600;background:none;border:0;cursor:pointer">
             Mark all as read
           </button>
         </div>`
      : '') +
    items.map(n => `
      <div class="inbox-item ${n.read ? '' : 'unread'}"
        onclick="openNotif('${n.id}','${n.task_id}')">
        <div style="display:flex;align-items:flex-start;flex:1;gap:12px">
          <div style="width:8px;height:8px;border-radius:50%;margin-top:6px;flex-shrink:0;
            background:${n.read ? 'transparent' : 'var(--primary)'}"></div>
          <div class="content-body">
            <p class="title">${n.message}</p>
            <p class="desc">${fmtRelTime(n.created_at)}</p>
          </div>
        </div>
      </div>`
    ).join('');
}

async function openNotif(notifId, taskId) {
  await window.markNotificationRead(notifId);
  window.location.href = 'Task Detail.html?id=' + taskId;
}

async function markAll() {
  await window.markAllNotificationsRead();
  await renderNotifs(false);
  const badge = document.getElementById('notif-badge');
  if (badge) badge.style.display = 'none';
}
</script>
```

- [ ] **Step 2: Verify**

1. As a Member, change a task status → log in as PM → go to Notifications → confirm the notification appears.
2. Click the notification → confirm it navigates to the correct task and the notification is now shown as read on return.
3. Click "Mark all as read" → confirm all items lose the purple dot and the bell badge clears.

- [ ] **Step 3: Commit**

```bash
git add "Notifications.html"
git commit -m "feat: replace static notification list with live Supabase data"
```

---

## Success Criteria Checklist

Run through these manually after all tasks complete:

- [ ] All sidebar nav links navigate to the correct page with no 404
- [ ] Sidebar highlights the correct active item on each page
- [ ] Sidebar task count updates dynamically from real data
- [ ] Member accounts see only their assigned tasks on Production Tasks
- [ ] Member accounts are redirected away from Dashboard, Team, and Admin Panel
- [ ] Admin Panel shows real user list from Supabase
- [ ] Admin can change a user's role; change persists after page reload
- [ ] Invite User sends a magic-link email and adds a pending row to the table
- [ ] Task status dropdown shows the task's current status and saves on change
- [ ] Changing status as a Member creates a notification for all PMs/Admins
- [ ] Comments post and appear in the Task Detail activity feed
- [ ] Posting a comment triggers a notification for the other party
- [ ] Notifications page lists live notifications, newest first
- [ ] Clicking a notification opens the correct task and marks it read
- [ ] Bell icon shows unread count badge; clears after marking all read
