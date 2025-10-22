import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const { eventId } = params;

    const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);

    // Get participants count and check-ins
    const { data: participants, error: participantsError } = await supabase
      .from('participants')
      .select('id, checked_in_at')
      .eq('event_id', eventId);

    if (participantsError) throw participantsError;

    const checkIns = participants?.filter(p => p.checked_in_at).length || 0;

    // Get analytics events
    const { data: analyticsEvents, error: analyticsError } = await supabase
      .from('analytics_events')
      .select('*')
      .eq('event_id', eventId);

    if (analyticsError) throw analyticsError;

    // Calculate unique viewers (unique session_ids)
    const uniqueSessions = new Set(
      analyticsEvents
        ?.filter(e => e.session_id)
        .map(e => e.session_id!) || []
    );
    const uniqueViewers = uniqueSessions.size;

    // Calculate average dwell time
    const dwellEvents = analyticsEvents?.filter(e => e.event_type === 'dwell_time') || [];
    const totalDwellTime = dwellEvents.reduce((sum, e) => {
      const metadata = e.metadata as any;
      return sum + (metadata?.dwell_time_seconds || 0);
    }, 0);
    const avgDwellTime = dwellEvents.length > 0 ? totalDwellTime / dwellEvents.length : 0;

    // Get sponsor interactions
    const { data: sponsorInteractions, error: sponsorError } = await supabase
      .from('sponsor_interactions')
      .select('interaction_type')
      .eq('event_id', eventId);

    if (sponsorError) throw sponsorError;

    const sponsorViews = sponsorInteractions?.filter(i => i.interaction_type === 'view').length || 0;
    const sponsorClicks = sponsorInteractions?.filter(i => i.interaction_type === 'click').length || 0;
    const sponsorCTR = sponsorViews > 0 ? (sponsorClicks / sponsorViews) * 100 : 0;

    // Calculate top referrer
    const referrerCounts = new Map<string, number>();
    analyticsEvents?.forEach(e => {
      const metadata = e.metadata as any;
      const referrer = metadata?.referrer || 'Direct';
      const hostname = referrer === 'Direct' ? 'Direct' :
        referrer ? new URL(referrer).hostname : 'Direct';
      referrerCounts.set(hostname, (referrerCounts.get(hostname) || 0) + 1);
    });

    const topReferrer = Array.from(referrerCounts.entries())
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'Direct';

    return NextResponse.json({
      checkIns,
      uniqueViewers,
      avgDwellTime: Math.round(avgDwellTime),
      sponsorCTR: Number(sponsorCTR.toFixed(2)),
      sponsorViews,
      sponsorClicks,
      topReferrer
    });
  } catch (error) {
    console.error('Failed to fetch metrics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch metrics' },
      { status: 500 }
    );
  }
}
