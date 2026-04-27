import Topbar from "@/components/Topbar";
import TasksClient from "./TasksClient";
import { createServerSupabase } from "@/lib/supabase-server";

export const revalidate = 0;

async function getTasks() {
  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .order('due_date', { ascending: true });
  
  if (error) {
    console.error("Failed to fetch tasks:", error);
    return [];
  }
  return data || [];
}

export default async function ProductionTasks() {
  const tasks = await getTasks();

  return (
    <>
      <Topbar title="Production Tasks" subtitle="Current workloads and timelines." />
      <TasksClient initialTasks={tasks} />
    </>
  );
}
