'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';

export default function Sidebar({ isOpen, onClose }: { isOpen?: boolean, onClose?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, loading } = useAuth();
  const [studioName, setStudioName] = useState('Aktivacity');

  useEffect(() => {
    async function loadStudioName() {
      const { data, error } = await supabase
        .from('workspace_settings')
        .select('name')
        .single();
      
      if (data && !error) {
        setStudioName(data.name);
      }
    }
    loadStudioName();

    const channel = supabase
      .channel('workspace-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'workspace_settings'
        },
        (payload) => {
          if (payload.new.name) {
            setStudioName(payload.new.name);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const role = profile?.user_role || 'admin';

  const allItems = [
    { key: 'dashboard', label: 'Dashboard',        href: '/',              icon: 'i-grid',     roles: ['admin', 'pm'] },
    { key: 'tasks',     label: 'Production Tasks', href: '/tasks',         icon: 'i-list',     roles: ['admin', 'pm', 'member'] },
    { key: 'team',      label: 'Team',             href: '/team',          icon: 'i-users',    roles: ['admin', 'pm'] },
    { key: 'admin',     label: 'Admin Panel',      href: '/admin',         icon: 'i-activity', roles: ['admin'] },
    { key: 'notifs',    label: 'Notifications',    href: '/notifications', icon: 'i-bell',     roles: ['admin', 'pm', 'member'] },
  ];

  const items = allItems.filter((it) => it.roles.includes(role));

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  // Build display name + initials from real profile
  const displayName = profile?.name || 'Studio User';
  const initials = profile?.oi ||
    displayName.split(/\s+/).map((w) => w[0]).join('').toUpperCase().slice(0, 2) ||
    'ME';
  const roleLabel =
    role === 'admin' ? 'Admin' :
    role === 'pm'    ? 'Project Manager' :
                      'Member';

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark" aria-hidden="true" />
        <div className="brand-name">{studioName}</div>
        {onClose && (
          <button className="mobile-close" onClick={onClose} aria-label="Close menu">
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      <div className="nav-section-label">Workspace</div>
      <nav className="nav">
        {items.map((it) => (
          <Link
            key={it.key}
            href={it.href}
            onClick={onClose}
            className={`nav-item ${
              pathname === it.href || (it.href !== '/' && pathname.startsWith(it.href))
                ? 'active'
                : ''
            }`}
          >
            <svg className="icon">
              <use href={`#${it.icon}`} />
            </svg>
            <span>{it.label}</span>
          </Link>
        ))}
      </nav>

      {/* New Task quick action */}
      <div style={{ padding: '12px 0', marginTop: '8px' }}>
        <Link
          href="/tasks/new"
          className="nav-item"
          style={{
            background: 'var(--primary-50)',
            color: 'var(--primary)',
            border: '1px solid rgba(99,102,241,0.2)',
            justifyContent: 'center',
            gap: '6px',
          }}
        >
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path d="M12 5v14M5 12h14" />
          </svg>
          New Task
        </Link>
      </div>

      <div className="sidebar-foot">
        <Link className="settings" href="/settings">
          <svg className="icon" style={{ width: '18px', height: '18px' }}>
            <use href="#i-cog" />
          </svg>
          <span>Settings</span>
        </Link>

        <div className="user-chip">
          {loading ? (
            <div className="avatar" style={{ background: 'var(--surface-light)', color: 'var(--muted)' }}>…</div>
          ) : (
            <div className="avatar">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
              ) : (
                initials
              )}
            </div>
          )}
          <div style={{ flex: 1, lineHeight: 1.15, minWidth: 0, overflow: 'hidden' }}>
            <div className="name" style={{ fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {loading ? 'Loading…' : displayName}
            </div>
            <div className="role" style={{ fontSize: 11, color: 'var(--muted)' }}>
              {loading ? '' : roleLabel}
            </div>
          </div>
          <button
            className="icon-btn"
            title="Sign Out"
            onClick={handleSignOut}
            style={{
              marginLeft: 'auto',
              border: '1px solid var(--border)',
              background: 'none',
              cursor: 'pointer',
              color: 'var(--muted)',
              flexShrink: 0,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
            </svg>
          </button>
        </div>
      </div>
    </aside>
  );
}
