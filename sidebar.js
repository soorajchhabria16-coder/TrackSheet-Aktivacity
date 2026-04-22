// Shared sidebar renderer. Pass active page name.
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
          <a class="nav-item ${it.key === active ? 'active' : ''}" href="${esc(it.href)}">
            <svg class="icon"><use href="#${esc(it.icon)}"/></svg>
            <span>${esc(it.label)}</span>
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
          <div class="avatar">${esc(cu.oi || 'ME')}</div>
          <div class="user-info">
            <span class="name">${esc(cu.name || 'Loading…')}</span>
            <span class="role">${esc(roleLabel)}</span>
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

// Shared topbar
window.renderTopbar = function(title, subtitle) {
  return `
    <header class="topbar">
      <div class="greeting">
        <h1 class="display">${esc(title)}</h1>
        <p>${esc(subtitle)}</p>
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
          <div class="avatar">${esc((window.CURRENT_USER && window.CURRENT_USER.oi) || 'ME')}</div>
          <svg width="14" height="14" class="caret"><use href="#i-chev-down"/></svg>
        </div>
      </div>
    </header>
  `;
};

// Shared task data (populated by initializeDashboardData)
window.TASKS = [];
window.OWNERS = [];

window.OWNER_COLORS = {
  SH:"linear-gradient(135deg,#F472B6,#DB2777)",
  SB:"linear-gradient(135deg,#FBBF24,#D97706)",
  TM:"linear-gradient(135deg,#34D399,#059669)",
  IN:"linear-gradient(135deg,#60A5FA,#2563EB)",
  ZA:"linear-gradient(135deg,#A78BFA,#6D28D9)",
  MK:"linear-gradient(135deg,#F87171,#B91C1C)",
};

/* Normalize a task from Supabase or mock, ensuring both prio+priority and oi exist */
window._normTask = function(t) {
  const oi = t.oi || (t.owner || t.assigned_to || '?').slice(0,2).toUpperCase();
  const priority = (t.priority || t.prio || 'medium').toLowerCase();
  return {
    ...t,
    oi,
    priority,
    prio: priority,
    owner:      t.owner || t.assigned_to || 'Unassigned',
    status:     (t.status || 'pending').toLowerCase().replace('_', '-'),
    due_date:   t.due_date || t.dueDate || null,
    notes:      typeof t.notes === 'number' ? t.notes : parseInt(t.notes) || 0,
    kind:       t.kind || 'web',
    department: t.department || 'Design',
  };
};

/* Normalize a profile from Supabase, deriving oi (initials) from name */
window._normOwner = function(p) {
  const parts = (p.name || p.email || 'Unknown User').trim().split(/\s+/);
  const oi = p.oi || p.initials || (
    (parts[0]?.[0] || '') + (parts[1]?.[0] || parts[0]?.[1] || '')
  ).toUpperCase() || 'UN';
  return {
    ...p,
    oi,
    name: p.name || p.email || 'Unknown',
    role: p.role || p.position || 'Team Member',
  };
};

/* Fallback task set used when Supabase returns nothing */
window._mockTasks = function() {
  const ts = new Date().toISOString().split('T')[0];
  const d = o => { const dt = new Date(ts); dt.setDate(dt.getDate()+o); return dt.toISOString().split('T')[0]; };
  return [
    {id:1, title:'Brand identity refresh — Season 3',  status:'in-progress',priority:'high',  prio:'high',  due_date:d(-4),owner:'Sara Hassan',   oi:'SH',kind:'portfolio',notes:3, department:'Design'},
    {id:2, title:'Campaign hero banner — Q2 launch',   status:'in-progress',priority:'high',  prio:'high',  due_date:d(-2),owner:'Sibghat Nawaz', oi:'SB',kind:'banner',   notes:1, department:'Marketing'},
    {id:3, title:'Podcast thumbnail system',           status:'in-progress',priority:'medium',prio:'medium',due_date:d(-1),owner:'Tom Morris',    oi:'TM',kind:'social',   notes:0, department:'Content'},
    {id:4, title:'Mobile app UI overhaul — v3',        status:'pending',    priority:'high',  prio:'high',  due_date:d(0), owner:'Inam Khan',     oi:'IN',kind:'web',      notes:5, department:'Design'},
    {id:5, title:'Social media asset pack — April',    status:'in-progress',priority:'medium',prio:'medium',due_date:d(0), owner:'Zainab Qureshi',oi:'ZA',kind:'social',   notes:2, department:'Marketing'},
    {id:6, title:'Annual report layout',               status:'pending',    priority:'high',  prio:'high',  due_date:d(2), owner:'Moiz Kiyani',   oi:'MK',kind:'portfolio',notes:0, department:'Design'},
    {id:7, title:'Merch lineup visual direction',      status:'in-progress',priority:'medium',prio:'medium',due_date:d(3), owner:'Sara Hassan',   oi:'SH',kind:'banner',   notes:1, department:'Creative'},
    {id:8, title:'Email newsletter template',          status:'pending',    priority:'low',   prio:'low',   due_date:d(5), owner:'Sibghat Nawaz', oi:'SB',kind:'web',      notes:0, department:'Marketing'},
    {id:9, title:'Event backdrop artwork',             status:'pending',    priority:'medium',prio:'medium',due_date:d(6), owner:'Tom Morris',    oi:'TM',kind:'banner',   notes:3, department:'Events'},
    {id:10,title:'Product photography art direction',  status:'pending',    priority:'low',   prio:'low',   due_date:d(14),owner:'Inam Khan',     oi:'IN',kind:'portfolio',notes:0, department:'Creative'},
    {id:11,title:'YouTube thumbnail A/B test series',  status:'completed',  priority:'medium',prio:'medium',due_date:d(-5),owner:'Zainab Qureshi',oi:'ZA',kind:'social',   notes:4, department:'Content'},
    {id:12,title:'Brand guidelines v2.1',              status:'completed',  priority:'high',  prio:'high',  due_date:d(-7),owner:'Moiz Kiyani',   oi:'MK',kind:'portfolio',notes:2, department:'Design'},
    {id:13,title:'Reel storyboard — Q1 retrospective', status:'completed',  priority:'low',   prio:'low',   due_date:d(-3),owner:'Sara Hassan',   oi:'SH',kind:'social',   notes:1, department:'Content'},
  ];
};

/* Fallback owner set */
window._mockOwners = function() {
  return [
    {id:'SH',oi:'SH',name:'Sara Hassan',    role:'Lead Designer'},
    {id:'SB',oi:'SB',name:'Sibghat Nawaz',  role:'Graphic Designer'},
    {id:'TM',oi:'TM',name:'Tom Morris',     role:'Content Creator'},
    {id:'IN',oi:'IN',name:'Inam Khan',      role:'UI Developer'},
    {id:'ZA',oi:'ZA',name:'Zainab Qureshi', role:'Motion Designer'},
    {id:'MK',oi:'MK',name:'Moiz Kiyani',   role:'Illustrator'},
  ];
};

/**
 * Initializes the dashboard by fetching real data from Supabase.
 * Normalizes all records so oi, prio, priority are consistently available.
 * Falls back to mock data if Supabase is unreachable or returns nothing.
 */
async function initializeDashboardData() {
  if (typeof fetchTasks === 'function') {
    try {
      const liveTasks    = await fetchTasks();
      const liveProfiles = await fetchProfiles();
      if (liveTasks    && liveTasks.length    > 0) window.TASKS  = liveTasks.map(window._normTask);
      if (liveProfiles && liveProfiles.length > 0) window.OWNERS = liveProfiles.map(window._normOwner);
    } catch (e) {
      console.warn('Aktivacity: Supabase fetch failed, using fallback data:', e);
    }
  }
  if (window.TASKS.length  === 0) window.TASKS  = window._mockTasks();
  if (window.OWNERS.length === 0) window.OWNERS = window._mockOwners();
}

// Load Supabase if available
if (typeof supabase === 'undefined' && typeof window.supabase !== 'undefined') {
  // supabase is defined by db.js, which should be included before sidebar.js
}

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

/**
 * Global Logout handler.
 */
async function handleLogout() {
  if (typeof supabase !== 'undefined' && supabase) {
    await supabase.auth.signOut();
  }
  window.location.href = 'Login.html';
}

window.KIND_ICON = {
  web:'i-globe', portfolio:'i-image', banner:'i-megaphone', ads:'i-image', social:'i-megaphone'
};

