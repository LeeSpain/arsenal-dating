import { Contact } from '@/components/contact';
import { FansBand } from '@/components/fans-band';
import { Footer } from '@/components/footer';
import { Header } from '@/components/header';
import { Hero } from '@/components/hero';
import { HowItWorks } from '@/components/how-it-works';
import { ValueProps } from '@/components/value-props';
import { Waitlist } from '@/components/waitlist';
import { WaitlistPopup } from '@/components/waitlist-popup';
import { Why } from '@/components/why';

export default function Home() {
  return (
    <main>
      <Header />
      <Hero />
      <ValueProps />
      <HowItWorks />
      <Why />
      <FansBand />
      <Waitlist />
      <Contact />
      <Footer />
      <WaitlistPopup />
    </main>
  );
}
