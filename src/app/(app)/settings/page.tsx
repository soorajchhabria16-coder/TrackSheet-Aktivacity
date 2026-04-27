import Topbar from "@/components/Topbar";
import SettingsClient from "./SettingsClient";
import { createServerSupabase } from "@/lib/supabase-server";

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

export default async function SettingsPage() {
  const supabase = createServerSupabase();
  const profiles = await getProfiles(supabase);

  return (
    <>
      <Topbar title="Settings" subtitle="Manage your profile and studio preferences." />
      <SettingsClient teamMembers={profiles} />
    </>
  );
}
