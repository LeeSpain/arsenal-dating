import type { Session } from '@supabase/supabase-js';
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { supabase } from '@/lib/supabase';

/** What we need to route the user and gate admin features. */
type ProfileStatus = {
  exists: boolean;
  onboardingCompleted: boolean;
  onboardingStep: string;
  isAdmin: boolean;
};

type SessionContextValue = {
  session: Session | null;
  profileStatus: ProfileStatus | null; // null until known
  loading: boolean; // true during the initial resolve
  refreshProfileStatus: () => Promise<void>;
  signOut: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | undefined>(undefined);

async function fetchProfileStatus(): Promise<ProfileStatus> {
  // Owner-only RLS: this only ever returns the caller's own row.
  const { data, error } = await supabase
    .from('profiles')
    .select('id, onboarding_completed, onboarding_step, is_admin')
    .maybeSingle();

  if (error || !data) {
    return { exists: false, onboardingCompleted: false, onboardingStep: 'profile', isAdmin: false };
  }
  return {
    exists: true,
    onboardingCompleted: !!data.onboarding_completed,
    onboardingStep: (data.onboarding_step as string) ?? 'profile',
    isAdmin: !!data.is_admin,
  };
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profileStatus, setProfileStatus] = useState<ProfileStatus | null>(null);
  const [loading, setLoading] = useState(true);

  async function resolveFor(nextSession: Session | null) {
    setSession(nextSession);
    if (nextSession) {
      setProfileStatus(await fetchProfileStatus());
    } else {
      setProfileStatus(null);
    }
  }

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      await resolveFor(data.session);
      if (active) setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      resolveFor(nextSession);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<SessionContextValue>(
    () => ({
      session,
      profileStatus,
      loading,
      refreshProfileStatus: async () => setProfileStatus(await fetchProfileStatus()),
      signOut: async () => {
        await supabase.auth.signOut();
      },
    }),
    [session, profileStatus, loading],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within a SessionProvider');
  return ctx;
}
