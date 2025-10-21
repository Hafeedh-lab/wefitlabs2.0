'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Database } from '@/types/database';
import { trackEvent } from '@/lib/analytics';

interface SponsorRibbonProps {
  event: Database['public']['Tables']['events']['Row'];
}

const FALLBACK_PROMOS = [
  {
    cta: 'Train with WeFit Labs NYC',
    url: 'https://wefitlabs.com',
    highlight: 'Join the next experience'
  },
  {
    cta: 'Stay connected with the crew',
    url: 'https://instagram.com/wefitlabsnyc',
    highlight: 'Follow on Instagram'
  }
];

export default function SponsorRibbon({ event }: SponsorRibbonProps) {
  const [dismissed, setDismissed] = useState(false);
  const [slide, setSlide] = useState(0);

  const slides = useMemo(() => {
    if (event.sponsor_name && event.sponsor_cta_text && event.sponsor_cta_url) {
      return [
        {
          cta: event.sponsor_cta_text,
          url: event.sponsor_cta_url,
          logo: event.sponsor_logo_url,
          highlight: event.sponsor_name
        }
      ];
    }
    return FALLBACK_PROMOS;
  }, [event]);

  useEffect(() => {
    const key = `sponsor-dismissed-${event.id}`;
    if (sessionStorage.getItem(key)) {
      setDismissed(true);
    }
  }, [event.id]);

  useEffect(() => {
    if (dismissed) return;
    const timer = setInterval(() => {
      setSlide((prev) => (prev + 1) % slides.length);
    }, 10000);
    return () => clearInterval(timer);
  }, [slides.length, dismissed]);

  useEffect(() => {
    if (dismissed) return;
    trackEvent({ event_type: 'sponsor_view', event_id: event.id, metadata: { sponsor: event.sponsor_name } });
  }, [dismissed, event.id, event.sponsor_name]);

  if (dismissed) return null;

  const activeSlide = slides[slide];

  const handleClick = () => {
    trackEvent({
      event_type: 'sponsor_click',
      event_id: event.id,
      metadata: { sponsor: event.sponsor_name ?? 'WeFit Labs' }
    });
  };

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem(`sponsor-dismissed-${event.id}`, 'true');
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-40 flex items-center justify-center border-b border-white/5 bg-wefit-dark-muted/95 px-3 py-2 backdrop-blur-md">
      <a
        href={activeSlide.url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleClick}
        className="flex w-full max-w-4xl items-center justify-center gap-3 overflow-hidden rounded-full bg-wefit-dark px-4 py-2 text-sm font-medium text-wefit-white transition hover:bg-wefit-dark/80"
      >
        {'logo' in activeSlide && activeSlide.logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={activeSlide.logo} alt={event.sponsor_name ?? 'Sponsor'} className="h-8 w-auto object-contain" />
        ) : (
          <span className="text-wefit-gold">✨</span>
        )}
        <span className="truncate">{activeSlide.cta}</span>
        <span className="hidden rounded-full border border-wefit-primary px-3 py-1 text-xs uppercase tracking-widest text-wefit-primary sm:inline-flex">
          {activeSlide.highlight}
        </span>
      </a>
      <button
        type="button"
        onClick={handleDismiss}
        className="ml-2 hidden rounded-full border border-white/10 px-3 py-1 text-xs text-wefit-grey transition hover:text-wefit-white sm:inline-flex"
        aria-label="Dismiss sponsor ribbon"
      >
        Dismiss
      </button>
    </div>
  );
}
