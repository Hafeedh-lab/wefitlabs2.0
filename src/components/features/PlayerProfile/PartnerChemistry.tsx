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
    if (score >= 90) return { label: 'Dynamic Duo', color: 'text-wefit-gold', icon: '🔥' };
    if (score >= 75) return { label: 'Great Team', color: 'text-wefit-success', icon: '⚡' };
    if (score >= 60) return { label: 'Solid Pair', color: 'text-wefit-primary', icon: '💪' };
    return { label: 'Building Chemistry', color: 'text-wefit-grey', icon: '🤝' };
  };

  if (loading) {
    return (
      <div className="bg-wefit-dark-muted/50 border border-white/5 rounded-xl p-6">
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-wefit-dark-muted rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (partners.length === 0) {
    return (
      <div className="bg-wefit-dark-muted/50 border border-white/5 rounded-xl p-6">
        <h2 className="text-xl font-bold text-wefit-white mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-wefit-primary" />
          Partner Chemistry
        </h2>
        <div className="text-center py-6">
          <Users className="w-12 h-12 text-wefit-grey/60 mx-auto mb-3" />
          <p className="text-wefit-grey text-sm">No partner data yet</p>
          <p className="text-wefit-grey/70 text-xs mt-1">Play doubles to build chemistry!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-wefit-dark-muted/50 border border-white/5 rounded-xl p-6">
      <h2 className="text-xl font-bold text-wefit-white mb-4 flex items-center gap-2">
        <Users className="w-5 h-5 text-wefit-primary" />
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
              className="bg-wefit-dark-muted/50 border border-white/5 rounded-lg p-4 hover:border-wefit-primary/40 transition-all group"
            >
              <div className="flex items-center gap-3">
                {/* Avatar */}
                {partnerData.partner.avatar_url ? (
                  <img
                    src={partnerData.partner.avatar_url}
                    alt={partnerData.partner.display_name}
                    className="w-12 h-12 rounded-full object-cover ring-2 ring-white/10 group-hover:ring-wefit-primary/50 transition-colors"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-wefit-primary to-wefit-primary-hover flex items-center justify-center text-white font-bold text-sm ring-2 ring-white/10 group-hover:ring-wefit-primary/50 transition-colors">
                    {initials}
                  </div>
                )}

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-wefit-white truncate">
                      {partnerData.partner.display_name}
                    </h3>
                    {index === 0 && partnerData.chemistry.win_rate > 70 && (
                      <Award className="w-4 h-4 text-wefit-gold flex-shrink-0" />
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs text-wefit-grey">
                    <span>{chemistryInfo.icon}</span>
                    <span className={chemistryInfo.color}>{chemistryInfo.label}</span>
                  </div>
                </div>

                {/* Stats */}
                <div className="text-right flex-shrink-0">
                  <div className="text-lg font-bold text-wefit-white mb-1">
                    {partnerData.chemistry.win_rate}%
                  </div>
                  <div className="text-xs text-wefit-grey">
                    {partnerData.chemistry.wins_together}-{partnerData.chemistry.losses_together}
                  </div>
                </div>
              </div>

              {/* Chemistry Bar */}
              <div className="mt-3">
                <div className="h-1.5 bg-wefit-dark-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-wefit-primary to-wefit-primary-hover transition-all duration-500"
                    style={{ width: `${partnerData.chemistry.chemistry_score}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {partners.length > 5 && (
        <button className="w-full mt-4 px-4 py-2 bg-wefit-dark-muted hover:bg-wefit-dark text-white rounded-lg transition-colors text-sm">
          View All Partners ({partners.length})
        </button>
      )}
    </div>
  );
}
