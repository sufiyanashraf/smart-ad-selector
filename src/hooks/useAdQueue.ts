import { useState, useCallback, useMemo } from 'react';
import { AdMetadata, DemographicCounts, AdScore, LogEntry } from '@/types/ad';
import { sampleAds } from '@/data/sampleAds';

export const useAdQueue = () => {
  const [queue, setQueue] = useState<AdMetadata[]>([...sampleAds]);
  const [playedAds, setPlayedAds] = useState<string[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const addLog = useCallback((type: LogEntry['type'], message: string) => {
    setLogs(prev => [{
      timestamp: new Date(),
      type,
      message
    }, ...prev].slice(0, 50)); // Keep last 50 logs
  }, []);

  const scoreAd = useCallback((ad: AdMetadata, demographics: DemographicCounts): AdScore => {
    let score = 0;
    const reasons: string[] = [];

    const dominantGender = demographics.male >= demographics.female ? 'male' : 'female';
    const dominantAge = demographics.young >= demographics.adult ? 'young' : 'adult';

    // Gender matching
    if (ad.gender === 'all') {
      score += 1;
      reasons.push('Universal gender appeal');
    } else if (ad.gender === dominantGender) {
      score += 2;
      reasons.push(`Matches dominant gender (${dominantGender})`);
    }

    // Age group matching
    if (ad.ageGroup === 'all') {
      score += 1;
      reasons.push('Universal age appeal');
    } else if (ad.ageGroup === dominantAge) {
      score += 2;
      reasons.push(`Matches dominant age group (${dominantAge})`);
    }

    // Penalty for recently played
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
    
    // Sort by score descending
    scoredAds.sort((a, b) => b.score - a.score);

    const newQueue = scoredAds.map(s => s.ad);
    setQueue(newQueue);

    // Log the reordering
    const topAd = scoredAds[0];
    if (topAd) {
      addLog('queue', `Queue reordered. Top: "${topAd.ad.title}" (score: ${topAd.score})`);
      topAd.reasons.forEach(r => addLog('queue', `  └─ ${r}`));
    }

    return scoredAds;
  }, [queue, scoreAd, addLog]);

  const getNextAd = useCallback((): AdMetadata | null => {
    if (queue.length === 0) {
      // Reset queue if empty
      setQueue([...sampleAds]);
      setPlayedAds([]);
      return sampleAds[0] || null;
    }

    const nextAd = queue[0];
    
    // Move to end of queue
    setQueue(prev => [...prev.slice(1), prev[0]]);
    
    // Track played ads
    setPlayedAds(prev => [nextAd.id, ...prev].slice(0, 5));
    
    addLog('ad', `Now playing: "${nextAd.title}"`);
    
    return nextAd;
  }, [queue, addLog]);

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
  };
};
