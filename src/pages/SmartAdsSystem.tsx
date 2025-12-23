import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { AdMetadata, DemographicCounts, DetectionResult } from '@/types/ad';
import { VideoPlayer } from '@/components/VideoPlayer';
import { DemographicStats } from '@/components/DemographicStats';
import { AdQueue } from '@/components/AdQueue';
import { SystemLogs } from '@/components/SystemLogs';
import { WebcamPreview } from '@/components/WebcamPreview';
import { SettingsPanel, CaptureSettings } from '@/components/SettingsPanel';
import { AdManager } from '@/components/AdManager';
import { useWebcam } from '@/hooks/useWebcam';
import { useFaceDetection, resetSimulatedPerson } from '@/hooks/useFaceDetection';
import { useAdQueue } from '@/hooks/useAdQueue';
import { sampleAds } from '@/data/sampleAds';
import { Tv, Zap, Activity } from 'lucide-react';

const SmartAdsSystem = () => {
  // Settings state
  const [captureSettings, setCaptureSettings] = useState<CaptureSettings>({
    startPercent: 75,
    endPercent: 92,
  });

  // Custom ads state
  const [customAds, setCustomAds] = useState<AdMetadata[]>([...sampleAds]);

  // Recalculate ads when settings change
  const adsWithCaptureWindows = useMemo(() => {
    return customAds.map(ad => ({
      ...ad,
      captureStart: Math.floor(ad.duration * captureSettings.startPercent / 100),
      captureEnd: Math.floor(ad.duration * captureSettings.endPercent / 100),
    }));
  }, [customAds, captureSettings]);

  const [currentAd, setCurrentAd] = useState<AdMetadata | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isCapturing, setIsCapturing] = useState(false);
  const [demographics, setDemographics] = useState<DemographicCounts>({
    male: 0,
    female: 0,
    young: 0,
    adult: 0,
  });
  const [currentViewers, setCurrentViewers] = useState<DetectionResult[]>([]);
  
  const captureIntervalRef = useRef<number | null>(null);
  const isCapturingRef = useRef(false);
  const initializedRef = useRef(false);
  const lastDemographicsRef = useRef<DemographicCounts>({ male: 0, female: 0, young: 0, adult: 0 });

  const { videoRef, isActive: webcamActive, hasPermission, error: webcamError, startWebcam, stopWebcam } = useWebcam();
  const { isModelLoaded, isLoading: modelsLoading, detectFaces } = useFaceDetection();
  const { queue, logs, getNextAd, reorderQueue, addLog, updateQueue } = useAdQueue({
    customAds: adsWithCaptureWindows,
    captureStartPercent: captureSettings.startPercent,
    captureEndPercent: captureSettings.endPercent,
  });

  // Update queue when ads change
  useEffect(() => {
    updateQueue(adsWithCaptureWindows);
  }, [adsWithCaptureWindows, updateQueue]);

  // Initialize with first ad
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const firstAd = adsWithCaptureWindows[0];
    if (firstAd) {
      setCurrentAd(firstAd);
      setIsPlaying(true);
      addLog('ad', `Starting system with: "${firstAd.title}"`);
      addLog('info', `Capture window: ${firstAd.captureStart}s - ${firstAd.captureEnd}s`);
    }
  }, [adsWithCaptureWindows, addLog]);

  // Handle settings change
  const handleSettingsChange = useCallback((newSettings: CaptureSettings) => {
    setCaptureSettings(newSettings);
    addLog('info', `⚙️ Settings updated: Capture ${newSettings.startPercent}% - ${newSettings.endPercent}%`);
  }, [addLog]);

  // Handle ads change
  const handleAdsChange = useCallback((newAds: AdMetadata[]) => {
    setCustomAds(newAds);
    addLog('info', `📁 Ad library updated: ${newAds.length} ads`);
  }, [addLog]);

  // Start detection loop - detects current viewers in frame
  const startDetectionLoop = useCallback(() => {
    if (captureIntervalRef.current) {
      window.clearInterval(captureIntervalRef.current);
    }

    captureIntervalRef.current = window.setInterval(async () => {
      if (!isCapturingRef.current || !videoRef.current) return;

      console.log('[Loop] Running detection...');
      const results = await detectFaces(videoRef.current);
      
      if (results.length > 0) {
        // Update current viewers with LATEST detection (not accumulating)
        setCurrentViewers(results);
        
        // Calculate demographics from current detection
        const newDemographics: DemographicCounts = {
          male: results.filter(d => d.gender === 'male').length,
          female: results.filter(d => d.gender === 'female').length,
          young: results.filter(d => d.ageGroup === 'young').length,
          adult: results.filter(d => d.ageGroup === 'adult').length,
        };
        setDemographics(newDemographics);
        lastDemographicsRef.current = newDemographics;
        
        addLog('detection', `👁️ ${results.length} viewer(s): ${results.map(r => `${r.gender}/${r.age}y (${(r.confidence * 100).toFixed(0)}%)`).join(', ')}`);
      }
    }, 1500);
  }, [detectFaces, addLog, videoRef]);

  const stopDetectionLoop = useCallback(() => {
    if (captureIntervalRef.current) {
      window.clearInterval(captureIntervalRef.current);
      captureIntervalRef.current = null;
    }
  }, []);

  // Capture window logic
  useEffect(() => {
    if (!currentAd || !isPlaying) return;

    const inCaptureWindow = 
      currentTime >= currentAd.captureStart && 
      currentTime <= currentAd.captureEnd;

    if (inCaptureWindow && !isCapturingRef.current) {
      console.log('[Capture] Starting capture window');
      isCapturingRef.current = true;
      setIsCapturing(true);
      
      // Reset for new capture session
      setDemographics({ male: 0, female: 0, young: 0, adult: 0 });
      setCurrentViewers([]);
      resetSimulatedPerson(); // Reset simulated person for fresh detection
      
      addLog('webcam', `📷 CAPTURE STARTED (${currentAd.captureStart}s - ${currentAd.captureEnd}s)`);
      addLog('info', '🔄 Scanning for current viewers...');
      
      startWebcam().then((success) => {
        if (success) {
          addLog('webcam', 'Camera activated');
          setTimeout(() => {
            startDetectionLoop();
          }, 500);
        } else {
          addLog('webcam', 'Camera unavailable, using simulation');
          startDetectionLoop();
        }
      });

    } else if (!inCaptureWindow && isCapturingRef.current) {
      console.log('[Capture] Ending capture window');
      isCapturingRef.current = false;
      setIsCapturing(false);
      
      stopDetectionLoop();
      stopWebcam();
      
      addLog('webcam', `📷 CAPTURE ENDED`);
      
      // Log and reorder based on detected demographics
      const demo = lastDemographicsRef.current;
      if (demo.male + demo.female > 0) {
        addLog('info', `📊 Detected: ${demo.male}M/${demo.female}F, ${demo.young} young/${demo.adult} adult`);
        reorderQueue(demo);
      }
    }
  }, [currentTime, currentAd, isPlaying, startWebcam, stopWebcam, startDetectionLoop, stopDetectionLoop, addLog, reorderQueue]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopDetectionLoop();
    };
  }, [stopDetectionLoop]);

  const handleTimeUpdate = useCallback((time: number) => {
    setCurrentTime(time);
  }, []);

  const handleAdEnded = useCallback(() => {
    isCapturingRef.current = false;
    setIsCapturing(false);
    stopDetectionLoop();
    stopWebcam();

    const nextAd = getNextAd();
    if (nextAd) {
      const adWithWindow = {
        ...nextAd,
        captureStart: Math.floor(nextAd.duration * captureSettings.startPercent / 100),
        captureEnd: Math.floor(nextAd.duration * captureSettings.endPercent / 100),
      };
      setCurrentAd(adWithWindow);
      setCurrentTime(0);
      setIsPlaying(true);
      addLog('info', `Capture window: ${adWithWindow.captureStart}s - ${adWithWindow.captureEnd}s`);
    }
  }, [getNextAd, stopWebcam, stopDetectionLoop, addLog, captureSettings]);

  const handleSkip = useCallback(() => {
    addLog('ad', `⏭️ Skipped: "${currentAd?.title}"`);
    handleAdEnded();
  }, [currentAd, handleAdEnded, addLog]);

  const captureWindow = currentAd ? {
    start: currentAd.captureStart,
    end: currentAd.captureEnd,
  } : null;

  return (
    <div className="min-h-screen bg-background p-6 lg:p-8">
      {/* Header */}
      <header className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/30">
            <Tv className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-2xl lg:text-3xl font-display font-bold tracking-tight">
            Smart<span className="text-primary">Ads</span> System
          </h1>
          <div className="ml-auto flex items-center gap-3">
            <AdManager 
              ads={customAds}
              onAdsChange={handleAdsChange}
              captureStartPercent={captureSettings.startPercent}
              captureEndPercent={captureSettings.endPercent}
            />
            <SettingsPanel 
              settings={captureSettings}
              onSettingsChange={handleSettingsChange}
            />
            <div className="flex items-center gap-2 text-sm pl-3 border-l border-border">
              <Activity className={`h-4 w-4 ${isCapturing ? 'text-destructive animate-pulse' : 'text-success'}`} />
              <span className="text-muted-foreground">
                {modelsLoading ? 'Loading AI...' : isModelLoaded ? 'AI Ready' : 'Demo Mode'}
              </span>
            </div>
          </div>
        </div>
        <p className="text-muted-foreground text-sm">
          Dynamic ad targeting powered by real-time demographic detection • Camera activates at {captureSettings.startPercent}% of ad duration
        </p>
      </header>

      {/* Main Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column - Video Player */}
        <div className="lg:col-span-7 space-y-6">
          <VideoPlayer
            ad={currentAd}
            isPlaying={isPlaying}
            onTimeUpdate={handleTimeUpdate}
            onEnded={handleAdEnded}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onSkip={handleSkip}
            isCapturing={isCapturing}
            captureWindow={captureWindow}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <WebcamPreview
              videoRef={videoRef}
              isActive={webcamActive}
              hasPermission={hasPermission}
              error={webcamError}
              isCapturing={isCapturing}
              detections={currentViewers}
            />
            <SystemLogs logs={logs} />
          </div>
        </div>

        {/* Right Column - Stats & Queue */}
        <div className="lg:col-span-5 space-y-6">
          <DemographicStats
            demographics={demographics}
            recentDetections={currentViewers}
            isCapturing={isCapturing}
          />
          
          <AdQueue
            queue={queue}
            currentAdId={currentAd?.id || null}
          />
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-8 pt-6 border-t border-border">
        <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <Zap className="h-3 w-3 text-primary" />
              HuggingFace Transformers.js
            </span>
            <span>•</span>
            <span>Camera: {captureSettings.startPercent}% - {captureSettings.endPercent}% of ad</span>
            <span>•</span>
            <span>{customAds.length} ads loaded</span>
          </div>
          <div className="flex gap-4">
            <span>Prototype v1.0</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default SmartAdsSystem;
