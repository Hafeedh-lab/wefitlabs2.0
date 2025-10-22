import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Email service configuration (Resend)
const RESEND_API_KEY = process.env.RESEND_API_KEY;

// SMS service configuration (Twilio)
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;

interface ReminderRequest {
  eventId: string;
  participantId?: string;
  reminderType: 'email' | 'sms' | 'both';
  minutesBefore?: number;
}

/**
 * Send event reminders via email and/or SMS
 * POST /api/reminders/send
 */
export async function POST(request: NextRequest) {
  try {
    const body: ReminderRequest = await request.json();
    const { eventId, participantId, reminderType, minutesBefore = 30 } = body;

    if (!eventId) {
      return NextResponse.json(
        { error: 'eventId is required' },
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

    // Get participants (either specific one or all checked-in participants)
    const query = supabase
      .from('participants')
      .select('*')
      .eq('event_id', eventId)
      .not('checked_in_at', 'is', null);

    if (participantId) {
      query.eq('id', participantId);
    }

    const { data: participants, error: participantsError } = await query;

    if (participantsError) throw participantsError;

    if (!participants || participants.length === 0) {
      return NextResponse.json(
        { error: 'No eligible participants found' },
        { status: 404 }
      );
    }

    const eventDate = new Date(event.date);
    const eventTime = eventDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });

    const eventLink = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://leaderboard.wefitlabs.com'}/${eventId}`;

    const results = {
      sent: 0,
      failed: 0,
      skipped: 0,
      errors: [] as string[]
    };

    // Check rate limiting (max 1 reminder per user per event)
    const rateLimitKey = `reminder-sent-${eventId}`;
    const sentReminders = new Set<string>();

    // Send reminders
    for (const participant of participants) {
      const participantKey = `${rateLimitKey}-${participant.id}`;

      // Check if already sent (using a simple in-memory check for demo)
      // In production, use Redis or database for persistent rate limiting
      if (sentReminders.has(participantKey)) {
        results.skipped++;
        continue;
      }

      let emailSent = false;
      let smsSent = false;

      // Send email
      if ((reminderType === 'email' || reminderType === 'both') && participant.email) {
        try {
          await sendEmail(
            participant.email,
            participant.first_name,
            event.name,
            eventTime,
            event.location || 'WeFit Labs NYC',
            eventLink
          );
          emailSent = true;
        } catch (error) {
          console.error(`Failed to send email to ${participant.email}:`, error);
          results.errors.push(`Email failed for ${participant.first_name}: ${error}`);
        }
      }

      // Send SMS
      if ((reminderType === 'sms' || reminderType === 'both') && participant.phone) {
        try {
          await sendSMS(
            participant.phone,
            participant.first_name,
            event.name,
            eventTime,
            eventLink
          );
          smsSent = true;
        } catch (error) {
          console.error(`Failed to send SMS to ${participant.phone}:`, error);
          results.errors.push(`SMS failed for ${participant.first_name}: ${error}`);
        }
      }

      if (emailSent || smsSent) {
        results.sent++;
        sentReminders.add(participantKey);
      } else {
        results.failed++;
      }
    }

    return NextResponse.json({
      success: true,
      eventId,
      participantsCount: participants.length,
      ...results,
      message: `Sent ${results.sent} reminders, ${results.failed} failed, ${results.skipped} skipped`
    });
  } catch (error) {
    console.error('Failed to send reminders:', error);
    return NextResponse.json(
      { error: 'Failed to send reminders' },
      { status: 500 }
    );
  }
}

/**
 * Send email reminder using Resend
 */
async function sendEmail(
  to: string,
  name: string,
  eventName: string,
  eventTime: string,
  location: string,
  link: string
): Promise<void> {
  if (!RESEND_API_KEY) {
    // Fallback to console.log in development
    console.log('📧 [DEV] Email would be sent to:', to);
    console.log(`   Subject: Your WeFit Labs match starts soon!`);
    console.log(`   Body: Hi ${name}, your match for ${eventName} starts at ${eventTime}. Check the live bracket: ${link}`);
    return;
  }

  // Production: Use Resend API
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: 'WeFit Labs <noreply@wefitlabs.com>',
      to: [to],
      subject: '🎾 Your WeFit Labs match starts soon!',
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #00C875;">🎾 Match Reminder</h1>
          <p>Hi ${name},</p>
          <p>Your WeFit Labs match for <strong>${eventName}</strong> starts in 30 minutes!</p>
          <p><strong>Time:</strong> ${eventTime}</p>
          <p><strong>Location:</strong> ${location}</p>
          <p style="margin: 30px 0;">
            <a href="${link}" style="background: #00C875; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">
              View Live Bracket
            </a>
          </p>
          <p style="color: #666; font-size: 14px;">
            Good luck and have fun! 🏆
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #999; font-size: 12px;">
            WeFit Labs NYC - Live Leaderboard<br>
            <a href="${link}" style="color: #00C875;">View Event</a>
          </p>
        </div>
      `
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Resend API error: ${error}`);
  }
}

/**
 * Send SMS reminder using Twilio
 */
async function sendSMS(
  to: string,
  name: string,
  eventName: string,
  eventTime: string,
  link: string
): Promise<void> {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
    // Fallback to console.log in development
    console.log('📱 [DEV] SMS would be sent to:', to);
    console.log(`   Message: Hi ${name}! Your WeFit Labs match for ${eventName} starts at ${eventTime}. Check the live bracket: ${link}`);
    return;
  }

  // Production: Use Twilio API
  const auth = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64');

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        From: TWILIO_PHONE_NUMBER,
        To: to,
        Body: `🎾 Hi ${name}! Your WeFit Labs match for ${eventName} starts at ${eventTime}. Check the live bracket: ${link}`
      })
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Twilio API error: ${error}`);
  }
}
