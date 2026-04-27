import Topbar from '@/components/Topbar';
import AdminClient from './AdminClient';
import { createServerSupabase } from '@/lib/supabase-server';

export const revalidate = 0;

async function getProfiles() {
  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('name', { ascending: true });
  
  if (error) {
    console.error("Failed to fetch profiles:", error);
    return [];
  }
  return data || [];
}

export default async function AdminPage() {
  const profiles = await getProfiles();
  return (
    <>
      <Topbar title="Admin Panel" subtitle="Manage users, roles, and access." />
      <AdminClient initialProfiles={profiles} />
    </>
  );
}
