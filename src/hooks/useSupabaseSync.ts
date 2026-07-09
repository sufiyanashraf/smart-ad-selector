/**
 * useSupabaseSync – Background Telemetry Worker
 * 
 * This hook runs a silent background loop that:
 * 1. Checks if the device is online every SYNC_INTERVAL_MS
 * 2. If online, pushes all queued analytics to Supabase
 * 3. Fetches the latest ad targeting rules from the cloud
 * 4. Updates the screen's online status (heartbeat ping)
 * 
 * The hook is completely non-blocking. If offline, it does nothing.
 * If Supabase is unreachable, it retries on the next interval.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { getSyncQueue, removeFromSyncQueue, markRetry } from '@/utils/syncQueue';
import { AdMetadata } from '@/types/ad';
import { syncPlaylist, getCacheTimestamp } from '@/utils/playlistSync';

// Sync interval: check every 60 seconds
const SYNC_INTERVAL_MS = 60_000;

// Screen identity: check localStorage first (set via /config page), then .env.local
const CONFIG_STORAGE_KEY = 'smartads-screen-config';

function getScreenConfig(): { outletId: string; screenId: string } {
  try {
    const raw = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (raw) {
      const config = JSON.parse(raw);
      if (config.outlet_id && config.screen_id) {
        return { outletId: config.outlet_id, screenId: config.screen_id };
      }
    }
  } catch { /* ignore parse errors */ }
  return {
    outletId: import.meta.env.VITE_OUTLET_ID || '',
    screenId: import.meta.env.VITE_SCREEN_ID || '',
  };
}

export interface SyncStatus {
  isOnline: boolean;
  lastSyncAt: number | null;
  pendingCount: number;
  lastError: string | null;
  isSyncing: boolean;
}

export function useSupabaseSync() {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isOnline: navigator.onLine,
    lastSyncAt: null,
    pendingCount: 0,
    lastError: null,
    isSyncing: false,
  });
  const [cloudAds, setCloudAds] = useState<AdMetadata[]>([]);
  const intervalRef = useRef<number | null>(null);
  const isSyncingRef = useRef(false);

  // ─── Push Analytics to Supabase ─────────────────────────────
  const pushAnalytics = useCallback(async (): Promise<number> => {
    const queue = getSyncQueue();
    if (queue.length === 0) return 0;

    // Only attempt items that haven't been retried too many times
    const eligible = queue.filter(item => item.retryCount < 5);
    if (eligible.length === 0) return 0;

    // Map local sessions to the Supabase analytics_sessions schema
    const { outletId, screenId } = getScreenConfig();
    const rows = eligible.map(item => ({
      screen_id: screenId || null,
      outlet_id: outletId || null,
      ad_title: item.session.adTitle,
      started_at: new Date(item.session.startedAt).toISOString(),
      ended_at: new Date(item.session.endedAt).toISOString(),
      total_viewers: item.session.totalViewers,
      male_count: item.session.maleCount,
      female_count: item.session.femaleCount,
      child_count: item.session.childCount,
      teen_count: item.session.teenCount,
      young_adult_count: item.session.youngAdultCount,
      middle_aged_count: item.session.middleAgedCount,
      senior_count: item.session.seniorCount,
    }));

    const { error } = await supabase
      .from('analytics_sessions')
      .insert(rows);

    if (error) {
      console.warn('[Sync] Failed to push analytics:', error.message);
      markRetry(eligible.map(e => e.id));
      throw new Error(error.message);
    }

    // Success: remove synced items from the local queue
    removeFromSyncQueue(eligible.map(e => e.id));
    return eligible.length;
  }, []);

  // ─── Fetch Playlist from Supabase ───────────────────────────
  const fetchPlaylistAds = useCallback(async (): Promise<AdMetadata[]> => {
    const ads = await syncPlaylist();
    return ads;
  }, []);

  // ─── Send Heartbeat Ping ─────────────────────────────────────
  const sendHeartbeat = useCallback(async () => {
    const { screenId } = getScreenConfig();
    if (!screenId) return;

    await supabase
      .from('screens')
      .update({ status: 'online', last_ping: new Date().toISOString() })
      .eq('id', screenId);
  }, []);

  // ─── Main Sync Cycle ─────────────────────────────────────────
  const runSyncCycle = useCallback(async () => {
    if (isSyncingRef.current) return;
    if (!navigator.onLine) {
      setSyncStatus(prev => ({ ...prev, isOnline: false, pendingCount: getSyncQueue().length }));
      return;
    }

    isSyncingRef.current = true;
    setSyncStatus(prev => ({ ...prev, isOnline: true, isSyncing: true }));

    try {
      // 1. Push queued analytics
      const pushed = await pushAnalytics();
      if (pushed > 0) {
        console.log(`[Sync] Pushed ${pushed} analytics sessions to Supabase`);
      }

      // 2. Fetch playlist from backend
      const ads = await fetchPlaylistAds();
      setCloudAds(ads);
      if (ads.length > 0) {
        console.log(`[Sync] Playlist synced: ${ads.length} ads`);
      }

      // 3. Send heartbeat
      await sendHeartbeat();

      setSyncStatus({
        isOnline: true,
        lastSyncAt: Date.now(),
        pendingCount: getSyncQueue().length,
        lastError: null,
        isSyncing: false,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown sync error';
      console.warn('[Sync] Cycle failed:', message);
      setSyncStatus(prev => ({
        ...prev,
        isOnline: navigator.onLine,
        pendingCount: getSyncQueue().length,
        lastError: message,
        isSyncing: false,
      }));
    } finally {
      isSyncingRef.current = false;
    }
  }, [pushAnalytics, fetchPlaylistAds, sendHeartbeat]);

  // ─── Start Background Loop ──────────────────────────────────
  useEffect(() => {
    // Run immediately on mount
    runSyncCycle();

    // Then run every SYNC_INTERVAL_MS
    intervalRef.current = window.setInterval(runSyncCycle, SYNC_INTERVAL_MS);

    // Listen for online/offline events for immediate reaction
    const handleOnline = () => {
      setSyncStatus(prev => ({ ...prev, isOnline: true }));
      // Immediately try to sync when we come back online
      runSyncCycle();
    };
    const handleOffline = () => {
      setSyncStatus(prev => ({ ...prev, isOnline: false }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
      }
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [runSyncCycle]);

  return {
    syncStatus,
    cloudAds,
    triggerSync: runSyncCycle,
    playlistCacheTimestamp: getCacheTimestamp(),
  };
}
