'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';

import styles from './notifications.module.css';

interface Task {
  id: string;
  title?: string;
  name?: string;
  status: string;
  priority?: string;
  due_date?: string;
  owner?: string;
  updated_at?: string;
  created_at?: string;
}

interface Notification {
  id: string;
  user_id: string;
  task_id?: string;
  type: 'status_change' | 'comment' | 'assigned' | 'overdue';
  message: string;
  read: boolean;
  created_at: string;
  tasks?: {
    title?: string;
    name?: string;
    due_date?: string;
  } | null;
}

function timeAgo(dateStr?: string): string {
  if (!dateStr) return 'recently';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function getNotifIcon(type: string) {
  if (type === 'status_change') return { icon: 'progress', cls: styles.iconProgress };
  if (type === 'comment') return { icon: 'new', cls: styles.iconNew };
  if (type === 'assigned') return { icon: 'new', cls: styles.iconNew };
  if (type === 'overdue') return { icon: 'alert', cls: styles.iconOverdue };
  return { icon: 'new', cls: styles.iconNew };
}

export default function NotificationsClient({ 
  tasks, 
  initialNotifications = [] 
}: { 
  tasks: Task[], 
  initialNotifications?: Notification[] 
}) {
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);

  useEffect(() => {
    if (!profile) return;

    const channel = supabase
      .channel(`notif-feed-${profile.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${profile.id}`
        },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            const { data: taskData } = payload.new.task_id 
              ? await supabase.from('tasks').select('title,name,due_date').eq('id', payload.new.task_id).single()
              : { data: null };

            const newN: Notification = {
              ...payload.new as Notification,
              tasks: taskData as Notification['tasks']
            };
            setNotifications(prev => [newN, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setNotifications(prev => prev.map(n => n.id === payload.new.id ? { ...n, ...payload.new } : n));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile]);

  const markAsRead = async (id: string) => {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id);
    
    if (!error) {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    }
  };

  const markAllAsRead = async () => {
    if (!profile) return;
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', profile.id)
      .eq('read', false);
    
    if (!error) {
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    }
  };
  const todayStr = new Date().toISOString().split('T')[0];

  const overdueCount = tasks.filter(
    (t) => t.status !== 'completed' && t.due_date && t.due_date < todayStr
  ).length;

  const completedRecently = tasks.filter((t) => {
    if (t.status !== 'completed' || !t.updated_at) return false;
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return new Date(t.updated_at) > weekAgo;
  }).length;

  return (
    <div className="content">
      {/* Summary row */}
      <div className={styles.summaryRow}>
        {overdueCount > 0 && (
          <div className={`${styles.alertBanner} ${styles.alertDanger}`}>
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" />
            </svg>
            <strong>{overdueCount} task{overdueCount !== 1 ? 's' : ''} overdue</strong> — action required
          </div>
        )}
        {completedRecently > 0 && (
          <div className={`${styles.alertBanner} ${styles.alertSuccess}`}>
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path d="M20 6L9 17l-5-5" />
            </svg>
            <strong>{completedRecently} task{completedRecently !== 1 ? 's' : ''} completed</strong> this week
          </div>
        )}
        {overdueCount === 0 && completedRecently === 0 && (
          <div className={`${styles.alertBanner} ${styles.alertNeutral}`}>
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path d="M20 6L9 17l-5-5" />
            </svg>
            All tasks are on track
          </div>
        )}
      </div>

      {/* Activity feed */}
      <div className={styles.feedCard}>
        <div className={styles.feedHeader}>
          <div className={styles.feedTitleWrap}>
            <span className={styles.feedTitle}>Activity Feed</span>
            <span className={styles.feedSub}>{notifications.length} notifications</span>
          </div>
          {notifications.some(n => !n.read) && (
            <button className="btn btn-ghost btn-xs" onClick={markAllAsRead}>Mark all as read</button>
          )}
        </div>

        {notifications.length === 0 ? (
          <div className={styles.emptyState}>No recent activity to display.</div>
        ) : (
          <div className={styles.feedList}>
            {notifications.map((n) => {
              const { icon, cls } = getNotifIcon(n.type);
              const isUnread = !n.read;

              return (
                <div
                  key={n.id}
                  className={`${styles.feedItem} ${isUnread ? styles.unread : ''}`}
                  onClick={() => !n.read && markAsRead(n.id)}
                >
                  {/* Icon */}
                  <div className={`${styles.feedIcon} ${cls}`}>
                    {icon === 'check' && (
                      <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5" /></svg>
                    )}
                    {icon === 'alert' && (
                      <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
                    )}
                    {icon === 'progress' && (
                      <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                    )}
                    {icon === 'new' && (
                      <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
                    )}
                  </div>

                  {/* Content */}
                  <div className={styles.feedContent}>
                    <div className={styles.feedMsg}>
                      <span className={styles.feedVerb}>{n.message}</span>
                    </div>
                    {n.task_id && (
                      <div className={styles.feedMeta}>
                        <Link href={`/tasks/${n.task_id}`} className={styles.taskLink}>
                          View Task
                        </Link>
                      </div>
                    )}
                  </div>

                  {/* Time */}
                  <div className={styles.feedTime}>
                    {timeAgo(n.created_at)}
                  </div>
                  {isUnread && <div className={styles.unreadDot} />}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
