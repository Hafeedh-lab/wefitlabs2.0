'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter, useSearchParams } from 'next/navigation';
import confetti from 'canvas-confetti';
import { Check, Loader2 } from 'lucide-react';
import { checkInSchema, type CheckInFormValues } from '@/lib/validation';
import { sanitizeInput } from '@/utils/sanitize';
import { supabaseClient } from '@/lib/supabase-client';
import { useToast } from '@/components/ui/ToastProvider';
import { trackEvent, getSessionId } from '@/lib/analytics';

interface CheckInPageProps {
  params: { eventId: string };
}

export default function CheckInPage({ params }: CheckInPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const source = searchParams.get('source');
  const { showToast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isSubmitSuccessful }
  } = useForm<CheckInFormValues>({
    resolver: zodResolver(checkInSchema),
    defaultValues: { consentMarketing: false }
  });

  useEffect(() => {
    trackEvent({
      event_type: 'qr_scan',
      event_id: params.eventId,
      metadata: { source: source ?? 'direct', referrer: typeof document !== 'undefined' ? document.referrer : '' }
    });
  }, [params.eventId, source]);

  useEffect(() => {
    if (!('credentials' in navigator)) return;
    navigator.credentials
      .get({
        federated: { providers: ['https://accounts.google.com'] },
        mediation: 'silent'
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (isSubmitSuccessful) {
      confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
      const timeout = setTimeout(() => {
        router.push(`/${params.eventId}`);
      }, 2000);
      return () => clearTimeout(timeout);
    }
  }, [isSubmitSuccessful, params.eventId, router]);

  const onSubmit = handleSubmit(async (values) => {
    const sanitized = {
      first_name: sanitizeInput(values.firstName)?.trim(),
      team_name: sanitizeInput(values.teamName)?.trim(),
      email: sanitizeInput(values.email ?? '') || null,
      phone: sanitizeInput(values.phone ?? '') || null,
      consent_marketing: values.consentMarketing,
      event_id: params.eventId,
      session_id: getSessionId()
    };

    const { error } = await supabaseClient.from('participants').insert({
      event_id: sanitized.event_id,
      first_name: sanitized.first_name ?? '',
      team_name: sanitized.team_name ?? '',
      email: sanitized.email,
      phone: sanitized.phone,
      consent_marketing: sanitized.consent_marketing
    });

    if (error) {
      console.error(error);
      showToast('Unable to complete check-in. Please try again.', 'error');
      return;
    }

    trackEvent({
      event_type: 'check_in',
      event_id: params.eventId,
      metadata: {
        consent: values.consentMarketing,
        has_email: Boolean(values.email),
        has_phone: Boolean(values.phone)
      }
    });
    showToast('You\'re checked in! 🎉', 'success');
  });

  return (
    <main className="flex min-h-screen flex-col items-center bg-wefit-dark px-4 pt-24">
      <div className="w-full max-w-md rounded-2xl border border-white/5 bg-wefit-dark-muted p-6 shadow-wefit">
        <div className="mb-6 space-y-2 text-center">
          <p className="text-sm uppercase tracking-[0.2em] text-wefit-grey">WeFit Labs Check-In</p>
          <h1 className="heading-md">You\'re almost on court</h1>
          <p className="body-sm">Fill this out once per team so we can keep the bracket buzzing.</p>
        </div>
        <form className="space-y-4" onSubmit={onSubmit}>
          <FormField label="First name" error={errors.firstName?.message}>
            <input
              {...register('firstName')}
              autoComplete="given-name"
              className="w-full rounded-lg border border-white/10 bg-wefit-dark px-4 py-3 text-base text-wefit-white placeholder:text-wefit-grey/60 focus:border-wefit-primary focus:outline-none focus:ring-2 focus:ring-wefit-primary/30"
              placeholder="Ava"
              required
            />
          </FormField>
          <FormField label="Team name" error={errors.teamName?.message}>
            <input
              {...register('teamName')}
              autoComplete="organization"
              className="w-full rounded-lg border border-white/10 bg-wefit-dark px-4 py-3 text-base text-wefit-white placeholder:text-wefit-grey/60 focus:border-wefit-primary focus:outline-none focus:ring-2 focus:ring-wefit-primary/30"
              placeholder="Smash Sisters"
              required
            />
          </FormField>
          <FormField label="Email" error={errors.email?.message} optional>
            <input
              {...register('email')}
              type="email"
              inputMode="email"
              autoComplete="email"
              className="w-full rounded-lg border border-white/10 bg-wefit-dark px-4 py-3 text-base text-wefit-white placeholder:text-wefit-grey/60 focus:border-wefit-primary focus:outline-none focus:ring-2 focus:ring-wefit-primary/30"
              placeholder="you@example.com"
            />
          </FormField>
          <FormField label="Phone" error={errors.phone?.message} optional>
            <input
              {...register('phone')}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              className="w-full rounded-lg border border-white/10 bg-wefit-dark px-4 py-3 text-base text-wefit-white placeholder:text-wefit-grey/60 focus:border-wefit-primary focus:outline-none focus:ring-2 focus:ring-wefit-primary/30"
              placeholder="(555) 555-5555"
            />
          </FormField>
          <label className="flex items-start gap-3 rounded-xl border border-white/5 bg-wefit-dark px-4 py-3 text-left text-sm text-wefit-grey">
            <input type="checkbox" {...register('consentMarketing')} className="mt-1 h-5 w-5 rounded border-white/20 bg-wefit-dark text-wefit-primary focus:ring-wefit-primary" />
            <span>
              I agree to receive updates about future WeFit Labs events. You can opt out anytime.
              <a href="/privacy" className="ml-1 text-wefit-primary underline" target="_blank" rel="noopener noreferrer">
                Privacy policy
              </a>
            </span>
          </label>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-wefit-primary px-4 py-3 text-base font-semibold text-white transition-all duration-200 hover:bg-wefit-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Checking in…
              </>
            ) : isSubmitSuccessful ? (
              <>
                <Check className="h-5 w-5" />
                You\'re in!
              </>
            ) : (
              'Check in'
            )}
          </button>
        </form>
      </div>
    </main>
  );
}

function FormField({
  label,
  error,
  children,
  optional
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
  optional?: boolean;
}) {
  return (
    <div className="space-y-2 text-left">
      <div className="flex items-center justify-between text-sm text-wefit-grey">
        <span className="font-semibold text-wefit-white">{label}</span>
        {optional ? <span className="text-xs text-wefit-grey/70">Optional</span> : null}
      </div>
      {children}
      {error ? <p className="text-xs text-wefit-error">{error}</p> : null}
    </div>
  );
}
