/**
 * Supabase Database Integration for Aktivacity.
 * Live Credentials provided by user.
 */

const SUPABASE_URL = 'https://wgtqmpbigyscnfihnabm.supabase.co';
const SUPABASE_KEY = 'sb_publishable_MRS6VObelNdJgqGoh6g-0g_zxcjQMXR';

// Initialize the client
let supabase = null;
if (typeof window.supabase !== 'undefined') {
  supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  console.log('Aktivacity: Supabase connected with live credentials.');
} else {
  console.warn('Aktivacity: Supabase CDN not loaded yet.');
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
