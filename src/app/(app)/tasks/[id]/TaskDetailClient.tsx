'use client';

import { useState, useEffect, useRef } from 'react';
import styles from './taskDetail.module.css';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
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
  notes?: string | number;
}

interface Comment {
  id: string | number;
  content: string;
  created_at: string;
  profiles?: {
    id: string;
    name: string;
  };
}

interface Attachment {
  id: string | number;
  file_path: string;
  file_name: string;
  file_size: number;
  file_type: string;
  created_at: string;
  profiles?: {
    name: string;
  };
}

interface Profile {
  id: string;
  name: string;
  email: string;
  user_role?: string;
  department?: string;
}

export default function TaskDetailClient({ 
  task: initialTask, 
  initialComments,
  initialAttachments = [],
  profiles 
}: { 
  task: Task, 
  initialComments: Comment[],
  initialAttachments?: Attachment[],
  profiles: Profile[]
}) {
  const { profile: authProfile } = useAuth();
  const [task, setTask] = useState(initialTask);
  const [comments, setComments] = useState(initialComments);
  const [attachments, setAttachments] = useState<Attachment[]>(initialAttachments);
  const [newComment, setNewComment] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedTask, setEditedTask] = useState(initialTask);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync editedTask when initialTask changes or when entering edit mode
  useEffect(() => {
    if (isEditing) {
      setEditedTask(task);
    }
  }, [isEditing, task]);

  // Real-time comments & attachments
  useEffect(() => {
    const commentChannel = supabase
      .channel(`task-comments-${task.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'comments',
          filter: `task_id=eq.${task.id}`
        },
        async (payload) => {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('name')
            .eq('id', payload.new.user_id)
            .single();

          const newC: Comment = {
            ...payload.new as Comment,
            profiles: {
              id: payload.new.user_id,
              name: profileData?.name || 'Unknown'
            }
          };

          setComments((prev) => {
            if (prev.some(c => c.id === newC.id)) return prev;
            return [newC, ...prev];
          });
        }
      )
      .subscribe();

    const attachmentChannel = supabase
      .channel(`task-attachments-${task.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'task_attachments',
          filter: `task_id=eq.${task.id}`
        },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('name')
              .eq('id', payload.new.uploaded_by)
              .single();

            const newA: Attachment = {
              ...payload.new as Attachment,
              profiles: {
                name: profileData?.name || 'Unknown'
              }
            };
            setAttachments(prev => {
              if (prev.some(a => a.id === newA.id)) return prev;
              return [newA, ...prev];
            });
          } else if (payload.eventType === 'DELETE') {
            setAttachments(prev => prev.filter(a => a.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(commentChannel);
      supabase.removeChannel(attachmentChannel);
    };
  }, [task.id]);

  const handleStatusChange = async (newStatus: string) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ status: newStatus })
        .eq('id', task.id);

      if (!error) {
        setTask(prev => ({ ...prev, status: newStatus }));
        
        // Notify owner if someone else changes status
        if (authProfile && task.owner && authProfile.name !== task.owner) {
          const ownerProfile = profiles.find(p => p.name === task.owner);
          if (ownerProfile) {
            await supabase.from('notifications').insert([{
              user_id: ownerProfile.id,
              task_id: task.id,
              type: 'status_change',
              message: `Task "${task.title || task.name}" status changed to ${newStatus.replace('-', ' ')}`,
              read: false
            }]);
          }
        }
      } else {
        console.error('Error updating status:', error);
      }
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleSaveTask = async () => {
    setIsSaving(true);
    try {
      const payload = { 
        title: editedTask.title || editedTask.name,
        notes: editedTask.notes,
        priority: editedTask.priority,
        due_date: editedTask.due_date,
        owner: editedTask.owner,
        department: editedTask.department
      };

      const { error } = await supabase
        .from('tasks')
        .update(payload)
        .eq('id', task.id);

      if (!error) {
        // Notify new owner if assignee changed
        if (editedTask.owner && editedTask.owner !== task.owner) {
          const newOwnerProfile = profiles.find(p => p.name === editedTask.owner);
          if (newOwnerProfile) {
            await supabase.from('notifications').insert([{
              user_id: newOwnerProfile.id,
              task_id: task.id,
              type: 'assigned',
              message: `You have been assigned to task "${editedTask.title || editedTask.name}"`,
              read: false
            }]);
          }
        }
        setTask(editedTask);
        setIsEditing(false);
      } else {
        console.error('Error saving task:', error);
      }
    } catch (error) {
      console.error('Error saving task:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePostComment = async () => {
    if (!newComment.trim() || isPosting || !authProfile) return;
    setIsPosting(true);

    try {
      const { data, error } = await supabase
        .from('comments')
        .insert([{
          task_id: task.id,
          content: newComment,
          user_id: authProfile.id
        }])
        .select();

      if (!error && data) {
        // Notify owner if someone else comments
        if (authProfile && task.owner && authProfile.name !== task.owner) {
          const ownerProfile = profiles.find(p => p.name === task.owner);
          if (ownerProfile) {
            await supabase.from('notifications').insert([{
              user_id: ownerProfile.id,
              task_id: task.id,
              type: 'comment',
              message: `${authProfile.name} commented on "${task.title || task.name}"`,
              read: false
            }]);
          }
        }

        const newC = { 
          ...data[0], 
          profiles: { 
            id: String(authProfile.id),
            name: authProfile?.name || 'You' 
          } 
        };
        setComments(prev => [newC, ...prev]);
        setNewComment('');
      } else {
        console.error('Error posting comment:', error);
      }
    } catch (error) {
      console.error('Error posting comment:', error);
    } finally {
      setIsPosting(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !authProfile) return;

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${task.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('task-attachments')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data, error: dbError } = await supabase
        .from('task_attachments')
        .insert([{
          task_id: task.id,
          file_path: filePath,
          file_name: file.name,
          file_size: file.size,
          file_type: file.type,
          uploaded_by: authProfile.id
        }])
        .select('*,profiles(name)');

      if (dbError) throw dbError;

      if (data) {
        setAttachments(prev => [data[0], ...prev]);
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Failed to upload file. Make sure the storage bucket "task-attachments" exists.');
    } finally {
      setIsUploading(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleDeleteAttachment = async (id: string | number, path: string) => {
    if (!confirm('Are you sure you want to delete this attachment?')) return;
    
    try {
      await supabase.storage.from('task-attachments').remove([path]);
      const { error } = await supabase
        .from('task_attachments')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setAttachments(prev => prev.filter(a => a.id !== id));
    } catch (error) {
      console.error('Error deleting attachment:', error);
    }
  };

  const getPublicUrl = (path: string) => {
    const { data } = supabase.storage.from('task-attachments').getPublicUrl(path);
    return data.publicUrl;
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const isOverdue = task.status !== 'completed' && task.due_date && task.due_date < todayStr;
  
  const getInitials = (name?: string) => {
    if (!name) return '??';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getGrad = (initials: string) => {
    const grads: Record<string, string> = {
      'SH': 'linear-gradient(135deg,#F472B6,#DB2777)',
      'SB': 'linear-gradient(135deg,#FBBF24,#D97706)',
      'TM': 'linear-gradient(135deg,#34D399,#059669)',
      'IN': 'linear-gradient(135deg,#60A5FA,#2563EB)',
      'ZA': 'linear-gradient(135deg,#A78BFA,#6D28D9)',
      'MK': 'linear-gradient(135deg,#F87171,#B91C1C)',
    };
    return grads[initials] || 'linear-gradient(135deg,#6B7FD7,#4B5EAA)';
  };

  return (
    <div className="content">
      <div className={styles.crumbs}>
        <Link href="/tasks">Production Tasks</Link>
        <span className={styles.sep}>/</span>
        <span>{task.title || task.name}</span>
      </div>

      <section className={`${styles.detailHead} ${isOverdue ? styles.overdue : ''}`}>
        <div className={styles.dhTop}>
          <div className={styles.dhIc}>
            <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
          </div>
          <div className={styles.dhInfo}>
            {isEditing ? (
              <div className={styles.editHeaderFields}>
                <input 
                  className={styles.editTitleInput}
                  value={editedTask.title || editedTask.name || ''}
                  onChange={(e) => setEditedTask(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Task Title"
                  title="Task Title"
                />
                <div className={styles.dhSub}>
                  <span className={styles.id}>TSK-{String(task.id).padStart(3, '0')}</span>
                  <select 
                    value={editedTask.department || 'Design'} 
                    onChange={(e) => setEditedTask(prev => ({ ...prev, department: e.target.value }))}
                    className={styles.deptSelect}
                    title="Select Department"
                  >
                    <option value="Design">Design</option>
                    <option value="Motion">Motion</option>
                    <option value="Web">Web</option>
                    <option value="Strategy">Strategy</option>
                  </select>
                </div>
              </div>
            ) : (
              <>
                <h1 className={styles.dhTitle}>{task.title || task.name}</h1>
                <div className={styles.dhSub}>
                  <span className={styles.id}>TSK-{String(task.id).padStart(3, '0')}</span>
                  <span className={styles.deptBadge}>{task.department || 'Design'}</span>
                </div>
              </>
            )}
          </div>
          <div className={styles.dhActions}>
            {isEditing ? (
              <>
                <button className="btn btn-ghost btn-sm" onClick={() => setIsEditing(false)}>Cancel</button>
                <button className="btn btn-primary btn-sm" onClick={handleSaveTask} disabled={isSaving}>
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </>
            ) : (
              <>
                <button className="btn btn-ghost btn-sm" onClick={() => setIsEditing(true)}>
                  <svg className="btn-icon-mr" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                  Edit Task
                </button>
                <button className="btn btn-primary btn-sm" onClick={() => handleStatusChange('completed')} disabled={task.status === 'completed'}>
                  {task.status === 'completed' ? '✓ Completed' : 'Mark as Complete'}
                </button>
              </>
            )}
          </div>
        </div>

        <div className={styles.dhMeta}>
          <div className={styles.cell}>
            <div className={styles.k}>Status</div>
            <div className={`${styles.v} ${styles['status' + (task.status.charAt(0).toUpperCase() + task.status.slice(1).replace('-', ''))]}`}>
              <span className={styles.statusDot}></span>
              {task.status.replace('-', ' ')}
            </div>
          </div>
          <div className={styles.cell}>
            <div className={styles.k}>Priority</div>
            <div className={`${styles.v} ${styles['prio' + ((task.priority || 'Medium').charAt(0).toUpperCase() + (task.priority || 'Medium').slice(1))]}`}>
              <span className={styles.pdot}></span>
              {task.priority || 'Medium'}
            </div>
          </div>
          <div className={styles.cell}>
            <div className={styles.k}>Assignee</div>
            <div className={styles.v}>
              <div className={`${styles.cavaSmall} ${styles['grad' + getInitials(task.owner)] || styles.gradDef}`}>{getInitials(task.owner)}</div>
              {task.owner || 'Unassigned'}
            </div>
          </div>
          <div className={styles.cell}>
            <div className={styles.k}>Due</div>
            <div className={`${styles.v} ${isOverdue ? styles.overdueText : ''}`}>
              <svg width="14" height="14" className={styles.dueIc} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
              {task.due_date || 'No date set'}
            </div>
          </div>
        </div>
      </section>

      <div className={styles.layout}>
        <div>
          <section className={styles.desc}>
            <div className={styles.sectionHead}>
              <h3>Description</h3>
            </div>
            {isEditing ? (
              <textarea 
                className={styles.editDescInput}
                value={String(editedTask.notes || '')}
                onChange={(e) => setEditedTask(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Add task description or notes..."
                title="Task Description"
              />
            ) : (
              <p className={styles.descriptionText}>{task.notes || "No additional description provided."}</p>
            )}
          </section>

          <section className={styles.attachmentsSection}>
            <div className={styles.sectionHead}>
              <h3>Attachments <span className={styles.countBadge}>{attachments.length}</span></h3>
              <button 
                className="btn btn-ghost btn-xs" 
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                {isUploading ? 'Uploading...' : '+ Add File'}
              </button>
            </div>
            <div className={styles.attachGrid}>
              {attachments.map(a => (
                <div key={a.id} className={styles.attachCard}>
                  <div className={styles.attachIcon}>
                    <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className={styles.attachInfo}>
                    <a href={getPublicUrl(a.file_path)} target="_blank" rel="noopener noreferrer" className={styles.attachName}>
                      {a.file_name}
                    </a>
                    <div className={styles.attachMeta}>
                      {Math.round(a.file_size / 1024)} KB · {a.profiles?.name || 'Unknown'}
                    </div>
                  </div>
                  <button 
                    className={styles.attachDelete} 
                    onClick={() => handleDeleteAttachment(a.id, a.file_path)}
                    title="Delete attachment"
                  >
                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12"/></svg>
                  </button>
                </div>
              ))}
              {attachments.length === 0 && (
                <div className={styles.emptyAttach}>No files attached to this task.</div>
              )}
            </div>
          </section>

          <section className={styles.comments}>
            <div className={styles.head}>
              <h3>Comments <span className={styles.countBadge}>{comments.length}</span></h3>
            </div>
            <div className={styles.list}>
              {comments.map(c => {
                const commentInitials = getInitials(c.profiles?.name);
                return (
                  <div key={c.id} className={styles.cItem}>
                    <div className={`${styles.cava} ${styles['grad' + commentInitials] || styles.gradDef}`}>{commentInitials}</div>
                    <div className={styles.body}>
                      <div className={styles.commentMeta}>
                        <b>{c.profiles?.name || 'Unknown'}</b> 
                        <span className={styles.dot}>·</span> 
                        <span className={styles.time}>{new Date(c.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                      </div>
                      <p>{c.content}</p>
                    </div>
                  </div>
                );
              })}
              {comments.length === 0 && <div className={styles.emptyComments}>No comments yet. Start the conversation.</div>}
            </div>
            <div className={styles.cWrite}>
              <div className={`${styles.cava} ${styles['grad' + getInitials(authProfile?.name)] || styles.gradDef}`}>{getInitials(authProfile?.name)}</div>
              <div className={styles.commentBox}>
                <textarea 
                  placeholder="Write a comment…" 
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  title="Write a comment"
                ></textarea>
                <div className={styles.commentFooter}>
                  <div className={styles.commentTools}>
                    <button 
                      title="Attach file" 
                      className={styles.toolBtn}
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                    >
                      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M15.172 7l-6.586 6.586a2 2 0 11-2.828-2.828l6.414-6.414a4 4 0 015.656 5.656l-6.415 6.415a6 6 0 01-8.486-8.486L9.5 3.5"/></svg>
                    </button>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      style={{ display: 'none' }} 
                      onChange={handleFileUpload} 
                    />
                  </div>
                  <button className="btn btn-primary btn-sm" onClick={handlePostComment} disabled={isPosting || !newComment.trim() || !authProfile}>
                    {isPosting ? 'Posting…' : 'Post Comment'}
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>

        <aside className={styles.side}>
          <div className={styles.field}>
            <div className={styles.lbl}>Status</div>
            <select 
              className={styles.statusDropdown} 
              value={task.status} 
              onChange={(e) => handleStatusChange(e.target.value)}
              title="Task Status"
            >
              <option value="pending">To Do</option>
              <option value="in-progress">In Progress</option>
              <option value="review">Review</option>
              <option value="completed">Done</option>
            </select>
          </div>

          <div className={styles.field}>
            <div className={styles.lbl}>Priority</div>
            {isEditing ? (
              <select 
                className={styles.fieldSelect} 
                value={editedTask.priority || 'medium'}
                onChange={(e) => setEditedTask(prev => ({ ...prev, priority: e.target.value }))}
                title="Task Priority"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            ) : (
              <div className={styles.fieldVal}>
                <span className={`${styles.prioDot} ${styles['dot' + ((task.priority || 'Medium').charAt(0).toUpperCase() + (task.priority || 'Medium').slice(1))]}`}></span>
                {task.priority || 'Medium'}
              </div>
            )}
          </div>

          <div className={styles.field}>
            <div className={styles.lbl}>Assignee</div>
            {isEditing ? (
              <select 
                className={styles.fieldSelect} 
                value={editedTask.owner || ''}
                onChange={(e) => setEditedTask(prev => ({ ...prev, owner: e.target.value }))}
                title="Task Assignee"
              >
                <option value="">Unassigned</option>
                {profiles.map(p => (
                  <option key={p.id} value={p.name}>{p.name}</option>
                ))}
              </select>
            ) : (
              <div className={styles.fieldVal}>
                <div className={`${styles.cavaTiny} ${styles['grad' + getInitials(task.owner)] || styles.gradDef}`}>{getInitials(task.owner)}</div>
                {task.owner || 'Unassigned'}
              </div>
            )}
          </div>

          <div className={styles.field}>
            <div className={styles.lbl}>Due Date</div>
            {isEditing ? (
              <input 
                type="date" 
                className={styles.fieldInput} 
                value={editedTask.due_date || ''}
                onChange={(e) => setEditedTask(prev => ({ ...prev, due_date: e.target.value }))}
                title="Due Date"
              />
            ) : (
              <div className={`${styles.fieldVal} ${isOverdue ? styles.overdueText : ''}`}>
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                {task.due_date || 'No date set'}
              </div>
            )}
          </div>

          <div className={styles.field}>
            <div className={styles.lbl}>Project / Client</div>
            <div className={styles.fieldVal}>
              <span className={styles.projectMark}>{task.title?.[0] || 'T'}</span>
              Aktivacity
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
