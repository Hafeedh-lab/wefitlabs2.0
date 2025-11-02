/**
 * Team Chemistry API
 * GET - Fetch player's chemistry with partners
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

    // Fetch chemistry records where player is involved
    // Since chemistry table stores player1_id < player2_id, we need to check both
    const { data: chemistry, error } = await supabase
      .from('team_chemistry')
      .select(`
        *,
        player1:player1_id(id, display_name, avatar_url, skill_rating),
        player2:player2_id(id, display_name, avatar_url, skill_rating)
      `)
      .or(`player1_id.eq.${playerId},player2_id.eq.${playerId}`)
      .order('chemistry_score', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Chemistry error:', error);
      return NextResponse.json({ error: 'Failed to fetch chemistry' }, { status: 500 });
    }

    // Transform to always show the partner (not the queried player)
    const partners = chemistry?.map((chem) => {
      const isPlayer1 = chem.player1_id === playerId;
      const partner = isPlayer1 ? chem.player2 : chem.player1;

      return {
        partner,
        chemistry: {
          matches_together: chem.matches_together,
          wins_together: chem.wins_together,
          losses_together: chem.losses_together,
          win_rate: chem.matches_together > 0
            ? Math.round((chem.wins_together / chem.matches_together) * 100)
            : 0,
          chemistry_score: chem.chemistry_score,
          last_played_together: chem.last_played_together,
        },
      };
    });

    return NextResponse.json({ partners: partners || [] });
  } catch (error) {
    console.error('Error fetching chemistry:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
