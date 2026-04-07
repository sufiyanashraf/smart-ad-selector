

# Plan: Fix Ad Queue Rotation and Analytics Recording

## Issue 1: Queue Plays Only 2 Ads in a Loop

**Root Cause**: `reorderQueue` in `useAdQueue.ts` takes only the top 2 ads (`scoredAds.slice(0, 2)`) and `getNextAd` alternates between `queue[0]` and `queue[1]`. This creates a fixed 2-ad loop regardless of audience.

**Fix**:
- Change `reorderQueue` to keep ALL ads sorted by relevance score (not just top 2), filtering out only negative-score ads
- Update `getNextAd` to rotate through matching ads: pick the highest-scored ad that was NOT recently played (track last 3-4 played IDs instead of just 1)
- When audience changes, re-score and re-sort, but maintain rotation position among the new top matches
- Update the AdQueue component footer text from "Top 2 ads" to reflect the new behavior

**File**: `src/hooks/useAdQueue.ts`
- `reorderQueue`: keep all positively-scored ads (score > 0), sorted descending
- `getNextAd`: iterate through the sorted queue, skip any ad in the `recentlyPlayed` list (last 3 IDs), pick the first available. If all have been played recently, pick the top-scored one
- Track `recentlyPlayed` as a ref array of last 3 ad IDs

**File**: `src/components/AdQueue.tsx`
- Update footer text

## Issue 2: Analytics Not Recording on Cloned Project

**Root Cause**: The periodic analytics recording in test mode (every 30s interval in `useEffect`) has `demographics` in its dependency array. Since `demographics` state updates every ~800ms from the detection loop, the `useEffect` re-runs constantly, destroying and recreating the 30-second `setInterval` before it ever fires. The timer never reaches 30 seconds.

**Fix in `src/pages/SmartAdsSystem.tsx`**:
- Remove `demographics` and `currentAd` from the useEffect dependency array for the analytics interval
- Instead, read demographics from `lastDemographicsRef.current` inside the interval callback (the ref is already kept in sync)
- Read currentAd from a new ref (`currentAdRef`) to avoid stale closures
- This way the 30s interval is created once when test mode starts and destroyed when it stops, and each tick reads the latest values from refs

## Summary of Changes

| File | Change |
|------|--------|
| `src/hooks/useAdQueue.ts` | Keep all matching ads in queue, rotate through them |
| `src/components/AdQueue.tsx` | Update footer text |
| `src/pages/SmartAdsSystem.tsx` | Fix analytics interval to not reset on every demographics change |

