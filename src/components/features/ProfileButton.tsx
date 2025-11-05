'use client';

/**
 * Profile Button Component
 * Displays a button to navigate to the user's player profile
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { User } from 'lucide-react';
import Link from 'next/link';

export function ProfileButton() {
  const { user, loading } = useAuth();
  const [profileId, setProfileId] = useState<string | null>(null);

  // Fetch user's profile ID
  useEffect(() => {
    if (user) {
      fetch('/api/players/me')
        .then((res) => res.json())
        .then((data) => {
          if (data.profile?.id) {
            setProfileId(data.profile.id);
          }
        })
        .catch(() => {
          // Ignore errors
        });
    } else {
      setProfileId(null);
    }
  }, [user]);

  if (loading) {
    return (
      <div className="w-10 h-10 bg-wefit-dark-muted/50 rounded-lg animate-pulse" />
    );
  }

  if (!user || !profileId) {
    return null;
  }

  return (
    <Link
      href={`/player/${profileId}`}
      className="flex items-center gap-2 px-4 py-2 bg-wefit-primary hover:bg-wefit-primary-hover text-white rounded-lg transition-colors shadow-wefit"
    >
      <User className="w-4 h-4" />
      <span className="hidden sm:inline font-semibold">My Profile</span>
    </Link>
  );
}
