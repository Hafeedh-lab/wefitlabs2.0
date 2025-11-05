'use client';

/**
 * Match History Component
 * Displays player's recent matches with results
 */

import React, { useState, useEffect } from 'react';
import { Trophy, X, Calendar, Users } from 'lucide-react';

interface Match {
  id: string;
  round_number: number;
  team1_score: number | null;
  team2_score: number | null;
  winner: 'team1' | 'team2' | null;
  status: string;
  created_at: string;
  player_team: 'team1' | 'team2';
  won: boolean;
  player_score: number | null;
  opponent_score: number | null;
  event?: {
    name: string;
    date: string;
  };
  team1_player1?: { id: string; display_name: string; avatar_url?: string };
  team1_player2?: { id: string; display_name: string; avatar_url?: string };
  team2_player1?: { id: string; display_name: string; avatar_url?: string };
  team2_player2?: { id: string; display_name: string; avatar_url?: string };
}

interface MatchHistoryProps {
  playerId: string;
}

export function MatchHistory({ playerId }: MatchHistoryProps) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'wins' | 'losses'>('all');

  useEffect(() => {
    fetchMatches();
  }, [playerId]);

  const fetchMatches = async () => {
    try {
      const response = await fetch(`/api/players/${playerId}/matches?limit=20`);
      const data = await response.json();
      setMatches(data.matches || []);
    } catch (error) {
      console.error('Failed to fetch matches:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredMatches = matches.filter((match) => {
    if (filter === 'wins') return match.won;
    if (filter === 'losses') return !match.won;
    return true;
  });

  if (loading) {
    return (
      <div className="bg-wefit-dark-muted/50 border border-white/5 rounded-xl p-8">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-wefit-dark-muted rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="bg-wefit-dark-muted/50 border border-white/5 rounded-xl p-8 text-center">
        <Trophy className="w-16 h-16 text-wefit-grey/60 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-wefit-grey mb-2">No Matches Yet</h3>
        <p className="text-wefit-grey/80">Match history will appear here after playing</p>
      </div>
    );
  }

  return (
    <div className="bg-wefit-dark-muted/50 border border-white/5 rounded-xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-wefit-white">Match History</h2>

        {/* Filter */}
        <div className="flex gap-2">
          {(['all', 'wins', 'losses'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === f
                  ? 'bg-wefit-primary text-white'
                  : 'bg-wefit-dark-muted text-wefit-grey hover:bg-wefit-dark'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Matches */}
      <div className="space-y-3">
        {filteredMatches.map((match) => {
          const playerTeam = match.player_team === 'team1';
          const teammates = playerTeam
            ? [match.team1_player1, match.team1_player2].filter(Boolean)
            : [match.team2_player1, match.team2_player2].filter(Boolean);
          const opponents = playerTeam
            ? [match.team2_player1, match.team2_player2].filter(Boolean)
            : [match.team1_player1, match.team1_player2].filter(Boolean);

          return (
            <div
              key={match.id}
              className={`p-4 rounded-lg border-2 transition-all hover:scale-[1.02] ${
                match.won
                  ? 'bg-wefit-success/10 border-wefit-success/30'
                  : 'bg-wefit-error/10 border-wefit-error/30'
              }`}
            >
              <div className="flex items-center justify-between">
                {/* Left: Result Icon & Score */}
                <div className="flex items-center gap-4">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      match.won ? 'bg-wefit-success' : 'bg-wefit-error'
                    }`}
                  >
                    {match.won ? (
                      <Trophy className="w-6 h-6 text-white" />
                    ) : (
                      <X className="w-6 h-6 text-white" />
                    )}
                  </div>

                  <div>
                    <div className="text-2xl font-bold text-wefit-white mb-1">
                      {match.player_score} - {match.opponent_score}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-wefit-grey">
                      {match.event && (
                        <>
                          <Calendar className="w-4 h-4" />
                          {match.event.name}
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Teams */}
                <div className="text-right">
                  <div className="text-sm text-wefit-grey mb-1">vs</div>
                  <div className="flex items-center gap-2 justify-end">
                    <Users className="w-4 h-4 text-wefit-grey" />
                    <span className="text-wefit-white">
                      {opponents.map((p: any) => p.display_name).join(' & ')}
                    </span>
                  </div>
                  {teammates.length > 1 && (
                    <div className="text-xs text-wefit-grey/80 mt-1">
                      with {teammates.find((t: any) => t.id !== playerId)?.display_name}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredMatches.length === 0 && (
        <div className="text-center py-8 text-wefit-grey">
          No {filter} found
        </div>
      )}
    </div>
  );
}
