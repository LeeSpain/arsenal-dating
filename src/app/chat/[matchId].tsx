import { useLocalSearchParams } from 'expo-router';

import { ScreenShell } from '@/components/screen-shell';

// Real-time chat for a match. women-message-first is enforced here: on a mixed
// match only the woman can send the first message; the other party sees the open
// thread but can't send until she has. Same-gender / non-binary -> either first.
export default function Chat() {
  const { matchId } = useLocalSearchParams<{ matchId: string }>();

  return (
    <ScreenShell
      title="Chat"
      subtitle={`Match: ${matchId ?? 'unknown'}`}
      note="Shell only. Real version: real-time messages via Supabase subscriptions, with the women-message-first rule enforced before the first send."
    />
  );
}
