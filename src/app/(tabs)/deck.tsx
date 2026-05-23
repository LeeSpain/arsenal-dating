import { ScreenShell } from '@/components/screen-shell';

// Home tab: the swipe deck. Right = like, left = pass. The deck is built from
// preference filters (age/distance/gender), excludes already-swiped/matched/
// blocked profiles, then the questionnaire boosts ordering only.
export default function Deck() {
  return (
    <ScreenShell
      title="Your deck"
      subtitle="Swipe right to like, left to pass."
      note="Shell only. The matching engine comes later: preference-filtered candidates, questionnaire-weighted ordering, and a guaranteed full deck even for brand-new fans."
    />
  );
}
