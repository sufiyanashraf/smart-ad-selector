import { useState, useCallback, useMemo } from 'react';
import { AdMetadata, DemographicCounts, AdScore, LogEntry } from '@/types/ad';
import { sampleAds } from '@/data/sampleAds';

interface UseAdQueueProps {
  customAds?: AdMetadata[];
  captureStartPercent?: number;
  captureEndPercent?: number;
}

export const useAdQueue = (props?: UseAdQueueProps) => {
  const { 
    customAds, 
    captureStartPercent = 75, 
    captureEndPercent = 92 
  } = props || {};

  // Use custom ads if provided, otherwise use sample ads
  const initialAds = useMemo(() => {
    const ads = customAds && customAds.length > 0 ? customAds : sampleAds;
    // Recalculate capture windows based on settings
    return ads.map(ad => ({
      ...ad,
      captureStart: Math.floor(ad.duration * captureStartPercent / 100),
      captureEnd: Math.floor(ad.duration * captureEndPercent / 100),
    }));
  }, [customAds, captureStartPercent, captureEndPercent]);

  const [queue, setQueue] = useState<AdMetadata[]>(initialAds);
  const [playedAds, setPlayedAds] = useState<string[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  // Update queue when ads or settings change
  const updateQueue = useCallback((ads: AdMetadata[]) => {
    const updatedAds = ads.map(ad => ({
      ...ad,
      captureStart: Math.floor(ad.duration * captureStartPercent / 100),
      captureEnd: Math.floor(ad.duration * captureEndPercent / 100),
    }));
    setQueue(updatedAds);
  }, [captureStartPercent, captureEndPercent]);

  const addLog = useCallback((type: LogEntry['type'], message: string) => {
    setLogs(prev => [{
      timestamp: new Date(),
      type,
      message
    }, ...prev].slice(0, 50));
  }, []);

  const scoreAd = useCallback((ad: AdMetadata, demographics: DemographicCounts): AdScore => {
    let score = 0;
    const reasons: string[] = [];

    const dominantGender = demographics.male >= demographics.female ? 'male' : 'female';
    const dominantAge = demographics.young >= demographics.adult ? 'young' : 'adult';

    if (ad.gender === 'all') {
      score += 1;
      reasons.push('Universal gender appeal');
    } else if (ad.gender === dominantGender) {
      score += 2;
      reasons.push(`Matches dominant gender (${dominantGender})`);
    }

    if (ad.ageGroup === 'all') {
      score += 1;
      reasons.push('Universal age appeal');
    } else if (ad.ageGroup === dominantAge) {
      score += 2;
      reasons.push(`Matches dominant age group (${dominantAge})`);
    }

    const recentIndex = playedAds.indexOf(ad.id);
    if (recentIndex !== -1) {
      const penalty = Math.max(0, 3 - recentIndex);
      score -= penalty;
      if (penalty > 0) reasons.push(`Recently played (-${penalty})`);
    }

    return { ad, score, reasons };
  }, [playedAds]);

  const reorderQueue = useCallback((demographics: DemographicCounts) => {
    const scoredAds = queue.map(ad => scoreAd(ad, demographics));
    scoredAds.sort((a, b) => b.score - a.score);
    const newQueue = scoredAds.map(s => s.ad);
    setQueue(newQueue);

    const topAd = scoredAds[0];
    if (topAd) {
      addLog('queue', `Queue reordered. Top: "${topAd.ad.title}" (score: ${topAd.score})`);
      topAd.reasons.forEach(r => addLog('queue', `  └─ ${r}`));
    }

    return scoredAds;
  }, [queue, scoreAd, addLog]);

  const getNextAd = useCallback((): AdMetadata | null => {
    if (queue.length === 0) {
      const resetAds = initialAds;
      setQueue(resetAds);
      setPlayedAds([]);
      return resetAds[0] || null;
    }

    const nextAd = queue[0];
    setQueue(prev => [...prev.slice(1), prev[0]]);
    setPlayedAds(prev => [nextAd.id, ...prev].slice(0, 5));
    addLog('ad', `Now playing: "${nextAd.title}"`);
    
    return nextAd;
  }, [queue, initialAds, addLog]);

  const queueStats = useMemo(() => ({
    total: queue.length,
    maleTargeted: queue.filter(a => a.gender === 'male').length,
    femaleTargeted: queue.filter(a => a.gender === 'female').length,
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
  };
};
