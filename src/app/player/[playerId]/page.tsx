/**
 * Player Profile Page
 * Displays player stats, achievements, match history, and partner chemistry
 */

import { createServerClient } from '@/lib/supabase/auth-server';
import { notFound } from 'next/navigation';
import { PlayerProfileHeader } from '@/components/features/PlayerProfile/PlayerProfileHeader';
import { StatsOverview } from '@/components/features/PlayerProfile/StatsOverview';
import { MatchHistory } from '@/components/features/PlayerProfile/MatchHistory';
import { AchievementShowcase } from '@/components/features/PlayerProfile/AchievementShowcase';
import { PartnerChemistry } from '@/components/features/PlayerProfile/PartnerChemistry';

interface PageProps {
  params: {
    playerId: string;
  };
}

export default async function PlayerProfilePage({ params }: PageProps) {
  const supabase = createServerClient();

  // Fetch player data
  const { data: profile } = await supabase
    .from('player_profiles')
    .select('*')
    .eq('id', params.playerId)
    .single();

  if (!profile) {
    notFound();
  }

  const { data: stats } = await supabase
    .from('player_stats')
    .select('*')
    .eq('player_id', params.playerId)
    .single();

  const { data: achievements } = await supabase
    .from('player_achievements')
    .select(`
      *,
      achievement:achievements(*)
    `)
    .eq('player_id', params.playerId)
    .order('unlocked_at', { ascending: false })
    .limit(6);

  return (
    <div className="min-h-screen bg-gradient-to-b from-wefit-dark to-wefit-dark-muted">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Profile Header */}
        <PlayerProfileHeader profile={profile} stats={stats} />

        {/* Stats Overview */}
        <StatsOverview stats={stats} profile={profile} />

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
          {/* Left Column - Achievements & Chemistry */}
          <div className="lg:col-span-1 space-y-6">
            <AchievementShowcase
              playerId={params.playerId}
              initialAchievements={achievements || []}
            />
            <PartnerChemistry playerId={params.playerId} />
          </div>

          {/* Right Column - Match History */}
          <div className="lg:col-span-2">
            <MatchHistory playerId={params.playerId} />
          </div>
        </div>
      </div>
    </div>
  );
}

export async function generateMetadata({ params }: PageProps) {
  const supabase = createServerClient();

  const { data: profile } = await supabase
    .from('player_profiles')
    .select('display_name, bio')
    .eq('id', params.playerId)
    .single();

  if (!profile) {
    return {
      title: 'Player Not Found | WeFit Labs',
    };
  }

  return {
    title: `${profile.display_name} - Player Profile | WeFit Labs`,
    description: profile.bio || `View ${profile.display_name}'s stats, achievements, and match history on WeFit Labs.`,
  };
}
