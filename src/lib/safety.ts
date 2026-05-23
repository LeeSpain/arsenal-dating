import { supabase } from '@/lib/supabase';

export const REPORT_REASONS = [
  { label: 'Harassment or abuse', value: 'harassment' },
  { label: 'Inappropriate content', value: 'inappropriate' },
  { label: 'Fake profile', value: 'fake' },
  { label: 'Spam or scam', value: 'spam' },
  { label: 'Underage', value: 'underage' },
  { label: 'Other', value: 'other' },
];

/** Block another user. The DB trigger removes the match + thread; the
 *  public_profiles filter makes them invisible to each other. */
export async function blockUser(myProfileId: string, blockedId: string): Promise<void> {
  const { error } = await supabase
    .from('blocks')
    .insert({ blocker_id: myProfileId, blocked_id: blockedId });
  if (error && !error.message.toLowerCase().includes('duplicate')) throw error;
}

export async function reportUser(
  myProfileId: string,
  reportedId: string,
  reason: string,
  details: string,
): Promise<void> {
  const { error } = await supabase.from('reports').insert({
    reporter_id: myProfileId,
    reported_id: reportedId,
    reason,
    details: details.trim() || null,
    status: 'open',
  });
  if (error) throw error;
}

export type BlockedProfile = {
  blockId: string;
  profileId: string;
  name: string | null;
  photoPath: string | null;
};

export async function listBlocked(): Promise<BlockedProfile[]> {
  const { data, error } = await supabase.rpc('get_my_blocked_profiles');
  if (error) throw error;
  return (data ?? []).map((r: { block_id: string; profile_id: string; display_name: string | null; photo_url: string | null }) => ({
    blockId: r.block_id,
    profileId: r.profile_id,
    name: r.display_name,
    photoPath: r.photo_url,
  }));
}

export async function unblock(blockId: string): Promise<void> {
  const { error } = await supabase.from('blocks').delete().eq('id', blockId);
  if (error) throw error;
}
