/**
 * Current Player API
 * GET - Fetch current authenticated user's player profile
 */

import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { ExtendedDatabase } from '@/types/database-extended';

export async function GET() {
  try {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient<ExtendedDatabase>({ cookies: () => cookieStore });

    // Get current user
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch player profile for current user
    const { data: profile, error } = await supabase
      .from('player_profiles')
      .select('*')
      .eq('user_id', session.user.id)
      .single();

    if (error) {
      // Profile doesn't exist yet
      return NextResponse.json({ profile: null });
    }

    return NextResponse.json({ profile });
  } catch (error) {
    console.error('Error fetching current player:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
