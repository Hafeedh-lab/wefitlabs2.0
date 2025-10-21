import { NextResponse } from 'next/server';
import { createSupabaseServiceClient } from '@/lib/supabase-service';

interface RouteContext {
  params: { eventId: string };
}

export async function GET(_request: Request, { params }: RouteContext) {
  const eventId = params.eventId;

  if (!eventId) {
    return NextResponse.json({ error: 'Event id is required' }, { status: 400 });
  }

  try {
    const supabase = createSupabaseServiceClient();
    const { data, error } = await supabase
      .from('matches')
      .select(`*, team1:participants(id, team_name), team2:participants(id, team_name)`)
      .eq('event_id', eventId)
      .order('round_number', { ascending: true })
      .order('match_number', { ascending: true });

    if (error) {
      console.error('[matches] Failed to fetch matches', error);
      return NextResponse.json({ error: 'Unable to load matches' }, { status: 500 });
    }

    return NextResponse.json({ matches: data ?? [] });
  } catch (error) {
    console.error('[matches] Unexpected error', error);
    return NextResponse.json({ error: 'Unable to load matches' }, { status: 500 });
  }
}
