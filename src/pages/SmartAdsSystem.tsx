import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { AdMetadata, DemographicCounts, DetectionResult } from '@/types/ad';
import { VideoPlayer } from '@/components/VideoPlayer';
import { DemographicStats } from '@/components/DemographicStats';
import { AdQueue } from '@/components/AdQueue';
import { ManualQueueEditor } from '@/components/ManualQueueEditor';
import { SystemLogs } from '@/components/SystemLogs';
import { WebcamPreview } from '@/components/WebcamPreview';
import { SettingsPanel, CaptureSettings } from '@/components/SettingsPanel';
import { AdManager } from '@/components/AdManager';
import { ThemeToggle } from '@/components/ThemeToggle';
import { InputSourceSelector } from '@/components/InputSourceSelector';
import { useWebcam } from '@/hooks/useWebcam';
import { useFaceDetection, resetSimulatedPerson } from '@/hooks/useFaceDetection';
import { useAdQueue } from '@/hooks/useAdQueue';
import { sampleAds } from '@/data/sampleAds';
import { Tv, Zap, Activity, AlertCircle, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

const SmartAdsSystem = () => {
  // Settings state - default to 40% capture window (60%-100%)
  const [captureSettings, setCaptureSettings] = useState<CaptureSettings>({
    startPercent: 60,
    endPercent: 100,
  });

  // Custom ads state - persisted to localStorage
  const [customAds, setCustomAds] = useState<AdMetadata[]>(() => {
    const saved = localStorage.getItem('smartads-custom-ads');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return [...sampleAds];
      }
    }
    return [...sampleAds];
  });

  // Save ads to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('smartads-custom-ads', JSON.stringify(customAds));
  }, [customAds]);

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
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [demographics, setDemographics] = useState<DemographicCounts>({
    male: 0,
    female: 0,
    kid: 0,
    young: 0,
    adult: 0,
  });
  const [currentViewers, setCurrentViewers] = useState<DetectionResult[]>([]);
  const [testMode, setTestMode] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [manualQueue, setManualQueue] = useState<AdMetadata[]>(() => {
    const saved = localStorage.getItem('smartads-manual-queue');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return [];
      }
    }
    return [];
  });

  // Save manual queue to localStorage
  useEffect(() => {
    localStorage.setItem('smartads-manual-queue', JSON.stringify(manualQueue));
  }, [manualQueue]);
  
  const captureIntervalRef = useRef<number | null>(null);
  const isCapturingRef = useRef(false);
  const initializedRef = useRef(false);
  const lastDemographicsRef = useRef<DemographicCounts>({ male: 0, female: 0, kid: 0, young: 0, adult: 0 });
  const testModeTimeoutRef = useRef<number | null>(null);

  const { 
    videoRef, 
    isActive: webcamActive, 
    hasPermission, 
    error: webcamError, 
    inputMode,
    videoFileName,
    startWebcam, 
    startVideoFile,
    startScreenCapture,
    stopWebcam 
  } = useWebcam();
  const { isModelLoaded, isLoading: modelsLoading, error: modelError, detectFaces } = useFaceDetection();
  const { queue, logs, getNextAd, reorderQueue, addLog, updateQueue, resetManualQueueIndex } = useAdQueue({
    customAds: adsWithCaptureWindows,
    captureStartPercent: captureSettings.startPercent,
    captureEndPercent: captureSettings.endPercent,
    manualMode,
    manualQueue,
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
          kid: results.filter(d => d.ageGroup === 'kid').length,
          young: results.filter(d => d.ageGroup === 'young').length,
          adult: results.filter(d => d.ageGroup === 'adult').length,
        };
        setDemographics(newDemographics);
        lastDemographicsRef.current = newDemographics;
        
        addLog('detection', `👁️ ${results.length} viewer(s): ${results.map(r => `${r.gender}/${r.ageGroup} (${(r.confidence * 100).toFixed(0)}%)`).join(', ')}`);
      }
    }, 1500);
  }, [detectFaces, addLog, videoRef]);

  const stopDetectionLoop = useCallback(() => {
    if (captureIntervalRef.current) {
      window.clearInterval(captureIntervalRef.current);
      captureIntervalRef.current = null;
    }
  }, []);

  // Start detection with current input source
  const startDetectionWithSource = useCallback(async (
    sourceStarter: () => Promise<boolean>,
    sourceName: string
  ) => {
    if (testMode) return;
    
    setTestMode(true);
    addLog('info', `🧪 TEST MODE: Starting ${sourceName} detection (30s)...`);
    
    // Reset demographics
    setDemographics({ male: 0, female: 0, kid: 0, young: 0, adult: 0 });
    setCurrentViewers([]);
    
    const success = await sourceStarter();
    if (success) {
      addLog('webcam', `✅ ${sourceName} activated for test`);
      isCapturingRef.current = true;
      setIsCapturing(true);
      
      setTimeout(() => {
        startDetectionLoop();
      }, 500);
      
      // Auto-stop after 30 seconds
      testModeTimeoutRef.current = window.setTimeout(() => {
        stopTestMode();
      }, 30000);
    } else {
      addLog('webcam', `❌ ${sourceName} failed to start`);
      setTestMode(false);
    }
  }, [testMode, startDetectionLoop, addLog]);

  // Test mode: manually trigger detection for 30 seconds
  const startTestMode = useCallback(async () => {
    await startDetectionWithSource(startWebcam, 'Camera');
  }, [startDetectionWithSource, startWebcam]);

  // Handle video file selection
  const handleVideoFileSelect = useCallback(async (file: File) => {
    await startDetectionWithSource(
      () => startVideoFile(file),
      `Video (${file.name})`
    );
  }, [startDetectionWithSource, startVideoFile]);

  // Handle screen capture selection  
  const handleScreenCaptureSelect = useCallback(async () => {
    await startDetectionWithSource(startScreenCapture, 'Screen Capture');
  }, [startDetectionWithSource, startScreenCapture]);

  const stopTestMode = useCallback(() => {
    if (testModeTimeoutRef.current) {
      window.clearTimeout(testModeTimeoutRef.current);
      testModeTimeoutRef.current = null;
    }
    
    stopDetectionLoop();
    stopWebcam();
    isCapturingRef.current = false;
    setIsCapturing(false);
    setTestMode(false);
    addLog('info', '🧪 TEST MODE: Ended');
  }, [stopDetectionLoop, stopWebcam, addLog]);

  // Toggle manual mode
  const handleManualModeToggle = useCallback((enabled: boolean) => {
    setManualMode(enabled);
    if (enabled) {
      // Stop any active detection
      if (testMode) stopTestMode();
      if (isCapturingRef.current) {
        stopDetectionLoop();
        stopWebcam();
        isCapturingRef.current = false;
        setIsCapturing(false);
      }
      setDemographics({ male: 0, female: 0, kid: 0, young: 0, adult: 0 });
      setCurrentViewers([]);
      resetManualQueueIndex();
      addLog('info', '📺 MANUAL MODE: Detection disabled - ads will play from playlist');
    } else {
      addLog('info', '🎯 AUTO MODE: Detection enabled - ads will target demographics');
    }
  }, [testMode, stopTestMode, stopDetectionLoop, stopWebcam, addLog, resetManualQueueIndex]);

  // Handle manual queue change
  const handleManualQueueChange = useCallback((newQueue: AdMetadata[]) => {
    setManualQueue(newQueue);
    resetManualQueueIndex();
    if (newQueue.length > 0) {
      addLog('info', `📋 Playlist updated: ${newQueue.length} ads`);
    }
  }, [resetManualQueueIndex, addLog]);

  // Capture window logic - only runs when not in manual mode
  useEffect(() => {
    if (!currentAd || !isPlaying || manualMode) return;

    const inCaptureWindow = 
      currentTime >= currentAd.captureStart && 
      currentTime <= currentAd.captureEnd;

    if (inCaptureWindow && !isCapturingRef.current) {
      console.log('[Capture] Starting capture window');
      isCapturingRef.current = true;
      setIsCapturing(true);
      
      // Reset for new capture session
      setDemographics({ male: 0, female: 0, kid: 0, young: 0, adult: 0 });
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
        addLog('info', `📊 Detected: ${demo.male}M/${demo.female}F, ${demo.kid} kid/${demo.young} young/${demo.adult} adult`);
        reorderQueue(demo);
      }
    }
  }, [currentTime, currentAd, isPlaying, manualMode, startWebcam, stopWebcam, startDetectionLoop, stopDetectionLoop, addLog, reorderQueue]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopDetectionLoop();
      if (testModeTimeoutRef.current) {
        window.clearTimeout(testModeTimeoutRef.current);
      }
    };
  }, [stopDetectionLoop]);

  const handleTimeUpdate = useCallback((time: number) => {
    setCurrentTime(time);
  }, []);

  const handleDurationDetected = useCallback((durationSeconds: number) => {
    setCurrentAd(prev => {
      if (!prev) return prev;
      if (Math.round(prev.duration) === durationSeconds) return prev;

      const updated = {
        ...prev,
        duration: durationSeconds,
        captureStart: Math.floor(durationSeconds * captureSettings.startPercent / 100),
        captureEnd: Math.floor(durationSeconds * captureSettings.endPercent / 100),
      };

      // Keep libraries in sync so playlist/queue shows correct time
      setCustomAds(ads => ads.map(a => a.id === updated.id ? { ...a, ...updated } : a));
      setManualQueue(q => q.map(a => a.id === updated.id ? { ...a, ...updated } : a));

      addLog('info', `⏱️ Duration updated from video metadata: ${updated.title} = ${durationSeconds}s`);
      return updated;
    });
  }, [captureSettings, addLog]);

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

  // Fullscreen mode - renders only the video player
  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-black">
        {/* Hidden webcam for detection - keeps running in background */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="hidden"
        />
        
        <VideoPlayer
          ad={currentAd}
          isPlaying={isPlaying}
          onTimeUpdate={handleTimeUpdate}
          onDurationDetected={handleDurationDetected}
          onEnded={handleAdEnded}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onSkip={handleSkip}
          isCapturing={isCapturing}
          captureWindow={captureWindow}
          isFullscreen={true}
          onFullscreenToggle={() => setIsFullscreen(false)}
        />
      </div>
    );
  }

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
            {/* Manual Mode Toggle */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 border border-border">
              {manualMode ? (
                <EyeOff className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Eye className="h-4 w-4 text-primary" />
              )}
              <Label htmlFor="manual-mode" className="text-sm font-medium cursor-pointer">
                {manualMode ? 'Manual' : 'Auto'}
              </Label>
              <Switch
                id="manual-mode"
                checked={manualMode}
                onCheckedChange={handleManualModeToggle}
              />
            </div>

            {/* Input Source Selector */}
            <InputSourceSelector
              currentMode={inputMode}
              isActive={webcamActive}
              videoFileName={videoFileName}
              onSelectWebcam={startTestMode}
              onSelectVideoFile={handleVideoFileSelect}
              onSelectScreenCapture={handleScreenCaptureSelect}
              onStop={stopTestMode}
              disabled={modelsLoading || manualMode}
            />
            
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
            <ThemeToggle />
            
            {/* Model Status */}
            <div className="flex items-center gap-2 text-sm pl-3 border-l border-border">
              {modelsLoading ? (
                <>
                  <Activity className="h-4 w-4 text-primary animate-spin" />
                  <span className="text-muted-foreground">Loading AI...</span>
                </>
              ) : modelError ? (
                <>
                  <AlertCircle className="h-4 w-4 text-destructive" />
                  <span className="text-destructive text-xs" title={modelError}>Model Error</span>
                </>
              ) : isModelLoaded ? (
                <>
                  <CheckCircle className="h-4 w-4 text-success" />
                  <span className="text-success">AI Ready</span>
                </>
              ) : (
                <>
                  <AlertCircle className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Demo Mode</span>
                </>
              )}
            </div>
          </div>
        </div>
        <p className="text-muted-foreground text-sm">
          {manualMode ? (
            <span className="text-warning">Manual Mode: Playing from custom playlist ({manualQueue.length} ads) in loop</span>
          ) : (
            <>Dynamic ad targeting powered by real-time demographic detection • Camera activates at {captureSettings.startPercent}% of ad duration</>
          )}
          {testMode && <span className="ml-2 text-primary font-medium">• TEST MODE ACTIVE</span>}
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
            onDurationDetected={handleDurationDetected}
            onEnded={handleAdEnded}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onSkip={handleSkip}
            isCapturing={isCapturing}
            captureWindow={captureWindow}
            isFullscreen={false}
            onFullscreenToggle={() => setIsFullscreen(true)}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <WebcamPreview
              videoRef={videoRef}
              isActive={webcamActive}
              hasPermission={hasPermission}
              error={webcamError}
              isCapturing={isCapturing}
              detections={currentViewers}
              inputMode={inputMode}
              videoFileName={videoFileName}
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
          
          {manualMode ? (
            <ManualQueueEditor
              availableAds={customAds}
              manualQueue={manualQueue}
              onQueueChange={handleManualQueueChange}
            />
          ) : (
            <AdQueue
              queue={queue}
              currentAdId={currentAd?.id || null}
            />
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-8 pt-6 border-t border-border">
        <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <Zap className="h-3 w-3 text-primary" />
              face-api.js (TinyFaceDetector + AgeGender)
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
