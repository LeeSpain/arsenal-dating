import type { Session } from '@supabase/supabase-js';
import { router } from 'expo-router';
import {
  createContext,
  useCallback,
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
  isSuspended: boolean;
};

type SessionContextValue = {
  session: Session | null;
  profileStatus: ProfileStatus | null; // null until known
  loading: boolean; // true during the initial resolve
  /**
   * True while the user is in the middle of a password-reset flow (a recovery
   * link was just opened). The entry router consults this so it doesn't bounce
   * them to the deck; reset-password.tsx clears it once the new password is set.
   */
  isPasswordRecovery: boolean;
  clearPasswordRecovery: () => void;
  refreshProfileStatus: () => Promise<void>;
  signOut: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | undefined>(undefined);

async function fetchProfileStatus(): Promise<ProfileStatus> {
  // Owner-only RLS: this only ever returns the caller's own row.
  const { data, error } = await supabase
    .from('profiles')
    .select('id, onboarding_completed, onboarding_step, is_admin, is_suspended')
    .maybeSingle();

  if (error || !data) {
    return {
      exists: false,
      onboardingCompleted: false,
      onboardingStep: 'profile',
      isAdmin: false,
      isSuspended: false,
    };
  }
  return {
    exists: true,
    onboardingCompleted: !!data.onboarding_completed,
    onboardingStep: (data.onboarding_step as string) ?? 'profile',
    isAdmin: !!data.is_admin,
    isSuspended: !!data.is_suspended,
  };
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profileStatus, setProfileStatus] = useState<ProfileStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

  async function resolveFor(nextSession: Session | null) {
    setSession(nextSession);
    if (nextSession) {
      setProfileStatus(await fetchProfileStatus());
    } else {
      setProfileStatus(null);
    }
  }

  const clearPasswordRecovery = useCallback(() => setIsPasswordRecovery(false), []);

  useEffect(() => {
    let active = true;

    // Subscribe FIRST so a PASSWORD_RECOVERY event fired during Supabase's
    // initial URL-hash parse can never slip past us. (Previously the listener
    // came after getSession(), opening a window where we'd miss the event and
    // the entry router would treat the recovery session as a normal sign-in
    // and bounce the user to /deck.)
    const { data: sub } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!active) return;
      if (event === 'PASSWORD_RECOVERY') {
        // Wherever the email link landed the user (e.g. `/` if the Supabase
        // redirect-allowlist didn't honour our redirectTo), force them onto
        // the reset screen. router.replace is idempotent when already there.
        setIsPasswordRecovery(true);
        router.replace('/reset-password');
      } else if (event === 'SIGNED_OUT') {
        setIsPasswordRecovery(false);
      }
      resolveFor(nextSession);
    });

    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      await resolveFor(data.session);
      if (active) setLoading(false);
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
      isPasswordRecovery,
      clearPasswordRecovery,
      refreshProfileStatus: async () => setProfileStatus(await fetchProfileStatus()),
      signOut: async () => {
        await supabase.auth.signOut();
      },
    }),
    [session, profileStatus, loading, isPasswordRecovery, clearPasswordRecovery],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within a SessionProvider');
  return ctx;
}
