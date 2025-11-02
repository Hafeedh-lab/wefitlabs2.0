import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { processMatchResult } from '@/lib/match-result-service';

export async function PATCH(request: Request) {
  const supabase = createSupabaseServerClient();
  const body = await request.json();
  const { id, ...updates } = body;

  if (!id) {
    return NextResponse.json({ error: 'Match id is required' }, { status: 400 });
  }

  // Get current match state to check if status is changing to completed
  const { data: currentMatch } = await supabase
    .from('matches')
    .select('status')
    .eq('id', id)
    .single();

  const wasCompleted = (currentMatch as { status: string } | null)?.status === 'completed';

  // @ts-ignore - Type inference issue with Supabase generic
  const { error } = await supabase.from('matches').update(updates).eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // If match status changed to completed, process match results and update ratings
  const isNowCompleted = updates.status === 'completed';

  if (!wasCompleted && isNowCompleted) {
    try {
      console.log(`[api/matches] Match ${id} completed, processing results...`);

      // Process match results asynchronously
      // Don't block the response - this can take a moment
      processMatchResult(id).catch((error) => {
        console.error('[api/matches] Error processing match result:', error);
      });

      console.log(`[api/matches] Match result processing initiated for ${id}`);
    } catch (error) {
      // Log error but don't fail the request
      // The match is still updated, just ELO might not be calculated
      console.error('[api/matches] Failed to initiate match result processing:', error);
    }
  }

  return NextResponse.json({ success: true });
}
