'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { useMobileNav } from '@/lib/mobile-nav-context';

export default function Topbar({ title, subtitle }: { title: string; subtitle: string }) {
  const { profile, loading } = useAuth();
  const { toggleSidebar } = useMobileNav();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!profile) return;

    async function fetchUnreadCount() {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', profile?.id)
        .eq('read', false);
      
      if (!error && count !== null) {
        setUnreadCount(count);
      }
    }

    fetchUnreadCount();

    const channel = supabase
      .channel(`notifs-${profile?.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${profile?.id}`
        },
        () => {
          fetchUnreadCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile]);

  const initials = profile?.oi ||
    (profile?.name?.split(/\s+/).map((w) => w[0]).join('').toUpperCase().slice(0, 2)) ||
    'ME';

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button 
          className="mobile-menu-btn" 
          onClick={toggleSidebar} 
          aria-label="Open menu"
        >
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <div className="greeting">
          <h1 className="display">{title}</h1>
          <p>{subtitle}</p>
        </div>
      </div>
      <div className="topbar-right">
        <Link
          className="icon-btn"
          aria-label="Notifications"
          href="/notifications"
          style={{ position: 'relative' }}
          id="notif-btn"
        >
          <svg width="16" height="16">
            <use href="#i-bell" />
          </svg>
          {unreadCount > 0 && (
            <span className="notif-badge">{unreadCount}</span>
          )}
        </Link>
        <Link href="/settings" className="account" aria-label="Account settings">
          <div className="avatar" title={loading ? 'Loading…' : (profile?.name || 'User')}>
            {loading ? '…' : initials}
          </div>
          <svg width="14" height="14" className="caret">
            <use href="#i-chev-down" />
          </svg>
        </Link>
      </div>
    </header>
  );
}
