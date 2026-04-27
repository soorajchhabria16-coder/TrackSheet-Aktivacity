'use client';

import { useState } from 'react';
import styles from './admin.module.css';
import { supabase } from '@/lib/supabase';

interface Profile {
  id: string | number;
  name?: string;
  email?: string;
  oi?: string;
  department?: string;
  user_role?: string;
  status?: string;
}

function roleLabel(r: string | undefined) {
  if (r === 'admin') return 'Admin';
  if (r === 'pm') return 'Project Manager';
  return 'Member';
}

function getInitials(p: Profile) {
  if (p.oi) return p.oi.slice(0, 2).toUpperCase();
  const name = p.name || p.email || '?';
  return name.split(/\s+/).map((w) => w[0]).join('').toUpperCase().slice(0, 2);
}

export default function AdminClient({ initialProfiles }: { initialProfiles: Profile[] }) {
  const [profiles, setProfiles] = useState<Profile[]>(initialProfiles);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [invName, setInvName] = useState('');
  const [invEmail, setInvEmail] = useState('');
  const [invDept, setInvDept] = useState('');
  const [invRole, setInvRole] = useState('member');

  const active = profiles.filter((p) => (p.status || 'active') === 'active');
  const pending = profiles.filter((p) => p.status === 'pending');

  async function handleChangeRole(id: string | number, newRole: string) {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ user_role: newRole })
        .eq('id', id);

      if (!error) {
        setProfiles((prev) => prev.map((p) => (p.id === id ? { ...p, user_role: newRole } : p)));
      } else {
        console.error('Error updating role:', error);
      }
    } catch (e) {
      console.error('[changeRole]', e);
    }
  }

  async function handleRemoveUser(id: string | number) {
    if (!confirm('Remove this user? They will lose access immediately.')) return;
    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', id);

      if (!error) {
        setProfiles((prev) => prev.filter((p) => p.id !== id));
      } else {
        console.error('Error removing user:', error);
      }
    } catch (e) {
      console.error('[removeUser]', e);
    }
  }

  function openInviteModal() {
    setInvName(''); setInvEmail(''); setInvDept(''); setInvRole('member');
    setInviteError('');
    setShowInviteModal(true);
  }

  async function submitInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviteError('');
    if (!invName.trim()) { setInviteError('Full name is required.'); return; }
    if (!invEmail.trim() || !invEmail.includes('@')) { setInviteError('Please enter a valid email address.'); return; }

    setInviting(true);
    try {
      const nameParts = invName.trim().split(/\s+/);
      const oi = ((nameParts[0]?.[0] || '') + (nameParts[1]?.[0] || nameParts[0]?.[1] || '')).toUpperCase();

      const { data, error } = await supabase
        .from('profiles')
        .insert([{
          name: invName.trim(),
          email: invEmail.trim().toLowerCase(),
          department: invDept.trim() || null,
          user_role: invRole,
          status: 'pending',
          oi,
        }])
        .select();

      if (error) throw error;
      if (data && data[0]) {
        setProfiles((prev) => [...prev, data[0]]);
        setShowInviteModal(false);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Could not send invite.';
      setInviteError(message);
    } finally {
      setInviting(false);
    }
  }

  return (
    <div className="content">
      {/* Stats row */}
      <div className={styles.adminGrid}>
        <div className={styles.statCard}>
          <div className={styles.lbl}>Total Users</div>
          <div className={styles.val}>{profiles.length}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.lbl}>Active</div>
          <div className={`${styles.val} ${styles.valSuccess}`}>{active.length}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.lbl}>Pending Invite</div>
          <div className={`${styles.val} ${styles.valWarning}`}>{pending.length}</div>
        </div>
      </div>

      {/* User table */}
      <div className={styles.auditLog}>
        <div className={styles.auditHeader}>
          <span className={styles.tableTitle}>Team Members</span>
          <button className="btn btn-primary btn-sm" onClick={openInviteModal}>
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Invite User
          </button>
        </div>

        <div className={styles.tableBody}>
          {profiles.length === 0 ? (
            <div className={styles.emptyState}>No team members found.</div>
          ) : (
            profiles.map((p) => {
              const oi = getInitials(p);
              const isPend = p.status === 'pending';
              const uRole = p.user_role || 'member';

              return (
                <div key={p.id} className={styles.userItem}>
                  <div className={styles.userAvatar}>{oi}</div>
                  <div className={styles.userInfo}>
                    <div className={styles.userName}>{p.name || p.email}</div>
                    <div className={styles.userEmail}>{p.email || ''}</div>
                  </div>
                  <div className={styles.userDept}>{p.department || '—'}</div>

                  <div className={styles.userRoleCell}>
                    <select
                      value={uRole}
                      onChange={(e) => handleChangeRole(p.id, e.target.value)}
                      aria-label={`Role for ${p.name || p.email}`}
                      className={styles.roleSelect}
                    >
                      <option value="admin">Admin</option>
                      <option value="pm">Project Manager</option>
                      <option value="member">Member</option>
                    </select>
                    <span className={styles.roleBadge}>{roleLabel(uRole)}</span>
                  </div>

                  <div className={styles.userStatusCell}>
                    <span className={`${styles.statusIndicator} ${isPend ? styles.statusPending : styles.statusActive}`}>
                      <span className={`${styles.statusDot} ${isPend ? styles.dotPending : styles.dotActive}`} />
                      {isPend ? 'Pending' : 'Active'}
                    </span>
                  </div>

                  <div className={styles.userActionCell}>
                    <button
                      className={`btn btn-ghost btn-xs ${styles.removeBtn}`}
                      onClick={() => handleRemoveUser(p.id)}
                      title={isPend ? 'Revoke invite' : 'Remove user'}
                    >
                      {isPend ? 'Revoke' : 'Remove'}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div
          className={styles.overlay}
          role="dialog"
          aria-modal="true"
          aria-label="Invite team member"
          onClick={(e) => { if (e.target === e.currentTarget) setShowInviteModal(false); }}
        >
          <div className={styles.modalContent}>
            <h3>Invite Team Member</h3>

            {inviteError && <div className={styles.inviteError}>{inviteError}</div>}

            <form onSubmit={submitInvite} noValidate>
              <div className={styles.formGroup}>
                <label htmlFor="inv-name">Full Name <span className={styles.req}>*</span></label>
                <input id="inv-name" type="text" placeholder="e.g. Zara Ali" value={invName} onChange={(e) => setInvName(e.target.value)} />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="inv-email">Email <span className={styles.req}>*</span></label>
                <input id="inv-email" type="email" placeholder="e.g. zara@studio.com" value={invEmail} onChange={(e) => setInvEmail(e.target.value)} />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="inv-dept">Department</label>
                <input id="inv-dept" type="text" placeholder="e.g. Design" value={invDept} onChange={(e) => setInvDept(e.target.value)} />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="inv-role">Role</label>
                <select id="inv-role" value={invRole} onChange={(e) => setInvRole(e.target.value)}>
                  <option value="member">Team Member</option>
                  <option value="pm">Project Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div className={styles.modalActions}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowInviteModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={inviting}>
                  {inviting ? 'Sending…' : 'Send Invite'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
