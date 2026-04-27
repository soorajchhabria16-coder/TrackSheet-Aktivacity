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

  let { data: userData, error: authError } = await supabase.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { name },
    password
  });

  let userId = userData?.user?.id;

  if (authError) {
    if (authError.message.includes('already been registered')) {
      console.log('ℹ️ User already exists in Auth. Fetching ID...');
      const { data: existingUser, error: fetchError } = await supabase.auth.admin.listUsers();
      const user = existingUser?.users.find(u => u.email === email);
      if (user) {
        userId = user.id;
        console.log(`✅ Found existing user ID: ${userId}`);
      } else {
        console.error('❌ Could not find existing user in list.');
        return;
      }
    } else {
      console.error('❌ Error creating user:', authError.message);
      return;
    }
  } else {
    console.log('✅ User created in Auth.');
  }

  // Create/Update profile
  const { error: profileError } = await supabase
    .from('profiles')
    .upsert([{
      id: userId,
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
