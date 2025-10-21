import NewsletterForm from '@/components/features/NewsletterForm';
import Link from 'next/link';

export const metadata = {
  title: 'Join the WeFit Labs waitlist',
  description: 'Get early access to WeFit Labs events, bracket drops, and sponsor perks.'
};

export default function NewsletterPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-wefit-dark to-wefit-dark-muted pb-24">
      <div className="mx-auto w-full max-w-3xl px-6 pt-24">
        <Link href="/" className="text-sm text-wefit-grey transition-colors hover:text-wefit-white">
          ← Back to events
        </Link>
        <header className="mt-6 space-y-4 text-left">
          <p className="text-sm uppercase tracking-[0.2em] text-wefit-grey">WeFit Labs</p>
          <h1 className="heading-lg text-wefit-white">Join the waitlist</h1>
          <p className="body-sm max-w-2xl text-wefit-grey">
            Be first to know when new tournaments open, snag early-bird registration, and get exclusive perks from our
            partners. Drop your info below and we&apos;ll keep you in the loop.
          </p>
        </header>
        <section className="mt-8 rounded-2xl border border-white/5 bg-wefit-dark-muted p-8 shadow-wefit">
          <h2 className="heading-sm text-wefit-white">Get notified about the next rally</h2>
          <p className="body-sm mt-2 max-w-xl text-wefit-grey">
            We send updates only when there&apos;s something you&apos;ll love—no spam, just the good stuff: bracket releases,
            open play invites, and community highlights.
          </p>
          <NewsletterForm />
        </section>
        <section className="mt-12 grid gap-6 rounded-2xl border border-white/5 bg-wefit-dark-muted p-6 md:grid-cols-3">
          <div className="space-y-2">
            <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-wefit-grey">Exclusive drops</h3>
            <p className="text-sm text-wefit-grey">
              Get first dibs on bracket registrations before they go public.
            </p>
          </div>
          <div className="space-y-2">
            <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-wefit-grey">Player community</h3>
            <p className="text-sm text-wefit-grey">
              Tap into training sessions, player stories, and meetup invites.
            </p>
          </div>
          <div className="space-y-2">
            <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-wefit-grey">Sponsor perks</h3>
            <p className="text-sm text-wefit-grey">
              Unlock early access to partner deals curated for the pickleball obsessed.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
