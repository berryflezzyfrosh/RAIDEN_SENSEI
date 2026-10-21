import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
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
  refreshProfile: (userId?: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const [premiumActive, setPremiumActive] = useState(false);
  const premiumExpiryTimer = useRef<number | null>(null);

  const loadProfile = async (uid: string) => {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', uid)
      .maybeSingle();
    if (error) {
      console.warn('profile load error', error.message);
      setProfile(null);
      setPremiumActive(false);
      if (premiumExpiryTimer.current !== null) window.clearTimeout(premiumExpiryTimer.current);
      premiumExpiryTimer.current = null;
      return;
    }
    setProfile(data as UserProfile | null);
    if (!data) {
      setPremiumActive(false);
      if (premiumExpiryTimer.current !== null) window.clearTimeout(premiumExpiryTimer.current);
      premiumExpiryTimer.current = null;
      return;
    }
    // Authoritative premium check via server RPC
    const { data: prem } = await supabase.rpc('get_my_premium_status').maybeSingle();
    const status = prem as { is_active?: boolean; expiry_date?: string | null } | null;
    const isActive = Boolean(status?.is_active);
    const expiry = status?.expiry_date ? Date.parse(status.expiry_date) : NaN;
    setPremiumActive(isActive);
    if (premiumExpiryTimer.current !== null) window.clearTimeout(premiumExpiryTimer.current);
    premiumExpiryTimer.current = isActive && Number.isFinite(expiry) && expiry > Date.now()
      ? window.setTimeout(() => { void loadProfile(uid); }, expiry - Date.now() + 250)
      : null;
  };

  const loadProfileRef = useRef(loadProfile);
  loadProfileRef.current = loadProfile;

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      const uid = data.session?.user?.id;
      if (uid) {
        loadProfileRef.current(uid).finally(() => mounted && setLoading(false));
      } else {
        setLoading(false);
      }
    });

    // onAuthStateChange: wrap async work in IIFE to avoid deadlock
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      (async () => {
        setSession(sess);
        if (sess?.user?.id) {
          await loadProfileRef.current(sess.user.id);
        } else {
          setProfile(null);
          setPremiumActive(false);
          if (premiumExpiryTimer.current !== null) window.clearTimeout(premiumExpiryTimer.current);
          premiumExpiryTimer.current = null;
        }
        setLoading(false);
      })();
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
      if (premiumExpiryTimer.current !== null) window.clearTimeout(premiumExpiryTimer.current);
    };
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    return {
      session,
      user: session?.user ?? null,
      profile,
      loading,
      isPremium: Boolean(profile?.is_admin && profile.account_status === 'active') || premiumActive,
      isAdmin: profile?.is_admin ?? false,
      refreshProfile: async (userId) => {
        const uid = userId ?? session?.user?.id;
        if (uid) await loadProfileRef.current(uid);
      },
      signOut: async () => {
        await supabase.auth.signOut();
        setProfile(null);
        setSession(null);
        setPremiumActive(false);
        if (premiumExpiryTimer.current !== null) window.clearTimeout(premiumExpiryTimer.current);
        premiumExpiryTimer.current = null;
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
