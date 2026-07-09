/**
 * playlistSync – Fetches and caches playlist from Supabase
 * 
 * The playlist is managed by the admin in the backend.
 * The selector fetches it on startup and caches in localStorage.
 * Videos are stored locally in public/ads/ and referenced via relative paths.
 */

import { supabase } from '@/lib/supabase';
import { AdMetadata } from '@/types/ad';

const PLAYLIST_CACHE_KEY = 'smartads-playlist-cache';
const PLAYLIST_CACHE_TIMESTAMP_KEY = 'smartads-playlist-cache-ts';

// Screen identity: check localStorage first (set via /config page), then .env.local
const CONFIG_STORAGE_KEY = 'smartads-screen-config';

function getOutletId(): string {
  try {
    const raw = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (raw) {
      const config = JSON.parse(raw);
      if (config.outlet_id) return config.outlet_id;
    }
  } catch { /* ignore */ }
  return import.meta.env.VITE_OUTLET_ID || '';
}

/**
 * Map a Supabase playlist row to the local AdMetadata format.
 * video_path (e.g., 'ads/pepsi.mp4') → videoUrl ('/ads/pepsi.mp4')
 */
function mapPlaylistRowToAd(row: Record<string, unknown>): AdMetadata {
  const videoPath = row.video_path as string;
  const ageGroups = row.age_groups as string[];
  const duration = row.duration as number;

  return {
    id: row.id as string,
    filename: videoPath.split('/').pop() || videoPath,
    title: row.title as string,
    gender: row.gender as 'male' | 'female' | 'all',
    ageGroup: ageGroups as AdMetadata['ageGroup'],
    duration: duration,
    captureStart: Math.floor(duration * 0.6),
    captureEnd: Math.floor(duration * 0.95),
    videoUrl: videoPath.startsWith('/') ? videoPath : `/${videoPath}`,
    video_path: videoPath,
  };
}

/**
 * Fetch active playlist items from Supabase.
 * Filters to include:
 * - Global ads (no entries in playlist_outlets)
 * - Ads assigned to this outlet
 */
export async function fetchPlaylist(): Promise<AdMetadata[]> {
  const outletId = getOutletId();

  // Fetch all active playlist items
  const { data: playlistData, error: playlistError } = await supabase
    .from('playlist')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (playlistError) {
    console.warn('[PlaylistSync] Failed to fetch playlist:', playlistError.message);
    throw new Error(playlistError.message);
  }

  if (!playlistData || playlistData.length === 0) return [];

  // Fetch outlet assignments
  const { data: assignmentsData } = await supabase
    .from('playlist_outlets')
    .select('playlist_id, outlet_id');

  const assignments = assignmentsData || [];

  // Build a map: playlist_id → assigned outlet_ids
  const assignmentMap = new Map<string, string[]>();
  for (const a of assignments) {
    const existing = assignmentMap.get(a.playlist_id) || [];
    existing.push(a.outlet_id);
    assignmentMap.set(a.playlist_id, existing);
  }

  // Filter: include global ads (no assignments) + ads assigned to this outlet
  const filtered = playlistData.filter((row: Record<string, unknown>) => {
    const id = row.id as string;
    const outlets = assignmentMap.get(id);
    // No assignments = global ad
    if (!outlets || outlets.length === 0) return true;
    // Has assignments = only if this outlet is in the list
    if (outletId && outlets.includes(outletId)) return true;
    return false;
  });

  return filtered.map(mapPlaylistRowToAd);
}

/**
 * Get cached playlist from localStorage.
 */
export function getCachedPlaylist(): AdMetadata[] {
  try {
    const raw = localStorage.getItem(PLAYLIST_CACHE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore parse errors */ }
  return [];
}

/**
 * Get the timestamp of the last successful cache.
 */
export function getCacheTimestamp(): number | null {
  try {
    const raw = localStorage.getItem(PLAYLIST_CACHE_TIMESTAMP_KEY);
    if (raw) return parseInt(raw, 10);
  } catch { /* ignore */ }
  return null;
}

/**
 * Save playlist to localStorage cache.
 */
function saveToCache(ads: AdMetadata[]): void {
  try {
    localStorage.setItem(PLAYLIST_CACHE_KEY, JSON.stringify(ads));
    localStorage.setItem(PLAYLIST_CACHE_TIMESTAMP_KEY, String(Date.now()));
  } catch (e) {
    console.warn('[PlaylistSync] Failed to save to cache:', e);
  }
}

/**
 * Sync playlist: try fetching from Supabase, fall back to cache.
 * Always saves successful fetches to cache.
 */
export async function syncPlaylist(): Promise<AdMetadata[]> {
  try {
    const ads = await fetchPlaylist();
    if (ads.length > 0) {
      saveToCache(ads);
      console.log(`[PlaylistSync] Fetched ${ads.length} ads from backend`);
      return ads;
    }
    // If backend returns empty, still cache it (admin may have cleared all ads)
    saveToCache(ads);
    return ads;
  } catch {
    console.warn('[PlaylistSync] Fetch failed, using cached playlist');
    return getCachedPlaylist();
  }
}
