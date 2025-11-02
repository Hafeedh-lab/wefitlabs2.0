/**
 * Match Result Service
 * Handles processing completed matches, updating player ratings, stats, and achievements
 */

import { createClient } from '@supabase/supabase-js';
import { eloSystem } from './elo-system';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Use service role client for admin operations
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface MatchResult {
  id: string;
  event_id: string;
  team1_id: string;
  team2_id: string;
  team1_score: number;
  team2_score: number;
  winner_id: string;
  completed_at: string;
}

interface PlayerInMatch {
  participant_id: string;
  player_profile_id: string;
  skill_rating: number;
  team_id: string;
  is_winner: boolean;
}

/**
 * Process a completed match and update all player ratings and stats
 */
export async function processMatchResult(matchId: string): Promise<void> {
  console.log(`[match-result-service] Processing match ${matchId}`);

  try {
    // 1. Fetch match details
    const { data: match, error: matchError } = await supabase
      .from('matches')
      .select('*')
      .eq('id', matchId)
      .single();

    if (matchError || !match) {
      throw new Error(`Failed to fetch match: ${matchError?.message}`);
    }

    if (match.status !== 'completed') {
      console.log('[match-result-service] Match not completed, skipping');
      return;
    }

    // 2. Fetch participants for both teams with their player profiles
    const { data: team1Participants, error: team1Error } = await supabase
      .from('participants')
      .select('id, player_profile_id, team_name')
      .eq('id', match.team1_id);

    const { data: team2Participants, error: team2Error } = await supabase
      .from('participants')
      .select('id, player_profile_id, team_name')
      .eq('id', match.team2_id);

    if (team1Error || team2Error) {
      throw new Error('Failed to fetch participants');
    }

    if (!team1Participants?.[0] || !team2Participants?.[0]) {
      console.log('[match-result-service] Participants not found');
      return;
    }

    // 3. Collect all player profiles involved
    const playerProfileIds = [
      team1Participants[0].player_profile_id,
      team2Participants[0].player_profile_id,
    ].filter(Boolean);

    if (playerProfileIds.length === 0) {
      console.log('[match-result-service] No player profiles linked, skipping rating update');
      return;
    }

    // 4. Fetch current ratings for all players
    const { data: profiles, error: profilesError } = await supabase
      .from('player_profiles')
      .select('id, skill_rating')
      .in('id', playerProfileIds);

    if (profilesError || !profiles) {
      throw new Error('Failed to fetch player profiles');
    }

    // Create lookup map
    const profileMap = new Map(profiles.map((p) => [p.id, p]));

    // 5. Build player list for ELO calculation
    const players: PlayerInMatch[] = [];

    if (team1Participants[0].player_profile_id) {
      const profile = profileMap.get(team1Participants[0].player_profile_id);
      if (profile) {
        players.push({
          participant_id: team1Participants[0].id,
          player_profile_id: profile.id,
          skill_rating: profile.skill_rating,
          team_id: match.team1_id,
          is_winner: match.winner_id === match.team1_id,
        });
      }
    }

    if (team2Participants[0].player_profile_id) {
      const profile = profileMap.get(team2Participants[0].player_profile_id);
      if (profile) {
        players.push({
          participant_id: team2Participants[0].id,
          player_profile_id: profile.id,
          skill_rating: profile.skill_rating,
          team_id: match.team2_id,
          is_winner: match.winner_id === match.team2_id,
        });
      }
    }

    if (players.length < 2) {
      console.log('[match-result-service] Not enough players with profiles');
      return;
    }

    // 6. Calculate new ratings using ELO system
    const team1Players = players.filter((p) => p.team_id === match.team1_id);
    const team2Players = players.filter((p) => p.team_id === match.team2_id);

    // Build team structures for ELO calculation
    const ratingUpdate = eloSystem.calculateNewRatings({
      team1: {
        player1: {
          id: team1Players[0].player_profile_id,
          rating: team1Players[0].skill_rating,
        },
        player2: team1Players[1]
          ? {
              id: team1Players[1].player_profile_id,
              rating: team1Players[1].skill_rating,
            }
          : undefined,
      },
      team2: {
        player1: {
          id: team2Players[0].player_profile_id,
          rating: team2Players[0].skill_rating,
        },
        player2: team2Players[1]
          ? {
              id: team2Players[1].player_profile_id,
              rating: team2Players[1].skill_rating,
            }
          : undefined,
      },
      winner: match.winner_id === match.team1_id ? 'team1' : 'team2',
      score: {
        team1: match.team1_score,
        team2: match.team2_score,
      },
    });

    // 7. Update player profiles with new ratings
    // Update team 1 players
    if (ratingUpdate.team1.player1) {
      await supabase
        .from('player_profiles')
        .update({ skill_rating: ratingUpdate.team1.player1.newRating })
        .eq('id', team1Players[0].player_profile_id);

      console.log(
        `[match-result-service] Updated rating for player ${team1Players[0].player_profile_id}: ${team1Players[0].skill_rating} -> ${ratingUpdate.team1.player1.newRating}`
      );
    }

    if (ratingUpdate.team1.player2 && team1Players[1]) {
      await supabase
        .from('player_profiles')
        .update({ skill_rating: ratingUpdate.team1.player2.newRating })
        .eq('id', team1Players[1].player_profile_id);

      console.log(
        `[match-result-service] Updated rating for player ${team1Players[1].player_profile_id}: ${team1Players[1].skill_rating} -> ${ratingUpdate.team1.player2.newRating}`
      );
    }

    // Update team 2 players
    if (ratingUpdate.team2.player1) {
      await supabase
        .from('player_profiles')
        .update({ skill_rating: ratingUpdate.team2.player1.newRating })
        .eq('id', team2Players[0].player_profile_id);

      console.log(
        `[match-result-service] Updated rating for player ${team2Players[0].player_profile_id}: ${team2Players[0].skill_rating} -> ${ratingUpdate.team2.player1.newRating}`
      );
    }

    if (ratingUpdate.team2.player2 && team2Players[1]) {
      await supabase
        .from('player_profiles')
        .update({ skill_rating: ratingUpdate.team2.player2.newRating })
        .eq('id', team2Players[1].player_profile_id);

      console.log(
        `[match-result-service] Updated rating for player ${team2Players[1].player_profile_id}: ${team2Players[1].skill_rating} -> ${ratingUpdate.team2.player2.newRating}`
      );
    }

    // 8. Update player stats
    for (const player of players) {
      await updatePlayerStats(player.player_profile_id, {
        won: player.is_winner,
        pointsScored: player.team_id === match.team1_id ? match.team1_score : match.team2_score,
        pointsAgainst: player.team_id === match.team1_id ? match.team2_score : match.team1_score,
        eventId: match.event_id,
      });
    }

    // 9. Update team chemistry for doubles matches
    if (team1Players.length === 2) {
      await updateTeamChemistry(
        team1Players[0].player_profile_id,
        team1Players[1].player_profile_id,
        team1Players[0].is_winner
      );
    }

    if (team2Players.length === 2) {
      await updateTeamChemistry(
        team2Players[0].player_profile_id,
        team2Players[1].player_profile_id,
        team2Players[0].is_winner
      );
    }

    console.log(`[match-result-service] Successfully processed match ${matchId}`);
  } catch (error) {
    console.error('[match-result-service] Error processing match:', error);
    throw error;
  }
}

/**
 * Update player stats after a match
 */
async function updatePlayerStats(
  playerId: string,
  matchData: {
    won: boolean;
    pointsScored: number;
    pointsAgainst: number;
    eventId: string;
  }
): Promise<void> {
  // Fetch current stats
  const { data: stats, error: fetchError } = await supabase
    .from('player_stats')
    .select('*')
    .eq('player_id', playerId)
    .single();

  if (fetchError && fetchError.code !== 'PGRST116') {
    // PGRST116 = not found
    throw new Error(`Failed to fetch stats: ${fetchError.message}`);
  }

  const currentStats = stats || {
    player_id: playerId,
    matches_played: 0,
    matches_won: 0,
    matches_lost: 0,
    points_scored: 0,
    points_against: 0,
    current_win_streak: 0,
    best_win_streak: 0,
    current_loss_streak: 0,
  };

  // Calculate new stats
  const newStats = {
    matches_played: currentStats.matches_played + 1,
    matches_won: currentStats.matches_won + (matchData.won ? 1 : 0),
    matches_lost: currentStats.matches_lost + (matchData.won ? 0 : 1),
    points_scored: currentStats.points_scored + matchData.pointsScored,
    points_against: currentStats.points_against + matchData.pointsAgainst,
    current_win_streak: matchData.won ? currentStats.current_win_streak + 1 : 0,
    best_win_streak: matchData.won
      ? Math.max(currentStats.best_win_streak, currentStats.current_win_streak + 1)
      : currentStats.best_win_streak,
    current_loss_streak: matchData.won ? 0 : currentStats.current_loss_streak + 1,
    last_played_at: new Date().toISOString(),
    avg_point_differential:
      (currentStats.points_scored +
        matchData.pointsScored -
        (currentStats.points_against + matchData.pointsAgainst)) /
      (currentStats.matches_played + 1),
  };

  // Upsert stats
  const { error: upsertError } = await supabase
    .from('player_stats')
    .upsert(
      {
        player_id: playerId,
        ...newStats,
      },
      { onConflict: 'player_id' }
    );

  if (upsertError) {
    throw new Error(`Failed to update stats: ${upsertError.message}`);
  }
}

/**
 * Update team chemistry between two partners
 */
async function updateTeamChemistry(
  player1Id: string,
  player2Id: string,
  won: boolean
): Promise<void> {
  // Ensure consistent ordering for lookup
  const [playerId, partnerId] =
    player1Id < player2Id ? [player1Id, player2Id] : [player2Id, player1Id];

  // Fetch existing chemistry record
  const { data: chemistry, error: fetchError } = await supabase
    .from('team_chemistry')
    .select('*')
    .eq('player_id', playerId)
    .eq('partner_id', partnerId)
    .single();

  if (fetchError && fetchError.code !== 'PGRST116') {
    throw new Error(`Failed to fetch chemistry: ${fetchError.message}`);
  }

  const currentChemistry = chemistry || {
    player_id: playerId,
    partner_id: partnerId,
    matches_together: 0,
    wins_together: 0,
    losses_together: 0,
    chemistry_score: 50, // Start at neutral
  };

  // Calculate new chemistry
  const newChemistry = {
    matches_together: currentChemistry.matches_together + 1,
    wins_together: currentChemistry.wins_together + (won ? 1 : 0),
    losses_together: currentChemistry.losses_together + (won ? 0 : 1),
    last_played_together: new Date().toISOString(),
  };

  // Calculate chemistry score (0-100)
  // Based on win rate and number of matches together
  const winRate = (newChemistry.wins_together / newChemistry.matches_together) * 100;
  const matchesBonus = Math.min(newChemistry.matches_together * 2, 20); // Up to +20 for experience
  const chemistryScore = Math.min(Math.round(winRate * 0.7 + matchesBonus), 100);

  // Upsert chemistry
  const { error: upsertError } = await supabase.from('team_chemistry').upsert(
    {
      player_id: playerId,
      partner_id: partnerId,
      ...newChemistry,
      chemistry_score: chemistryScore,
    },
    { onConflict: 'player_id,partner_id' }
  );

  if (upsertError) {
    throw new Error(`Failed to update chemistry: ${upsertError.message}`);
  }
}
