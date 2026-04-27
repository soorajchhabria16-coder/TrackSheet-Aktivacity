import { createClient } from '@supabase/supabase-js';

const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndndHFtcGJpZ3lzY25maWhuYWJtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjcxNjAwMiwiZXhwIjoyMDkyMjkyMDAyfQ._ViHN4EE9p3XzjrwA3tkgHs8PeYtzHLNqEp86EDs6tw'; 
const SUPABASE_URL = 'https://wgtqmpbigyscnfihnabm.supabase.co';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function addSibghat() {
  const email = 'sibghat.shaikh@aktivacity.com';
  const name = 'Sibghat Shaikh';
  const password = 'TemporaryPassword123!';

  console.log(`🚀 Creating user: ${email}`);

  const { data: userData, error: authError } = await supabase.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { name },
    password
  });

  if (authError) {
    console.error('Error creating user:', authError.message);
  } else {
    console.log('✅ User created in Auth.');
  }

  // Create profile
  const { error: profileError } = await supabase
    .from('profiles')
    .upsert([{
      id: userData?.user?.id,
      email,
      name,
      user_role: 'admin',
      status: 'active',
      oi: 'SS'
    }], { onConflict: 'email' });

  if (profileError) {
    console.error('Error creating profile:', profileError.message);
  } else {
    console.log('✅ Profile created/updated.');
  }
}

addSibghat();
