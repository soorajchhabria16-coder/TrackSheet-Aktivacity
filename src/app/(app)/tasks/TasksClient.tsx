'use client';

import { useState, useMemo } from 'react';
import styles from './tasks.module.css';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

interface Task {
  id: string | number;
  title?: string;
  name?: string;
  status: string;
  priority?: string;
  due_date?: string;
  owner?: string;
  department?: string;
}

export default function TasksClient({ initialTasks }: { initialTasks: Task[] }) {
  const [tasks, setTasks] = useState(initialTasks);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('Any');
  const [priorityFilter, setPriorityFilter] = useState('Any');
  const [assigneeFilter, setAssigneeFilter] = useState('Any');

  const todayStr = new Date().toISOString().split('T')[0];
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  const nextWeekStr = nextWeek.toISOString().split('T')[0];

  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      const title = (t.title || t.name || '').toLowerCase();
      const owner = (t.owner || '').toLowerCase();
      const search = searchQuery.toLowerCase();
      const matchesSearch = !search || title.includes(search) || owner.includes(search);

      const status = t.status?.toLowerCase() || 'pending';
      const isOverdue = !!(t.due_date && t.due_date < todayStr && status !== 'completed');
      
      let matchesStatus = true;
      if (statusFilter === 'Overdue') matchesStatus = isOverdue;
      else if (statusFilter === 'Completed') matchesStatus = status === 'completed';
      else if (statusFilter === 'In Progress') matchesStatus = status === 'in-progress' || status === 'doing';
      else if (statusFilter === 'Pending') matchesStatus = status === 'pending' || status === 'todo';

      const priority = (t.priority || 'medium').toLowerCase();
      const matchesPriority = priorityFilter === 'Any' || priority === priorityFilter.toLowerCase();

      const matchesAssignee = assigneeFilter === 'Any' || t.owner === assigneeFilter;

      return matchesSearch && matchesStatus && matchesPriority && matchesAssignee;
    });
  }, [tasks, searchQuery, statusFilter, priorityFilter, assigneeFilter, todayStr]);

  const buckets = useMemo(() => {
    const b = {
      ov: [] as Task[],
      td: [] as Task[],
      wk: [] as Task[],
      lt: [] as Task[],
      dn: [] as Task[],
    };

    filteredTasks.forEach(t => {
      const status = t.status?.toLowerCase() || 'pending';
      if (status === 'completed') {
        b.dn.push(t);
      } else if (t.due_date && t.due_date < todayStr) {
        b.ov.push(t);
      } else if (t.due_date === todayStr) {
        b.td.push(t);
      } else if (t.due_date && t.due_date <= nextWeekStr) {
        b.wk.push(t);
      } else {
        b.lt.push(t);
      }
    });
    return b;
  }, [filteredTasks, todayStr, nextWeekStr]);

  const totalCount = filteredTasks.length;
  const overdueCount = buckets.ov.length;
  const doneCount = buckets.dn.length;

  const barClass = overdueCount === 0 ? styles.calm : (overdueCount <= 3 ? styles.warn : styles.critical);

  const uniqueAssignees = Array.from(new Set(initialTasks.map(t => t.owner).filter(Boolean)));

  const handleMarkComplete = async (e: React.MouseEvent, taskId: string | number) => {
    e.stopPropagation();
    e.preventDefault();

    try {
      const { error } = await supabase
        .from('tasks')
        .update({ status: 'completed' })
        .eq('id', taskId);

      if (!error) {
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'completed' } : t));
      } else {
        console.error('Failed to mark task as complete:', error);
      }
    } catch (error) {
      console.error('Error marking task as complete:', error);
    }
  };

  return (
    <div className={styles.tasksWrapper}>
      {/* \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 HERO STATUS BAR \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 */}
      <div className={`${styles.heroBar} ${barClass}`}>
        <div className={styles.heroInner}>
          <div className={styles.heroEyebrow}>
            {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
          <div className={styles.heroStats}>
            <div className={`${styles.statBlock} ${styles.total}`}>
              <span className={styles.num}>{totalCount}</span>
              <span className={styles.label}>Tasks</span>
            </div>
            <span className={styles.statSep}>\u00b7</span>
            <div className={`${styles.statBlock} ${styles.overdue}`}>
              <span className={styles.num}>{overdueCount}</span>
              <span className={styles.label}>Overdue</span>
            </div>
            <span className={styles.statSep}>\u00b7</span>
            <div className={`${styles.statBlock} ${styles.done}`}>
              <span className={styles.num}>{doneCount}</span>
              <span className={styles.label}>Done</span>
            </div>
          </div>
          <div className={styles.heroLegend}>
            <span className={styles.legItem}><span className={`${styles.legDot} ${styles.r}`}></span>Overdue</span>
            <span className={styles.legItem}><span className={`${styles.legDot} ${styles.a}`}></span>Due Soon</span>
            <span className={styles.legItem}><span className={`${styles.legDot} ${styles.e}`}></span>Done</span>
            <span className={styles.legItem}><span className={`${styles.legDot} ${styles.b}`}></span>In Progress</span>
          </div>
        </div>
      </div>

      {/* \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 FILTER BAR \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 */}
      <div className={styles.filterZone}>
        <div className={styles.filterSentence}>
          <span className={styles.fConnector}>Show tasks</span>
          <span className={styles.fConnector}>\u00b7</span>
          <span className={styles.fConnector}>status</span>

          <div className={`${styles.fToken} ${statusFilter !== 'Any' ? styles.on : ''}`}>
            <span>{statusFilter}</span>
            <span className={styles.caret}>\u25be</span>
            <select aria-label="Filter by status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="Any">Any</option>
              <option value="Overdue">Overdue</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
              <option value="Pending">Pending</option>
            </select>
          </div>

          <span className={styles.fConnector}>\u00b7</span>
          <span className={styles.fConnector}>priority</span>

          <div className={`${styles.fToken} ${priorityFilter !== 'Any' ? styles.on : ''}`}>
            <span>{priorityFilter}</span>
            <span className={styles.caret}>\u25be</span>
            <select aria-label="Filter by priority" value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
              <option value="Any">Any</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>

          <span className={styles.fConnector}>\u00b7</span>
          <span className={styles.fConnector}>assigned to</span>

          <div className={`${styles.fToken} ${assigneeFilter !== 'Any' ? styles.on : ''}`}>
            <span>{assigneeFilter === 'Any' ? 'Anyone' : assigneeFilter}</span>
            <span className={styles.caret}>\u25be</span>
            <select aria-label="Filter by assignee" value={assigneeFilter} onChange={(e) => setAssigneeFilter(e.target.value)}>
              <option value="Any">Anyone</option>
              {uniqueAssignees.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className={styles.filterRight}>
          <div className={styles.crSearch}>
            <svg className={styles.si} width="13" height="13">
              <use href="#i-search" />
            </svg>
            <input 
              type="text" 
              placeholder="Search tasks\u2026" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button className={styles.rstBtn} onClick={() => {
            setSearchQuery('');
            setStatusFilter('Any');
            setPriorityFilter('Any');
            setAssigneeFilter('Any');
          }}>Reset</button>
        </div>
      </div>

      {/* \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 TIMELINE \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 */}
      <div className={styles.tlSection}>
        <div className={styles.secLabel}>Timeline View</div>
        <div className={styles.lanes}>
          {[
            { key: 'ov', cls: styles.lnOv, label: 'Overdue', items: buckets.ov },
            { key: 'td', cls: styles.lnTd, label: 'Today', items: buckets.td },
            { key: 'wk', cls: styles.lnWk, label: 'This Week', items: buckets.wk },
            { key: 'lt', cls: styles.lnLt, label: 'Later', items: buckets.lt },
            { key: 'dn', cls: styles.lnDn, label: 'Completed', items: buckets.dn },
          ].map(({ key, cls, label, items }) => (
            items.length > 0 || key !== 'dn' ? (
              <div key={key} className={`${styles.lane} ${cls}`}>
                <div className={styles.laneHead}>
                  <span className={styles.laneName}>{label}</span>
                  <span className={styles.laneCnt}>{items.length}</span>
                </div>
                <div className={styles.cardsRow}>
                  {items.length === 0 ? (
                    <div className={styles.laneNil}>All clear.</div>
                  ) : (
                    items.map((t, index) => (
                      <TaskCard key={t.id} t={t} index={index} onMarkComplete={(e) => handleMarkComplete(e, t.id)} />
                    ))
                  )}
                </div>
              </div>
            ) : null
          ))}
        </div>
      </div>
    </div>
  );
}

function TaskCard({ t, index, onMarkComplete }: { t: Task, index: number, onMarkComplete: (e: React.MouseEvent) => void }) {
  const status = t.status?.toLowerCase() || 'pending';
  const priority = (t.priority || 'medium').toLowerCase();
  const initials = t.owner ? t.owner.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '??';
  
  const getGrad = (oi: string) => {
    const grads: Record<string, string> = {
      'SH': 'linear-gradient(135deg,#F472B6,#DB2777)',
      'SB': 'linear-gradient(135deg,#FBBF24,#D97706)',
      'TM': 'linear-gradient(135deg,#34D399,#059669)',
      'IN': 'linear-gradient(135deg,#60A5FA,#2563EB)',
    };
    return grads[oi] || 'linear-gradient(135deg,#6B7FD7,#4B5EAA)';
  };

  return (
    <Link 
      href={`/tasks/${t.id}`} 
      className={`${styles.tcard} hover-glow`}
      style={{ '--d': `${index * 0.05}s` } as React.CSSProperties}
    >
      <div className={styles.cardBodyTop}>
        <div className={styles.cardChips}>
          <span className={`${styles.chip} ${status === 'completed' ? styles.dn : (status === 'in-progress' ? styles.ip : styles.ov)}`}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </span>
          <span className={`${styles.chip} ${priority === 'high' ? styles.hi : (priority === 'medium' ? styles.med : styles.lo)}`}>
            {priority.charAt(0).toUpperCase() + priority.slice(1)}
          </span>
        </div>
        <div className={styles.cardTitle}>{t.title || t.name}</div>
        <div className={styles.cardWho}>
          <div className={styles.cardAssignee}>
            <div className={`${styles.cava} ${styles[`grad${initials}`] || styles.gradDef}`}>{initials}</div>
            {t.owner || 'Unassigned'}
          </div>
          {status !== 'completed' && (
            <button 
              className={styles.markDoneBtn}
              onClick={onMarkComplete}
              title="Mark as complete"
            >
              <svg width="14" height="14">
                <use href="#i-check" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </Link>
  );
}
