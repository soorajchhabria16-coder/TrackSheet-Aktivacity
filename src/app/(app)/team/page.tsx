import Topbar from "@/components/Topbar";
import styles from "./team.module.css";
import { createServerSupabase } from "@/lib/supabase-server";

export const revalidate = 0;

async function getProfiles() {
  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from('profiles')
    .select('*');
  
  if (error) {
    console.error("Failed to fetch profiles:", error);
    return [];
  }
  return data || [];
}

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

export default async function TeamPage() {
  const profiles = await getProfiles();
  const tasks = await getTasks();

  const getStats = (profileName: string) => {
    const userTasks = tasks.filter((t: { owner?: string }) => t.owner === profileName);
    const overdue = userTasks.filter((t: { status: string; due_date?: string }) => {
        const todayStr = new Date().toISOString().split('T')[0];
        return t.status !== 'completed' && t.due_date && t.due_date < todayStr;
    }).length;
    const completed = userTasks.filter((t: { status: string }) => t.status === 'completed').length;
    return { total: userTasks.length, overdue, completed };
  };

  const teamSize = profiles.length;
  const totalOpenTasks = tasks.filter((t: { status: string }) => t.status !== 'completed').length;
  const avgTasks = teamSize > 0 ? (totalOpenTasks / teamSize).toFixed(1) : 0;
  
  const profileStats = profiles.map((p: { name: string }) => ({ name: p.name, ...getStats(p.name) }));
  const highestLoadUser = profileStats.sort((a: { total: number }, b: { total: number }) => b.total - a.total)[0];
  
  const completedThisWeek = tasks.filter((t: { status: string; updated_at?: string }) => {
    if (t.status !== 'completed' || !t.updated_at) return false;
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return new Date(t.updated_at) > weekAgo;
  }).length;

  return (
    <>
      <Topbar title="Team" subtitle="Six designers across production. Balance load, surface overdue risk." />
      <div className={styles.content}>
        
        <div className={styles.teamSummary}>
          <div className={styles.miniKpi}>
            <div className={styles.lbl}>Team size</div>
            <div className={styles.val}>{teamSize}</div>
            <div className={styles.cap}>All active members</div>
          </div>
          <div className={styles.miniKpi}>
            <div className={styles.lbl}>Avg. open tasks / person</div>
            <div className={styles.val}>{avgTasks}</div>
            <div className={styles.cap}>Workload distribution</div>
          </div>
          <div className={styles.miniKpi}>
            <div className={styles.lbl}>Highest load</div>
            <div className={styles.val}>{highestLoadUser?.name || '—'}</div>
            <div className={styles.cap}>{highestLoadUser?.total || 0} active tasks</div>
          </div>
          <div className={styles.miniKpi}>
            <div className={styles.lbl}>Completed this week</div>
            <div className={styles.val}>{completedThisWeek}</div>
            <div className={styles.cap}>Velocity tracking</div>
          </div>
        </div>

        <div className={styles.grid}>
          {profiles.map((p: { id: string | number; name: string; role?: string; email: string }) => {
            const stats = getStats(p.name);
            const initials = p.name ? p.name.slice(0, 2).toUpperCase() : '??';
            const loadPct = Math.min(100, (stats.total / 5) * 100);
            
            return (
              <article key={p.id} className={styles.personCard}>
                <div className={styles.pcTop}>
                  <div className={styles.avatar}>{initials}</div>
                  <div className={styles.pcInfo}>
                    <div className={styles.name}>{p.name}</div>
                    <div className={styles.role}>{p.role || 'Production Designer'}</div>
                    <div className={styles.email}>{p.email}</div>
                  </div>
                  <span className={`${styles.pcStatus} ${stats.overdue > 0 ? styles.red : styles.green}`}>
                    <span className={styles.sw}></span> {stats.overdue > 0 ? `${stats.overdue} overdue` : 'On track'}
                  </span>
                </div>
                <div className={styles.pcStats}>
                  <div className={styles.cell}><span className={styles.num}>{stats.total}</span><span className={styles.lbl}>Assigned</span></div>
                  <div className={styles.cell}><span className={`${styles.num} ${styles.redNum}`}>{stats.overdue}</span><span className={styles.lbl}>Overdue</span></div>
                  <div className={styles.cell}><span className={`${styles.num} ${styles.greenNum}`}>{stats.completed}</span><span className={styles.lbl}>Done</span></div>
                </div>
                <div className={styles.pcLoad}>
                    <div className={styles.lhead}><span>Current load</span><span><b>{stats.total}</b> of 5 slots</span></div>
                    <div className={styles.wbar}>
                        <div 
                          className={styles.seg} 
                          style={{ '--w': `${loadPct}%` } as React.CSSProperties}
                        ></div>
                    </div>
                </div>
                <div className={styles.pcFoot}>
                    <button className="btn btn-ghost btn-sm">Message</button>
                    <button className="btn btn-ghost btn-sm">Assign Task</button>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </>
  );
}
