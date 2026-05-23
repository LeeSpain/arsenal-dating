import { supabase } from '@/lib/supabase';

/**
 * Full account erasure — the complete GDPR delete path. Invokes the
 * `delete-account` Edge Function (service role) which removes the user's Storage
 * objects AND deletes the auth user, cascading every DB row via FKs.
 *
 * Used by BOTH the GDPR "delete my account" action and the under-18 age-gate
 * failure — deliberately the same complete path, no lighter version.
 *
 * Does NOT sign out: the caller should navigate to a safe (unguarded) route and
 * then sign out, to avoid a guard race while the local session is still present.
 */
export async function eraseAccount(): Promise<void> {
  const { error } = await supabase.functions.invoke('delete-account', {
    method: 'POST',
  });
  if (error) throw error;
}
