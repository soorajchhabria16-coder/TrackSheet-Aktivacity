import Topbar from "@/components/Topbar";
import { createServerSupabase } from "@/lib/supabase-server";
import DashboardClient from "./DashboardClient";

export const revalidate = 0;

async function getTasks() {
  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from('tasks')
    .select('*');
  
  if (error) {
    console.error("Failed to fetch tasks:", error);
    return [];
  }
  return data || [];
}

export default async function DashboardPage() {
  const tasks = await getTasks();
  
  const dateStr = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  return (
    <>
      <Topbar title="Dashboard" subtitle={`${dateStr} · Studio pulse.`} />
      <DashboardClient tasks={tasks} />
    </>
  );
}
