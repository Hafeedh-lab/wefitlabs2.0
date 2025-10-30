import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';

type Event = Database['public']['Tables']['events']['Row'];

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, eventId, participantId } = body;

    if (!code || !eventId) {
      return NextResponse.json(
        { error: 'Missing required fields: code and eventId' },
        { status: 400 }
      );
    }

    // Validate code format: WFIT-XXXX-XXXX
    const codePattern = /^WFIT-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
    if (!codePattern.test(code)) {
      return NextResponse.json(
        { error: 'Invalid code format' },
        { status: 400 }
      );
    }

    const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);

    // Get event details
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    const typedEvent = event as Event;

    // Track redemption in sponsor_interactions
    const { error: trackError } = await supabase
      .from('sponsor_interactions')
      .insert({
        event_id: eventId,
        interaction_type: 'redemption',
        session_id: `redemption-${code}`,
        created_at: new Date().toISOString()
      } as any);

    if (trackError) {
      console.error('Failed to track redemption:', trackError);
    }

    // Return sponsor offer details
    return NextResponse.json({
      success: true,
      code,
      sponsor: typedEvent.sponsor_name || 'WeFit Labs',
      offer: typedEvent.sponsor_cta_text || 'Exclusive offer for participants',
      message: 'Code redeemed successfully! Show this at the sponsor booth.',
      redeemedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to redeem code:', error);
    return NextResponse.json(
      { error: 'Failed to redeem code' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('eventId');

    if (!eventId) {
      return NextResponse.json(
        { error: 'Missing eventId parameter' },
        { status: 400 }
      );
    }

    const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);

    // Get redemption stats
    const { data: redemptions, error } = await supabase
      .from('sponsor_interactions')
      .select('id')
      .eq('event_id', eventId)
      .eq('interaction_type', 'redemption');

    if (error) throw error;

    return NextResponse.json({
      eventId,
      totalRedemptions: redemptions?.length || 0
    });
  } catch (error) {
    console.error('Failed to get redemption stats:', error);
    return NextResponse.json(
      { error: 'Failed to get redemption stats' },
      { status: 500 }
    );
  }
}
