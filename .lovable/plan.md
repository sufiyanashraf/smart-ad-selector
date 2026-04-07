

# Plan: Strict Audience-Based Ad Filtering

## Problem
The queue currently scores all ads but never actually filters out mismatched ones. Ads tagged `female` still appear when the audience is all male, and vice versa. The scoring system gives penalties but still includes wrong-gender ads in the queue.

## Solution
Replace the soft-scoring approach in `reorderQueue` with strict filtering, then score within the filtered set.

### Changes to `src/hooks/useAdQueue.ts`

**`reorderQueue` function (lines 113-140)**:
1. Determine dominant gender and age from demographics
2. **Hard filter**: keep only ads where `ad.gender === dominantGender || ad.gender === 'all'`
3. Within those, score by age match (exact age match > `all` age > wrong age)
4. Sort by score descending
5. If the hard filter produces zero results, relax to best gender match (keep ads matching dominant gender regardless of age, plus `all`-gender ads)
6. If still empty, fall back to all ads sorted by score (should not happen with sample data)

**`scoreAd` function (lines 75-111)**:
- Add a strict gender filter flag. Ads with wrong gender get score = -100 (effectively excluded)
- Keep recency penalty logic as-is

**`getNextAd` function (lines 142-195)**:
- No changes needed — it already rotates through `selectionRef.current.latestQueue`, which will now only contain matching ads

### Expected behavior
- Audience = male young → queue contains: TechPro (male/young), PowerBoost (male/young), NexGen (all/young), WealthGuard (all/adult). Female-tagged ads completely removed.
- Audience = female adult → queue contains: Elegance (female/adult), GlowUp (female/young), WealthGuard (all/adult), NexGen (all/young). Male-tagged ads completely removed.
- Rotation continues among matching ads via the existing `recentlyPlayedRef` mechanism.

### File summary

| File | Change |
|------|--------|
| `src/hooks/useAdQueue.ts` | Hard-filter by gender in `reorderQueue`, score by age within matches |

