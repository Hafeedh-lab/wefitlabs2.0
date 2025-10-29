#!/usr/bin/env tsx

/**
 * Demo Data Seed Script for WeFit Labs Leaderboard
 *
 * Creates comprehensive demo data including:
 * - Demo event "Friday Night Smash - Demo"
 * - 16 participants with realistic names
 * - 3 rounds of matches (some completed, some in progress, some pending)
 * - Sponsor (Vita Coco) with working redemption codes
 * - Analytics events for dashboard testing
 *
 * Usage: npm run seed:demo
 *
 * This script is idempotent - safe to run multiple times
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '../src/types/database';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing required environment variables:');
  console.error('  - NEXT_PUBLIC_SUPABASE_URL');
  console.error('  - SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient<Database>(supabaseUrl, supabaseKey);

const DEMO_PARTICIPANTS = [
  { name: 'Emma Johnson', team: 'Court Queens' },
  { name: 'Liam Chen', team: 'Net Ninjas' },
  { name: 'Sophia Rodriguez', team: 'Smash Sisters' },
  { name: 'Noah Williams', team: 'Paddle Power' },
  { name: 'Olivia Davis', team: 'Baseline Bandits' },
  { name: 'Ethan Martinez', team: 'Serve Stars' },
  { name: 'Ava Taylor', team: 'Dink Dynasty' },
  { name: 'Mason Anderson', team: 'Volley Vikings' },
  { name: 'Isabella Thomas', team: 'Rally Rebels' },
  { name: 'Lucas Jackson', team: 'Spin Squad' },
  { name: 'Mia White', team: 'Drop Shot Divas' },
  { name: 'Oliver Harris', team: 'Lob Legends' },
  { name: 'Charlotte Martin', team: 'Ace Alliance' },
  { name: 'Elijah Thompson', team: 'Game Point Gang' },
  { name: 'Amelia Garcia', team: 'Kitchen Kings' },
  { name: 'James Wilson', team: 'Paddle Pros' }
];

async function main() {
  console.log('🌱 Starting WeFit Labs demo data seed...\n');

  try {
    // Step 1: Create or find demo event
    console.log('📅 Creating demo event...');

    const eventDate = new Date();
    eventDate.setDate(eventDate.getDate() + 3); // 3 days from now

    const { data: existingEvent, error: checkError } = await supabase
      .from('events')
      .select('id')
      .eq('name', 'Friday Night Smash - Demo')
      .maybeSingle() as { data: { id: string } | null; error: any };

    let eventId: string;

    if (existingEvent) {
      console.log('   ℹ️  Demo event already exists, using existing event');
      eventId = existingEvent.id;

      // Clean up existing data
      console.log('   🧹 Cleaning up existing demo data...');
      await supabase.from('matches').delete().eq('event_id', eventId);
      await supabase.from('participants').delete().eq('event_id', eventId);
      await supabase.from('analytics_events').delete().eq('event_id', eventId);
      await supabase.from('sponsor_interactions').delete().eq('event_id', eventId);
    } else {
      const { data: newEvent, error: eventError } = await supabase
        .from('events')
        .insert({
          name: 'Friday Night Smash - Demo',
          date: eventDate.toISOString(),
          location: 'WeFit Labs NYC - Brooklyn',
          status: 'live',
          sponsor_name: 'Vita Coco',
          sponsor_logo_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Vita_Coco_logo.svg/320px-Vita_Coco_logo.svg.png',
          sponsor_cta_text: 'Get a free Vita Coco at the hydration station',
          sponsor_cta_url: 'https://vitacoco.com',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        } as any)
        .select()
        .single() as { data: { id: string }; error: any };

      if (eventError) throw eventError;
      eventId = newEvent.id;
      console.log(`   ✅ Created demo event: ${eventId}`);
    }

    // Step 2: Create participants
    console.log('\n👥 Creating participants...');

    const participantsToInsert = DEMO_PARTICIPANTS.map((p, i) => ({
      event_id: eventId,
      first_name: p.name,
      team_name: p.team,
      email: i < 12 ? `${p.name.toLowerCase().replace(' ', '.')}@example.com` : null,
      phone: i < 10 ? `(555) ${String(i).padStart(3, '0')}-${String(Math.floor(Math.random() * 9000) + 1000)}` : null,
      consent_marketing: i % 3 === 0,
      checked_in_at: i < 14 ? new Date(Date.now() - Math.random() * 3600000).toISOString() : null,
      created_at: new Date(Date.now() - Math.random() * 7200000).toISOString()
    }));

    const { data: participants, error: participantsError } = await supabase
      .from('participants')
      .insert(participantsToInsert as any)
      .select();

    if (participantsError) throw participantsError;
    console.log(`   ✅ Created ${participants.length} participants`);

    // Step 3: Create bracket matches
    console.log('\n🏆 Creating tournament bracket...');

    const shuffled = [...participants].sort(() => Math.random() - 0.5);

    // Round 1 - 8 matches
    const round1Matches = [];
    for (let i = 0; i < 8; i++) {
      const team1 = shuffled[i * 2];
      const team2 = shuffled[i * 2 + 1];

      // First 5 matches are completed, next 2 are in progress, last 1 is pending
      const status = i < 5 ? 'completed' : i < 7 ? 'in_progress' : 'pending';
      const team1Score = status === 'completed' ? Math.floor(Math.random() * 6) + 7 : i < 7 ? Math.floor(Math.random() * 8) : 0;
      const team2Score = status === 'completed' ? Math.floor(Math.random() * team1Score) : i < 7 ? Math.floor(Math.random() * 8) : 0;
      const winnerId = status === 'completed' ? (team1Score > team2Score ? (team1 as { id: string }).id : (team2 as { id: string }).id) : null;

      round1Matches.push({
        event_id: eventId,
        round_number: 1,
        match_number: i + 1,
        court_number: (i % 4) + 1,
        team1_id: (team1 as { id: string }).id,
        team2_id: (team2 as { id: string }).id,
        team1_score: team1Score,
        team2_score: team2Score,
        winner_id: winnerId,
        status,
        started_at: i < 7 ? new Date(Date.now() - Math.random() * 1800000).toISOString() : null,
        completed_at: status === 'completed' ? new Date(Date.now() - Math.random() * 900000).toISOString() : null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }

    const { error: round1Error } = await supabase.from('matches').insert(round1Matches as any);
    if (round1Error) throw round1Error;
    console.log(`   ✅ Created ${round1Matches.length} Round 1 matches`);

    // Round 2 - 4 matches (2 completed, 2 pending)
    const round2Winners = round1Matches.filter(m => m.status === 'completed').slice(0, 4);
    const round2Matches = [];

    for (let i = 0; i < 2; i++) {
      const match1Winner = round2Winners[i * 2];
      const match2Winner = round2Winners[i * 2 + 1];

      if (!match1Winner || !match2Winner) continue;

      const team1Score = i === 0 ? 11 : 0;
      const team2Score = i === 0 ? 7 : 0;

      round2Matches.push({
        event_id: eventId,
        round_number: 2,
        match_number: i + 1,
        court_number: i + 1,
        team1_id: match1Winner.winner_id,
        team2_id: match2Winner.winner_id,
        team1_score: team1Score,
        team2_score: team2Score,
        winner_id: i === 0 ? match1Winner.winner_id : null,
        status: i === 0 ? 'completed' : 'pending',
        started_at: i === 0 ? new Date(Date.now() - 600000).toISOString() : null,
        completed_at: i === 0 ? new Date(Date.now() - 300000).toISOString() : null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }

    if (round2Matches.length > 0) {
      const { error: round2Error } = await supabase.from('matches').insert(round2Matches as any);
      if (round2Error) throw round2Error;
      console.log(`   ✅ Created ${round2Matches.length} Round 2 matches`);
    }

    // Round 3 - Finals (1 match, pending)
    const round3Matches = [{
      event_id: eventId,
      round_number: 3,
      match_number: 1,
      court_number: 1,
      team1_id: round2Matches[0]?.winner_id || null,
      team2_id: null,
      team1_score: 0,
      team2_score: 0,
      winner_id: null,
      status: 'pending',
      started_at: null,
      completed_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }];

    const { error: round3Error } = await supabase.from('matches').insert(round3Matches as any);
    if (round3Error) throw round3Error;
    console.log(`   ✅ Created ${round3Matches.length} Round 3 match (Finals)`);

    // Step 4: Create analytics events
    console.log('\n📊 Creating analytics events...');

    const analyticsEvents = [];
    const sessionIds = Array.from({ length: 25 }, () => `session-${Math.random().toString(36).substring(7)}`);

    // Page views
    for (let i = 0; i < 40; i++) {
      analyticsEvents.push({
        event_id: eventId,
        event_type: 'page_view',
        session_id: sessionIds[i % sessionIds.length],
        user_agent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)',
        metadata: {
          path: '/' + eventId,
          referrer: i % 3 === 0 ? 'https://instagram.com' : i % 3 === 1 ? 'https://twitter.com' : ''
        },
        created_at: new Date(Date.now() - Math.random() * 7200000).toISOString()
      });
    }

    // Dwell time events
    for (let i = 0; i < 20; i++) {
      analyticsEvents.push({
        event_id: eventId,
        event_type: 'dwell_time',
        session_id: sessionIds[i % sessionIds.length],
        user_agent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)',
        metadata: {
          dwell_time_seconds: Math.floor(Math.random() * 600) + 30
        },
        created_at: new Date(Date.now() - Math.random() * 3600000).toISOString()
      });
    }

    const { error: analyticsError } = await supabase.from('analytics_events').insert(analyticsEvents as any);
    if (analyticsError) throw analyticsError;
    console.log(`   ✅ Created ${analyticsEvents.length} analytics events`);

    // Step 5: Create sponsor interactions
    console.log('\n🎁 Creating sponsor interactions...');

    const sponsorInteractions = [];

    // Sponsor views
    for (let i = 0; i < 35; i++) {
      sponsorInteractions.push({
        event_id: eventId,
        interaction_type: 'view',
        session_id: sessionIds[i % sessionIds.length],
        created_at: new Date(Date.now() - Math.random() * 7200000).toISOString()
      });
    }

    // Sponsor clicks
    for (let i = 0; i < 12; i++) {
      sponsorInteractions.push({
        event_id: eventId,
        interaction_type: 'click',
        session_id: sessionIds[i % sessionIds.length],
        created_at: new Date(Date.now() - Math.random() * 3600000).toISOString()
      });
    }

    // Sponsor redemptions
    for (let i = 0; i < 5; i++) {
      sponsorInteractions.push({
        event_id: eventId,
        interaction_type: 'redemption',
        session_id: `redemption-WFIT-VITA-${i}`,
        created_at: new Date(Date.now() - Math.random() * 1800000).toISOString()
      });
    }

    const { error: sponsorError } = await supabase.from('sponsor_interactions').insert(sponsorInteractions as any);
    if (sponsorError) throw sponsorError;
    console.log(`   ✅ Created ${sponsorInteractions.length} sponsor interactions`);

    // Summary
    console.log('\n✨ Demo data seed completed successfully!\n');
    console.log('📋 Summary:');
    console.log(`   Event ID: ${eventId}`);
    console.log(`   Participants: ${participants.length}`);
    console.log(`   Matches: ${round1Matches.length + round2Matches.length + round3Matches.length}`);
    console.log(`   Analytics Events: ${analyticsEvents.length}`);
    console.log(`   Sponsor Interactions: ${sponsorInteractions.length}`);
    console.log(`\n🔗 View demo event at: /${eventId}`);
    console.log(`🔗 Admin dashboard at: /${eventId}/admin`);
    console.log(`🔗 Scorer interface at: /${eventId}/scorer\n`);

  } catch (error) {
    console.error('\n❌ Error seeding demo data:', error);
    process.exit(1);
  }
}

main();
