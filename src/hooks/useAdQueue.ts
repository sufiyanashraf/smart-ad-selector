import { useState, useCallback, useMemo, useRef } from 'react';
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

  const initialAds = useMemo(() => {
    const ads = customAds && customAds.length > 0 ? customAds : sampleAds;
    return ads.map(ad => ({
      ...ad,
      captureStart: Math.floor(ad.duration * captureStartPercent / 100),
      captureEnd: Math.floor(ad.duration * captureEndPercent / 100),
    }));
  }, [customAds, captureStartPercent, captureEndPercent]);

  const [queue, setQueue] = useState<AdMetadata[]>(initialAds);
  const [playedAds, setPlayedAds] = useState<string[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const lastPlayedIdRef = useRef<string | null>(null);

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

    // Perfect match bonus - both gender AND age match
    const genderMatches = ad.gender === dominantGender || ad.gender === 'all';
    const ageMatches = ad.ageGroup === dominantAge || ad.ageGroup === 'all';

    if (ad.gender === dominantGender && ad.ageGroup === dominantAge) {
      score += 10; // Perfect match - highest priority
      reasons.push(`★ Perfect match: ${dominantGender} + ${dominantAge}`);
    } else if (genderMatches && ageMatches) {
      score += 5; // Both match but one is 'all'
      reasons.push(`✓ Matches both criteria`);
    } else if (ad.gender === dominantGender) {
      score += 3;
      reasons.push(`✓ Matches ${dominantGender}`);
    } else if (ad.ageGroup === dominantAge) {
      score += 3;
      reasons.push(`✓ Matches ${dominantAge}`);
    } else {
      score -= 5; // Neither matches
      reasons.push(`✗ No match`);
    }

    // Penalty for recently played
    if (ad.id === lastPlayedIdRef.current) {
      score -= 3;
      reasons.push('Just played (-3)');
    }

    return { ad, score, reasons };
  }, [playedAds]);

  const reorderQueue = useCallback((demographics: DemographicCounts) => {
    console.log('[Queue] Reordering based on demographics:', demographics);
    
    // Score ALL available ads (from initial pool)
    const allAds = customAds && customAds.length > 0 ? customAds : sampleAds;
    const adsWithCapture = allAds.map(ad => ({
      ...ad,
      captureStart: Math.floor(ad.duration * captureStartPercent / 100),
      captureEnd: Math.floor(ad.duration * captureEndPercent / 100),
    }));

    const scoredAds = adsWithCapture.map(ad => scoreAd(ad, demographics));
    
    // Sort by score descending
    scoredAds.sort((a, b) => b.score - a.score);

    // Take only top 2 ads for the queue
    const top2 = scoredAds.slice(0, 2).map(s => s.ad);
    
    // Log the reordering
    const topAd = scoredAds[0];
    if (topAd) {
      console.log('[Queue] New queue (max 2):', scoredAds.slice(0, 2).map(s => `${s.ad.title}(${s.score})`).join(' > '));
      addLog('queue', `🔄 Queue updated for ${demographics.male > demographics.female ? 'male' : 'female'} ${demographics.young > demographics.adult ? 'young' : 'adult'}`);
      addLog('queue', `Next: "${topAd.ad.title}" (score: ${topAd.score})`);
    }

    setQueue(top2);
  }, [scoreAd, addLog, customAds, captureStartPercent, captureEndPercent]);

  const getNextAd = useCallback((): AdMetadata | null => {
    if (queue.length === 0) {
      const resetAds = initialAds;
      setQueue(resetAds);
      setPlayedAds([]);
      lastPlayedIdRef.current = null;
      return resetAds[0] || null;
    }

    // Get the first ad that wasn't just played
    let nextAd = queue[0];
    
    // If top ad was just played, try second option
    if (nextAd.id === lastPlayedIdRef.current && queue.length > 1) {
      nextAd = queue[1];
      // Rotate queue differently
      setQueue(prev => [prev[1], ...prev.filter((_, i) => i !== 1)]);
    } else {
      // Normal rotation - move first to end
      setQueue(prev => [...prev.slice(1), prev[0]]);
    }
    
    // Track played ads
    setPlayedAds(prev => [nextAd.id, ...prev].slice(0, 5));
    lastPlayedIdRef.current = nextAd.id;
    
    addLog('ad', `▶️ Playing: "${nextAd.title}"`);
    
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
