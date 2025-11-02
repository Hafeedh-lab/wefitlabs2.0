'use client';

/**
 * Create Profile Modal
 * Prompts new users to create their player profile after checking in
 */

import React, { useState } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useToast } from '@/components/ui/ToastProvider';
import { User, MapPin, X, Target } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface CreateProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDisplayName?: string;
}

export function CreateProfileModal({ isOpen, onClose, initialDisplayName }: CreateProfileModalProps) {
  const [displayName, setDisplayName] = useState(initialDisplayName || '');
  const [location, setLocation] = useState('');
  const [bio, setBio] = useState('');
  const [playStyle, setPlayStyle] = useState<'aggressive' | 'defensive' | 'balanced'>('balanced');
  const [preferredPosition, setPreferredPosition] = useState<'left' | 'right' | 'any'>('any');
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();

  if (!isOpen || !user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch('/api/players/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name: displayName,
          location: location || null,
          bio: bio || null,
          play_style: playStyle,
          preferred_position: preferredPosition,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 409) {
          // Profile already exists
          showToast('Profile already exists!', 'error');
          if (data.profileId) {
            router.push(`/player/${data.profileId}`);
          }
          onClose();
          return;
        }
        throw new Error(data.error || 'Failed to create profile');
      }

      showToast('Profile created successfully! 🎉', 'success');
      onClose();

      // Redirect to new profile
      if (data.profile?.id) {
        router.push(`/player/${data.profile.id}`);
      }
    } catch (error) {
      console.error('Error creating profile:', error);
      showToast(error instanceof Error ? error.message : 'Failed to create profile', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    showToast('You can create your profile anytime from the menu', 'info');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="relative w-full max-w-lg bg-gradient-to-b from-gray-900 to-black border border-yellow-500/20 rounded-2xl shadow-2xl">
        {/* Close button */}
        <button
          onClick={handleSkip}
          disabled={isLoading}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="p-6 pb-4 border-b border-gray-800">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-full flex items-center justify-center">
              <User className="w-6 h-6 text-black" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Create Your Profile</h2>
              <p className="text-sm text-gray-400">Track your stats and compete!</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Display Name */}
          <div>
            <label htmlFor="displayName" className="block text-sm font-medium text-gray-300 mb-2">
              Display Name *
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                id="displayName"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                placeholder="Your name"
                className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 transition-colors"
              />
            </div>
          </div>

          {/* Location */}
          <div>
            <label htmlFor="location" className="block text-sm font-medium text-gray-300 mb-2">
              Location
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                id="location"
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="New York, NY"
                className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 transition-colors"
              />
            </div>
          </div>

          {/* Bio */}
          <div>
            <label htmlFor="bio" className="block text-sm font-medium text-gray-300 mb-2">
              Bio
            </label>
            <textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell us about yourself..."
              rows={3}
              maxLength={200}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 transition-colors resize-none"
            />
            <p className="mt-1 text-xs text-gray-500">{bio.length}/200 characters</p>
          </div>

          {/* Play Style */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Play Style</label>
            <div className="grid grid-cols-3 gap-2">
              {(['aggressive', 'balanced', 'defensive'] as const).map((style) => (
                <button
                  key={style}
                  type="button"
                  onClick={() => setPlayStyle(style)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    playStyle === style
                      ? 'bg-yellow-500 text-black'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  {style === 'aggressive' && '⚡'} {style === 'balanced' && '⚖️'}{' '}
                  {style === 'defensive' && '🛡️'}
                  <br />
                  <span className="text-xs capitalize">{style}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Preferred Position */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Preferred Position (Doubles)
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['left', 'right', 'any'] as const).map((position) => (
                <button
                  key={position}
                  type="button"
                  onClick={() => setPreferredPosition(position)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    preferredPosition === position
                      ? 'bg-yellow-500 text-black'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  <span className="capitalize">{position}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleSkip}
              disabled={isLoading}
              className="flex-1 py-3 px-4 bg-gray-800 hover:bg-gray-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
            >
              Skip for Now
            </button>
            <button
              type="submit"
              disabled={isLoading || !displayName.trim()}
              className="flex-1 py-3 px-4 bg-yellow-500 hover:bg-yellow-600 text-black font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Creating...' : 'Create Profile'}
            </button>
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 pb-6 text-center">
          <p className="text-xs text-gray-500">
            Your profile helps track your progress and connect with other players
          </p>
        </div>
      </div>
    </div>
  );
}
