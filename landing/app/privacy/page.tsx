import type { Metadata } from 'next';

import { LegalDoc, type LegalSection } from '@/components/legal-doc';

export const metadata: Metadata = {
  title: 'Privacy Policy · Arsenal Dating',
  description: 'What personal data Arsenal Dating collects, why, where it is kept, and your rights over it.',
};

// Initial, good-faith Privacy Policy reflecting exactly what the app does.
// Kept in sync with the in-app policy. Pending final professional legal review.
const SECTIONS: LegalSection[] = [
  {
    heading: 'This website',
    paragraphs: [
      'Right now, arsenaldating.com is a pre-launch waitlist page. The only personal data this website collects is the email address you choose to give us, so we can tell you when the app launches. We don’t sell it, and we’ll only email you about Arsenal Dating.',
      'The rest of this policy describes the Arsenal Dating app itself — what it will collect and how we’ll look after it once it’s live.',
    ],
  },
  {
    heading: '1. Who we are',
    paragraphs: [
      'Arsenal Dating is an independent fan project — a small, early-stage app built by a single Arsenal supporter. It is not affiliated with, endorsed by, or connected to Arsenal Football Club.',
      'For any privacy question, or to exercise your data rights, contact us at privacy@arsenaldating.com.',
    ],
  },
  {
    heading: '2. What we collect, why, and our legal basis',
    paragraphs: [
      'Email and login details — to create and secure your account and to contact you about the service. Basis: performance of the service you sign up for, and your consent.',
      'Date of birth — to confirm you are 18 or over and to calculate your age. Your date of birth is never shown to anyone; other people only ever see your age as a number. Basis: your consent and our legitimate interest in keeping the app adults-only.',
      'Profile photos — to build your profile and show you to potential matches. Basis: your consent.',
      'Arsenal kit photo (optional) — if you submit one, it is reviewed by hand to award a “verified” badge. The kit photo itself is not shown to other users. Basis: your consent.',
      'City-level location — to show you people within the distance you choose. We store only your city (its central coordinates), never your precise or GPS location. Basis: your consent.',
      'Questionnaire answers (favourite players, era, manager, and when you started supporting) — used only to order your matches so people who share your answers appear higher. They never remove anyone from your deck. Basis: your consent.',
      'Preferences (age range, distance, who you want to meet) — to tailor the people you see. Basis: your consent and performance of the service.',
      'Swipes, matches and messages — to run matching and chat. Messages can be seen only by the two people in a match. Basis: performance of the service.',
      'Reports and blocks — to keep people safe and to moderate the community. Basis: our legitimate interest in safety and, where relevant, legal compliance.',
      'Basic technical data — needed to run the app securely, such as authentication tokens and rate-limiting counters. Basis: our legitimate interest in security.',
    ],
  },
  {
    heading: '3. How other people see your data',
    paragraphs: [
      'Other users only ever see a safe version of your profile: your display name, your photos, your age as a number (never your date of birth), your city, and the Arsenal details you chose to share. Your email, your exact date of birth, and your precise data are never shown to other users.',
      'Photos are served through short-lived secure links and cannot be browsed or bulk-downloaded by other users.',
      'For safety, mixed matches use “women message first” — only the woman can send the first message.',
    ],
  },
  {
    heading: '4. Where your data is stored and how it’s protected',
    paragraphs: [
      'Your data is stored with Supabase, hosted in the European Union (Frankfurt, Germany).',
      'Access is restricted by database row-level security, so you can reach only your own data and other users only ever see the safe public view. Photos are kept in private storage. Data is encrypted in transit.',
    ],
  },
  {
    heading: '5. How long we keep your data',
    paragraphs: [
      'We keep your data while your account is active. When you delete your account, we erase your profile, photos, questionnaire, preferences, swipes, matches, messages, and your sign-in record.',
      'We have not yet set fixed retention periods beyond deletion-on-request; we will define these as part of our final policy. We may keep limited records where needed for safety or to meet a legal obligation.',
    ],
  },
  {
    heading: '6. Who we share it with',
    paragraphs: [
      'We do not sell your personal data. We share it only with the infrastructure providers we need to run the app — primarily Supabase, which stores the data on our behalf as our processor — and where we are required to by law.',
    ],
  },
  {
    heading: '7. Your rights',
    paragraphs: [
      'Access and portability — request or export a copy of your data. The app includes a “Request my data” export in a machine-readable format.',
      'Erasure — delete your account and all your data at any time, from within the app.',
      'Rectification — correct your profile details in the app.',
      'Restriction and objection — ask us to limit or stop certain processing.',
      'Withdraw consent — at any time, for example by deleting your account or contacting us.',
      'Complain — you can complain to your local data protection authority.',
      'To exercise any right, use the in-app tools or email privacy@arsenaldating.com.',
    ],
  },
  {
    heading: '8. Children',
    paragraphs: [
      'Arsenal Dating is strictly for adults aged 18 and over. We block under-18 sign-ups and erase any under-18 data.',
    ],
  },
  {
    heading: '9. Changes to this policy',
    paragraphs: [
      'We will update this policy as the app develops and always show the current version here. The version you accept at sign-up is recorded.',
    ],
  },
  {
    heading: '10. Status',
    paragraphs: [
      'This is our initial, good-faith policy and is pending final professional legal review. We will refine it as Arsenal Dating grows.',
    ],
  },
];

export default function PrivacyPage() {
  return (
    <LegalDoc
      title="Privacy Policy"
      updated="Updated 24 May 2026 · v1.0"
      intro="This policy explains what personal data Arsenal Dating collects, why, where it’s kept, and the rights you have over it. We’ve written it to match exactly what the app does."
      sections={SECTIONS}
    />
  );
}
