'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Database } from '@/types/database';
import { trackEvent } from '@/lib/analytics';
import { getRedemptionCode, markCodeAsRedeemed, isCodeRedeemed } from '@/utils/redemption';
import { X, Copy, CheckCircle } from 'lucide-react';

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
  const [showRedemptionModal, setShowRedemptionModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [redeemed, setRedeemed] = useState(false);

  const hasSponsor = event.sponsor_name && event.sponsor_cta_text;

  const slides = useMemo(() => {
    if (hasSponsor && event.sponsor_cta_url) {
      return [
        {
          cta: event.sponsor_cta_text!,
          url: event.sponsor_cta_url,
          logo: event.sponsor_logo_url,
          highlight: event.sponsor_name!
        }
      ];
    }
    return FALLBACK_PROMOS;
  }, [event, hasSponsor]);

  useEffect(() => {
    const key = `sponsor-dismissed-${event.id}`;
    if (sessionStorage.getItem(key)) {
      setDismissed(true);
    }

    // Check if code is already redeemed
    if (hasSponsor) {
      setRedeemed(isCodeRedeemed(event.id));
    }
  }, [event.id, hasSponsor]);

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

  const handleClick = (e: React.MouseEvent) => {
    // If has sponsor, show redemption modal instead of navigating
    if (hasSponsor) {
      e.preventDefault();
      setShowRedemptionModal(true);
    }

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

  const redemptionCode = hasSponsor
    ? getRedemptionCode(
        event.id,
        event.sponsor_name!,
        event.sponsor_cta_text || 'Exclusive tournament offer'
      )
    : null;

  const handleCopyCode = async () => {
    if (!redemptionCode) return;

    try {
      await navigator.clipboard.writeText(redemptionCode.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy code:', error);
    }
  };

  const handleRedeem = async () => {
    if (!redemptionCode) return;

    try {
      const response = await fetch('/api/sponsors/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: redemptionCode.code,
          eventId: event.id
        })
      });

      if (response.ok) {
        markCodeAsRedeemed(event.id);
        setRedeemed(true);
      }
    } catch (error) {
      console.error('Failed to redeem code:', error);
    }
  };

  return (
    <>
      <div className="fixed top-0 left-0 right-0 z-40 flex items-center justify-center border-b border-white/5 bg-wefit-dark-muted/95 px-3 py-2 backdrop-blur-md">
        <a
          href={activeSlide.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleClick}
          className="flex w-full max-w-4xl items-center justify-center gap-3 overflow-hidden rounded-full bg-wefit-dark px-4 py-2 text-sm font-medium text-wefit-white transition hover:bg-wefit-dark/80 cursor-pointer"
        >
          {'logo' in activeSlide && activeSlide.logo ? (
            <img src={activeSlide.logo} alt={event.sponsor_name ?? 'Sponsor'} className="h-8 w-auto object-contain" />
          ) : (
            <span className="text-wefit-gold">✨</span>
          )}
          <span className="truncate">{activeSlide.cta}</span>
          <span className="hidden rounded-full border border-wefit-primary px-3 py-1 text-xs uppercase tracking-widest text-wefit-primary sm:inline-flex">
            {hasSponsor ? 'Click for code' : activeSlide.highlight}
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

      {/* Redemption Modal */}
      {showRedemptionModal && redemptionCode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-wefit-dark-muted p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-wefit-white">
                {event.sponsor_name || 'Sponsor'} Offer
              </h2>
              <button
                onClick={() => setShowRedemptionModal(false)}
                className="text-wefit-grey hover:text-wefit-white"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {event.sponsor_logo_url && (
              <div className="mb-4 flex justify-center">
                <img
                  src={event.sponsor_logo_url}
                  alt={event.sponsor_name || 'Sponsor'}
                  className="h-16 w-auto object-contain"
                />
              </div>
            )}

            <p className="mb-6 text-center text-sm text-wefit-grey">
              {redemptionCode.offer}
            </p>

            <div className="mb-6 rounded-lg border-2 border-dashed border-wefit-primary bg-wefit-primary/10 p-6 text-center">
              <p className="mb-2 text-xs uppercase tracking-wider text-wefit-grey">
                Your Exclusive Code
              </p>
              <p className="font-mono text-3xl font-bold text-wefit-primary">
                {redemptionCode.code}
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={handleCopyCode}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-wefit-primary px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-wefit-primary-hover"
              >
                {copied ? (
                  <>
                    <CheckCircle className="h-5 w-5" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-5 w-5" />
                    Copy Code
                  </>
                )}
              </button>

              {!redeemed && (
                <button
                  onClick={handleRedeem}
                  className="w-full rounded-lg border border-white/10 px-4 py-3 text-sm font-semibold text-wefit-white transition-colors hover:bg-white/5"
                >
                  Mark as Redeemed
                </button>
              )}

              {redeemed && (
                <div className="flex items-center justify-center gap-2 rounded-lg bg-green-500/10 px-4 py-3 text-sm font-semibold text-green-400">
                  <CheckCircle className="h-5 w-5" />
                  Code Redeemed
                </div>
              )}
            </div>

            <p className="mt-4 text-center text-xs text-wefit-grey">
              Show this code at the {event.sponsor_name || 'sponsor'} booth to claim your offer
            </p>
          </div>
        </div>
      )}
    </>
  );
}
