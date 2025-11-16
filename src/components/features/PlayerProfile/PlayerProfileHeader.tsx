'use client';

/**
 * Player Profile Header
 * Displays avatar, name, rating, and bio
 */

import React, { useState } from 'react';
import type { PlayerProfile, PlayerStats } from '@/types/database-extended';
import { eloSystem } from '@/lib/elo-system';
import { Trophy, MapPin, Calendar, Edit } from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';
import { EditProfileModal } from '@/components/features/EditProfileModal';

interface PlayerProfileHeaderProps {
  profile: PlayerProfile;
  stats: PlayerStats | null;
}

export function PlayerProfileHeader({ profile, stats }: PlayerProfileHeaderProps) {
  const { user } = useAuth();
  const [showEditModal, setShowEditModal] = useState(false);
  const isOwnProfile = user?.id === profile.user_id;
  const skillBracket = eloSystem.getSkillBracket(profile.skill_rating);

  // Generate initials for avatar fallback
  const initials = profile.display_name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const winRate = stats && stats.matches_played > 0
    ? Math.round((stats.matches_won / stats.matches_played) * 100)
    : 0;

  return (
    <>
      <EditProfileModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        profile={profile}
        onUpdate={() => window.location.reload()}
      />
      <div className="bg-white border border-wefit-primary/40 rounded-2xl p-8 shadow-lg">
        <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
          {/* Avatar */}
          <div className="relative">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.display_name}
                className="w-24 h-24 md:w-32 md:h-32 rounded-full object-cover ring-4 ring-yellow-500/50"
              />
            ) : (
              <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-gradient-to-br from-yellow-500 to-yellow-600 flex items-center justify-center ring-4 ring-yellow-500/50">
                <span className="text-4xl md:text-5xl font-bold text-black">{initials}</span>
              </div>
            )}

            {/* Skill Badge */}
            <div
              className="absolute -bottom-2 -right-2 px-3 py-1 rounded-full text-xs font-bold shadow-lg"
              style={{ backgroundColor: skillBracket.color }}
            >
              {skillBracket.label}
            </div>
          </div>

          {/* Info */}
          <div className="flex-1">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
                  {profile.display_name}
                </h1>

                <div className="flex flex-wrap items-center gap-4 text-wefit-grey text-sm mb-4">
                  {profile.location && (
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {profile.location}
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    Member since {new Date(profile.member_since).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </div>
                </div>

                {profile.bio && (
                  <p className="text-gray-700 max-w-2xl mb-4">{profile.bio}</p>
                )}
              </div>

              {isOwnProfile && (
                <button
                  onClick={() => setShowEditModal(true)}
                  className="px-4 py-2 border border-wefit-primary text-wefit-primary hover:bg-wefit-primary/10 rounded-lg transition-colors flex items-center gap-2"
                >
                  <Edit className="w-4 h-4" />
                  Edit Profile
                </button>
              )}
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="text-wefit-grey text-sm mb-1">Rating</div>
                <div className="text-2xl font-bold text-wefit-gold">{profile.skill_rating}</div>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="text-wefit-grey text-sm mb-1">Matches</div>
                <div className="text-2xl font-bold text-gray-900">{stats?.matches_played || 0}</div>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="text-wefit-grey text-sm mb-1">Win Rate</div>
                <div className="text-2xl font-bold text-wefit-success">{winRate}%</div>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="text-wefit-grey text-sm mb-1">Streak</div>
                <div className="text-2xl font-bold text-orange-500 flex items-center gap-1">
                  {stats?.current_win_streak && stats.current_win_streak > 0 ? (
                    <>🔥 {stats.current_win_streak}</>
                  ) : (
                    '0'
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
