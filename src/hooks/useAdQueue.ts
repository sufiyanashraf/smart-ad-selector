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

  let dominantAge: 'kid' | 'young' | 'adult' = 'young';
  if (demographics.kid >= demographics.young && demographics.kid >= demographics.adult) {
    dominantAge = 'kid';
  } else if (demographics.adult > demographics.young && demographics.adult > demographics.kid) {
    dominantAge = 'adult';
  }

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
  const [queue, setQueue] = useState<AdMetadata[]>(() =>
    applyCapture(customAds && customAds.length > 0 ? customAds : sampleAds, captureStartPercent, captureEndPercent)
  );
  const [playedAds, setPlayedAds] = useState<string[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const selectionRef = useRef<{ lastPlayedId: string | null; latestQueue: AdMetadata[] }>({
    lastPlayedId: null,
    latestQueue: applyCapture(customAds && customAds.length > 0 ? customAds : sampleAds, captureStartPercent, captureEndPercent),
  });

  selectionRef.current.latestQueue = queue;

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

    const genderMatches = ad.gender === dominantGender || ad.gender === 'all';
    const ageMatches = ad.ageGroup === dominantAge || ad.ageGroup === 'all';

    if (ad.gender === dominantGender && ad.ageGroup === dominantAge) {
      score += 10;
      reasons.push(`★ Perfect match: ${dominantGender} + ${dominantAge}`);
    } else if (genderMatches && ageMatches) {
      score += 5;
      reasons.push('✓ Matches both criteria');
    } else if (ad.gender === dominantGender) {
      score += 3;
      reasons.push(`✓ Matches ${dominantGender}`);
    } else if (ad.ageGroup === dominantAge) {
      score += 3;
      reasons.push(`✓ Matches ${dominantAge}`);
    } else {
      score -= 5;
      reasons.push('✗ No match');
    }

    if (ad.id === selectionRef.current.lastPlayedId) {
      score -= 3;
      reasons.push('Just played (-3)');
    }

    return { ad, score, reasons };
  }, []);

  const reorderQueue = useCallback((demographics: DemographicCounts) => {
    console.log('[Queue] Reordering based on demographics:', demographics);

    const allAds = customAds && customAds.length > 0 ? customAds : sampleAds;
    const adsWithCapture = applyCapture(allAds, captureStartPercent, captureEndPercent);
    const scoredAds = adsWithCapture.map(ad => scoreAd(ad, demographics));

    scoredAds.sort((a, b) => b.score - a.score);

    const top2 = scoredAds.slice(0, 2).map(s => s.ad);
    const { dominantGender, dominantAge } = getDominantAudience(demographics);
    const topAd = scoredAds[0];

    if (topAd) {
      console.log('[Queue] New queue (max 2):', scoredAds.slice(0, 2).map(s => `${s.ad.title}(${s.score})`).join(' > '));
      addLog('queue', `🔄 Queue updated for ${dominantGender} ${dominantAge}`);
      addLog('queue', `Next: "${topAd.ad.title}" (score: ${topAd.score})`);
    }

    selectionRef.current.latestQueue = top2;
    setQueue(top2);
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
      const resetAds = initialAds;
      selectionRef.current.latestQueue = resetAds;
      setQueue(resetAds);
      setPlayedAds([]);
      selectionRef.current.lastPlayedId = null;
      return resetAds[0] || null;
    }

    let nextAd = activeQueue[0];
    if (nextAd.id === selectionRef.current.lastPlayedId && activeQueue.length > 1) {
      nextAd = activeQueue[1];
    }

    setPlayedAds(prev => [nextAd.id, ...prev].slice(0, 5));
    selectionRef.current.lastPlayedId = nextAd.id;

    addLog('ad', `▶️ Playing: "${nextAd.title}"`);

    return nextAd;
  }, [initialAds, addLog, manualMode, externalManualQueue, captureStartPercent, captureEndPercent]);

  const resetManualQueueIndex = useCallback(() => {
    manualQueueIndexRef.current = 0;
  }, []);

  const queueStats = useMemo(() => ({
    total: queue.length,
    maleTargeted: queue.filter(a => a.gender === 'male').length,
    femaleTargeted: queue.filter(a => a.gender === 'female').length,
    kidTargeted: queue.filter(a => a.ageGroup === 'kid').length,
    youngTargeted: queue.filter(a => a.ageGroup === 'young').length,
    adultTargeted: queue.filter(a => a.ageGroup === 'adult').length,
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
