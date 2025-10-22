import { ImageResponse } from '@vercel/og';
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export const runtime = 'edge';

export async function GET(request: NextRequest, { params }: { params: { matchId: string } }) {
  const supabase = createSupabaseServerClient();

  // Get query parameters
  const { searchParams } = new URL(request.url);
  const download = searchParams.get('download') === '1';
  const format = searchParams.get('format') || 'social'; // 'social' (1200x630) or 'instagram' (1080x1080)

  const { data: match, error } = await supabase
    .from('matches')
    .select(`
      *,
      team1:participants!matches_team1_id_fkey(id, team_name),
      team2:participants!matches_team2_id_fkey(id, team_name),
      event:events(name, date, sponsor_name, sponsor_logo_url)
    `)
    .eq('id', params.matchId)
    .maybeSingle() as any;

  if (error || !match) {
    return NextResponse.json({ error: 'Match not found' }, { status: 404 });
  }

  // Determine winner
  const isCompleted = match.status === 'completed' && match.winner_id;
  const team1Won = match.winner_id === match.team1?.id;
  const team2Won = match.winner_id === match.team2?.id;
  const winnerName = team1Won ? match.team1?.team_name : team2Won ? match.team2?.team_name : null;

  // Set dimensions based on format
  const width = format === 'instagram' ? 1080 : 1200;
  const height = format === 'instagram' ? 1080 : 630;

  // Gradient colors based on winner
  const gradientStart = team1Won ? '#00C875' : team2Won ? '#00A8E1' : '#FFC84A';
  const gradientEnd = '#111214';

  const eventDate = match.event?.date ? new Date(match.event.date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }) : '';

  const imageResponse = new ImageResponse(
    (
      <div
        style={{
          width: `${width}px`,
          height: `${height}px`,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: format === 'instagram' ? '80px 60px' : '60px',
          background: `linear-gradient(135deg, ${gradientStart}20 0%, ${gradientEnd} 100%)`,
          color: '#FFFFFF',
          fontFamily: 'Inter, system-ui, sans-serif',
          position: 'relative'
        }}
      >
        {/* Header - Event name and date */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}>
          <div style={{
            fontSize: format === 'instagram' ? 32 : 28,
            fontWeight: 700,
            color: '#FFFFFF'
          }}>
            {match.event?.name || 'WeFit Labs Tournament'}
          </div>
          {eventDate && (
            <div style={{ fontSize: format === 'instagram' ? 22 : 20, color: '#A0A0A0' }}>
              {eventDate}
            </div>
          )}
        </div>

        {/* Center - Match details */}
        <div style={{
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: format === 'instagram' ? '32px' : '24px'
        }}>
          {/* Winner badge */}
          {isCompleted && winnerName && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              padding: '16px 32px',
              borderRadius: '999px',
              background: gradientStart,
              color: '#FFFFFF',
              fontWeight: 700,
              fontSize: format === 'instagram' ? 32 : 28,
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)'
            }}>
              <span>🏆</span>
              <span>WINNER: {winnerName}</span>
            </div>
          )}

          {/* Team names */}
          <div style={{
            fontSize: format === 'instagram' ? 56 : 48,
            fontWeight: 700,
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            gap: '24px'
          }}>
            <span style={{
              color: team1Won ? gradientStart : '#FFFFFF',
              opacity: team2Won ? 0.6 : 1
            }}>
              {match.team1?.team_name || 'Team 1'}
            </span>
            <span style={{ color: '#A0A0A0', fontSize: format === 'instagram' ? 40 : 32 }}>vs</span>
            <span style={{
              color: team2Won ? gradientStart : '#FFFFFF',
              opacity: team1Won ? 0.6 : 1
            }}>
              {match.team2?.team_name || 'Team 2'}
            </span>
          </div>

          {/* Score */}
          <div style={{
            fontSize: format === 'instagram' ? 140 : 120,
            fontWeight: 700,
            fontFamily: 'JetBrains Mono, monospace',
            display: 'flex',
            alignItems: 'center',
            gap: '32px',
            letterSpacing: '-0.02em'
          }}>
            <span style={{
              color: team1Won ? gradientStart : team2Won ? '#666666' : '#00C875'
            }}>
              {match.team1_score}
            </span>
            <span style={{ color: '#A0A0A0', fontSize: format === 'instagram' ? 100 : 80 }}>-</span>
            <span style={{
              color: team2Won ? gradientStart : team1Won ? '#666666' : '#00C875'
            }}>
              {match.team2_score}
            </span>
          </div>

          {/* Match status badge */}
          {!isCompleted && (
            <div style={{
              fontSize: format === 'instagram' ? 24 : 20,
              color: '#FFC84A',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.1em'
            }}>
              {match.status === 'in_progress' ? '🔴 LIVE' : '⏳ UPCOMING'}
            </div>
          )}

          {/* Confetti overlay for completed matches */}
          {isCompleted && (
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              pointerEvents: 'none',
              display: 'flex',
              justifyContent: 'space-around',
              alignItems: 'flex-start',
              padding: '40px',
              fontSize: format === 'instagram' ? 48 : 40,
              opacity: 0.3
            }}>
              <span>🎉</span>
              <span>🎊</span>
              <span>✨</span>
              <span>🎉</span>
              <span>🎊</span>
            </div>
          )}
        </div>

        {/* Footer - WeFit Labs watermark and sponsor */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '4px'
          }}>
            <div style={{
              fontSize: format === 'instagram' ? 28 : 24,
              fontWeight: 700,
              color: '#FFFFFF'
            }}>
              WeFit Labs NYC
            </div>
            <div style={{
              fontSize: format === 'instagram' ? 18 : 16,
              color: '#A0A0A0'
            }}>
              Live Leaderboard
            </div>
          </div>

          {/* Sponsor logo */}
          {match.event?.sponsor_logo_url ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
              gap: '8px'
            }}>
              <div style={{
                fontSize: format === 'instagram' ? 16 : 14,
                color: '#A0A0A0',
                textTransform: 'uppercase',
                letterSpacing: '0.1em'
              }}>
                Sponsored by
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={match.event.sponsor_logo_url}
                alt="Sponsor"
                style={{
                  height: format === 'instagram' ? '56px' : '48px',
                  objectFit: 'contain',
                  maxWidth: '200px'
                }}
              />
            </div>
          ) : match.event?.sponsor_name ? (
            <div style={{
              fontSize: format === 'instagram' ? 24 : 20,
              color: '#A0A0A0',
              fontWeight: 600
            }}>
              {match.event.sponsor_name}
            </div>
          ) : null}
        </div>
      </div>
    ),
    {
      width,
      height,
      headers: download ? {
        'Content-Disposition': `attachment; filename="wefit-match-${params.matchId}.png"`,
        'Content-Type': 'image/png'
      } : undefined
    }
  );

  return imageResponse;
}
