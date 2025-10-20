'use client';

import { useEffect, useState } from 'react';
import { offlineQueue } from '@/lib/offline-queue';
import { cn } from '@/utils/cn';

export default function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [queuedActions, setQueuedActions] = useState<number>(0);

  useEffect(() => {
    const updateQueueCount = async () => {
      try {
        const actions = await offlineQueue.getAll();
        setQueuedActions(actions.length);
      } catch (error) {
        console.error('Failed to load offline actions', error);
      }
    };

    updateQueueCount();
    const interval = setInterval(updateQueueCount, 2000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      void offlineQueue.syncAll();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline && queuedActions === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        'fixed bottom-4 left-1/2 z-40 w-[90vw] max-w-md -translate-x-1/2 rounded-xl px-4 py-3 text-sm font-medium shadow-wefit-lg',
        'flex items-center justify-between gap-3 animate-fade-in',
        isOnline ? 'bg-wefit-success text-white' : 'bg-wefit-error text-white'
      )}
    >
      <div className="flex items-center gap-3">
        <span className="text-lg" aria-hidden>
          {isOnline ? '🔄' : '⚠️'}
        </span>
        <div className="flex flex-col">
          <span>{isOnline ? 'Syncing offline updates…' : "You're offline"}</span>
          {queuedActions > 0 && (
            <span className="text-xs text-white/80">
              {queuedActions} update{queuedActions === 1 ? '' : 's'} pending
            </span>
          )}
        </div>
      </div>
      {isOnline ? (
        <div className="h-2 w-2 rounded-full bg-white animate-pulse" aria-hidden />
      ) : (
        <span className="rounded-lg bg-white/20 px-2 py-1 text-xs font-semibold">
          Offline
        </span>
      )}
    </div>
  );
}
