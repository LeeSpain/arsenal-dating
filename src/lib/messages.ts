import { supabase } from '@/lib/supabase';

export type Message = {
  id: string;
  match_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

// Pairings where the first message is the woman's to send (mirror of the DB
// trigger): one woman + man/other/prefer-not-to-say. Non-binary or same-gender
// pairings let either party open.
const RESTRICTED_OTHERS = ['man', 'other', 'prefer_not_to_say'];

export function firstSenderRole(
  myGender: string | null,
  otherGender: string | null,
): 'me' | 'them' | 'either' {
  if (myGender === 'woman' && otherGender && RESTRICTED_OTHERS.includes(otherGender)) return 'me';
  if (otherGender === 'woman' && myGender && RESTRICTED_OTHERS.includes(myGender)) return 'them';
  return 'either';
}

export async function loadMessages(matchId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('match_id', matchId)
    .order('created_at');
  if (error) throw error;
  return (data ?? []) as Message[];
}

export async function sendMessage(
  matchId: string,
  senderId: string,
  body: string,
): Promise<Message> {
  const { data, error } = await supabase
    .from('messages')
    .insert({ match_id: matchId, sender_id: senderId, body: body.trim() })
    .select()
    .single();
  if (error) throw error;
  return data as Message;
}

/** Subscribe to new messages in a match (Realtime applies the SELECT RLS, so the
 *  channel only delivers messages the user is allowed to read). */
export function subscribeMessages(matchId: string, onInsert: (m: Message) => void): () => void {
  const channel = supabase
    .channel(`messages:${matchId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages', filter: `match_id=eq.${matchId}` },
      (payload) => onInsert(payload.new as Message),
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}
