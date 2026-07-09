import { useState, useCallback, useMemo, useRef } from 'react';
import { AdMetadata, DemographicCounts, AdScore, LogEntry } from '@/types/ad';


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

export interface AudienceWeights {
  genderWeights: { male: number; female: number };
  ageWeights: Record<'child' | 'teen' | 'youngAdult' | 'middleAged' | 'senior', number>;
  totalViewers: number;
  dominantGender: 'male' | 'female';
  dominantAge: 'child' | 'teen' | 'youngAdult' | 'middleAged' | 'senior';
}

export const getAudienceWeights = (demographics: DemographicCounts): AudienceWeights => {
  const totalGender = demographics.male + demographics.female;
  const genderWeights = totalGender > 0
    ? { male: demographics.male / totalGender, female: demographics.female / totalGender }
    : { male: 0.5, female: 0.5 };

  const ageKeys = ['child', 'teen', 'youngAdult', 'middleAged', 'senior'] as const;
  const totalAge = ageKeys.reduce((sum, k) => sum + demographics[k], 0);
  const ageWeights = {} as Record<typeof ageKeys[number], number>;
  for (const k of ageKeys) {
    ageWeights[k] = totalAge > 0 ? demographics[k] / totalAge : 0.2;
  }

  const dominantGender = demographics.male >= demographics.female ? 'male' as const : 'female' as const;
  const dominantAge = ageKeys.reduce((max, k) => demographics[k] > demographics[max] ? k : max, ageKeys[0]);

  return { genderWeights, ageWeights, totalViewers: Math.max(totalGender, totalAge), dominantGender, dominantAge };
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
    applyCapture(customAds && customAds.length > 0 ? customAds : [], captureStartPercent, captureEndPercent)
  );
  const [playedAds, setPlayedAds] = useState<string[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const selectionRef = useRef<{ lastPlayedId: string | null; latestQueue: AdMetadata[] }>({
    lastPlayedId: null,
    latestQueue: applyCapture(customAds && customAds.length > 0 ? customAds : [], captureStartPercent, captureEndPercent),
  });

  // NOTE: Do NOT sync selectionRef from queue state — it overwrites filtered results.
  // selectionRef.latestQueue is updated only inside reorderQueue() and updateQueue().

  const initialAds = useMemo(() => {
    const ads = customAds && customAds.length > 0 ? customAds : [];
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
    const weights = getAudienceWeights(demographics);

    // --- Gender scoring (proportional) ---
    if (ad.gender === 'all') {
      score += 3;
      reasons.push('✓ Gender: all (+3)');
    } else {
      const genderWeight = weights.genderWeights[ad.gender];
      const genderScore = 5 * genderWeight;
      score += genderScore;
      reasons.push(`✓ Gender: ${ad.gender} (${(genderWeight * 100).toFixed(0)}% → +${genderScore.toFixed(1)})`);

      // Soft penalty: targeting a gender with <20% presence
      if (genderWeight < 0.2) {
        score -= 2;
        reasons.push(`⚠ Minority gender (<20% → -2)`);
      }
    }

    // --- Age scoring (proportional, sums across all targeted groups) ---
    const adAgeGroups = Array.isArray(ad.ageGroup) ? ad.ageGroup : [ad.ageGroup];
    if (adAgeGroups.includes('all' as any)) {
      score += 3;
      reasons.push('✓ Age: all (+3)');
    } else {
      let ageScore = 0;
      const matchedGroups: string[] = [];
      for (const ag of adAgeGroups) {
        if (ag !== 'all' && ag in weights.ageWeights) {
          const w = weights.ageWeights[ag as keyof typeof weights.ageWeights];
          ageScore += 5 * w;
          if (w > 0) matchedGroups.push(`${ag}:${(w * 100).toFixed(0)}%`);
        }
      }
      score += ageScore;
      if (matchedGroups.length > 0) {
        reasons.push(`✓ Age: ${matchedGroups.join(', ')} (+${ageScore.toFixed(1)})`);
      } else {
        reasons.push(`~ Age: no match in audience`);
      }
    }

    // --- Multi-viewer bonus: ads targeting 'all' get a crowd bonus when >2 viewers ---
    if (weights.totalViewers >= 3 && ad.gender === 'all') {
      score += 1;
      reasons.push(`👥 Crowd bonus (+1)`);
    }

    // --- Impression penalty (unchanged, capped at 2.5) ---
    const impressionCount = impressionCountsRef.current[ad.id] || 0;
    const impressionPenalty = Math.min(2.5, Math.log2(1 + impressionCount) * 0.5);
    if (impressionPenalty > 0) {
      score -= impressionPenalty;
      reasons.push(`Impressions: ${impressionCount} (-${impressionPenalty.toFixed(2)})`);
    }

    // --- Recency penalty (unchanged) ---
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

  // Store latest scores for UI display
  const lastScoresRef = useRef<AdScore[]>([]);

  const reorderQueue = useCallback((demographics: DemographicCounts) => {
    const weights = getAudienceWeights(demographics);
    console.log('[Queue] Reordering with audience weights:', weights);

    const allAds = customAds && customAds.length > 0 ? customAds : [];
    const adsWithCapture = applyCapture(allAds, captureStartPercent, captureEndPercent);

    // Score ALL ads proportionally (no hard filtering)
    const scored = adsWithCapture.map(ad => scoreAd(ad, demographics));

    // Primary sort by score; secondary sort by fewer impressions for fair rotation
    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const aImpressions = impressionCountsRef.current[a.ad.id] || 0;
      const bImpressions = impressionCountsRef.current[b.ad.id] || 0;
      return aImpressions - bImpressions;
    });

    lastScoresRef.current = scored;
    const finalAds = scored.map(s => s.ad);

    const summary = weights.totalViewers > 0
      ? `👥 ${weights.totalViewers} viewers | ${weights.dominantGender} ${(weights.genderWeights[weights.dominantGender] * 100).toFixed(0)}% | ${weights.dominantAge}`
      : 'No viewers';
    console.log('[Queue] Weighted reorder:', summary, '→', finalAds.map(a => a.title).join(', '));
    addLog('queue', `🔄 Queue: ${summary} → ${finalAds.length} ads`);

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
    lastScores: lastScoresRef.current,
  };
};
