'use client';

import { openDB } from 'idb';

export type OfflineActionType = 'score_update' | 'match_complete';

interface QueuedAction {
  id: string;
  type: OfflineActionType;
  payload: Record<string, unknown>;
  timestamp: number;
}

const DB_NAME = 'wefit-offline-queue';
const STORE_NAME = 'actions';

async function getDB() {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    }
  });
}

async function executeAction(action: QueuedAction) {
  if (typeof window === 'undefined') return;
  const { supabaseClient } = await import('@/lib/supabase-client');

  switch (action.type) {
    case 'score_update':
      await supabaseClient
        .from('matches')
        .update(action.payload)
        .eq('id', action.payload.match_id as string);
      break;
    case 'match_complete':
      await supabaseClient
        .from('matches')
        .update({
          status: 'completed',
          winner_id: action.payload.winner_id,
          updated_at: new Date().toISOString()
        })
        .eq('id', action.payload.match_id as string);
      break;
    default:
      console.warn('Unknown offline action type', action.type);
  }
}

class OfflineQueue {
  async add(action: Omit<QueuedAction, 'id' | 'timestamp'>) {
    const db = await getDB();
    await db.add(STORE_NAME, {
      ...action,
      id: crypto.randomUUID(),
      timestamp: Date.now()
    });
  }

  async getAll() {
    const db = await getDB();
    return db.getAll(STORE_NAME) as Promise<QueuedAction[]>;
  }

  async remove(id: string) {
    const db = await getDB();
    await db.delete(STORE_NAME, id);
  }

  async syncAll() {
    const actions = await this.getAll();
    for (const action of actions) {
      try {
        await executeAction(action);
        await this.remove(action.id);
      } catch (error) {
        console.error('Failed to sync offline action', action, error);
      }
    }
  }
}

export const offlineQueue = new OfflineQueue();
