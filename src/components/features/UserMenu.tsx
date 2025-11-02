'use client';

/**
 * User Menu Component
 * Displays user avatar/name and provides auth actions
 */

import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { AuthModal } from './AuthModal';
import { User, LogOut, Trophy, Settings, ChevronDown } from 'lucide-react';

export function UserMenu() {
  const { user, signOut, loading } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [profileId, setProfileId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

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
    }
  }, [user]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showDropdown]);

  if (loading) {
    return (
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-gray-800 rounded-full animate-pulse" />
        <div className="w-20 h-4 bg-gray-800 rounded animate-pulse hidden sm:block" />
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <button
          onClick={() => setShowAuthModal(true)}
          className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-black font-semibold rounded-lg transition-colors text-sm"
        >
          Sign In
        </button>
        <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
      </>
    );
  }

  const displayName = user.user_metadata?.displayName || user.email?.split('@')[0] || 'Player';
  const initials = displayName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-800/50 transition-colors"
      >
        <div className="w-8 h-8 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-full flex items-center justify-center text-black font-bold text-sm">
          {initials}
        </div>
        <span className="text-sm font-medium text-white hidden sm:block">{displayName}</span>
        <ChevronDown
          className={`w-4 h-4 text-gray-400 transition-transform ${showDropdown ? 'rotate-180' : ''}`}
        />
      </button>

      {showDropdown && (
        <div className="absolute right-0 mt-2 w-56 bg-gray-900 border border-gray-800 rounded-lg shadow-xl overflow-hidden z-50">
          <div className="px-4 py-3 border-b border-gray-800">
            <p className="text-sm font-medium text-white">{displayName}</p>
            <p className="text-xs text-gray-400 truncate">{user.email}</p>
          </div>

          <div className="py-1">
            {profileId ? (
              <a
                href={`/player/${profileId}`}
                className="flex items-center gap-3 px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 transition-colors"
              >
                <User className="w-4 h-4" />
                My Profile
              </a>
            ) : (
              <button
                onClick={() => {
                  setShowDropdown(false);
                  // Open create profile modal - handled by page
                }}
                className="flex items-center gap-3 w-full px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 transition-colors"
              >
                <User className="w-4 h-4" />
                Create Profile
              </button>
            )}
            <a
              href="/settings"
              className="flex items-center gap-3 px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 transition-colors"
            >
              <Settings className="w-4 h-4" />
              Settings
            </a>
          </div>

          <div className="border-t border-gray-800 py-1">
            <button
              onClick={signOut}
              className="flex items-center gap-3 w-full px-4 py-2 text-sm text-red-400 hover:bg-gray-800 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
