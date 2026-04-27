import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://wgtqmpbigyscnfihnabm.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_MRS6VObelNdJgqGoh6g-0g_zxcjQMXR';

// createBrowserClient (from @supabase/ssr) stores the session in cookies
// instead of localStorage, so the middleware can read it server-side.
export const supabase = createBrowserClient(supabaseUrl, supabaseKey);
