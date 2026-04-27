import Topbar from '@/components/Topbar';
import NewTaskClient from './NewTaskClient';
import { createServerSupabase } from '@/lib/supabase-server';

export const revalidate = 0;

async function getProfiles() {
  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from('profiles')
    .select('id,name,oi')
    .order('name', { ascending: true });
  
  if (error) {
    console.error("Failed to fetch profiles:", error);
    return [];
  }
  return data || [];
}

export default async function NewTaskPage() {
  const profiles = await getProfiles();
  return (
    <>
      <Topbar title="New Task" subtitle="Initialize a new production item." />
      <NewTaskClient profiles={profiles} />
    </>
  );
}
