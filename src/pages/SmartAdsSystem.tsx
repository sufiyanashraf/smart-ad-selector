import { useState, useCallback, useEffect, useRef } from 'react';
import { AdMetadata, DemographicCounts, DetectionResult } from '@/types/ad';
import { VideoPlayer } from '@/components/VideoPlayer';
import { DemographicStats } from '@/components/DemographicStats';
import { AdQueue } from '@/components/AdQueue';
import { SystemLogs } from '@/components/SystemLogs';
import { WebcamPreview } from '@/components/WebcamPreview';
import { useWebcam } from '@/hooks/useWebcam';
import { useFaceDetection } from '@/hooks/useFaceDetection';
import { useAdQueue } from '@/hooks/useAdQueue';
import { Tv, Zap, Activity } from 'lucide-react';

const SmartAdsSystem = () => {
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
  const [recentDetections, setRecentDetections] = useState<DetectionResult[]>([]);
  
  const captureIntervalRef = useRef<number | null>(null);
  const adDetectionsRef = useRef<DetectionResult[]>([]);
  const isCapturingRef = useRef(false);

  const { videoRef, isActive: webcamActive, hasPermission, error: webcamError, startWebcam, stopWebcam } = useWebcam();
  const { isModelLoaded, isLoading: modelsLoading, detectFaces } = useFaceDetection();
  const { queue, logs, getNextAd, reorderQueue, addLog } = useAdQueue();

  // Initialize with first ad
  useEffect(() => {
    const firstAd = getNextAd();
    if (firstAd) {
      setCurrentAd(firstAd);
      setIsPlaying(true);
      addLog('ad', `Starting system with: "${firstAd.title}"`);
      addLog('info', `Capture window: ${firstAd.captureStart}s - ${firstAd.captureEnd}s`);
    }
  }, []);

  // Start detection loop when capturing
  const startDetectionLoop = useCallback(() => {
    if (captureIntervalRef.current) {
      window.clearInterval(captureIntervalRef.current);
    }

    // Run detection every 1.5 seconds
    captureIntervalRef.current = window.setInterval(async () => {
      if (!isCapturingRef.current || !videoRef.current) return;

      console.log('[Loop] Running detection...');
      const results = await detectFaces(videoRef.current);
      
      if (results.length > 0) {
        adDetectionsRef.current.push(...results);
        setRecentDetections(prev => [...results, ...prev].slice(0, 10));
        addLog('detection', `Detected ${results.length} viewer(s): ${results.map(r => `${r.gender}/${r.age}y`).join(', ')}`);
      }
    }, 1500);
  }, [detectFaces, addLog, videoRef]);

  const stopDetectionLoop = useCallback(() => {
    if (captureIntervalRef.current) {
      window.clearInterval(captureIntervalRef.current);
      captureIntervalRef.current = null;
    }
  }, []);

  // Capture window logic - check every time currentTime updates
  useEffect(() => {
    if (!currentAd || !isPlaying) return;

    const inCaptureWindow = 
      currentTime >= currentAd.captureStart && 
      currentTime <= currentAd.captureEnd;

    if (inCaptureWindow && !isCapturingRef.current) {
      // START capturing
      console.log('[Capture] Starting capture window');
      isCapturingRef.current = true;
      setIsCapturing(true);
      adDetectionsRef.current = [];
      
      addLog('webcam', `📷 CAPTURE STARTED (${currentAd.captureStart}s - ${currentAd.captureEnd}s)`);
      
      startWebcam().then((success) => {
        if (success) {
          addLog('webcam', 'Camera activated, scanning for viewers...');
          // Wait a moment for camera to initialize, then start detection
          setTimeout(() => {
            startDetectionLoop();
          }, 500);
        } else {
          addLog('webcam', 'Camera unavailable, using simulated detection');
          startDetectionLoop();
        }
      });

    } else if (!inCaptureWindow && isCapturingRef.current) {
      // STOP capturing
      console.log('[Capture] Ending capture window');
      isCapturingRef.current = false;
      setIsCapturing(false);
      
      stopDetectionLoop();
      stopWebcam();
      
      const detectionCount = adDetectionsRef.current.length;
      addLog('webcam', `📷 CAPTURE ENDED - ${detectionCount} total detections`);
    }
  }, [currentTime, currentAd, isPlaying, startWebcam, stopWebcam, startDetectionLoop, stopDetectionLoop, addLog]);

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
    // Process detections from this ad
    const detections = adDetectionsRef.current;
    
    // Stop any ongoing capture
    isCapturingRef.current = false;
    setIsCapturing(false);
    stopDetectionLoop();
    stopWebcam();
    
    if (detections.length > 0) {
      const newDemographics = { ...demographics };
      
      detections.forEach(det => {
        if (det.gender === 'male') newDemographics.male++;
        else newDemographics.female++;
        
        if (det.ageGroup === 'young') newDemographics.young++;
        else newDemographics.adult++;
      });

      setDemographics(newDemographics);
      addLog('info', `📊 Demographics updated: M${newDemographics.male}/F${newDemographics.female}, Young${newDemographics.young}/Adult${newDemographics.adult}`);

      // Reorder queue based on new demographics
      reorderQueue(newDemographics);
    }

    // Play next ad
    const nextAd = getNextAd();
    if (nextAd) {
      setCurrentAd(nextAd);
      setCurrentTime(0);
      setIsPlaying(true);
      addLog('ad', `▶️ Now playing: "${nextAd.title}"`);
      addLog('info', `Capture window: ${nextAd.captureStart}s - ${nextAd.captureEnd}s`);
    }
  }, [demographics, getNextAd, reorderQueue, stopWebcam, stopDetectionLoop, addLog]);

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
          <div className="ml-auto flex items-center gap-2 text-sm">
            <Activity className={`h-4 w-4 ${isCapturing ? 'text-destructive animate-pulse' : 'text-success'}`} />
            <span className="text-muted-foreground">
              {modelsLoading ? 'Loading AI...' : isModelLoaded ? 'AI Ready' : 'Demo Mode'}
            </span>
          </div>
        </div>
        <p className="text-muted-foreground text-sm">
          Dynamic ad targeting powered by real-time demographic detection • Camera activates at 75% of ad duration
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
            />
            <SystemLogs logs={logs} />
          </div>
        </div>

        {/* Right Column - Stats & Queue */}
        <div className="lg:col-span-5 space-y-6">
          <DemographicStats
            demographics={demographics}
            recentDetections={recentDetections}
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
              face-api.js for detection
            </span>
            <span>•</span>
            <span>Camera activates at 75% of ad, closes at 92%</span>
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
