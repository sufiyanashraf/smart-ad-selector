import { useState, useCallback, useMemo, useRef } from 'react';
import { AdMetadata, DemographicCounts, AdScore, LogEntry } from '@/types/ad';
import { sampleAds } from '@/data/sampleAds';

interface UseAdQueueProps {
  customAds?: AdMetadata[];
  captureStartPercent?: number;
  captureEndPercent?: number;
  manualMode?: boolean;
  manualQueue?: AdMetadata[];
}

const applyCapture = (ads: AdMetadata[], startPercent: number, endPercent: number) =>
  ads.map(ad => ({
    ...ad,
    captureStart: Math.floor(ad.duration * startPercent / 100),
    captureEnd: Math.floor(ad.duration * endPercent / 100),
  }));

const getDominantAudience = (demographics: DemographicCounts) => {
  const dominantGender = demographics.male >= demographics.female ? 'male' : 'female';

  const ageGroups = [
    { key: 'child' as const, count: demographics.child },
    { key: 'teen' as const, count: demographics.teen },
    { key: 'youngAdult' as const, count: demographics.youngAdult },
    { key: 'middleAged' as const, count: demographics.middleAged },
    { key: 'senior' as const, count: demographics.senior },
  ];
  const dominantAge = ageGroups.reduce((max, g) => g.count > max.count ? g : max, ageGroups[0]).key;

  return { dominantGender, dominantAge };
};

export const useAdQueue = (props?: UseAdQueueProps) => {
  const {
    customAds,
    captureStartPercent = 75,
    captureEndPercent = 92,
    manualMode = false,
    manualQueue: externalManualQueue = [],
  } = props || {};

  const manualQueueIndexRef = useRef(0);
  const recentlyPlayedRef = useRef<string[]>([]);
  const impressionCountsRef = useRef<Record<string, number>>({});
  const [queue, setQueue] = useState<AdMetadata[]>(() =>
    applyCapture(customAds && customAds.length > 0 ? customAds : sampleAds, captureStartPercent, captureEndPercent)
  );
  const [playedAds, setPlayedAds] = useState<string[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const selectionRef = useRef<{ lastPlayedId: string | null; latestQueue: AdMetadata[] }>({
    lastPlayedId: null,
    latestQueue: applyCapture(customAds && customAds.length > 0 ? customAds : sampleAds, captureStartPercent, captureEndPercent),
  });

  // NOTE: Do NOT sync selectionRef from queue state — it overwrites filtered results.
  // selectionRef.latestQueue is updated only inside reorderQueue() and updateQueue().

  const initialAds = useMemo(() => {
    const ads = customAds && customAds.length > 0 ? customAds : sampleAds;
    return applyCapture(ads, captureStartPercent, captureEndPercent);
  }, [customAds, captureStartPercent, captureEndPercent]);

  const updateQueue = useCallback((ads: AdMetadata[]) => {
    const updatedAds = applyCapture(ads, captureStartPercent, captureEndPercent);
    selectionRef.current.latestQueue = updatedAds;
    setQueue(updatedAds);
  }, [captureStartPercent, captureEndPercent]);

  const addLog = useCallback((type: LogEntry['type'], message: string) => {
    setLogs(prev => [{
      timestamp: new Date(),
      type,
      message,
    }, ...prev].slice(0, 50));
  }, []);

  const scoreAd = useCallback((ad: AdMetadata, demographics: DemographicCounts): AdScore => {
    let score = 0;
    const reasons: string[] = [];
    const { dominantGender, dominantAge } = getDominantAudience(demographics);

    // Strict gender filter: wrong gender = excluded
    if (ad.gender !== dominantGender && ad.gender !== 'all') {
      return { ad, score: -100, reasons: ['✗ Gender mismatch — excluded'] };
    }

    // Gender match bonus
    if (ad.gender === dominantGender) {
      score += 5;
      reasons.push(`✓ Gender: ${dominantGender}`);
    } else {
      score += 3;
      reasons.push('✓ Gender: all');
    }

    // Age match scoring
    if (ad.ageGroup === dominantAge) {
      score += 5;
      reasons.push(`✓ Age: ${dominantAge}`);
    } else if (ad.ageGroup === 'all') {
      score += 3;
      reasons.push('✓ Age: all');
    } else {
      score += 0;
      reasons.push(`~ Age mismatch (${ad.ageGroup})`);
    }

    // Impression weight penalty — gives less-played ads a natural advantage
    const impressionCount = impressionCountsRef.current[ad.id] || 0;
    const impressionPenalty = Math.log2(1 + impressionCount);
    if (impressionPenalty > 0) {
      score -= impressionPenalty;
      reasons.push(`Impressions: ${impressionCount} (-${impressionPenalty.toFixed(2)})`);
    }

    // Small penalty for recently played (window of last 5)
    if (recentlyPlayedRef.current.includes(ad.id)) {
      const recencyIndex = recentlyPlayedRef.current.indexOf(ad.id);
      const penalty = 2 - recencyIndex;
      if (penalty > 0) {
        score -= penalty;
        reasons.push(`Recently played (-${penalty})`);
      }
    }

    return { ad, score, reasons };
  }, []);

  const reorderQueue = useCallback((demographics: DemographicCounts) => {
    console.log('[Queue] Reordering based on demographics:', demographics);
    const { dominantGender, dominantAge } = getDominantAudience(demographics);

    const allAds = customAds && customAds.length > 0 ? customAds : sampleAds;
    const adsWithCapture = applyCapture(allAds, captureStartPercent, captureEndPercent);

    // Step 1: Hard filter by gender
    let filtered = adsWithCapture.filter(ad => ad.gender === dominantGender || ad.gender === 'all');

    // Step 2: Fallback if nothing matched
    if (filtered.length === 0) {
      filtered = adsWithCapture.filter(ad => ad.gender === dominantGender);
    }
    if (filtered.length === 0) {
      filtered = adsWithCapture; // last resort
    }

    // Step 3: Score within the filtered set (by age relevance)
    const scored = filtered.map(ad => scoreAd(ad, demographics));
    // Primary sort by score; secondary sort by fewer impressions for fair rotation
    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const aImpressions = impressionCountsRef.current[a.ad.id] || 0;
      const bImpressions = impressionCountsRef.current[b.ad.id] || 0;
      return aImpressions - bImpressions;
    });
    const finalAds = scored.map(s => s.ad);

    console.log('[Queue] Strict filter for', dominantGender, dominantAge, '→', finalAds.map(a => a.title).join(', '));
    addLog('queue', `🔄 Queue: ${dominantGender} ${dominantAge} → ${finalAds.length} ads (${finalAds.map(a => a.title).join(', ')})`);

    selectionRef.current.latestQueue = finalAds;
    setQueue(finalAds);
  }, [scoreAd, addLog, customAds, captureStartPercent, captureEndPercent]);

  const getNextAd = useCallback((): AdMetadata | null => {
    if (manualMode && externalManualQueue.length > 0) {
      const nextIndex = manualQueueIndexRef.current % externalManualQueue.length;
      const nextAd = {
        ...externalManualQueue[nextIndex],
        captureStart: Math.floor(externalManualQueue[nextIndex].duration * captureStartPercent / 100),
        captureEnd: Math.floor(externalManualQueue[nextIndex].duration * captureEndPercent / 100),
      };
      manualQueueIndexRef.current = (nextIndex + 1) % externalManualQueue.length;

      addLog('ad', `▶️ Playing: "${nextAd.title}" (${nextIndex + 1}/${externalManualQueue.length})`);
      selectionRef.current.lastPlayedId = nextAd.id;

      return nextAd;
    }

    const activeQueue = selectionRef.current.latestQueue;

    if (activeQueue.length === 0) {
      console.warn('[Queue] activeQueue is empty — refusing to reset to the full library.');
      addLog('queue', '⚠️ Queue is empty after filtering; waiting for next audience update');
      return null;
    }

    // Pick the first ad in the sorted queue that hasn't been recently played
    const recent = recentlyPlayedRef.current;
    let nextAd: AdMetadata | null = null;

    for (const ad of activeQueue) {
      if (!recent.includes(ad.id)) {
        nextAd = ad;
        break;
      }
    }

    // If all have been recently played, pick the top-scored one (first in queue)
    if (!nextAd) {
      nextAd = activeQueue[0];
    }

    // Track in recently played (dynamic window: scales with queue size, max 5)
    const recencyWindow = Math.min(5, Math.floor(activeQueue.length * 0.6));
    recentlyPlayedRef.current = [nextAd.id, ...recent.filter(id => id !== nextAd!.id)].slice(0, recencyWindow);

    // Increment impression count for weighted round-robin
    impressionCountsRef.current[nextAd.id] = (impressionCountsRef.current[nextAd.id] || 0) + 1;
    const impressionCount = impressionCountsRef.current[nextAd.id];

    setPlayedAds(prev => [nextAd!.id, ...prev].slice(0, 5));
    selectionRef.current.lastPlayedId = nextAd.id;

    addLog('ad', `▶️ Playing: "${nextAd.title}" (impressions: ${impressionCount})`);

    return nextAd;
  }, [addLog, manualMode, externalManualQueue, captureStartPercent, captureEndPercent]);

  const resetManualQueueIndex = useCallback(() => {
    manualQueueIndexRef.current = 0;
  }, []);

  const queueStats = useMemo(() => ({
    total: queue.length,
    maleTargeted: queue.filter(a => a.gender === 'male').length,
    femaleTargeted: queue.filter(a => a.gender === 'female').length,
    childTargeted: queue.filter(a => a.ageGroup === 'child').length,
    teenTargeted: queue.filter(a => a.ageGroup === 'teen').length,
    youngAdultTargeted: queue.filter(a => a.ageGroup === 'youngAdult').length,
    middleAgedTargeted: queue.filter(a => a.ageGroup === 'middleAged').length,
    seniorTargeted: queue.filter(a => a.ageGroup === 'senior').length,
  }), [queue]);

  return {
    queue,
    logs,
    getNextAd,
    reorderQueue,
    scoreAd,
    addLog,
    queueStats,
    updateQueue,
    resetManualQueueIndex,
  };
};
