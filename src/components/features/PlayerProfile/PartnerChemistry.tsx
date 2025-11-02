'use client';

/**
 * Partner Chemistry Component
 * Shows player's best partners and team chemistry
 */

import React, { useState, useEffect } from 'react';
import { Users, TrendingUp, Award } from 'lucide-react';

interface Partner {
  partner: {
    id: string;
    display_name: string;
    avatar_url?: string;
    skill_rating: number;
  };
  chemistry: {
    matches_together: number;
    wins_together: number;
    losses_together: number;
    win_rate: number;
    chemistry_score: number;
    last_played_together: string | null;
  };
}

interface PartnerChemistryProps {
  playerId: string;
}

export function PartnerChemistry({ playerId }: PartnerChemistryProps) {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchChemistry();
  }, [playerId]);

  const fetchChemistry = async () => {
    try {
      const response = await fetch(`/api/players/${playerId}/chemistry`);
      const data = await response.json();
      setPartners(data.partners || []);
    } catch (error) {
      console.error('Failed to fetch chemistry:', error);
    } finally {
      setLoading(false);
    }
  };

  const getChemistryLabel = (score: number) => {
    if (score >= 90) return { label: 'Dynamic Duo', color: 'text-yellow-500', icon: '🔥' };
    if (score >= 75) return { label: 'Great Team', color: 'text-green-500', icon: '⚡' };
    if (score >= 60) return { label: 'Solid Pair', color: 'text-blue-500', icon: '💪' };
    return { label: 'Building Chemistry', color: 'text-gray-400', icon: '🤝' };
  };

  if (loading) {
    return (
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-gray-800 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (partners.length === 0) {
    return (
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-cyan-500" />
          Partner Chemistry
        </h2>
        <div className="text-center py-6">
          <Users className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No partner data yet</p>
          <p className="text-gray-600 text-xs mt-1">Play doubles to build chemistry!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
      <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
        <Users className="w-5 h-5 text-cyan-500" />
        Partner Chemistry
      </h2>

      <div className="space-y-3">
        {partners.slice(0, 5).map((partnerData, index) => {
          const chemistryInfo = getChemistryLabel(partnerData.chemistry.chemistry_score);
          const initials = partnerData.partner.display_name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);

          return (
            <div
              key={partnerData.partner.id}
              className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 hover:border-gray-600 transition-all group"
            >
              <div className="flex items-center gap-3">
                {/* Avatar */}
                {partnerData.partner.avatar_url ? (
                  <img
                    src={partnerData.partner.avatar_url}
                    alt={partnerData.partner.display_name}
                    className="w-12 h-12 rounded-full object-cover ring-2 ring-gray-700 group-hover:ring-cyan-500 transition-colors"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-white font-bold text-sm ring-2 ring-gray-700 group-hover:ring-cyan-500 transition-colors">
                    {initials}
                  </div>
                )}

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-white truncate">
                      {partnerData.partner.display_name}
                    </h3>
                    {index === 0 && partnerData.chemistry.win_rate > 70 && (
                      <Award className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <span>{chemistryInfo.icon}</span>
                    <span className={chemistryInfo.color}>{chemistryInfo.label}</span>
                  </div>
                </div>

                {/* Stats */}
                <div className="text-right flex-shrink-0">
                  <div className="text-lg font-bold text-white mb-1">
                    {partnerData.chemistry.win_rate}%
                  </div>
                  <div className="text-xs text-gray-400">
                    {partnerData.chemistry.wins_together}-{partnerData.chemistry.losses_together}
                  </div>
                </div>
              </div>

              {/* Chemistry Bar */}
              <div className="mt-3">
                <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500"
                    style={{ width: `${partnerData.chemistry.chemistry_score}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {partners.length > 5 && (
        <button className="w-full mt-4 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors text-sm">
          View All Partners ({partners.length})
        </button>
      )}
    </div>
  );
}
