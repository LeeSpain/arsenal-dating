import { ScreenShell } from '@/components/screen-shell';

// Home tab: the swipe deck. Onboarding is complete by the time you reach here.
// The matching engine (preference-filtered candidates + questionnaire-weighted,
// inclusive ordering) is built in step 5; for now this is the unlocked landing.
export default function Deck() {
  return (
    <ScreenShell
      title="You're all set"
      subtitle="Your deck opens here."
      note="Onboarding complete — your profile is now live and visible to other Gooners. Swiping + matching switch on in step 5 (preference-filtered, questionnaire-weighted, and inclusive: a full deck even with no questionnaire answers)."
    />
  );
}
