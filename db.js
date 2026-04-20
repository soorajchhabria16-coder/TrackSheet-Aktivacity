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
  const { data, error } = await supabase.from('profiles').select('*');
  return error ? window.OWNERS : data;
};
