'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from './newTask.module.css';
import { supabase } from '@/lib/supabase';

interface Profile {
  id: string | number;
  name: string;
  oi?: string;
}

const CATEGORIES = [
  { value: 'web', label: 'Web Design' },
  { value: 'portfolio', label: 'Portfolio' },
  { value: 'banner', label: 'Banner' },
  { value: 'ads', label: 'Ads' },
  { value: 'social', label: 'Social Media' },
  { value: 'other', label: 'Other' },
];

export default function NewTaskClient({ profiles }: { profiles: Profile[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [title, setTitle] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [priority, setPriority] = useState('medium');
  const [dueDate, setDueDate] = useState('');
  const [project, setProject] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('web');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!title.trim() || !assigneeId || !dueDate) {
      setError('Please fill in all required fields: Title, Assignee, and Due Date.');
      return;
    }

    setLoading(true);
    try {
      const assignee = profiles.find((p) => String(p.id) === assigneeId);
      const initials = assignee?.name?.split(/\s+/).map((w) => w[0]).join('').toUpperCase().slice(0, 2) || 'UN';
      const oi = assignee?.oi || initials;

      const taskData = {
        title: title.trim(),
        oi,
        owner: assignee?.name || 'Unknown',
        priority,
        due_date: dueDate,
        kind: category,
        status: 'in-progress',
        notes: description.trim() || null,
        department: 'Design',
        project: project.trim() || null,
      };

      const { error: insertError } = await supabase
        .from('tasks')
        .insert([taskData]);

      if (insertError) throw insertError;

      router.push('/tasks');
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Could not create task. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="content">
      <Link href="/tasks" className={styles.backBtn}>
        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <path d="M15 18l-6-6 6-6" />
        </svg>
        Back to Tasks
      </Link>

      <div className={styles.formContainer}>
        <header className={styles.formHeader}>
          <h2>Create New Task</h2>
          <p>Fill in the details below to add a new task to the production pipeline.</p>
        </header>

        {error && <div className={styles.errorBanner}>{error}</div>}

        <form className={styles.formBody} onSubmit={handleSubmit} noValidate>
          <div className={`${styles.formGroup} ${styles.full}`}>
            <label htmlFor="task-title">Task Title <span className={styles.req}>*</span></label>
            <input
              id="task-title"
              type="text"
              placeholder="e.g. Website Hero Section Redesign"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="assignee">Assignee <span className={styles.req}>*</span></label>
            <select id="assignee" value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)} required>
              <option value="">Select individual…</option>
              {profiles.map((p) => (
                <option key={p.id} value={String(p.id)}>{p.name}</option>
              ))}
            </select>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="priority">Priority</label>
            <select id="priority" value={priority} onChange={(e) => setPriority(e.target.value)}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="due-date">Due Date <span className={styles.req}>*</span></label>
            <input
              id="due-date"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="category">Category</label>
            <select id="category" value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="project">Project / Client</label>
            <input
              id="project"
              type="text"
              placeholder="e.g. Synary, Aqua Venom…"
              value={project}
              onChange={(e) => setProject(e.target.value)}
            />
          </div>

          <div className={`${styles.formGroup} ${styles.full}`}>
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              placeholder="Briefly describe the task objectives and deliverables…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <footer className={styles.formFooter}>
            <Link href="/tasks" className="btn btn-ghost">Cancel</Link>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? (
                <>
                  <span className={styles.spinner} />
                  Creating…
                </>
              ) : (
                <>
                  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  Create Task
                </>
              )}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
