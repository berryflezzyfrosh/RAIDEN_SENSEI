import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { UserProfile } from '@/types';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isPremium: boolean;
  isAdmin: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const [premiumActive, setPremiumActive] = useState(false);

  const loadProfile = async (uid: string) => {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', uid)
      .maybeSingle();
    if (error) {
      console.warn('profile load error', error.message);
      return;
    }
    setProfile(data as UserProfile | null);
    // Authoritative premium check via server RPC
    const { data: prem } = await supabase.rpc('get_my_premium_status').maybeSingle();
    setPremiumActive(Boolean((prem as { is_active?: boolean })?.is_active));
  };

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      const uid = data.session?.user?.id;
      if (uid) {
        loadProfile(uid).finally(() => mounted && setLoading(false));
      } else {
        setLoading(false);
      }
    });

    // onAuthStateChange: wrap async work in IIFE to avoid deadlock
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      (async () => {
        setSession(sess);
        if (sess?.user?.id) {
          await loadProfile(sess.user.id);
        } else {
          setProfile(null);
        }
        setLoading(false);
      })();
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    return {
      session,
      user: session?.user ?? null,
      profile,
      loading,
      isPremium: premiumActive,
      isAdmin: profile?.is_admin ?? false,
      refreshProfile: async () => {
        if (session?.user?.id) await loadProfile(session.user.id);
      },
      signOut: async () => {
        await supabase.auth.signOut();
        setProfile(null);
        setSession(null);
        setPremiumActive(false);
      },
    };
  }, [session, profile, loading, premiumActive]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
