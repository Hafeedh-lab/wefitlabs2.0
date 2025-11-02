/**
 * Player Match History API
 * GET - Fetch player's match history
 */

import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { ExtendedDatabase } from '@/types/database-extended';

export async function GET(
  request: Request,
  { params }: { params: { playerId: string } }
) {
  try {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient<ExtendedDatabase>({ cookies: () => cookieStore });

    const { playerId } = params;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Fetch matches where player participated
    // This queries the matches table looking for player in any of the 4 player positions
    const { data: matches, error } = await supabase
      .from('matches')
      .select(`
        *,
        event:events(name, date),
        team1_player1:team1_player1_id(id, display_name, avatar_url),
        team1_player2:team1_player2_id(id, display_name, avatar_url),
        team2_player1:team2_player1_id(id, display_name, avatar_url),
        team2_player2:team2_player2_id(id, display_name, avatar_url)
      `)
      .or(
        `team1_player1_id.eq.${playerId},team1_player2_id.eq.${playerId},team2_player1_id.eq.${playerId},team2_player2_id.eq.${playerId}`
      )
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Matches error:', error);
      return NextResponse.json({ error: 'Failed to fetch matches' }, { status: 500 });
    }

    // Transform matches to include win/loss info for this player
    const enrichedMatches = matches?.map((match) => {
      const isTeam1 =
        match.team1_player1_id === playerId || match.team1_player2_id === playerId;
      const won = match.winner === (isTeam1 ? 'team1' : 'team2');

      return {
        ...match,
        player_team: isTeam1 ? 'team1' : 'team2',
        won,
        player_score: isTeam1 ? match.team1_score : match.team2_score,
        opponent_score: isTeam1 ? match.team2_score : match.team1_score,
      };
    });

    return NextResponse.json({ matches: enrichedMatches || [] });
  } catch (error) {
    console.error('Error fetching player matches:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
