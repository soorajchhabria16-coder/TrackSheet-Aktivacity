// Shared sidebar renderer. Pass active page name.
window.renderSidebar = function(active){
  const items = [
    { key:'tasks',    label:'Production Tasks', href:'Production Tasks.html', icon:'i-list',  count:12 },
    { key:'dashboard',label:'Dashboard',         href:'Dashboard.html',        icon:'i-grid'   },
    { key:'team',     label:'Team',              href:'Team.html',             icon:'i-users'  },
    { key:'admin',    label:'Admin Panel',       href:'Admin.html',            icon:'i-activity' },
  ];
  return `
    <aside class="sidebar">
      <div class="brand">
        <div class="brand-mark" aria-hidden="true"></div>
        <div class="brand-name">Aktivacity</div>
      </div>
      <div class="nav-section-label">Workspace</div>
      <nav class="nav">
        ${items.map(it => `
          <a class="nav-item ${it.key===active?'active':''}" href="${it.href}">
            <svg class="icon"><use href="#${it.icon}"/></svg>
            <span>${it.label}</span>
            ${it.count?`<span class="count">${it.count}</span>`:''}
          </a>
        `).join('')}
      </nav>
      <div class="sidebar-foot">
        <a class="settings" href="Settings.html">
          <svg class="icon" style="width:18px;height:18px"><use href="#i-cog"/></svg>
          <span>Settings</span>
        </a>
        <div class="user-chip">
          <div class="avatar">SA</div>
          <div class="user-info">
            <span class="name">Sooraj Ahmed</span>
            <span class="role">Studio Lead</span>
          </div>
          <button class="icon-btn" onclick="handleLogout()" title="Sign Out" style="margin-left:auto; border:0; background:none; cursor:pointer; color:var(--muted)">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>
            </svg>
          </button>
        </div>
      </div>
    </aside>
  `;
};

// Shared topbar
window.renderTopbar = function(title, subtitle){
  return `
    <header class="topbar">
      <div class="greeting">
        <h1 class="display">${title}</h1>
        <p>${subtitle}</p>
      </div>
      <div class="topbar-right">
        <a class="icon-btn" aria-label="Notifications" href="Notifications.html">
          <svg width="16" height="16"><use href="#i-bell"/></svg>
        </a>
        <div class="account">
          <div class="avatar">SO</div>
          <svg width="14" height="14" class="caret"><use href="#i-chev-down"/></svg>
        </div>
      </div>
    </header>
  `;
};

// Shared task data (Initial mock data while loading)
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

/**
 * Initializes the dashboard by fetching real data from Supabase.
 * Falls back to static data if no database is connected or table is empty.
 */
async function initializeDashboardData() {
  if (typeof fetchTasks === 'function') {
    try {
      const liveTasks = await fetchTasks();
      const liveProfiles = await fetchProfiles();
      
      if (liveTasks && liveTasks.length > 0) window.TASKS = liveTasks;
      if (liveProfiles && liveProfiles.length > 0) window.OWNERS = liveProfiles;
    } catch (e) {
      console.warn('Fallback to local data due to fetch error:', e);
    }
  }
}

// Load Supabase if available
if (typeof supabase === 'undefined' && typeof window.supabase !== 'undefined') {
  // supabase is defined by db.js, which should be included before sidebar.js
}

/**
 * Global Auth Gate: Redirects to Login.html if no session is found.
 */
async function checkAuth() {
  await initializeDashboardData(); // Load data before checking session
  
  if (typeof supabase !== 'undefined' && supabase) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session && !window.location.pathname.includes('Login.html')) {
        window.location.href = 'Login.html';
    }
  }
}
checkAuth();

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

