import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-6 px-6 text-center">
      <span className="rounded-full border border-wefit-primary/40 px-4 py-1 text-sm uppercase tracking-widest text-wefit-grey">
        WeFit Labs Tournament Platform
      </span>
      <h1 className="heading-xl">Live Pickleball Leaderboards</h1>
      <p className="body-md max-w-xl">
        Bring energy to every WeFit Labs NYC community event with real-time scoring, sponsor integrations,
        and offline-ready tools designed for mobile-first experiences.
      </p>
      <div className="flex flex-col items-center gap-3 sm:flex-row">
        <Link
          href="/demo-event"
          className="rounded-lg bg-wefit-primary px-6 py-3 text-base font-semibold text-white shadow-wefit transition-all duration-200 hover:bg-wefit-primary-hover active:scale-95"
        >
          View Demo Event
        </Link>
        <Link
          href="/demo-event/check-in"
          className="rounded-lg border border-wefit-primary px-6 py-3 text-base font-semibold text-wefit-primary transition-all duration-200 hover:bg-wefit-primary/10"
        >
          Try Check-In Flow
        </Link>
      </div>
    </main>
  );
}
