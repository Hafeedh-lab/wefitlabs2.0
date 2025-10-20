'use client';

import { useMemo, useState } from 'react';
import type { Database } from '@/types/database';
import { trackEvent } from '@/lib/analytics';

type MatchRow = Database['public']['Tables']['matches']['Row'];

type ShareMatch = MatchRow & {
  team1?: { team_name?: string | null } | null;
  team2?: { team_name?: string | null } | null;
};

interface SharePanelProps {
  match: ShareMatch;
  eventId: string;
}

export default function SharePanel({ match, eventId }: SharePanelProps) {
  const [copied, setCopied] = useState(false);
  const shareUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}/${eventId}/share/${match.id}`;
  }, [eventId, match.id]);

  const handleShare = async () => {
    trackEvent({ event_type: 'share', event_id: eventId, metadata: { match_id: match.id } });

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'WeFit Labs Match Result',
          text: `${match.team1?.team_name ?? 'Team A'} vs ${match.team2?.team_name ?? 'Team B'}`,
          url: shareUrl
        });
      } catch (error) {
        console.warn('Share cancelled', error);
      }
      return;
    }

    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full max-w-xl rounded-3xl border border-white/5 bg-wefit-dark-muted p-8 shadow-wefit-lg">
      <p className="text-sm uppercase tracking-[0.2em] text-wefit-grey">Share result</p>
      <h1 className="mt-2 text-3xl font-bold text-wefit-white">
        {match.team1?.team_name ?? 'Team A'} vs {match.team2?.team_name ?? 'Team B'}
      </h1>
      <p className="mt-1 font-mono text-5xl font-bold text-wefit-primary">
        {match.team1_score} - {match.team2_score}
      </p>
      <p className="mt-4 text-sm text-wefit-grey">
        Download the social share image or copy the link to brag about your win.
      </p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <a
          href={`/${eventId}/share/${match.id}?download=1`}
          className="flex-1 rounded-lg border border-wefit-primary px-4 py-3 text-center text-sm font-semibold text-wefit-primary transition hover:bg-wefit-primary/10"
        >
          Download image
        </a>
        <button
          onClick={handleShare}
          className="flex-1 rounded-lg bg-wefit-primary px-4 py-3 text-sm font-semibold text-white shadow-wefit transition hover:bg-wefit-primary-hover"
        >
          {copied ? 'Copied!' : 'Share result'}
        </button>
      </div>
    </div>
  );
}
