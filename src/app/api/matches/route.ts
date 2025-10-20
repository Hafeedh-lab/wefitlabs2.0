import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export async function PATCH(request: Request) {
  const supabase = createSupabaseServerClient();
  const body = await request.json();
  const { id, ...updates } = body;
  if (!id) {
    return NextResponse.json({ error: 'Match id is required' }, { status: 400 });
  }
  // @ts-ignore - Type inference issue with Supabase generic
  const { error } = await supabase.from('matches').update(updates).eq('id', id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ success: true });
}
