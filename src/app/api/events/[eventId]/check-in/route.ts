import { NextResponse } from 'next/server';
import { createSupabaseServiceClient } from '@/lib/supabase-service';

interface RouteContext {
  params: { eventId: string };
}

interface CheckInPayload {
  first_name?: string | null;
  team_name?: string | null;
  email?: string | null;
  phone?: string | null;
  consent_marketing?: boolean | null;
}

const sanitize = (value?: string | null) => (typeof value === 'string' ? value.trim() : value ?? null);

export async function POST(request: Request, { params }: RouteContext) {
  const eventId = params.eventId;

  if (!eventId) {
    return NextResponse.json({ error: 'Event id is required' }, { status: 400 });
  }

  let payload: CheckInPayload;
  try {
    payload = (await request.json()) as CheckInPayload;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const firstName = sanitize(payload.first_name);
  const teamName = sanitize(payload.team_name);
  const email = sanitize(payload.email);
  const phone = sanitize(payload.phone);
  const consentMarketing = Boolean(payload.consent_marketing);

  if (!firstName || !teamName) {
    return NextResponse.json({ error: 'First name and team name are required' }, { status: 400 });
  }

  try {
    const supabase = createSupabaseServiceClient();
    const { error } = await supabase.from('participants').insert({
      event_id: eventId,
      first_name: firstName,
      team_name: teamName,
      email,
      phone,
      consent_marketing: consentMarketing
    } as any);

    if (error) {
      console.error('[check-in] Failed to insert participant', error);
      return NextResponse.json({ error: 'Unable to complete check-in. Please try again.' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[check-in] Unexpected error', error);
    return NextResponse.json({ error: 'Unable to complete check-in. Please try again.' }, { status: 500 });
  }
}
