import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// --- CONFIGURATION ---
// Replace with your Service Role Key from Supabase Dashboard > Settings > API
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndndHFtcGJpZ3lzY25maWhuYWJtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjcxNjAwMiwiZXhwIjoyMDkyMjkyMDAyfQ._ViHN4EE9p3XzjrwA3tkgHs8PeYtzHLNqEp86EDs6tw'; 
const SUPABASE_URL = 'https://wgtqmpbigyscnfihnabm.supabase.co';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function importData() {
  console.log('🚀 Starting import...');

  // 1. IMPORT USERS
  const usersCsv = fs.readFileSync(path.join(__dirname, '../src/lib/Users.csv'), 'utf8');
  const userLines = usersCsv.split('\n').slice(1).filter(l => l.trim());

  console.log(`👥 Importing ${userLines.length} users...`);

  for (const line of userLines) {
    // Basic CSV split (handles simple cases, for complex CSVs use a library)
    const [email, name, avatar, role] = line.split(',');
    
    if (!email) continue;

    console.log(`Processing user: ${email}`);

    // Create User in Supabase Auth
    const { data: userData, error: authError } = await supabase.auth.admin.createUser({
      email: email.trim(),
      email_confirm: true,
      user_metadata: { name: name.trim() },
      password: 'TemporaryPassword123!' // User should reset this
    });

    if (authError) {
      if (authError.message.includes('already exists')) {
        console.log(`User ${email} already exists in Auth.`);
      } else {
        console.error(`Error creating user ${email}:`, authError.message);
      }
    }

    // Update Profile
    const userRole = role?.includes('Boss') ? 'Admin' : (role?.includes('Manager') ? 'PM' : 'Member');
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        name: name.trim(),
        avatar_url: avatar.trim(),
        user_role: userRole,
        status: 'active'
      })
      .eq('email', email.trim());

    if (profileError) {
      console.error(`Error updating profile for ${email}:`, profileError.message);
    }
  }

  // 2. IMPORT TASKS
  const tasksCsv = fs.readFileSync(path.join(__dirname, '../src/lib/Tasks.csv'), 'utf8');
  const taskLines = tasksCsv.split('\n').slice(1).filter(l => l.trim());

  console.log(`📝 Importing ${taskLines.length} tasks...`);

  const tasksToInsert = taskLines.map(line => {
    const parts = line.split(',');
    const title = parts[0]?.trim() || '';
    let kind = 'web';
    if (title.toLowerCase().includes('portfolio')) kind = 'portfolio';
    else if (title.toLowerCase().includes('banner')) kind = 'banner';
    else if (title.toLowerCase().includes('ad creative') || title.toLowerCase().includes('images (')) kind = 'ads';
    else if (title.toLowerCase().includes('social media')) kind = 'social';

    return {
      title: title,
      description: parts[1]?.trim(), // Mapped to description column in DB
      department: parts[2]?.trim(),
      due_date: parts[4]?.trim() || null,
      status: parts[5]?.trim()?.toLowerCase().replace(' ', '-') || 'pending',
      priority: parts[6]?.trim()?.toLowerCase() || 'medium',
      owner: parts[10]?.trim(), // Using email as owner identifier
      kind: kind
    };
  });

  const { error: tasksError } = await supabase
    .from('tasks')
    .insert(tasksToInsert);

  if (tasksError) {
    console.error('Error inserting tasks:', tasksError.message);
  } else {
    console.log('✅ Tasks imported successfully!');
  }

  console.log('🏁 Import finished.');
}

importData();
