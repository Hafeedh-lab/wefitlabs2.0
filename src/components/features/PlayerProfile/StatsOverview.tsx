'use client';

/**
 * Stats Overview Component
 * Displays detailed player statistics
 */

import React from 'react';
import type { PlayerProfile, PlayerStats } from '@/types/database-extended';
import { TrendingUp, TrendingDown, Minus, Target, Flame, Users } from 'lucide-react';

interface StatsOverviewProps {
  profile: PlayerProfile;
  stats: PlayerStats | null;
}

export function StatsOverview({ profile, stats }: StatsOverviewProps) {
  if (!stats || stats.matches_played === 0) {
    return (
      <div className="mt-6 bg-gray-900/50 border border-gray-800 rounded-xl p-8 text-center">
        <Target className="w-16 h-16 text-gray-600 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-400 mb-2">No Matches Yet</h3>
        <p className="text-gray-500">Play your first match to see your stats!</p>
      </div>
    );
  }

  const winRate = Math.round((stats.matches_won / stats.matches_played) * 100);
  const avgPointDiff = stats.avg_point_differential;
  const trend = avgPointDiff > 0.5 ? 'improving' : avgPointDiff < -0.5 ? 'declining' : 'stable';

  const statCards = [
    {
      label: 'Total Matches',
      value: stats.matches_played,
      icon: Target,
      color: 'text-blue-500',
    },
    {
      label: 'Wins',
      value: stats.matches_won,
      icon: TrendingUp,
      color: 'text-green-500',
    },
    {
      label: 'Losses',
      value: stats.matches_lost,
      icon: TrendingDown,
      color: 'text-red-500',
    },
    {
      label: 'Best Streak',
      value: stats.best_win_streak,
      icon: Flame,
      color: 'text-orange-500',
    },
    {
      label: 'Comeback Wins',
      value: stats.comeback_wins,
      icon: TrendingUp,
      color: 'text-purple-500',
    },
    {
      label: 'Different Partners',
      value: stats.different_partners_count,
      icon: Users,
      color: 'text-cyan-500',
    },
  ];

  return (
    <div className="mt-6 space-y-6">
      {/* Performance Trend */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 border border-gray-700 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Performance Trend</h3>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              {trend === 'improving' && <TrendingUp className="w-5 h-5 text-green-500" />}
              {trend === 'declining' && <TrendingDown className="w-5 h-5 text-red-500" />}
              {trend === 'stable' && <Minus className="w-5 h-5 text-gray-500" />}
              <span className="text-gray-300 capitalize">{trend}</span>
            </div>
            <p className="text-sm text-gray-400">
              Average point differential:{' '}
              <span className={avgPointDiff > 0 ? 'text-green-500' : avgPointDiff < 0 ? 'text-red-500' : 'text-gray-300'}>
                {avgPointDiff > 0 ? '+' : ''}{avgPointDiff.toFixed(1)}
              </span>
            </p>
          </div>

          <div className="text-right">
            <div className="text-3xl font-bold text-white">{winRate}%</div>
            <div className="text-sm text-gray-400">Win Rate</div>
          </div>
        </div>

        {/* Win/Loss Bar */}
        <div className="mt-4">
          <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-green-500 to-green-600 transition-all duration-500"
              style={{ width: `${winRate}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-500">
            <span>{stats.matches_won} wins</span>
            <span>{stats.matches_lost} losses</span>
          </div>
        </div>
      </div>

      {/* Detailed Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statCards.map((stat) => (
          <div
            key={stat.label}
            className="bg-gray-900/70 border border-gray-800 rounded-lg p-4 hover:border-gray-700 transition-colors"
          >
            <div className="flex items-center justify-between mb-2">
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
            <div className="text-2xl font-bold text-white mb-1">{stat.value}</div>
            <div className="text-xs text-gray-400">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Additional Info */}
      {stats.last_played_at && (
        <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4 text-center">
          <p className="text-sm text-gray-400">
            Last played:{' '}
            <span className="text-white font-medium">
              {new Date(stats.last_played_at).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
          </p>
        </div>
      )}
    </div>
  );
}
