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
        <a class="user-chip" href="Settings.html">
          <div class="avatar">SO</div>
          <div class="meta">
            <div class="name">Sooraj</div>
            <div class="role">Studio Lead</div>
          </div>
        </a>
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

// Shared task data
window.TASKS = [
  { id:1,  title:"Official Synary Website Redesign", owner:"Soheera",  oi:"SH", kind:"web",      status:"overdue",   prio:"high",   notes:4 },
  { id:2,  title:"Portfolio's Individual Designs #1 — Soheera",   owner:"Soheera", oi:"SH", kind:"portfolio",status:"overdue",   prio:"medium", notes:2 },
  { id:3,  title:"Portfolio's Individual Designs #2 — Sibghat",   owner:"Sibghat", oi:"SB", kind:"portfolio",status:"overdue",   prio:"medium", notes:1 },
  { id:4,  title:"Portfolio's Individual Designs #3 — Timothy",   owner:"Timothy", oi:"TM", kind:"portfolio",status:"overdue",   prio:"high",   notes:3 },
  { id:5,  title:"Portfolio's Individual Designs #4 — Inam",      owner:"Inam",    oi:"IN", kind:"portfolio",status:"overdue",   prio:"medium", notes:0 },
  { id:6,  title:"Portfolio's Individual Designs #5 — Zainab",    owner:"Zainab",  oi:"ZA", kind:"portfolio",status:"overdue",   prio:"medium", notes:2 },
  { id:7,  title:"Portfolio Design (Moiz Kiyani)",                 owner:"Moiz",    oi:"MK", kind:"portfolio",status:"completed", prio:"high",   notes:5 },
  { id:8,  title:"Banner Design",                                  owner:"Zainab",  oi:"ZA", kind:"banner",   status:"overdue",   prio:"high",   notes:1 },
  { id:9,  title:"AD Creative Images (30)",                        owner:"Timothy", oi:"TM", kind:"ads",      status:"overdue",   prio:"medium", notes:3 },
  { id:10, title:"AD Creative Images Additional (5)",              owner:"Inam",    oi:"IN", kind:"ads",      status:"completed", prio:"medium", notes:2 },
  { id:11, title:"Social Media Content (AQUA VENOM)",              owner:"Sibghat", oi:"SB", kind:"social",   status:"completed", prio:"medium", notes:4 },
  { id:12, title:"Social Media Content (CocoaCrumbs Riyadh)",      owner:"Soheera", oi:"SH", kind:"social",   status:"overdue",   prio:"high",   notes:2 },
];

window.OWNER_COLORS = {
  SH:"linear-gradient(135deg,#F472B6,#DB2777)",
  SB:"linear-gradient(135deg,#FBBF24,#D97706)",
  TM:"linear-gradient(135deg,#34D399,#059669)",
  IN:"linear-gradient(135deg,#60A5FA,#2563EB)",
  ZA:"linear-gradient(135deg,#A78BFA,#6D28D9)",
  MK:"linear-gradient(135deg,#F87171,#B91C1C)",
};

window.OWNERS = [
  { id:"SH", name:"Soheera Ahmed",  role:"Senior Designer",  email:"soheera@aktivacity.studio" },
  { id:"SB", name:"Sibghat Nawaz",  role:"Designer",          email:"sibghat@aktivacity.studio" },
  { id:"TM", name:"Timothy Chen",   role:"Motion Designer",   email:"timothy@aktivacity.studio" },
  { id:"IN", name:"Inam Khan",      role:"Designer",          email:"inam@aktivacity.studio" },
  { id:"ZA", name:"Zainab Qureshi", role:"Art Director",      email:"zainab@aktivacity.studio" },
  { id:"MK", name:"Moiz Kiyani",    role:"Design Lead",       email:"moiz@aktivacity.studio" },
];

window.KIND_ICON = {
  web:'i-globe', portfolio:'i-image', banner:'i-megaphone', ads:'i-image', social:'i-megaphone'
};
