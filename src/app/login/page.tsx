'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import styles from './login.module.css';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [mode, setMode] = useState<'login' | 'forgot'>('login');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ text: string; type: 'error' | 'success' } | null>(null);
  const [showRequestModal, setShowRequestModal] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      router.push('/');
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Sign-in failed. Please try again.';
      setMsg({ text: message, type: 'error' });
    } finally {
      setLoading(false);
    }
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    if (!resetEmail.trim()) {
      setMsg({ text: 'Please enter your email address.', type: 'error' });
      return;
    }
    setMsg(null);
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail.trim(), {
        redirectTo: window.location.origin + '/login',
      });
      if (error) throw error;
      setMsg({ text: 'Reset link sent! Check your email inbox.', type: 'success' });
      setMode('login');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Could not send reset link.';
      setMsg({ text: message, type: 'error' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.page}>
      {/* Background radial glows */}
      <div className={styles.bgPattern} aria-hidden="true" />

      <div className={styles.loginWrap}>
        {/* Hero header */}
        <header className={styles.loginHero}>
          <div className={styles.brandLg}>
            <div className={styles.brandMark}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <div className={styles.brandName}>Aktivacity</div>
          </div>
          <h1 className={styles.heroTitle}>Studio Login</h1>
        </header>

        {/* Body */}
        <div className={styles.loginBody}>
          {msg && (
            <div className={`${styles.msg} ${msg.type === 'error' ? styles.msgError : styles.msgSuccess}`}>
              {msg.text}
            </div>
          )}

          {mode === 'login' && (
            <form onSubmit={handleLogin} noValidate>
              <div className={styles.formGroup}>
                <label htmlFor="email">Email Address</label>
                <input
                  id="email"
                  type="email"
                  placeholder="you@studio.com"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="password">Password</label>
                <input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <div className={styles.forgot}>
                <button type="button" className={styles.forgotLink} onClick={() => { setMode('forgot'); setMsg(null); setResetEmail(email); }}>
                  Forgot password?
                </button>
              </div>

              <button type="submit" className={styles.btnLogin} disabled={loading}>
                {loading ? 'Signing in…' : 'Sign in to workspace'}
              </button>
            </form>
          )}

          {mode === 'forgot' && (
            <form onSubmit={handleReset} className={styles.forgotPanel} noValidate>
              <p className={styles.panelTitle}>Reset your password</p>
              <p className={styles.panelSub}>Enter your email and we&apos;ll send you a link to reset your password.</p>
              <div className={styles.formGroup}>
                <label htmlFor="reset-email">Email Address</label>
                <input
                  id="reset-email"
                  type="email"
                  placeholder="you@studio.com"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                />
              </div>
              <div className={styles.forgotActions}>
                <button type="submit" className={styles.btnLogin} disabled={loading}>
                  {loading ? 'Sending…' : 'Send reset link'}
                </button>
                <button type="button" className={styles.btnCancel} onClick={() => { setMode('login'); setMsg(null); }}>
                  Cancel
                </button>
              </div>
            </form>
          )}

          <div className={styles.loginFoot}>
            Don&apos;t have an account?{' '}
            <button type="button" className={styles.requestLink} onClick={() => setShowRequestModal(true)}>
              Request access
            </button>
          </div>
        </div>
      </div>

      {/* Request access modal */}
      {showRequestModal && (
        <div
          className={styles.overlay}
          role="dialog"
          aria-modal="true"
          aria-label="Access request information"
          onClick={(e) => { if (e.target === e.currentTarget) setShowRequestModal(false); }}
        >
          <div className={styles.modalBox}>
            <div className={styles.modalIco}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <h3>Invite-only access</h3>
            <p>Aktivacity is a private studio workspace. Ask your studio admin to invite you — you&apos;ll receive a magic-link email to get started.</p>
            <button className={styles.btnLogin} onClick={() => setShowRequestModal(false)}>Got it</button>
          </div>
        </div>
      )}
    </div>
  );
}
