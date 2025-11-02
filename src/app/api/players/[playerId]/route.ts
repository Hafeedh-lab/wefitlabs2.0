/**
 * Player Profile API
 * GET - Fetch player profile with stats
 * PATCH - Update player profile
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

    // Fetch player profile
    const { data: profile, error: profileError } = await supabase
      .from('player_profiles')
      .select('*')
      .eq('id', playerId)
      .single();

    if (profileError) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }

    // Fetch player stats
    const { data: stats, error: statsError } = await supabase
      .from('player_stats')
      .select('*')
      .eq('player_id', playerId)
      .single();

    if (statsError) {
      // Stats might not exist yet, that's okay
      console.error('Stats error:', statsError);
    }

    // Fetch achievements
    const { data: achievements, error: achievementsError } = await supabase
      .from('player_achievements')
      .select(`
        *,
        achievement:achievements(*)
      `)
      .eq('player_id', playerId)
      .order('unlocked_at', { ascending: false });

    if (achievementsError) {
      console.error('Achievements error:', achievementsError);
    }

    // Return combined data
    return NextResponse.json({
      profile,
      stats: stats || null,
      achievements: achievements || [],
    });
  } catch (error) {
    console.error('Error fetching player:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { playerId: string } }
) {
  try {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient<ExtendedDatabase>({ cookies: () => cookieStore });

    const { playerId } = params;
    const body = await request.json();

    // Verify user owns this profile
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user owns this profile
    const { data: profile } = await supabase
      .from('player_profiles')
      .select('user_id')
      .eq('id', playerId)
      .single();

    if (!profile || profile.user_id !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Update profile
    const { data, error } = await supabase
      .from('player_profiles')
      .update({
        display_name: body.display_name,
        bio: body.bio,
        location: body.location,
        play_style: body.play_style,
        preferred_position: body.preferred_position,
        avatar_url: body.avatar_url,
      })
      .eq('id', playerId)
      .select()
      .single();

    if (error) {
      console.error('Update error:', error);
      return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error updating player:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
