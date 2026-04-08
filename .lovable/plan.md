

# Plan: Fix Ad Queue Filtering and Analytics Import/Export

## Problem 1: Queue Not Filtering by Audience

I traced through the entire flow and found **three concrete bugs**:

### Bug A: `selectionRef` gets overwritten every render (line 54)
```
selectionRef.current.latestQueue = queue;
```
This runs on **every render**. When `reorderQueue` filters ads and calls `setQueue(filteredAds)`, React batches the state update. Before the re-render commits, subsequent renders still have the old `queue` state, and line 54 overwrites `selectionRef.current.latestQueue` back to the unfiltered list. This means `getNextAd()` reads stale, unfiltered data.

**Fix**: Remove line 54 entirely. `reorderQueue` already sets `selectionRef.current.latestQueue = finalAds` directly (line 145). The ref should only be written inside `reorderQueue` and `updateQueue`, never synced from state.

### Bug B: `updateQueue` on line 221 resets the filtered queue
```js
useEffect(() => {
  updateQueue(adsWithCaptureWindows); // resets to ALL ads
}, [adsWithCaptureWindows, updateQueue]);
```
This runs on mount and whenever ads change. `updateQueue` sets `selectionRef.current.latestQueue` to ALL ads with capture windows applied. If this effect re-fires after `reorderQueue` has filtered the queue, it undoes the filtering. Since `adsWithCaptureWindows` is a `useMemo` that creates a new array reference when `customAds` or `captureSettings` change, this can trigger unexpectedly.

**Fix**: Guard the effect so it only runs when the ad library actually changes (not on every memo recalc). Use a ref to track previous ads and skip if unchanged.

### Bug C: `getNextAd` falls back to `initialAds` when queue is empty
Lines 167-175: if `activeQueue.length === 0`, it resets to `initialAds` (all ads, unfiltered). This destroys any audience filtering.

**Fix**: When the filtered queue is empty (which shouldn't happen with the "best gender match" fallback), log a warning but keep the current queue rather than resetting to all ads.

### Files changed: `src/hooks/useAdQueue.ts`
- Remove line 54 (`selectionRef.current.latestQueue = queue`)
- Guard `updateQueue` effect in SmartAdsSystem or add a check in `updateQueue` to not overwrite if a reorder is active
- Fix empty-queue fallback in `getNextAd`
- Add console.log in `reorderQueue` showing the final filtered list for debugging

### Files changed: `src/pages/SmartAdsSystem.tsx`
- Guard the `updateQueue` effect (line 221) to only run on actual ad library changes, not after reorder

---

## Problem 2: Analytics Not Showing on Local Clone

The analytics storage layer (`analyticsStorage.ts`) is correct -- it reads/writes localStorage. The `ManagerAnalytics` page reads from localStorage on mount via `useMemo` keyed on `refreshKey`.

The issue is that `ManagerAnalytics` has **no way to know** when new data is written from the dashboard (which runs on a different route/page). The `refreshKey` only updates on manual button click. There is no `storage` event listener and no polling.

**Fix**:
- Add a `useEffect` in `ManagerAnalytics` that polls localStorage every 5 seconds (incrementing `refreshKey`) while the page is open
- Add Import/Export buttons: Export downloads the JSON (already exists). Add an Import button that reads a JSON file and merges sessions into localStorage.

### Files changed: `src/pages/ManagerAnalytics.tsx`
- Add auto-refresh polling (every 5s, increment refreshKey)
- Add Import button that reads a JSON file, parses sessions/events, merges with existing data

### Files changed: `src/utils/analyticsStorage.ts`
- Add `importAnalyticsJSON(json: string)` function that merges imported sessions/events with existing ones (deduplicating by ID)

---

## Summary

| File | Change |
|------|--------|
| `src/hooks/useAdQueue.ts` | Remove ref-from-state sync (line 54), fix empty-queue fallback |
| `src/pages/SmartAdsSystem.tsx` | Guard `updateQueue` effect to not overwrite filtered queue |
| `src/pages/ManagerAnalytics.tsx` | Add auto-refresh polling + Import button |
| `src/utils/analyticsStorage.ts` | Add `importAnalyticsJSON` function |

