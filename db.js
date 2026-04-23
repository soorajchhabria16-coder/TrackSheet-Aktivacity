/**
 * Supabase Database Integration for Aktivacity.
 *
 * SECURITY NOTE: SUPABASE_KEY is the anon/public key, which is intentionally
 * exposed client-side. It is safe ONLY if Row Level Security (RLS) is enabled
 * and correctly configured on every Supabase table. Never use the service_role
 * key here.
 */

const SUPABASE_URL = 'https://wgtqmpbigyscnfihnabm.supabase.co';
/** @public Supabase anon key — safe client-side only with RLS enforced on all tables */
const SUPABASE_KEY = 'sb_publishable_MRS6VObelNdJgqGoh6g-0g_zxcjQMXR';

console.log('Aktivacity: db.js loading...');

/**
 * Escapes a string for safe insertion into HTML.
 */
window.esc = function(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
};

/**
 * Basic email format validation.
 */
window.isValidEmail = function(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
};

// Initialize the client
let supabase = null;
window.supabaseClient = null;

/**
 * Attempts to initialize the Supabase client.
 * Returns true if successful.
 */
function initSupabase() {
  console.log('Aktivacity: initSupabase called');
  try {
    const lib = window.supabase || (typeof supabase !== 'undefined' ? supabase : null);
    if (lib && typeof lib.createClient === 'function') {
      console.log('Aktivacity: Supabase library found, creating client...');
      window.supabaseClient = lib.createClient(SUPABASE_URL, SUPABASE_KEY);
      supabase = window.supabaseClient;
      
      console.log('Aktivacity: Supabase client initialized:', !!window.supabaseClient);
      return true;
    } else {
      console.warn('Aktivacity: window.supabase is not defined or createClient is missing');
    }
  } catch (e) {
    console.error('Aktivacity: Supabase initialization error:', e);
  }
  return false;
}

// Initial attempt
console.log('Aktivacity: Running initial initSupabase...');
if (!initSupabase()) {
  console.warn('Aktivacity: Supabase CDN not yet ready, setting retry...');
  setTimeout(() => {
    console.log('Aktivacity: Retrying initSupabase...');
    initSupabase();
  }, 500);
}


/**
 * Fetches tasks from the 'tasks' table.
 */
window.fetchTasks = async function() {
  if (!supabase) return window.TASKS;
  const { data, error } = await supabase.from('tasks').select('*').order('due_date', { ascending: true });
  return error ? window.TASKS : data;
};

/**
 * Fetches profiles from the 'profiles' table.
 */
window.fetchProfiles = async function() {
  if (!supabase) return window.OWNERS;
  
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('name', { ascending: true });
    
  if (error) {
    console.error('Error fetching profiles:', error);
    return window.OWNERS;
  }
  return data;
};

/**
 * Invites/Adds a new user to the studio.
 */
window.inviteUser = async function(userData) {
  if (!supabase) {
    alert('Database not connected. Adding to local session only.');
    return { ...userData, id: 'NEW' };
  }
  
  const { data, error } = await supabase
    .from('profiles')
    .insert([userData])
    .select();
    
  if (error) throw error;
  return data[0];
};

/**
 * Deletes a user profile.
 */
window.removeUser = async function(userId) {
  if (!supabase) return true;
  const { error } = await supabase.from('profiles').delete().eq('id', userId);
  if (error) throw error;
  return true;
};

/**
 * Creates a new task in the 'tasks' table.
 * Falls back to updating the local TASKS array if Supabase is unavailable.
 */
window.createTask = async function(taskData) {
  if (!supabase) {
    const newTask = { ...taskData, id: Date.now() };
    window.TASKS = [...(window.TASKS || []), newTask];
    return newTask;
  }
  const { data, error } = await supabase.from('tasks').insert([taskData]).select();
  if (error) throw error;
  if (data?.[0]) window.TASKS = [...(window.TASKS || []), data[0]];
  return data[0];
};

/**
 * Updates an existing task by id.
 * Applies the update locally first, then persists to Supabase.
 */
window.updateTask = async function(id, updates) {
  const idx = (window.TASKS || []).findIndex(t => String(t.id) === String(id));
  if (idx > -1) window.TASKS[idx] = { ...window.TASKS[idx], ...updates };
  if (!supabase) return (window.TASKS || [])[idx];
  const { data, error } = await supabase.from('tasks').update(updates).eq('id', id).select();
  if (error) throw error;
  return data?.[0];
};

window.updateProfile = async function(id, updates) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('profiles').update(updates).eq('id', id).select();
  if (error) throw error;
  return data?.[0] || null;
};

window.sendMagicLink = async function(email) {
  if (!supabase) return { error: new Error('Supabase not available') };
  // Use the same base URL the app is served from; cleanUrls means /Login works everywhere
  const redirectBase = window.location.origin + '/Login';
  return await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: redirectBase }
  });
};

window.fetchComments = async function(taskId) {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('comments')
    .select('*, profiles(id, name)')
    .eq('task_id', taskId)
    .order('created_at', { ascending: true });
  return error ? [] : (data || []);
};

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

window.createNotification = async function(userId, taskId, type, message) {
  if (!supabase || !userId) return;
  const { error } = await supabase
    .from('notifications')
    .insert([{ user_id: userId, task_id: taskId, type, message }]);
  if (error) console.warn('createNotification failed:', error);
};

window.notifyManagers = async function(taskId, type, message) {
  const managers = (window.OWNERS || []).filter(
    p => ['pm', 'admin'].includes(p.user_role)
  );
  await Promise.all(
    managers.map(m => window.createNotification(m.id, taskId, type, message))
  );
};

window.fetchNotifications = async function() {
  if (!supabase || !window.CURRENT_USER) return [];
  const { data, error } = await supabase
    .from('notifications')
    .select('*, tasks(title)')
    .eq('user_id', window.CURRENT_USER.id)
    .order('created_at', { ascending: false });
  return error ? [] : (data || []);
};

window.markNotificationRead = async function(id) {
  if (!supabase) return;
  await supabase.from('notifications').update({ read: true }).eq('id', id);
};

window.markAllNotificationsRead = async function() {
  if (!supabase || !window.CURRENT_USER) return;
  await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', window.CURRENT_USER.id)
    .eq('read', false);
};
