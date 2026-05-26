import { FansBand } from '@/components/fans-band';
import { Footer } from '@/components/footer';
import { Header } from '@/components/header';
import { Hero } from '@/components/hero';
import { ValueProps } from '@/components/value-props';
import { Waitlist } from '@/components/waitlist';
import { Why } from '@/components/why';

export default function Home() {
  return (
    <main>
      <Header />
      <Hero />
      <ValueProps />
      <Why />
      <FansBand />
      <Waitlist />
      <Footer />
    </main>
  );
}
