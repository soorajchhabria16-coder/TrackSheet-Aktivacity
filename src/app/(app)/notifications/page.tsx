import Topbar from '@/components/Topbar';
import NotificationsClient from './NotificationsClient';
import { createServerSupabase } from '@/lib/supabase-server';

export const revalidate = 0;

async function getRecentTasks(supabase: any) {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(50);
  
  if (error) {
    console.error("Failed to fetch recent tasks:", error);
    return [];
  }
  return data || [];
}

async function getNotifications(supabase: any) {
  const { data, error } = await supabase
    .from('notifications')
    .select('*, tasks(title, name, due_date)')
    .order('created_at', { ascending: false })
    .limit(50);
  
  if (error) {
    console.error("Failed to fetch notifications:", error);
    return [];
  }
  return data || [];
}

export default async function NotificationsPage() {
  const supabase = createServerSupabase();
  const [tasks, notifications] = await Promise.all([
    getRecentTasks(supabase),
    getNotifications(supabase)
  ]);

  return (
    <>
      <Topbar title="Notifications" subtitle="Recent activity and alerts." />
      <NotificationsClient tasks={tasks} initialNotifications={notifications} />
    </>
  );
}
