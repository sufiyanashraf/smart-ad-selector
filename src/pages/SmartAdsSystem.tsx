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
  
  const captureIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const adDetectionsRef = useRef<DetectionResult[]>([]);

  const { videoRef, isActive: webcamActive, hasPermission, error: webcamError, startWebcam, stopWebcam } = useWebcam();
  const { isModelLoaded, isLoading: modelsLoading, detectFaces } = useFaceDetection();
  const { queue, logs, getNextAd, reorderQueue, addLog } = useAdQueue();

  // Initialize with first ad
  useEffect(() => {
    const firstAd = getNextAd();
    if (firstAd) {
      setCurrentAd(firstAd);
      setIsPlaying(true);
    }
  }, []);

  // Capture window logic
  useEffect(() => {
    if (!currentAd || !isPlaying) return;

    const inCaptureWindow = 
      currentTime >= currentAd.captureStart && 
      currentTime <= currentAd.captureEnd;

    if (inCaptureWindow && !isCapturing) {
      // Start capturing
      setIsCapturing(true);
      addLog('webcam', `Capture window started (${currentAd.captureStart}s - ${currentAd.captureEnd}s)`);
      startWebcam();
      adDetectionsRef.current = [];

      // Start frame sampling (1 fps)
      captureIntervalRef.current = setInterval(async () => {
        if (videoRef.current && videoRef.current.readyState >= 2) {
          const results = await detectFaces(videoRef.current);
          
          if (results.length > 0) {
            adDetectionsRef.current.push(...results);
            setRecentDetections(prev => [...results, ...prev].slice(0, 10));
            addLog('detection', `Detected ${results.length} face(s): ${results.map(r => `${r.gender}/${r.age}y`).join(', ')}`);
          }
        }
      }, 1000);

    } else if (!inCaptureWindow && isCapturing) {
      // Stop capturing
      setIsCapturing(false);
      addLog('webcam', 'Capture window ended, webcam off');
      stopWebcam();
      
      if (captureIntervalRef.current) {
        clearInterval(captureIntervalRef.current);
        captureIntervalRef.current = null;
      }
    }

    return () => {
      if (captureIntervalRef.current) {
        clearInterval(captureIntervalRef.current);
      }
    };
  }, [currentTime, currentAd, isPlaying, isCapturing, startWebcam, stopWebcam, detectFaces, addLog, videoRef]);

  const handleTimeUpdate = useCallback((time: number) => {
    setCurrentTime(time);
  }, []);

  const handleAdEnded = useCallback(() => {
    // Process detections from this ad
    const detections = adDetectionsRef.current;
    
    if (detections.length > 0) {
      const newDemographics = { ...demographics };
      
      detections.forEach(det => {
        if (det.gender === 'male') newDemographics.male++;
        else newDemographics.female++;
        
        if (det.ageGroup === 'young') newDemographics.young++;
        else newDemographics.adult++;
      });

      setDemographics(newDemographics);
      addLog('detection', `Ad finished. Updated demographics: M${newDemographics.male}/F${newDemographics.female}, Y${newDemographics.young}/A${newDemographics.adult}`);

      // Reorder queue based on new demographics
      reorderQueue(newDemographics);
    }

    // Stop any ongoing capture
    setIsCapturing(false);
    stopWebcam();
    if (captureIntervalRef.current) {
      clearInterval(captureIntervalRef.current);
      captureIntervalRef.current = null;
    }

    // Play next ad
    const nextAd = getNextAd();
    if (nextAd) {
      setCurrentAd(nextAd);
      setCurrentTime(0);
      setIsPlaying(true);
    }
  }, [demographics, getNextAd, reorderQueue, stopWebcam, addLog]);

  const handleSkip = useCallback(() => {
    addLog('ad', `Skipped: "${currentAd?.title}"`);
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
            <Activity className="h-4 w-4 text-success" />
            <span className="text-muted-foreground">
              {modelsLoading ? 'Loading AI models...' : isModelLoaded ? 'AI Ready' : 'Demo Mode'}
            </span>
          </div>
        </div>
        <p className="text-muted-foreground text-sm">
          Dynamic ad targeting powered by real-time demographic detection
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
            <span>Webcam active only during capture window</span>
          </div>
          <div className="flex gap-4">
            {/* TODO: Cloud analytics integration */}
            {/* TODO: Multiple screen support */}
            {/* TODO: Privacy masking (face blur) */}
            {/* TODO: Raspberry Pi optimization */}
            <span>Prototype v1.0</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default SmartAdsSystem;
