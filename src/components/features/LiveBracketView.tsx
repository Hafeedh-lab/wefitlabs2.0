'use client';

import { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import { supabaseClient } from '@/lib/supabase-client';
import { cn } from '@/utils/cn';
import type { Database } from '@/types/database';

type MatchRow = Database['public']['Tables']['matches']['Row'];

type MatchWithTeams = MatchRow & {
  team1?: { id: string; team_name: string } | null;
  team2?: { id: string; team_name: string } | null;
};

const fetchMatches = async (eventId: string): Promise<MatchWithTeams[]> => {
  const { data, error } = await supabaseClient
    .from('matches')
    .select(`*, team1:participants(id, team_name), team2:participants(id, team_name)`)
    .eq('event_id', eventId)
    .order('round_number', { ascending: true })
    .order('match_number', { ascending: true });

  if (error) throw error;
  return data ?? [];
};

export default function LiveBracketView({ eventId }: { eventId: string }) {
  const { data: matches, error, mutate, isLoading } = useSWR(
    ['matches', eventId],
    () => fetchMatches(eventId),
    { refreshInterval: 5000 }
  );
  const [animatingMatch, setAnimatingMatch] = useState<string | null>(null);

  useEffect(() => {
    const channel = supabaseClient
      .channel(`event-${eventId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'matches',
          filter: `event_id=eq.${eventId}`
        },
        async (payload) => {
          await mutate();
          if (payload.new?.id) {
            setAnimatingMatch(payload.new.id as string);
            setTimeout(() => setAnimatingMatch(null), 600);
          }
        }
      )
      .subscribe();

    return () => {
      supabaseClient.removeChannel(channel);
    };
  }, [eventId, mutate]);

  const rounds = useMemo(() => {
    if (!matches?.length) return [] as MatchWithTeams[][];
    const grouped = matches.reduce<Record<number, MatchWithTeams[]>>((acc, match) => {
      acc[match.round_number] = acc[match.round_number] ?? [];
      acc[match.round_number].push(match);
      return acc;
    }, {});
    return Object.keys(grouped)
      .map((round) => Number(round))
      .sort((a, b) => a - b)
      .map((key) => grouped[key]);
  }, [matches]);

  const onDeckMatches = useMemo(() => {
    if (!matches) return [] as MatchWithTeams[];
    return matches
      .filter((match) => match.status === 'pending')
      .sort((a, b) => a.match_number - b.match_number)
      .slice(0, 3);
  }, [matches]);

  if (error) {
    return (
      <section className="rounded-2xl border border-wefit-error/40 bg-wefit-dark-muted p-6 text-wefit-grey">
        Failed to load bracket. Please refresh.
      </section>
    );
  }

  if (isLoading) {
    return <SkeletonGrid />;
  }

  if (!matches?.length) {
    return (
      <section className="rounded-2xl border border-white/5 bg-wefit-dark-muted p-8 text-center">
        <p className="text-lg font-semibold text-wefit-white">Tournament starting soon…</p>
        <p className="body-sm mt-2">Check back shortly for live match updates.</p>
      </section>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="overflow-x-auto pb-4">
        <div className="flex min-w-full gap-4">
          {rounds.map((roundMatches, index) => (
            <div key={index} className="flex w-72 flex-col gap-4">
              <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-wefit-grey">
                Round {index + 1}
              </h2>
              {roundMatches.map((match) => (
                <MatchCard key={match.id} match={match} isAnimating={animatingMatch === match.id} />
              ))}
            </div>
          ))}
        </div>
      </div>
      <aside className="sticky top-28 h-fit rounded-2xl border border-white/5 bg-wefit-dark-muted p-6">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-wefit-grey">On Deck</h3>
        <div className="space-y-3">
          {onDeckMatches.length === 0 ? (
            <p className="text-sm text-wefit-grey">No matches queued.</p>
          ) : (
            onDeckMatches.map((match) => (
              <div key={match.id} className="rounded-xl border border-white/5 bg-wefit-dark p-3">
                <p className="text-xs uppercase tracking-[0.2em] text-wefit-grey">
                  Match {match.match_number}
                </p>
                <p className="mt-1 text-sm font-semibold text-wefit-white">
                  {match.team1?.team_name ?? 'TBD'} vs {match.team2?.team_name ?? 'TBD'}
                </p>
                {match.court_number && (
                  <span className="mt-2 inline-flex items-center rounded-full bg-wefit-primary/10 px-2 py-1 text-xs font-semibold text-wefit-primary">
                    Court {match.court_number}
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      </aside>
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="flex gap-4">
        {[...Array(3)].map((_, index) => (
          <div key={index} className="flex w-72 flex-col gap-4">
            <div className="h-4 w-24 rounded bg-white/10" />
            {[...Array(3)].map((__, idx) => (
              <div key={idx} className="h-32 rounded-2xl border border-white/5 bg-wefit-dark-muted/80" />
            ))}
          </div>
        ))}
      </div>
      <div className="h-64 rounded-2xl border border-white/5 bg-wefit-dark-muted/80" />
    </div>
  );
}

interface MatchCardProps {
  match: MatchWithTeams;
  isAnimating: boolean;
}

function MatchCard({ match, isAnimating }: MatchCardProps) {
  const statusStyles = {
    pending: 'border-white/5',
    in_progress: 'border-wefit-primary shadow-wefit',
    completed: 'border-status-completed'
  } as const;

  return (
    <div
      className={cn(
        'rounded-2xl border bg-wefit-dark-muted p-4 transition-all duration-300',
        statusStyles[match.status],
        isAnimating && 'animate-celebrate'
      )}
    >
      {match.status === 'in_progress' && (
        <div className="mb-3 flex items-center gap-2 text-xs text-wefit-grey">
          <span className="inline-flex h-2 w-2 rounded-full bg-wefit-primary animate-pulse-green" />
          Live • {match.court_number ? `Court ${match.court_number}` : 'Court TBD'}
        </div>
      )}
      <TeamRow name={match.team1?.team_name ?? 'TBD'} score={match.team1_score} isWinner={match.winner_id === match.team1_id} />
      <div className="my-3 h-px bg-white/10" />
      <TeamRow name={match.team2?.team_name ?? 'TBD'} score={match.team2_score} isWinner={match.winner_id === match.team2_id} />
      {match.status === 'completed' && (
        <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-wefit-gold">
          🏆 Winner decided
        </span>
      )}
    </div>
  );
}

interface TeamRowProps {
  name: string;
  score: number;
  isWinner: boolean;
}

function TeamRow({ name, score, isWinner }: TeamRowProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex min-w-0 items-center gap-2">
        {isWinner && <span aria-hidden>🏆</span>}
        <span className={cn('truncate font-medium', isWinner ? 'text-wefit-white' : 'text-wefit-grey')}>{name}</span>
      </div>
      <span className={cn('font-mono text-3xl font-bold', isWinner ? 'text-wefit-primary' : 'text-wefit-grey')}>{score}</span>
    </div>
  );
}
