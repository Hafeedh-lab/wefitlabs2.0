import { ImageResponse } from '@vercel/og';
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-client';

export const runtime = 'edge';

export async function GET(_: Request, { params }: { params: { matchId: string } }) {
  const supabase = createSupabaseServerClient();
  const { data: match, error } = await supabase
    .from('matches')
    .select(`*, team1:participants(team_name), team2:participants(team_name), event:events(name, sponsor_logo_url) `)
    .eq('id', params.matchId)
    .single();

  if (error || !match) {
    return NextResponse.json({ error: 'Match not found' }, { status: 404 });
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '60px',
          background: '#111214',
          color: '#FFFFFF',
          fontFamily: 'Inter'
        }}
      >
        <div style={{ fontSize: 30, color: '#A0A0A0' }}>{match.event?.name ?? 'WeFit Labs Event'}</div>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '12px',
            padding: '10px 24px',
            borderRadius: '999px',
            background: '#FFC84A',
            color: '#111214',
            fontWeight: 700,
            marginBottom: '20px'
          }}>
            🏆 Winner
          </div>
          <div style={{ fontSize: 64, fontWeight: 700, marginBottom: '16px' }}>
            {match.team1?.team_name ?? 'Team A'} vs {match.team2?.team_name ?? 'Team B'}
          </div>
          <div style={{ fontSize: 120, fontWeight: 700, color: '#00C875', fontFamily: 'JetBrains Mono' }}>
            {match.team1_score} - {match.team2_score}
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 24, color: '#A0A0A0' }}>WeFit Labs NYC</div>
          {match.event?.sponsor_logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={match.event.sponsor_logo_url} alt="Sponsor" style={{ height: '48px', objectFit: 'contain' }} />
          ) : null}
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
