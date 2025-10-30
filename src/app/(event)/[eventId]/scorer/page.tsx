'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase-client';
import type { Database } from '@/types/database';
import { offlineQueue } from '@/lib/offline-queue';
import { cn } from '@/utils/cn';
import { useToast } from '@/components/ui/ToastProvider';
import { trackEvent } from '@/lib/analytics';
import { ChevronDown, ChevronUp, Trophy, Undo2, AlertTriangle, X, UserX } from 'lucide-react';

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

interface DisputeNote {
  id: string;
  matchId: string;
  note: string;
  reportedBy: 'scorer' | 'participant';
  timestamp: string;
  resolved: boolean;
}

export default function ScorerPage() {
  const params = useParams<{ eventId: string }>();
  const { showToast } = useToast();
  const [matches, setMatches] = useState<MatchWithTeams[]>([]);
  const [expandedRounds, setExpandedRounds] = useState<Record<number, boolean>>({});
  const [filter, setFilter] = useState<Filter>('in_progress');
  const [isSyncing, setIsSyncing] = useState(false);
  const [history, setHistory] = useState<ActionHistoryItem[]>([]);
  const [disputes, setDisputes] = useState<Map<string, DisputeNote[]>>(new Map());
  const [disputeModal, setDisputeModal] = useState<{ matchId: string; matchName: string } | null>(null);
  const [disputeNote, setDisputeNote] = useState('');

  const loadDisputes = useCallback(() => {
    try {
      const stored = localStorage.getItem(`disputes-${params.eventId}`);
      if (stored) {
        const disputesArray: DisputeNote[] = JSON.parse(stored);
        const disputesMap = new Map<string, DisputeNote[]>();
        disputesArray.forEach(dispute => {
          const existing = disputesMap.get(dispute.matchId) || [];
          disputesMap.set(dispute.matchId, [...existing, dispute]);
        });
        setDisputes(disputesMap);
      }
    } catch (error) {
      console.error('Failed to load disputes:', error);
    }
  }, [params.eventId]);

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

      // Load disputes from localStorage
      loadDisputes();
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
  }, [params.eventId, showToast, loadDisputes]);

  const saveDisputes = (newDisputes: Map<string, DisputeNote[]>) => {
    try {
      const disputesArray: DisputeNote[] = [];
      newDisputes.forEach(notes => disputesArray.push(...notes));
      localStorage.setItem(`disputes-${params.eventId}`, JSON.stringify(disputesArray));
    } catch (error) {
      console.error('Failed to save disputes:', error);
    }
  };

  const addDisputeNote = () => {
    if (!disputeModal || !disputeNote.trim()) return;

    const newNote: DisputeNote = {
      id: crypto.randomUUID(),
      matchId: disputeModal.matchId,
      note: disputeNote.trim(),
      reportedBy: 'scorer',
      timestamp: new Date().toISOString(),
      resolved: false
    };

    const newDisputes = new Map(disputes);
    const existingNotes = newDisputes.get(disputeModal.matchId) || [];
    newDisputes.set(disputeModal.matchId, [...existingNotes, newNote]);

    setDisputes(newDisputes);
    saveDisputes(newDisputes);

    showToast('Dispute note added', 'success');
    setDisputeNote('');
    setDisputeModal(null);
  };

  const resolveDispute = (matchId: string, disputeId: string) => {
    const newDisputes = new Map(disputes);
    const matchDisputes = newDisputes.get(matchId) || [];
    const updated = matchDisputes.map(d =>
      d.id === disputeId ? { ...d, resolved: true } : d
    );
    newDisputes.set(matchId, updated);

    setDisputes(newDisputes);
    saveDisputes(newDisputes);
    showToast('Dispute marked as resolved', 'success');
  };

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

  const handleBYE = async (match: MatchWithTeams) => {
    if (!match.team1 && !match.team2) {
      showToast('No teams assigned to this match', 'error');
      return;
    }

    if (!confirm('Mark this as a BYE (no-show)? The present team will auto-advance.')) {
      return;
    }

    // Determine which team is present (has a higher score or is the only one present)
    const winnerId = match.team1 ? match.team1.id : match.team2?.id;

    const payload = {
      status: 'completed',
      winner_id: winnerId,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      team1_score: match.team1 ? 11 : 0,
      team2_score: match.team2 ? 11 : 0
    };

    setMatches((prev) => prev.map((item) => (item.id === match.id ? ({ ...item, ...payload } as MatchWithTeams) : item)));

    try {
      const supabase = getSupabaseClient();
      // @ts-ignore - Type inference issue with Supabase generic
      await supabase.from('matches').update(payload).eq('id', match.id);
      showToast('BYE recorded - team auto-advanced', 'success');
    } catch (error) {
      console.error(error);
      showToast('Failed to record BYE', 'error');
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
                      .map((match) => {
                        const matchDisputes = disputes.get(match.id) || [];
                        const unresolvedDisputes = matchDisputes.filter(d => !d.resolved);

                        return (
                          <div key={match.id} className="grid gap-4 px-5 py-4">
                            {/* Match header with dispute indicator */}
                            <div className="flex items-start justify-between">
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
                              {unresolvedDisputes.length > 0 && (
                                <div className="flex items-center gap-2 rounded-full bg-red-500/10 px-3 py-1 text-xs text-red-400">
                                  <AlertTriangle className="h-3 w-3" />
                                  {unresolvedDisputes.length} Dispute{unresolvedDisputes.length > 1 ? 's' : ''}
                                </div>
                              )}
                            </div>

                            {/* Disputes list */}
                            {matchDisputes.length > 0 && (
                              <div className="space-y-2 rounded-lg bg-wefit-dark p-3">
                                {matchDisputes.map(dispute => (
                                  <div
                                    key={dispute.id}
                                    className={cn(
                                      'rounded-lg border p-3 text-sm',
                                      dispute.resolved
                                        ? 'border-green-500/20 bg-green-500/10 text-green-400'
                                        : 'border-red-500/20 bg-red-500/10 text-red-400'
                                    )}
                                  >
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="flex-1">
                                        <p className="font-medium">{dispute.note}</p>
                                        <p className="mt-1 text-xs opacity-70">
                                          {new Date(dispute.timestamp).toLocaleString()} • {dispute.reportedBy}
                                        </p>
                                      </div>
                                      {!dispute.resolved && (
                                        <button
                                          onClick={() => resolveDispute(match.id, dispute.id)}
                                          className="text-xs underline"
                                        >
                                          Resolve
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Match controls */}
                            <div className="grid gap-3 sm:grid-cols-[1.5fr_1fr] sm:items-start">
                              <ScoreControls match={match} onUpdate={applyScoreUpdate} />
                              <div className="flex flex-col gap-2">
                                <button
                                  type="button"
                                  onClick={() => declareWinner(match)}
                                  className="flex items-center justify-center gap-2 rounded-lg border border-wefit-primary px-4 py-2 text-sm font-semibold text-wefit-primary transition hover:bg-wefit-primary/10"
                                >
                                  <Trophy className="h-4 w-4" /> Declare winner
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleBYE(match)}
                                  className="flex items-center justify-center gap-2 rounded-lg border border-yellow-500/50 px-4 py-2 text-sm font-semibold text-yellow-400 transition hover:bg-yellow-500/10"
                                >
                                  <UserX className="h-4 w-4" /> Mark as BYE
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDisputeModal({
                                    matchId: match.id,
                                    matchName: `${match.team1?.team_name ?? 'TBD'} vs ${match.team2?.team_name ?? 'TBD'}`
                                  })}
                                  className="flex items-center justify-center gap-2 rounded-lg border border-red-500/50 px-4 py-2 text-sm font-semibold text-red-400 transition hover:bg-red-500/10"
                                >
                                  <AlertTriangle className="h-4 w-4" /> Add dispute note
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            );
          })}
        </section>
      </div>

      {/* Dispute Modal */}
      {disputeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-wefit-dark-muted p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-wefit-white">Add Dispute Note</h2>
              <button
                onClick={() => {
                  setDisputeModal(null);
                  setDisputeNote('');
                }}
                className="text-wefit-grey hover:text-wefit-white"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <p className="mb-4 text-sm text-wefit-grey">{disputeModal.matchName}</p>
            <textarea
              value={disputeNote}
              onChange={(e) => setDisputeNote(e.target.value)}
              placeholder="Describe the issue or dispute..."
              className="mb-4 w-full rounded-lg border border-white/10 bg-wefit-dark p-3 text-wefit-white placeholder:text-wefit-grey focus:border-wefit-primary focus:outline-none focus:ring-2 focus:ring-wefit-primary/30"
              rows={4}
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setDisputeModal(null);
                  setDisputeNote('');
                }}
                className="flex-1 rounded-lg border border-white/10 px-4 py-2 text-sm font-semibold text-wefit-grey hover:text-wefit-white"
              >
                Cancel
              </button>
              <button
                onClick={addDisputeNote}
                disabled={!disputeNote.trim()}
                className="flex-1 rounded-lg bg-wefit-primary px-4 py-2 text-sm font-semibold text-white hover:bg-wefit-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                Add Note
              </button>
            </div>
          </div>
        </div>
      )}
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
