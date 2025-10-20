'use client';

import { useEffect } from 'react';
import { getSupabaseClient } from '@/lib/supabase-client';
import type { Json } from '@/types/database';

export type AnalyticsEventType =
  | 'qr_scan'
  | 'check_in'
  | 'page_view'
  | 'sponsor_click'
  | 'sponsor_view'
  | 'share'
  | 'match_update'
  | 'dwell_time';

const SESSION_STORAGE_KEY = 'wefit_session_id';

export function getSessionId() {
  if (typeof window === 'undefined') return '';
  let sessionId = sessionStorage.getItem(SESSION_STORAGE_KEY);
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem(SESSION_STORAGE_KEY, sessionId);
  }
  return sessionId;
}

interface TrackEventParams {
  event_type: AnalyticsEventType;
  event_id: string;
  metadata?: Json;
}

export async function trackEvent({ event_type, event_id, metadata }: TrackEventParams) {
  try {
    const supabase = getSupabaseClient();
    await supabase.from('analytics_events').insert({
      event_type,
      event_id,
      session_id: typeof window === 'undefined' ? null : getSessionId(),
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      metadata: metadata ?? null
    } as any);
  } catch (error) {
    console.error('Analytics tracking failed', error);
  }
}

export function usePageViewTracking(eventId: string) {
  useEffect(() => {
    if (!eventId) return;
    trackEvent({
      event_type: 'page_view',
      event_id: eventId,
      metadata: {
        path: typeof window !== 'undefined' ? window.location.pathname : '',
        referrer: typeof document !== 'undefined' ? document.referrer : ''
      }
    });
  }, [eventId]);
}

export function useDwellTimeTracking(eventId: string) {
  useEffect(() => {
    if (!eventId) return;
    const start = Date.now();
    return () => {
      const dwellSeconds = Math.round((Date.now() - start) / 1000);
      trackEvent({
        event_type: 'dwell_time',
        event_id: eventId,
        metadata: { dwell_time_seconds: dwellSeconds }
      });
    };
  }, [eventId]);
}
