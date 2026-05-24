import type { Metadata } from 'next';

import { LegalDoc, type LegalSection } from '@/components/legal-doc';

export const metadata: Metadata = {
  title: 'Terms of Use · Arsenal Dating',
  description: 'The terms for using Arsenal Dating — eligibility, behaviour, safety, your content, and our early-stage service.',
};

// Initial, good-faith Terms of Use. Kept in sync with the in-app terms.
// Pending final professional legal review.
const SECTIONS: LegalSection[] = [
  {
    heading: '1. About these terms',
    paragraphs: [
      'Arsenal Dating is an independent fan project, not affiliated with, endorsed by, or connected to Arsenal Football Club. By creating an account or using the app, you agree to these terms.',
    ],
  },
  {
    heading: '2. Eligibility',
    paragraphs: [
      'You must be 18 or over to use Arsenal Dating. We block under-18 sign-ups, and we remove accounts and data we find to be under 18.',
    ],
  },
  {
    heading: '3. The service',
    paragraphs: [
      'This is an early-stage app and a learning start-up, built by one fan. It is provided “as is”, features will change, and there will be rough edges as it grows. Thanks for being here early.',
    ],
  },
  {
    heading: '4. Your account',
    paragraphs: [
      'Give accurate information, keep your login details secure, and you are responsible for activity on your account. One account per person.',
    ],
  },
  {
    heading: '5. How to behave',
    paragraphs: [
      'Be respectful, fan-to-fan. Do not harass, abuse, threaten, or impersonate anyone; do not post hateful, explicit, illegal, or spam content; do not scrape or misuse the app or other people’s data.',
      'In mixed matches, the woman sends the first message — please respect that. We may rate-limit actions to prevent flooding and abuse.',
    ],
  },
  {
    heading: '6. Safety and moderation',
    paragraphs: [
      'You can report and block other users. We operate a manual review queue, and we may warn, suspend, or remove accounts that break these terms or put others’ safety at risk.',
    ],
  },
  {
    heading: '7. Your content',
    paragraphs: [
      'You keep ownership of the photos and messages you create. You grant us the limited permission needed to store and display them within the app so we can provide the service. Only upload content you have the right to share, and never anything explicit or abusive.',
    ],
  },
  {
    heading: '8. Your privacy',
    paragraphs: ['We handle your personal data as described in our Privacy Policy.'],
  },
  {
    heading: '9. Ending your use',
    paragraphs: [
      'You can delete your account and all your data at any time from within the app. We may suspend or terminate accounts that breach these terms.',
    ],
  },
  {
    heading: '10. Disclaimers and liability',
    paragraphs: [
      'The app is provided “as is” and “as available”, without warranties. As a small, early project we cannot guarantee uninterrupted service, matches, or outcomes. To the fullest extent permitted by law, our liability is limited. (Final wording here is subject to legal review.)',
    ],
  },
  {
    heading: '11. Changes',
    paragraphs: [
      'We may update these terms; we’ll show the current version, and continued use means you accept it.',
    ],
  },
  {
    heading: '12. Governing law and contact',
    paragraphs: [
      'The operator is based in the EU; the governing law will be confirmed as part of final legal review. Questions: privacy@arsenaldating.com.',
    ],
  },
  {
    heading: '13. Status',
    paragraphs: ['This is our initial, good-faith version pending final professional legal review.'],
  },
];

export default function TermsPage() {
  return (
    <LegalDoc
      title="Terms of Use"
      updated="Updated 24 May 2026 · v1.0"
      intro="These terms cover using Arsenal Dating — who can use it, how to behave, safety, your content, and the basics of our (early-stage) service."
      sections={SECTIONS}
    />
  );
}
