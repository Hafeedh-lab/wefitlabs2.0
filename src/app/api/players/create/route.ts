/**
 * Create Player Profile API
 * POST - Create a new player profile for authenticated user
 */

import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { ExtendedDatabase } from '@/types/database-extended';
import { eloSystem } from '@/lib/elo-system';

export async function POST(request: Request) {
  try {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient<ExtendedDatabase>({ cookies: () => cookieStore });

    // Check authentication
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Check if profile already exists
    const { data: existing } = await supabase
      .from('player_profiles')
      .select('id')
      .eq('user_id', session.user.id)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'Profile already exists', profileId: existing.id },
        { status: 409 }
      );
    }

    // Create player profile
    const { data: profile, error: profileError } = await supabase
      .from('player_profiles')
      .insert({
        user_id: session.user.id,
        display_name: body.display_name || session.user.email?.split('@')[0] || 'Player',
        bio: body.bio || null,
        location: body.location || null,
        skill_rating: eloSystem.getInitialRating(),
        play_style: body.play_style || null,
        preferred_position: body.preferred_position || null,
        avatar_url: body.avatar_url || null,
      })
      .select()
      .single();

    if (profileError) {
      console.error('Profile creation error:', profileError);
      return NextResponse.json(
        { error: 'Failed to create profile', details: profileError.message },
        { status: 500 }
      );
    }

    // Player stats are automatically created by database trigger

    return NextResponse.json({
      profile,
      message: 'Profile created successfully',
    });
  } catch (error) {
    console.error('Error creating player profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
