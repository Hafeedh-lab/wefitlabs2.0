import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-client';

export async function PATCH(request: Request) {
  const supabase = createSupabaseServerClient();
  const body = await request.json();
  const { id, ...updates } = body;
  if (!id) {
    return NextResponse.json({ error: 'Match id is required' }, { status: 400 });
  }
  const { error } = await supabase.from('matches').update(updates).eq('id', id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ success: true });
}
