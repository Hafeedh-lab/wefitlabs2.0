'use client';

import { FormEvent, useState } from 'react';
import { Check, Loader2 } from 'lucide-react';

const initialState = { status: 'idle' as 'idle' | 'loading' | 'success' | 'error', message: '' };

export default function NewsletterForm() {
  const [state, setState] = useState(initialState);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const email = formData.get('email')?.toString().trim() ?? '';
    const phone = formData.get('phone')?.toString().trim() ?? '';

    if (!email && !phone) {
      setState({ status: 'error', message: 'Please share an email or phone number so we can reach you.' });
      return;
    }

    setState({ status: 'loading', message: '' });

    try {
      const response = await fetch('/api/reminder-signups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email || null, phone: phone || null, eventId: 'newsletter' })
      });

      const body = await response.json().catch(() => null);

      if (!response.ok) {
        setState({
          status: 'error',
          message: (body && 'error' in body ? (body.error as string) : null) || 'We could not save your info. Try again?'
        });
        return;
      }

      form.reset();
      setState({ status: 'success', message: 'You are on the list! We will be in touch soon.' });
    } catch (error) {
      console.error('[newsletter] Failed to submit waitlist form', error);
      setState({ status: 'error', message: 'We could not save your info. Try again?' });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-semibold text-wefit-white">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            inputMode="email"
            placeholder="you@example.com"
            className="w-full rounded-lg border border-white/10 bg-wefit-dark px-4 py-3 text-base text-wefit-white placeholder:text-wefit-grey/60 focus:border-wefit-primary focus:outline-none focus:ring-2 focus:ring-wefit-primary/30"
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="phone" className="text-sm font-semibold text-wefit-white">
            Phone <span className="font-normal text-wefit-grey">(optional)</span>
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            inputMode="tel"
            placeholder="(555) 555-5555"
            className="w-full rounded-lg border border-white/10 bg-wefit-dark px-4 py-3 text-base text-wefit-white placeholder:text-wefit-grey/60 focus:border-wefit-primary focus:outline-none focus:ring-2 focus:ring-wefit-primary/30"
          />
        </div>
      </div>
      <p className="text-xs text-wefit-grey">
        We&apos;ll send you WeFit Labs event updates and bracket drops. Opt out anytime.
      </p>
      <button
        type="submit"
        disabled={state.status === 'loading'}
        className="flex items-center justify-center gap-2 rounded-lg bg-wefit-primary px-6 py-3 text-base font-semibold text-white transition-all duration-200 hover:bg-wefit-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
      >
        {state.status === 'loading' ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Joining…
          </>
        ) : state.status === 'success' ? (
          <>
            <Check className="h-5 w-5" />
            You&apos;re in!
          </>
        ) : (
          'Join the waitlist'
        )}
      </button>
      {state.message ? (
        <p
          className={`text-sm ${
            state.status === 'success' ? 'text-wefit-gold' : 'text-wefit-error'
          }`}
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
