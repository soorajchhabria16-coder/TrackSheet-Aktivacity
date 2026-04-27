'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  oi: string;
  role?: string;
  user_role?: string;
  isAdmin: boolean;
  department?: string;
  status?: string;
  avatar_url?: string;
}

interface AuthContextValue {
  profile: UserProfile | null;
  loading: boolean;
  refetch: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  profile: null,
  loading: true,
  refetch: () => {},
});

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://wgtqmpbigyscnfihnabm.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_MRS6VObelNdJgqGoh6g-0g_zxcjQMXR';

async function fetchProfileByEmail(email: string): Promise<UserProfile | null> {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?email=eq.${encodeURIComponent(email)}&limit=1`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
      }
    );
    if (!res.ok) return null;
    const rows = (await res.json()) as UserProfile[];
    const profile = rows[0] ?? null;
    if (profile) {
      return {
        ...profile,
        isAdmin: profile.user_role === 'admin' || profile.role === 'admin'
      };
    }
    return null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) {
        setProfile(null);
        return;
      }

      // Try to get matching profile row from DB
      const dbProfile = await fetchProfileByEmail(user.email);

      if (dbProfile) {
        setProfile(dbProfile);
      } else {
        // Fallback: build from auth user metadata
        const displayName: string =
          (user.user_metadata?.full_name as string | undefined) ||
          (user.user_metadata?.name as string | undefined) ||
          user.email;
        const parts = displayName.split(/\s+/);
        const oi = ((parts[0]?.[0] || '') + (parts[1]?.[0] || parts[0]?.[1] || '')).toUpperCase();
        setProfile({
          id: user.id,
          name: displayName,
          email: user.email,
          oi,
          user_role: 'admin', // Default fallback to admin for first user/unlisted
          isAdmin: true,
        });
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();

    // Re-load whenever auth state changes (login / logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      loadUser();
    });

    return () => subscription.unsubscribe();
  }, [loadUser]);

  return (
    <AuthContext.Provider value={{ profile, loading, refetch: loadUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
