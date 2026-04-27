import Topbar from "@/components/Topbar";
import TaskDetailClient from "./TaskDetailClient";
import { createServerSupabase } from "@/lib/supabase-server";

export const revalidate = 0;

async function getTask(id: string) {
  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) {
    console.error("Failed to fetch task:", error);
    return null;
  }
  return data;
}

async function getComments(taskId: string) {
  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from('comments')
    .select('*,profiles(id,name)')
    .eq('task_id', taskId)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error("Failed to fetch comments:", error);
    return [];
  }
  return data || [];
}

async function getProfiles() {
  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from('profiles')
    .select('id,name,email,user_role,department');
  
  if (error) {
    console.error("Failed to fetch profiles:", error);
    return [];
  }
  return data || [];
}

async function getAttachments(taskId: string) {
  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from('task_attachments')
    .select('*,profiles(id,name)')
    .eq('task_id', taskId)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error("Failed to fetch attachments:", error);
    return [];
  }
  return data || [];
}

export default async function TaskPage({ params }: { params: { id: string } }) {
  const task = await getTask(params.id);
  const initialComments = await getComments(params.id);
  const initialAttachments = await getAttachments(params.id);
  const profiles = await getProfiles();

  if (!task) {
    return (
      <>
        <Topbar title="Task Not Found" subtitle="The requested task could not be located." />
        <div className="content">
          <div className="empty-state">Task not found.</div>
        </div>
      </>
    );
  }

  return (
    <>
      <Topbar title="Task Detail" subtitle="Update status, add notes, and collaborate." />
      <TaskDetailClient 
        task={task} 
        initialComments={initialComments} 
        initialAttachments={initialAttachments}
        profiles={profiles} 
      />
    </>
  );
}
