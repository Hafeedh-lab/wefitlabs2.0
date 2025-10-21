'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase-client';
import type { Database } from '@/types/database';
import { offlineQueue } from '@/lib/offline-queue';
import { cn } from '@/utils/cn';
import { useToast } from '@/components/ui/ToastProvider';
import { trackEvent } from '@/lib/analytics';
import { ChevronDown, ChevronUp, Trophy, Undo2 } from 'lucide-react';

type MatchRow = Database['public']['Tables']['matches']['Row'];

interface MatchWithTeams extends MatchRow {
  team1?: { id: string; team_name: string } | null;
  team2?: { id: string; team_name: string } | null;
}

type Filter = 'all' | 'in_progress' | 'completed';

type ActionHistoryItem = {
  id: string;
  matchId: string;
  team: 'team1' | 'team2';
  previousScore: number;
};

export default function ScorerPage() {
  const params = useParams<{ eventId: string }>();
  const { showToast } = useToast();
  const [matches, setMatches] = useState<MatchWithTeams[]>([]);
  const [expandedRounds, setExpandedRounds] = useState<Record<number, boolean>>({});
  const [filter, setFilter] = useState<Filter>('in_progress');
  const [isSyncing, setIsSyncing] = useState(false);
  const [history, setHistory] = useState<ActionHistoryItem[]>([]);

  useEffect(() => {
    if (!params?.eventId) return;

    const supabase = getSupabaseClient();

    const fetchMatches = async () => {
      const { data, error } = await supabase
        .from('matches')
        .select(`*, team1:participants(id, team_name), team2:participants(id, team_name)`)
        .eq('event_id', params.eventId)
        .order('round_number', { ascending: true })
        .order('match_number', { ascending: true });
      if (error) {
        console.error(error);
        showToast('Unable to load matches', 'error');
        return;
      }
      setMatches(data ?? []);
    };

    fetchMatches();

    const channel = supabase
      .channel(`scorer-${params.eventId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches', filter: `event_id=eq.${params.eventId}` }, (payload: any) => {
        setMatches((prev) => {
          const updated = prev.map((match) => (match.id === payload.new?.id ? (payload.new as MatchWithTeams) : match));
          return updated;
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [params.eventId, showToast]);

  const groupedByRound = useMemo(() => {
    return matches.reduce<Record<number, MatchWithTeams[]>>((acc, match) => {
      if (!acc[match.round_number]) acc[match.round_number] = [];
      acc[match.round_number].push(match);
      return acc;
    }, {});
  }, [matches]);

  const toggleRound = (round: number) => {
    setExpandedRounds((prev) => ({ ...prev, [round]: !prev[round] }));
  };

  const applyScoreUpdate = async (match: MatchWithTeams, team: 'team1' | 'team2', delta: number) => {
    const column = team === 'team1' ? 'team1_score' : 'team2_score';
    const newScore = Math.max(0, (match as any)[column] + delta);

    const payload = { [column]: newScore, updated_at: new Date().toISOString() } as Record<string, unknown>;

    setMatches((prev) =>
      prev.map((item) =>
        item.id === match.id
          ? ({ ...item, [column]: newScore } as MatchWithTeams)
          : item
      )
    );

    setHistory((prev) => [{ id: crypto.randomUUID(), matchId: match.id, team, previousScore: (match as any)[column] }, ...prev.slice(0, 4)]);

    try {
      const supabase = getSupabaseClient();
      // @ts-ignore - Type inference issue with Supabase generic
      await supabase.from('matches').update(payload).eq('id', match.id);
      trackEvent({ event_type: 'match_update', event_id: params.eventId, metadata: { match_id: match.id, column, newScore } });
    } catch (error) {
      console.error(error);
      await offlineQueue.add({ type: 'score_update', payload: { ...payload, match_id: match.id } });
      showToast('Offline: score will sync when online', 'info');
    }
  };

  const undoLastAction = async () => {
    const last = history[0];
    if (!last) return;
    const column = last.team === 'team1' ? 'team1_score' : 'team2_score';
    setMatches((prev) =>
      prev.map((match) =>
        match.id === last.matchId ? ({ ...match, [column]: last.previousScore } as MatchWithTeams) : match
      )
    );
    try {
      const supabase = getSupabaseClient();
      const payload = { [column]: last.previousScore, updated_at: new Date().toISOString() };
      // @ts-ignore - Type inference issue with Supabase generic
      await supabase.from('matches').update(payload).eq('id', last.matchId);
    } catch (error) {
      console.error(error);
    }
    setHistory((prev) => prev.slice(1));
  };

  const declareWinner = async (match: MatchWithTeams) => {
    if (match.team1_score === match.team2_score) {
      showToast('Cannot declare a tie. Update the score first.', 'error');
      return;
    }
    const winnerId = match.team1_score > match.team2_score ? match.team1_id : match.team2_id;
    const payload = {
      status: 'completed',
      winner_id: winnerId,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    setMatches((prev) => prev.map((item) => (item.id === match.id ? ({ ...item, ...payload } as MatchWithTeams) : item)));
    try {
      const supabase = getSupabaseClient();
      // @ts-ignore - Type inference issue with Supabase generic
      await supabase.from('matches').update(payload).eq('id', match.id);
      showToast('Winner saved', 'success');
    } catch (error) {
      console.error(error);
      await offlineQueue.add({ type: 'match_complete', payload: { ...payload, match_id: match.id } });
      showToast('Offline: winner will sync when online', 'info');
    }
  };

  return (
    <main className="min-h-screen bg-wefit-dark px-4 pt-24">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <header className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-white/5 bg-wefit-dark-muted px-5 py-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-wefit-grey">Scorer Console</p>
            <h1 className="heading-md">Court control</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className={cn('flex items-center gap-2 rounded-full border px-3 py-1 text-xs', isSyncing ? 'border-wefit-primary text-wefit-primary' : 'border-white/10 text-wefit-grey')}>
              <span className={cn('h-2 w-2 rounded-full', isSyncing ? 'bg-wefit-primary animate-pulse-green' : 'bg-wefit-grey')} />
              {isSyncing ? 'Syncing' : 'Live'}
            </div>
            <button
              type="button"
              onClick={async () => {
                setIsSyncing(true);
                try {
                  const supabase = getSupabaseClient();
                  const { data } = await supabase
                    .from('matches')
                    .select(`*, team1:participants(id, team_name), team2:participants(id, team_name)`)
                    .eq('event_id', params.eventId)
                    .order('round_number', { ascending: true })
                    .order('match_number', { ascending: true });
                  setMatches(data ?? []);
                } finally {
                  setIsSyncing(false);
                }
              }}
              className="rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-wefit-grey transition hover:text-wefit-white"
            >
              Refresh
            </button>
            <button
              type="button"
              onClick={undoLastAction}
              disabled={history.length === 0}
              className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-wefit-grey transition hover:text-wefit-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Undo2 className="h-4 w-4" /> Undo
            </button>
          </div>
        </header>

        <div className="flex flex-wrap items-center gap-3">
          {(['in_progress', 'all', 'completed'] as Filter[]).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setFilter(option)}
              className={cn(
                'rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em]',
                filter === option
                  ? 'bg-wefit-primary text-white shadow-wefit'
                  : 'border border-white/10 text-wefit-grey hover:text-wefit-white'
              )}
            >
              {option.replace('_', ' ')}
            </button>
          ))}
        </div>

        <section className="space-y-4">
          {Object.entries(groupedByRound).map(([roundNumber, roundMatches]) => {
            const isExpanded = expandedRounds[Number(roundNumber)] ?? true;
            return (
              <div key={roundNumber} className="overflow-hidden rounded-2xl border border-white/5 bg-wefit-dark-muted">
                <button
                  type="button"
                  onClick={() => toggleRound(Number(roundNumber))}
                  className="flex w-full items-center justify-between px-5 py-4 text-left text-sm font-semibold uppercase tracking-[0.2em] text-wefit-grey"
                >
                  Round {roundNumber}
                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                {isExpanded && (
                  <div className="divide-y divide-white/5">
                    {roundMatches
                      .filter((match) => filter === 'all' || match.status === filter)
                      .map((match) => (
                        <div key={match.id} className="grid gap-4 px-5 py-4 sm:grid-cols-[1.5fr_1fr] sm:items-center">
                          <div className="space-y-1">
                            <p className="text-xs uppercase tracking-[0.2em] text-wefit-grey">
                              Match {match.match_number} • {match.court_number ? `Court ${match.court_number}` : 'Court TBD'}
                            </p>
                            <p className="text-lg font-semibold text-wefit-white">
                              {match.team1?.team_name ?? 'TBD'} vs {match.team2?.team_name ?? 'TBD'}
                            </p>
                            <p className="text-xs text-wefit-grey">
                              Status: {match.status.replace('_', ' ')}
                            </p>
                          </div>
                          <div className="flex flex-col gap-3">
                            <ScoreControls match={match} onUpdate={applyScoreUpdate} />
                            <button
                              type="button"
                              onClick={() => declareWinner(match)}
                              className="flex items-center justify-center gap-2 rounded-lg border border-wefit-primary px-4 py-2 text-sm font-semibold text-wefit-primary transition hover:bg-wefit-primary/10"
                            >
                              <Trophy className="h-4 w-4" /> Declare winner
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            );
          })}
        </section>
      </div>
    </main>
  );
}

function ScoreControls({
  match,
  onUpdate
}: {
  match: MatchWithTeams;
  onUpdate: (match: MatchWithTeams, team: 'team1' | 'team2', delta: number) => void;
}) {
  return (
    <div className="rounded-xl border border-white/5 bg-wefit-dark p-4">
      {[{ team: 'team1', label: match.team1?.team_name ?? 'TBD', score: match.team1_score }, { team: 'team2', label: match.team2?.team_name ?? 'TBD', score: match.team2_score }].map((entry) => (
        <div key={entry.team} className="flex items-center justify-between gap-3 first:pb-3 last:pt-3">
          <span className="truncate text-sm font-semibold text-wefit-white">{entry.label}</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onUpdate(match, entry.team as 'team1' | 'team2', -1)}
              className="flex h-12 w-12 items-center justify-center rounded-lg bg-wefit-error/20 text-xl font-bold text-wefit-error"
            >
              -
            </button>
            <span className="w-12 text-center font-mono text-3xl font-bold text-wefit-primary">{entry.score}</span>
            <button
              type="button"
              onClick={() => onUpdate(match, entry.team as 'team1' | 'team2', 1)}
              className="flex h-12 w-12 items-center justify-center rounded-lg bg-wefit-primary text-xl font-bold text-white"
            >
              +
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
