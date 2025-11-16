'use client';

/**
 * Achievement Showcase Component
 * Displays player's unlocked achievements
 */

import React, { useState } from 'react';
import type { PlayerAchievement, Achievement } from '@/types/database-extended';
import { Award, Lock, ChevronRight } from 'lucide-react';

interface AchievementShowcaseProps {
  playerId: string;
  initialAchievements: Array<PlayerAchievement & { achievement: Achievement }>;
}

export function AchievementShowcase({ playerId, initialAchievements }: AchievementShowcaseProps) {
  const [showAll, setShowAll] = useState(false);

  const displayedAchievements = showAll ? initialAchievements : initialAchievements.slice(0, 6);

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'legendary':
        return 'from-yellow-500 to-orange-500';
      case 'epic':
        return 'from-purple-500 to-pink-500';
      case 'rare':
        return 'from-blue-500 to-cyan-500';
      default:
        return 'from-gray-500 to-gray-600';
    }
  };

  const getRarityGlow = (rarity: string) => {
    switch (rarity) {
      case 'legendary':
        return 'shadow-yellow-500/50';
      case 'epic':
        return 'shadow-purple-500/50';
      case 'rare':
        return 'shadow-blue-500/50';
      default:
        return 'shadow-gray-500/50';
    }
  };

  if (initialAchievements.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Award className="w-5 h-5 text-wefit-gold" />
          Achievements
        </h2>
        <div className="text-center py-8">
          <Lock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No achievements unlocked yet</p>
          <p className="text-wefit-grey text-xs mt-1">Play matches to earn achievements!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Award className="w-5 h-5 text-wefit-gold" />
          Achievements
        </h2>
        <span className="text-sm text-wefit-grey">{initialAchievements.length} unlocked</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {displayedAchievements.map((playerAchievement) => {
          const achievement = playerAchievement.achievement as Achievement;
          return (
            <div
              key={playerAchievement.id}
              className={`relative bg-gradient-to-br ${getRarityColor(
                achievement.rarity || 'common'
              )} p-[2px] rounded-lg overflow-hidden group hover:scale-105 transition-transform`}
            >
              <div className="bg-white rounded-lg p-3 h-full">
                <div className="text-3xl mb-2">{achievement.icon}</div>
                <h3 className="text-sm font-semibold text-gray-900 mb-1 line-clamp-1">
                  {achievement.name}
                </h3>
                <p className="text-xs text-wefit-grey line-clamp-2 mb-2">{achievement.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-wefit-gold font-medium">+{achievement.points} pts</span>
                  <span className={`text-xs capitalize ${getRarityColor(achievement.rarity || 'common')} bg-clip-text text-transparent font-medium`}>
                    {achievement.rarity}
                  </span>
                </div>
              </div>

              {/* Shine effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            </div>
          );
        })}
      </div>

      {initialAchievements.length > 6 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="w-full mt-4 px-4 py-2 border border-wefit-primary text-wefit-primary hover:bg-wefit-primary/10 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
        >
          {showAll ? 'Show Less' : `Show All (${initialAchievements.length})`}
          <ChevronRight className={`w-4 h-4 transition-transform ${showAll ? 'rotate-90' : ''}`} />
        </button>
      )}
    </div>
  );
}
