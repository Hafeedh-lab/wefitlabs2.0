import Link from 'next/link';

export default function JoinCta() {
  return (
    <section className="mt-16 w-full bg-wefit-dark-muted">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 px-6 py-10 text-center">
        <p className="text-sm uppercase tracking-[0.2em] text-wefit-grey">Next Event</p>
        <h2 className="heading-md">Want in on the next rally?</h2>
        <p className="body-sm max-w-2xl">
          Sign up to get reminders for the next WeFit Labs community showdown and be the first to know when brackets open.
        </p>
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-center">
          <Link
            href="/newsletter"
            className="rounded-lg bg-wefit-primary px-6 py-3 text-base font-semibold text-white shadow-wefit transition-all duration-200 hover:bg-wefit-primary-hover"
          >
            Join the waitlist
          </Link>
          <a
            href="mailto:events@wefitlabs.com"
            className="rounded-lg border border-wefit-primary px-6 py-3 text-base font-semibold text-wefit-primary transition-all duration-200 hover:bg-wefit-primary/10"
          >
            Sponsor an event
          </a>
        </div>
      </div>
    </section>
  );
}
