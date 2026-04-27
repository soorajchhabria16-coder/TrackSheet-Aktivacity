'use client';

import { useState, useEffect, useRef } from 'react';
import styles from './settings.module.css';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';

interface User {
  id: string | number;
  name: string;
  email: string;
  role?: string;
  department?: string;
  user_role?: string;
  avatar_url?: string;
}

export default function SettingsClient({ teamMembers }: { teamMembers: User[] }) {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  // Start with the auth profile, then update from teamMembers once both are ready
  const [user, setUser] = useState<User | null>(null);
  const [members, setMembers] = useState(teamMembers);

  // Once auth + teamMembers are available, find the matching profile row
  useEffect(() => {
    if (!profile) return;
    const match = teamMembers.find(
      (m) => m.email?.toLowerCase() === profile.email?.toLowerCase()
    );
    setUser(match ?? {
      id: profile.id,
      name: profile.name,
      email: profile.email,
      role: profile.role,
      department: profile.department,
      user_role: profile.user_role,
    });
  }, [profile, teamMembers]);
  const [isSaving, setIsSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newMember, setNewMember] = useState({ name: '', email: '', role: 'junior' });
  const [workspace, setWorkspace] = useState({
    name: 'Aktivacity',
    slug: 'aktivacity',
    timezone: 'Asia/Karachi',
    date_format: 'dd/mm/yyyy',
    default_priority: 'medium',
    default_department: 'Design',
    logo_url: ''
  });

  const photoInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function loadWorkspace() {
      const { data, error } = await supabase
        .from('workspace_settings')
        .select('*')
        .single();
      
      if (data && !error) {
        setWorkspace(data);
      }
    }
    loadWorkspace();
  }, []);

  const handleSaveWorkspace = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('workspace_settings')
        .upsert([workspace], { onConflict: 'slug' });

      if (!error) {
        alert('Workspace settings saved!');
      } else {
        console.error('Error saving workspace:', error);
      }
    } catch (error) {
      console.error('Error saving workspace:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          name: user.name,
          role: user.role,
          department: user.department
        })
        .eq('id', user.id);

      if (!error) {
        alert('Profile saved successfully!');
      } else {
        console.error('Error saving profile:', error);
      }
    } catch (error) {
      console.error('Error saving profile:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleInviteUser = async () => {
    if (!newMember.name || !newMember.email) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .insert([{
          name: newMember.name,
          email: newMember.email,
          user_role: newMember.role,
          role: newMember.role === 'lead' ? 'Lead Designer' : 'Junior Designer',
          status: 'pending',
          oi: newMember.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
        }])
        .select();

      if (!error && data) {
        setMembers(prev => [...prev, data[0]]);
        setIsModalOpen(false);
        setNewMember({ name: '', email: '', role: 'junior' });
        alert('Invitation sent successfully!');
      } else {
        console.error('Error inviting user:', error);
      }
    } catch (error) {
      console.error('Error inviting user:', error);
    }
  };

  const handleRemoveUser = async (id: string | number) => {
    if (!confirm('Are you sure you want to remove this member?')) return;
    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', id);

      if (!error) {
        setMembers(prev => prev.filter(m => m.id !== id));
      } else {
        console.error('Error removing user:', error);
      }
    } catch (error) {
      console.error('Error removing user:', error);
    }
  };

  const handleSignOut = async () => {
    if (confirm('Are you sure you want to sign out?')) {
      await supabase.auth.signOut();
      window.location.href = '/login';
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setIsSaving(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Math.random()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('profiles')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('profiles').getPublicUrl(filePath);

      const { error: dbError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (dbError) throw dbError;
      alert('Photo updated!');
    } catch (error) {
      console.error('Error uploading photo:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsSaving(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `logo-${Math.random()}.${fileExt}`;
      const filePath = `workspace/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('workspace')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('workspace').getPublicUrl(filePath);

      setWorkspace(prev => ({ ...prev, logo_url: publicUrl }));
    } catch (error) {
      console.error('Error uploading logo:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const initials = user?.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '??';

  return (
    <div className={styles.settingsLayout}>
      <aside className={styles.settingsNav}>
        {[
          { id: 'profile', label: 'My Profile' },
          { id: 'workspace', label: 'Workspace Settings' },
          { id: 'notifications', label: 'Notifications' },
          { id: 'team', label: 'Team Management' },
          { id: 'security', label: 'Security & Privacy' }
        ].map(tab => (
          <button 
            key={tab.id}
            className={`${styles.settingsNavItem} ${activeTab === tab.id ? styles.active : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </aside>

      <div className={styles.settingsCard}>
        {activeTab === 'profile' && (
          <section className={styles.settingsSection}>
            <h3>My Profile</h3>
            <p>Update your personal information and how you appear in the dashboard.</p>
            
            <div className={styles.profileEdit}>
              <div className={styles.avatar}>
                {user?.avatar_url ? (
                  <img src={user.avatar_url} alt="" className={styles.avatarImg} />
                ) : (
                  initials
                )}
              </div>
              <button 
                className="btn btn-ghost btn-sm" 
                onClick={() => photoInputRef.current?.click()}
                disabled={isSaving}
              >
                Change photo
              </button>
              <input 
                type="file" 
                ref={photoInputRef} 
                style={{ display: 'none' }} 
                accept="image/*" 
                onChange={handlePhotoUpload} 
              />
            </div>

            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label htmlFor="prof-name">Full Name</label>
                <input
                  id="prof-name"
                  type="text"
                  placeholder="Your full name"
                  value={user?.name || ''}
                  onChange={(e) => setUser(prev => prev ? { ...prev, name: e.target.value } : null)}
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="prof-email">Email Address</label>
                <input id="prof-email" type="email" value={user?.email || ''} disabled title="Email cannot be changed here" />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="prof-role">Job Title</label>
                <input
                  id="prof-role"
                  type="text"
                  placeholder="e.g. Studio Lead"
                  value={user?.role || ''}
                  onChange={(e) => setUser(prev => prev ? { ...prev, role: e.target.value } : null)}
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="prof-dept">Department</label>
                <input
                  id="prof-dept"
                  type="text"
                  placeholder="e.g. Design"
                  value={user?.department || ''}
                  onChange={(e) => setUser(prev => prev ? { ...prev, department: e.target.value } : null)}
                />
              </div>
            </div>
            
            <div className={styles.settingsFooter}>
              <button className="btn btn-primary" onClick={handleSaveProfile} disabled={isSaving}>
                {isSaving ? 'Saving…' : 'Save Settings'}
              </button>
            </div>
          </section>
        )}

        {activeTab === 'workspace' && (
          <section className={styles.settingsSection}>
            <h3>Workspace Settings</h3>
            <p>Configure studio-wide defaults that apply to all team members.</p>

            {/* Studio identity */}
            <div className={styles.subSection}>
              <div className={styles.subSectionLabel}>Studio Identity</div>
              
              <div className={styles.logoEdit}>
                <div className={styles.logoPreview}>
                  {workspace.logo_url ? (
                    <img src={workspace.logo_url} alt="Studio Logo" />
                  ) : (
                    <div className={styles.logoPlaceholder}>LOGO</div>
                  )}
                </div>
                <div>
                  <button 
                    className="btn btn-ghost btn-xs" 
                    onClick={() => logoInputRef.current?.click()}
                    disabled={isSaving}
                  >
                    Change Logo
                  </button>
                  <p className={styles.logoHint}>Recommended: 200x200px PNG or SVG</p>
                  <input 
                    type="file" 
                    ref={logoInputRef} 
                    style={{ display: 'none' }} 
                    accept="image/*" 
                    onChange={handleLogoUpload} 
                  />
                </div>
              </div>

              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label htmlFor="ws-name">Studio Name</label>
                  <input 
                    id="ws-name" 
                    type="text" 
                    value={workspace.name} 
                    onChange={(e) => setWorkspace(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g. Aktivacity Studio" 
                  />
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="ws-url">Workspace URL</label>
                  <input 
                    id="ws-url" 
                    type="text" 
                    value={workspace.slug} 
                    onChange={(e) => setWorkspace(prev => ({ ...prev, slug: e.target.value }))}
                    placeholder="your-studio" 
                  />
                </div>
              </div>
            </div>

            {/* Regional */}
            <div className={styles.subSection}>
              <div className={styles.subSectionLabel}>Regional</div>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label htmlFor="ws-tz">Timezone</label>
                  <select 
                    id="ws-tz" 
                    title="Select timezone" 
                    value={workspace.timezone}
                    onChange={(e) => setWorkspace(prev => ({ ...prev, timezone: e.target.value }))}
                  >
                    <option value="Asia/Karachi">Asia/Karachi (PKT, UTC+5)</option>
                    <option value="UTC">UTC (UTC+0)</option>
                    <option value="America/New_York">America/New_York (EST, UTC-5)</option>
                    <option value="America/Los_Angeles">America/Los_Angeles (PST, UTC-8)</option>
                    <option value="Europe/London">Europe/London (GMT, UTC+0)</option>
                    <option value="Europe/Berlin">Europe/Berlin (CET, UTC+1)</option>
                    <option value="Asia/Dubai">Asia/Dubai (GST, UTC+4)</option>
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="ws-date">Date Format</label>
                  <select 
                    id="ws-date" 
                    title="Select date format" 
                    value={workspace.date_format}
                    onChange={(e) => setWorkspace(prev => ({ ...prev, date_format: e.target.value }))}
                  >
                    <option value="dd/mm/yyyy">DD/MM/YYYY</option>
                    <option value="mm/dd/yyyy">MM/DD/YYYY</option>
                    <option value="yyyy-mm-dd">YYYY-MM-DD</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Task defaults */}
            <div className={styles.subSection}>
              <div className={styles.subSectionLabel}>Task Defaults</div>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label htmlFor="ws-prio">Default Priority</label>
                  <select 
                    id="ws-prio" 
                    title="Default task priority" 
                    value={workspace.default_priority}
                    onChange={(e) => setWorkspace(prev => ({ ...prev, default_priority: e.target.value }))}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="ws-dept">Default Department</label>
                  <select 
                    id="ws-dept" 
                    title="Default department" 
                    value={workspace.default_department}
                    onChange={(e) => setWorkspace(prev => ({ ...prev, default_department: e.target.value }))}
                  >
                    <option value="Design">Design</option>
                    <option value="Motion">Motion</option>
                    <option value="Web">Web</option>
                    <option value="Strategy">Strategy</option>
                  </select>
                </div>
              </div>

              <div className={styles.toggleGroup}>
                <div className={styles.toggleInfo}>
                  <h4>Auto-assign to Creator</h4>
                  <p>Automatically assign new tasks to whoever created them.</p>
                </div>
                <label className={styles.switch}>
                  <input type="checkbox" defaultChecked />
                  <span className={styles.slider}></span>
                </label>
              </div>

              <div className={styles.toggleGroup}>
                <div className={styles.toggleInfo}>
                  <h4>Show Completed Tasks</h4>
                  <p>Display completed tasks in the timeline view by default.</p>
                </div>
                <label className={styles.switch}>
                  <input type="checkbox" />
                  <span className={styles.slider}></span>
                </label>
              </div>
            </div>

            {/* Danger zone */}
            <div className={styles.dangerZone}>
              <div className={styles.dangerLabel}>Danger Zone</div>
              <div className={styles.toggleGroup}>
                <div className={styles.toggleInfo}>
                  <h4>Clear Completed Tasks</h4>
                  <p>Permanently delete all tasks marked as completed. This cannot be undone.</p>
                </div>
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ color: 'var(--danger)', borderColor: 'var(--danger-50)', whiteSpace: 'nowrap' }}
                  onClick={() => confirm('Delete all completed tasks? This cannot be undone.') && null}
                >
                  Clear Completed
                </button>
              </div>
            </div>

            <div className={styles.settingsFooter}>
              <button className="btn btn-primary" onClick={handleSaveWorkspace} disabled={isSaving}>
                {isSaving ? 'Saving…' : 'Save Settings'}
              </button>
            </div>
          </section>
        )}

        {activeTab === 'team' && (
          <section className={styles.settingsSection}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h3>Team Management</h3>
                <p>Add, edit, or remove studio members and their access levels.</p>
              </div>
              <button className="btn btn-primary btn-sm" onClick={() => setIsModalOpen(true)}>Add User</button>
            </div>

            <div className={styles.tableContainer}>
              <table className={styles.tableMain}>
                <thead className={styles.tableHead}>
                  <tr>
                    <th className={styles.thCell}>User</th>
                    <th className={styles.thCell}>Role</th>
                    <th className={styles.thCell}>Status</th>
                    <th className={styles.thCell} style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map(member => {
                    const mi = member.name.slice(0, 2).toUpperCase();
                    return (
                      <tr key={member.id} className={styles.trRow}>
                        <td className={styles.tdCell}>
                          <div className={styles.tdUserInfo}>
                            <div className={styles.tdAvatar}>{mi}</div>
                            <div>
                              <div className={styles.tdName}>{member.name}</div>
                              <div className={styles.tdEmail}>{member.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className={styles.tdCell}>{member.user_role || 'Member'}</td>
                        <td className={styles.tdCell}>Active</td>
                        <td className={styles.tdActionCell}>
                          {member.id !== user?.id ? (
                            <button className={`${styles.removeBtn} btn btn-ghost btn-xs`} onClick={() => handleRemoveUser(member.id)}>
                              Remove
                            </button>
                          ) : (
                            <span className={styles.youBadge}>You</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}


        {activeTab === 'notifications' && (
          <section className={styles.settingsSection}>
            <h3>Notifications</h3>
            <p>Configure which alerts you want to receive via email and in-app bubble.</p>
            
            {[
              { label: 'Overdue Alerts', desc: 'Notify me immediately when a task passes its due date.' },
              { label: 'Comments & Mentions', desc: 'Receive notifications when someone mentions you.' },
              { label: 'Weekly Recap', desc: 'Receive a summary of your team\'s throughput.' }
            ].map((n, i) => (
              <div key={i} className={styles.toggleGroup}>
                <div className={styles.toggleInfo}>
                  <h4>{n.label}</h4>
                  <p>{n.desc}</p>
                </div>
                <label className={styles.switch}>
                  <input type="checkbox" defaultChecked={i < 2} />
                  <span className={styles.slider}></span>
                </label>
              </div>
            ))}
          </section>
        )}

        {activeTab === 'security' && (
          <section className={styles.settingsSection}>
            <h3>Security & Privacy</h3>
            <p>Manage your account security and authentication sessions.</p>
            <div className={styles.toggleGroup}>
              <div className={styles.toggleInfo}>
                <h4>Global Sign Out</h4>
                <p>Revoke access from all devices, including this one.</p>
              </div>
              <button className="btn btn-ghost" style={{ color: 'var(--danger)' }} onClick={handleSignOut}>Sign Out Everywhere</button>
            </div>
          </section>
        )}
      </div>

      {isModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3>Invite Member</h3>
            <p>Send a workspace invite to a new designer.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className={styles.formGroup}>
                <label>Full Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. John Doe"
                  value={newMember.name}
                  onChange={(e) => setNewMember(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className={styles.formGroup}>
                <label>Email Address</label>
                <input 
                  type="email" 
                  placeholder="john@aktivacity.studio"
                  value={newMember.email}
                  onChange={(e) => setNewMember(prev => ({ ...prev, email: e.target.value }))}
                />
              </div>
              <div className={styles.formGroup}>
                <label>Role</label>
                <select 
                  value={newMember.role}
                  onChange={(e) => setNewMember(prev => ({ ...prev, role: e.target.value }))}
                >
                  <option value="lead">Lead Designer</option>
                  <option value="junior">Junior Designer</option>
                  <option value="pm">Project Manager</option>
                </select>
              </div>
            </div>
            <div className={styles.modalActions}>
              <button className="btn btn-ghost" onClick={() => setIsModalOpen(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleInviteUser}>Send Invite</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
