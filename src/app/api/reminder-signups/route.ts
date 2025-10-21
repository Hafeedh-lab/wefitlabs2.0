import { NextResponse } from 'next/server';
import { createSupabaseServiceClient } from '@/lib/supabase-service';

interface ReminderSignupPayload {
  email?: string | null;
  phone?: string | null;
  eventId?: string | null;
}

const sanitize = (value?: string | null) => (typeof value === 'string' ? value.trim() : value ?? null);

export async function POST(request: Request) {
  let payload: ReminderSignupPayload;
  try {
    payload = (await request.json()) as ReminderSignupPayload;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const email = sanitize(payload.email);
  const phone = sanitize(payload.phone);

  if (!email && !phone) {
    return NextResponse.json({ error: 'Please provide an email or phone number.' }, { status: 400 });
  }

  const eventId = sanitize(payload.eventId) || 'newsletter';

  try {
    const supabase = createSupabaseServiceClient();
    const { error } = await supabase.from('reminder_signups').insert({
      event_id: eventId,
      email,
      phone
    } as any);

    if (error) {
      console.error('[reminder-signups] Failed to save signup', error);
      return NextResponse.json({ error: 'Unable to save your signup. Please try again.' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[reminder-signups] Unexpected error', error);
    return NextResponse.json({ error: 'Unable to save your signup. Please try again.' }, { status: 500 });
  }
}
