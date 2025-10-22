import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const { eventId } = params;

    const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);

    // Check if any matches have been completed
    const { data: completedMatches, error: checkError } = await supabase
      .from('matches')
      .select('id')
      .eq('event_id', eventId)
      .eq('status', 'completed')
      .limit(1);

    if (checkError) throw checkError;

    if (completedMatches && completedMatches.length > 0) {
      return NextResponse.json(
        { error: 'Cannot reseed bracket: matches have already been completed' },
        { status: 400 }
      );
    }

    // Get all participants
    const { data: participants, error: participantsError } = await supabase
      .from('participants')
      .select('id, team_name')
      .eq('event_id', eventId)
      .order('created_at', { ascending: true });

    if (participantsError) throw participantsError;

    if (!participants || participants.length < 2) {
      return NextResponse.json(
        { error: 'Not enough participants to create bracket' },
        { status: 400 }
      );
    }

    // Delete all existing matches
    const { error: deleteError } = await supabase
      .from('matches')
      .delete()
      .eq('event_id', eventId);

    if (deleteError) throw deleteError;

    // Shuffle participants for random seeding
    const shuffled = [...participants].sort(() => Math.random() - 0.5);

    // Calculate number of rounds needed
    const numParticipants = shuffled.length;
    const numRounds = Math.ceil(Math.log2(numParticipants));

    // Create Round 1 matches
    const round1Matches = [];
    let matchNumber = 1;

    for (let i = 0; i < numParticipants; i += 2) {
      const team1 = shuffled[i];
      const team2 = shuffled[i + 1] || null; // Handle odd number of participants

      round1Matches.push({
        event_id: eventId,
        round_number: 1,
        match_number: matchNumber,
        court_number: matchNumber,
        team1_id: team1.id,
        team2_id: team2?.id || null,
        team1_score: 0,
        team2_score: 0,
        winner_id: team2 ? null : team1.id, // Auto-win if no opponent (BYE)
        status: (team2 ? 'pending' : 'completed') as 'pending' | 'completed',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      matchNumber++;
    }

    // Insert Round 1 matches
    const { error: insertError } = await supabase
      .from('matches')
      .insert(round1Matches as any);

    if (insertError) throw insertError;

    // Create placeholder matches for subsequent rounds
    const subsequentMatches = [];
    let previousRoundMatches = Math.ceil(numParticipants / 2);

    for (let round = 2; round <= numRounds; round++) {
      const thisRoundMatches = Math.ceil(previousRoundMatches / 2);

      for (let i = 1; i <= thisRoundMatches; i++) {
        subsequentMatches.push({
          event_id: eventId,
          round_number: round,
          match_number: i,
          court_number: i,
          team1_id: null,
          team2_id: null,
          team1_score: 0,
          team2_score: 0,
          winner_id: null,
          status: 'pending' as const,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      }

      previousRoundMatches = thisRoundMatches;
    }

    // Insert subsequent round matches
    if (subsequentMatches.length > 0) {
      const { error: subsequentError } = await supabase
        .from('matches')
        .insert(subsequentMatches as any);

      if (subsequentError) throw subsequentError;
    }

    return NextResponse.json({
      success: true,
      message: 'Bracket reseeded successfully',
      participants: numParticipants,
      rounds: numRounds,
      matches: round1Matches.length + subsequentMatches.length
    });
  } catch (error) {
    console.error('Failed to reseed bracket:', error);
    return NextResponse.json(
      { error: 'Failed to reseed bracket' },
      { status: 500 }
    );
  }
}
