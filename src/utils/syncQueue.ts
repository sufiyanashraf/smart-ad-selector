/**
 * Cloud Sync Queue – Offline-First Analytics Buffer
 * 
 * This module manages a persistent local queue of analytics sessions
 * that are waiting to be synced to Supabase. The queue lives in
 * localStorage so it survives browser restarts and works even when
 * the device is completely offline.
 * 
 * Flow:
 * 1. SmartAdsSystem records an analytics session via recordAnalyticsSession()
 * 2. recordAnalyticsSession() calls queueForSync() to add it to the sync queue
 * 3. The useSupabaseSync hook periodically checks if online
 * 4. If online, it flushes the queue to Supabase and clears synced items
 */

import { AnalyticsSession } from '@/types/analytics';

const SYNC_QUEUE_KEY = 'smartads-sync-queue';

export interface SyncQueueItem {
  id: string;
  session: AnalyticsSession;
  queuedAt: number;
  retryCount: number;
}

/**
 * Add an analytics session to the sync queue.
 * Called automatically by analyticsStorage.recordAnalyticsSession().
 */
export function queueForSync(session: AnalyticsSession): void {
  const queue = getSyncQueue();
  const item: SyncQueueItem = {
    id: session.id,
    session,
    queuedAt: Date.now(),
    retryCount: 0,
  };
  queue.push(item);
  saveSyncQueue(queue);
}

/**
 * Get all items currently waiting in the sync queue.
 */
export function getSyncQueue(): SyncQueueItem[] {
  try {
    const raw = localStorage.getItem(SYNC_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Save the sync queue back to localStorage.
 */
function saveSyncQueue(queue: SyncQueueItem[]): void {
  localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
}

/**
 * Remove specific items from the queue by their IDs (after successful sync).
 */
export function removeFromSyncQueue(ids: string[]): void {
  const idSet = new Set(ids);
  const queue = getSyncQueue().filter(item => !idSet.has(item.id));
  saveSyncQueue(queue);
}

/**
 * Increment the retry count for failed items.
 */
export function markRetry(ids: string[]): void {
  const idSet = new Set(ids);
  const queue = getSyncQueue().map(item => {
    if (idSet.has(item.id)) {
      return { ...item, retryCount: item.retryCount + 1 };
    }
    return item;
  });
  saveSyncQueue(queue);
}

/**
 * Get the number of items waiting to sync.
 */
export function getSyncQueueLength(): number {
  return getSyncQueue().length;
}

/**
 * Clear the entire sync queue (e.g., after a manual reset).
 */
export function clearSyncQueue(): void {
  localStorage.removeItem(SYNC_QUEUE_KEY);
}
