'use client';

import { useMemo } from 'react';
import styles from './dashboard.module.css';
import Link from 'next/link';

interface Task {
  id: string | number;
  title?: string;
  name?: string;
  status: string;
  priority?: string;
  due_date?: string;
  owner?: string;
  department?: string;
  updated_at?: string;
}

export default function DashboardClient({ tasks }: { tasks: Task[] }) {
  const todayStr = new Date().toISOString().split('T')[0];

  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'completed').length;
    const overdue = tasks.filter(t => t.status !== 'completed' && t.due_date && t.due_date < todayStr).length;
    return { total, completed, overdue };
  }, [tasks, todayStr]);

  // Throughput Data (Last 7 Days)
  const throughputData = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dStr = d.toISOString().split('T')[0];
      const count = tasks.filter(t => t.status === 'completed' && t.updated_at && t.updated_at.startsWith(dStr)).length;
      days.push({
        label: d.toLocaleDateString('en-GB', { weekday: 'short' }),
        value: count
      });
    }
    const max = Math.max(...days.map(d => d.value), 1);
    return days.map(d => ({ ...d, height: (d.value / max) * 100 }));
  }, [tasks]);

  // Department Data
  const deptData = useMemo(() => {
    const depts: Record<string, number> = {};
    tasks.forEach(t => {
      const d = t.department || 'Design';
      depts[d] = (depts[d] || 0) + 1;
    });
    
    const colors = ['#6366F1', '#0EA5E9', '#10B981', '#F59E0B', '#EF4444'];
    return Object.entries(depts).map(([label, value], i) => ({
      label,
      value,
      color: colors[i % colors.length]
    })).sort((a, b) => b.value - a.value);
  }, [tasks]);

  const totalDeptTasks = useMemo(() => deptData.reduce((acc, curr) => acc + curr.value, 0), [deptData]);

  return (
    <div className={styles.content}>
      <section className={styles.hero}>
        <div className={`${styles.alertCard} ${stats.overdue > 0 ? styles.critical : ''} glass`}>
          <div className={`${styles.alertTag} ${stats.overdue > 0 ? styles.critical : ''}`}>
             {stats.overdue > 0 ? 'Risk Alert' : '✓ All on track'}
          </div>
          <div>
            <div className={`${styles.alertNum} ${stats.overdue > 0 ? styles.critical : ''}`}>
              {stats.overdue}
              <small>tasks overdue</small>
            </div>
            <div className={styles.alertBottom}>
              <p className={styles.alertP}>
                {stats.overdue > 0 
                  ? `${stats.overdue} tasks are behind schedule. High risk to production timeline.` 
                  : 'All systems green. Your studio is running at peak efficiency.'}
              </p>
              <Link href="/tasks" className="btn btn-primary btn-sm">
                View Tasks
              </Link>
            </div>
          </div>
        </div>

        <div className={`${styles.todayCard} glass`}>
          <div className={styles.todayHead}>
            <span className={styles.todayDate}>{new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
          </div>
          <div>
            <h2 className={styles.todayTitle}>At a glance</h2>
            <p className={styles.todayStatP}>Live studio snapshot.</p>
          </div>
          <div className={styles.todayRow}>
            <div className={styles.todayStat}>
              <div className={styles.todayNum}>{stats.total}</div>
              <small className={styles.todayStatSmall}>Total tasks</small>
            </div>
            <div className={styles.todayStat}>
              <div className={`${styles.todayNum} ${styles.todayStatSuccess}`}>{stats.completed}</div>
              <small className={styles.todayStatSmall}>Completed</small>
            </div>
            <div className={styles.todayStat}>
              <div className={`${styles.todayNum} ${styles.todayStatDanger}`}>{stats.overdue}</div>
              <small className={styles.todayStatSmall}>Overdue</small>
            </div>
          </div>
        </div>
      </section>

      <div className={styles.quickActionsGrid}>
        <Link href="/tasks/new" className={styles.actionBtn}>
          <div className={`${styles.actionIcon} ${styles.iconPrimary}`}>
            <svg width="20" height="20"><use href="#i-zap" /></svg>
          </div>
          <div>
            <span className={styles.actionLabel}>New Task</span>
            <span className={styles.actionSub}>Quick Create</span>
          </div>
        </Link>
        <Link href="/tasks" className={styles.actionBtn}>
          <div className={`${styles.actionIcon} ${styles.iconSecondary}`}>
            <svg width="20" height="20"><use href="#i-briefcase" /></svg>
          </div>
          <div>
            <span className={styles.actionLabel}>Production</span>
            <span className={styles.actionSub}>Manage Tasks</span>
          </div>
        </Link>
        <Link href="/team" className={styles.actionBtn}>
          <div className={`${styles.actionIcon} ${styles.iconSuccess}`}>
            <svg width="20" height="20"><use href="#i-users" /></svg>
          </div>
          <div>
            <span className={styles.actionLabel}>Team View</span>
            <span className={styles.actionSub}>Check Availability</span>
          </div>
        </Link>
        <Link href="/settings" className={styles.actionBtn}>
          <div className={`${styles.actionIcon} ${styles.iconDefault}`}>
            <svg width="20" height="20"><use href="#i-cog" /></svg>
          </div>
          <div>
            <span className={styles.actionLabel}>Settings</span>
            <span className={styles.actionSub}>Studio Defaults</span>
          </div>
        </Link>
      </div>

      <div className={styles.grid2}>
        <div className={styles.chartCard}>
          <h3>Weekly Throughput</h3>
          <p className={styles.chartSub}>Completed tasks over the last 7 days.</p>
          <div className={styles.barChart}>
            {throughputData.map((d, i) => (
              <div key={i} className={styles.barCol}>
                <div className={styles.barVal}>{d.value}</div>
                <div 
                  className={styles.bar} 
                  style={{ 
                    '--h': `${d.height}%`, 
                    '--d': `${i * 0.1}s` 
                  } as React.CSSProperties}
                ></div>
                <div className={styles.barLabel}>{d.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.chartCard}>
          <h3>Department Load</h3>
          <p className={styles.chartSub}>Active tasks across design verticals.</p>
          <div className={styles.donutArea}>
            <svg className={styles.donutSvg} viewBox="0 0 100 100">
              <circle className={styles.donutTrack} cx="50" cy="50" r="40" />
              {deptData.reduce<{ totalPct: number, elements: React.ReactNode[] }>((acc, curr, i) => {
                const pct = (curr.value / totalDeptTasks) * 100;
                const offset = acc.totalPct;
                acc.totalPct += pct;
                return {
                  totalPct: acc.totalPct,
                  elements: [
                    ...acc.elements,
                    <circle 
                      key={i}
                      className={styles.donutSegment}
                      cx="50" cy="50" r="40"
                      stroke={curr.color}
                      style={{ 
                        '--pct': pct, 
                        '--off': -offset 
                      } as React.CSSProperties}
                    />
                  ]
                };
              }, { totalPct: 0, elements: [] }).elements}
            </svg>
            <div className={styles.donutLegends}>
              {deptData.map((d, i) => (
                <div key={i} className={styles.legItem}>
                  <span className={styles.legDot} style={{ '--bg': d.color } as React.CSSProperties}></span>
                  <span>{d.label}</span>
                  <b>{d.value}</b>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
