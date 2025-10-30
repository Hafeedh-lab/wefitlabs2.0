'use client';

import { useEffect, useState, useCallback } from 'react';
import { offlineQueue } from '@/lib/offline-queue';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function ServiceWorkerRegistration() {
  const [isOnline, setIsOnline] = useState(true);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installPromptShown, setInstallPromptShown] = useState(false);
  const [interactionCount, setInteractionCount] = useState(0);

  const showInstallPrompt = useCallback(async () => {
    if (!deferredPrompt) return;

    setInstallPromptShown(true);

    // Show the install prompt
    await deferredPrompt.prompt();

    // Wait for the user's response
    const choiceResult = await deferredPrompt.userChoice;

    if (choiceResult.outcome === 'accepted') {
      console.log('User accepted the install prompt');
    } else {
      console.log('User dismissed the install prompt');
    }

    setDeferredPrompt(null);
  }, [deferredPrompt]);

  useEffect(() => {
    // Service Worker Registration
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('Service Worker registered:', registration.scope);

          // Check for updates every 60 seconds
          setInterval(() => {
            registration.update();
          }, 60000);

          // Listen for updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // New service worker available, prompt user to refresh
                  if (confirm('A new version is available! Refresh to update?')) {
                    window.location.reload();
                  }
                }
              });
            }
          });
        })
        .catch((error) => {
          console.error('Service Worker registration failed:', error);
        });
    }

    // Online/Offline Detection
    const handleOnline = async () => {
      console.log('Connection restored, syncing offline queue...');
      setIsOnline(true);
      try {
        await offlineQueue.syncAll();
        console.log('Offline queue synced successfully');
      } catch (error) {
        console.error('Failed to sync offline queue:', error);
      }
    };

    const handleOffline = () => {
      console.log('Connection lost, entering offline mode');
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    setIsOnline(navigator.onLine);

    // Initial sync check on mount
    if (navigator.onLine) {
      offlineQueue.syncAll().catch(console.error);
    }

    // PWA Install Prompt Handling
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Track user interactions for install prompt
    const trackInteraction = () => {
      setInteractionCount((prev) => {
        const newCount = prev + 1;
        // Show install prompt after 3 interactions
        if (newCount >= 3 && deferredPrompt && !installPromptShown) {
          showInstallPrompt();
        }
        return newCount;
      });
    };

    // Track clicks, scrolls, and taps
    const events = ['click', 'scroll', 'touchstart'];
    events.forEach((event) => {
      window.addEventListener(event, trackInteraction, { once: true, passive: true });
    });

    // Background Sync Registration (if supported)
    if ('serviceWorker' in navigator && 'sync' in ServiceWorkerRegistration.prototype) {
      navigator.serviceWorker.ready.then((registration) => {
        // Register sync for offline updates
        // @ts-expect-error - sync not in TypeScript types yet
        return registration.sync.register('sync-offline-queue');
      }).catch(console.error);
    }

    // Periodic Background Sync (if supported)
    if ('serviceWorker' in navigator && 'periodicSync' in ServiceWorkerRegistration.prototype) {
      navigator.serviceWorker.ready.then((registration) => {
        // @ts-ignore - periodicSync not in TypeScript types yet
        return registration.periodicSync.register('sync-scores', {
          minInterval: 5 * 60 * 1000 // 5 minutes
        });
      }).catch(console.error);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, [deferredPrompt, installPromptShown, showInstallPrompt]);

  // Install button component (can be triggered manually)
  useEffect(() => {
    // Expose install function globally for manual trigger
    if (typeof window !== 'undefined') {
      (window as any).showPWAInstall = showInstallPrompt;
    }
  }, [showInstallPrompt]);

  return null; // This is a headless component
}
