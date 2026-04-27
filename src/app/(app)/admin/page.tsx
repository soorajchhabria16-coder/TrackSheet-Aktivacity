import Topbar from '@/components/Topbar';
import AdminClient from './AdminClient';
import { createServerSupabase } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';

export const revalidate = 0;

async function getProfiles(supabase: any) {
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
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Check if user is admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('user_role')
    .eq('id', user.id)
    .single();

  if (profile?.user_role !== 'admin') {
    redirect('/');
  }

  const profiles = await getProfiles(supabase);
  return (
    <>
      <Topbar title="Admin Panel" subtitle="Manage users, roles, and access." />
      <AdminClient initialProfiles={profiles} />
    </>
  );
}
