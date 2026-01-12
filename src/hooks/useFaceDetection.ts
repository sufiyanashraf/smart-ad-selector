import { useState, useEffect, useCallback, useRef } from 'react';
import * as faceapi from 'face-api.js';
import * as tf from '@tensorflow/tfjs';

// Detection timeout to prevent hanging
const DETECTION_TIMEOUT = 10000;
import { DetectionResult, FaceBoundingBox } from '@/types/ad';
import { DetectionDebugInfo, CCTVDetectionConfig, DEFAULT_CCTV_CONFIG, DEFAULT_WEBCAM_CONFIG } from '@/types/detection';
import { createPreprocessedCanvas, PreprocessingOptions, ROIConfig } from '@/utils/imagePreprocessing';

// Use local models from public folder - no CORS issues
const MODEL_URL = '/models';

type SourceMode = 'webcam' | 'video' | 'screen';

type FaceDetectionOptions = {
  sourceMode?: SourceMode;
  cctvMode?: boolean;
  config?: Partial<CCTVDetectionConfig>;
};

interface DetectionStats {
  lastFps: number;
  lastLatency: number;
  frameCount: number;
  lastFrameTime: number;
}

export const useFaceDetection = (
  sensitivity: number = 0.4,
  options?: FaceDetectionOptions
) => {
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [backend, setBackend] = useState<string>('');
  const [ssdLoaded, setSsdLoaded] = useState(false);
  
  const loadingRef = useRef(false);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const inFlightRef = useRef(false);
  const statsRef = useRef<DetectionStats>({
    lastFps: 0,
    lastLatency: 0,
    frameCount: 0,
    lastFrameTime: 0,
  });
  const debugInfoRef = useRef<DetectionDebugInfo | null>(null);

  // Initialize backend and load models
  useEffect(() => {
    const loadModels = async () => {
      if (loadingRef.current) return;
      loadingRef.current = true;

      try {
        setIsLoading(true);
        setLoadingProgress(10);

        // Use WebGL (stable with face-api.js) - WebGPU has kernel compatibility issues
        console.log('[TensorFlow] Initializing backend...');
        let selectedBackend = 'webgl';
        
        try {
          await tf.setBackend('webgl');
          await tf.ready();
          console.log('[TensorFlow] ✅ Using WebGL backend');
        } catch (e) {
          console.log('[TensorFlow] WebGL failed, trying CPU...');
          try {
            await tf.setBackend('cpu');
            await tf.ready();
            selectedBackend = 'cpu';
            console.log('[TensorFlow] ⚠️ Using CPU backend (slower)');
          } catch (e2) {
            throw new Error('No TensorFlow backend available');
          }
        }
        
        setBackend(tf.getBackend() || selectedBackend);
        setLoadingProgress(30);

        console.log('[FaceAPI] Loading models from:', MODEL_URL);

        // Load TinyFaceDetector and AgeGender first (essential)
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.ageGenderNet.loadFromUri(MODEL_URL),
        ]);
        
        console.log('[FaceAPI] ✅ TinyFaceDetector + AgeGender loaded');
        setLoadingProgress(70);
        setIsModelLoaded(true);

        // Try to load SSD Mobilenet for CCTV mode (optional, don't fail if missing)
        try {
          await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL);
          console.log('[FaceAPI] ✅ SSD Mobilenet V1 loaded');
          setSsdLoaded(true);
        } catch (e) {
          console.log('[FaceAPI] ⚠️ SSD Mobilenet not available, using TinyFace only');
        }
        
        setLoadingProgress(100);
        setError(null);
      } catch (err) {
        console.error('[FaceAPI] ❌ Failed to load models:', err);
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        setError(`Model load failed: ${errorMsg}`);
        setIsModelLoaded(false);
      } finally {
        setIsLoading(false);
      }
    };

    loadModels();
  }, []);

  // Get effective config based on mode
  const getConfig = useCallback((): CCTVDetectionConfig => {
    const sourceMode = options?.sourceMode ?? 'webcam';
    const cctvMode = options?.cctvMode ?? sourceMode === 'video';
    const baseConfig = cctvMode ? DEFAULT_CCTV_CONFIG : DEFAULT_WEBCAM_CONFIG;
    
    return {
      ...baseConfig,
      sensitivity,
      ...options?.config,
    };
  }, [sensitivity, options]);

  // Run TinyFaceDetector
  const runTinyDetection = useCallback(async (
    input: HTMLVideoElement | HTMLCanvasElement,
    inputSize: number,
    scoreThreshold: number
  ) => {
    return faceapi
      .detectAllFaces(
        input,
        new faceapi.TinyFaceDetectorOptions({
          inputSize,
          scoreThreshold,
        })
      )
      .withAgeAndGender();
  }, []);

  // Run SSD Mobilenet
  const runSsdDetection = useCallback(async (
    input: HTMLVideoElement | HTMLCanvasElement,
    minConfidence: number
  ) => {
    if (!ssdLoaded) return [];
    
    return faceapi
      .detectAllFaces(
        input,
        new faceapi.SsdMobilenetv1Options({
          minConfidence,
        })
      )
      .withAgeAndGender();
  }, [ssdLoaded]);

  // Create upscaled/preprocessed canvas
  const createProcessedCanvas = useCallback((
    videoElement: HTMLVideoElement,
    preprocessing: PreprocessingOptions,
    scale: number,
    roi?: ROIConfig
  ): HTMLCanvasElement | null => {
    return createPreprocessedCanvas(videoElement, preprocessing, scale, roi);
  }, []);

  // Filter and process raw detections
  const processDetections = useCallback((
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    detections: any[],
    videoWidth: number,
    videoHeight: number,
    scaleBack: number,
    config: CCTVDetectionConfig,
    detectorUsed: 'tiny' | 'ssd',
    roiOffset?: { x: number; y: number },
    debugMode: boolean = false
  ): { results: DetectionResult[]; rawCount: number; filteredCount: number } => {
    const rawCount = detections.length;
    
    // Use the LOWER of minFaceScore and sensitivity to avoid filtering too strictly
    const effectiveMinScore = Math.min(config.minFaceScore, config.sensitivity);
    
    if (debugMode && rawCount > 0) {
      console.log(`[Filter] Raw: ${rawCount}, minScore: ${effectiveMinScore.toFixed(2)}, minPx: ${config.minFaceSizePx}, minPct: ${config.minFaceSizePercent}%`);
    }
    
    const results = detections
      .filter(detection => {
        const det = detection.detection ?? detection;
        const box = det.box;
        const faceScore = det.score;
        
        // Scale back bounding box
        const faceWidth = box.width / scaleBack;
        const faceHeight = box.height / scaleBack;
        const faceX = box.x / scaleBack + (roiOffset?.x ?? 0);
        const faceY = box.y / scaleBack + (roiOffset?.y ?? 0);
        
        // Filter by face detection score (use effective minimum)
        if (faceScore < effectiveMinScore) {
          if (debugMode) console.log(`[Filter] ❌ Low score: ${faceScore.toFixed(2)} < ${effectiveMinScore.toFixed(2)}`);
          return false;
        }
        
        // Filter by minimum pixel size
        if (faceWidth < config.minFaceSizePx || faceHeight < config.minFaceSizePx) {
          if (debugMode) console.log(`[Filter] ❌ Too small: ${faceWidth.toFixed(0)}x${faceHeight.toFixed(0)}px < ${config.minFaceSizePx}px`);
          return false;
        }
        
        // Filter by percentage of frame
        const facePercent = (faceWidth * faceHeight) / (videoWidth * videoHeight) * 100;
        if (facePercent < config.minFaceSizePercent) {
          if (debugMode) console.log(`[Filter] ❌ Too small: ${facePercent.toFixed(2)}% < ${config.minFaceSizePercent}%`);
          return false;
        }
        
        // Filter by aspect ratio (faces should be roughly square)
        const aspectRatio = faceWidth / faceHeight;
        if (aspectRatio < config.aspectRatioMin || aspectRatio > config.aspectRatioMax) {
          if (debugMode) console.log(`[Filter] ❌ Bad aspect: ${aspectRatio.toFixed(2)} not in [${config.aspectRatioMin}, ${config.aspectRatioMax}]`);
          return false;
        }
        
        // Check if face is within video bounds
        if (faceX < 0 || faceY < 0 || faceX + faceWidth > videoWidth || faceY + faceHeight > videoHeight) {
          if (debugMode) console.log('[Filter] ❌ Out of bounds');
          return false;
        }
        
        if (debugMode) console.log(`[Filter] ✅ PASSED: score=${faceScore.toFixed(2)}, size=${faceWidth.toFixed(0)}x${faceHeight.toFixed(0)}px`);
        return true;
      })
      .map(detection => {
        const det = detection.detection ?? detection;
        const box = det.box;
        const faceScore = det.score;

        const boundingBox: FaceBoundingBox = {
          x: Math.max(0, box.x / scaleBack + (roiOffset?.x ?? 0)),
          y: Math.max(0, box.y / scaleBack + (roiOffset?.y ?? 0)),
          width: Math.min(box.width / scaleBack, videoWidth - box.x / scaleBack),
          height: Math.min(box.height / scaleBack, videoHeight - box.y / scaleBack),
        };

        // Classify age: kid (<13), young (13-34), adult (35+)
        const age = Math.round(detection.age);
        let ageGroup: 'kid' | 'young' | 'adult';
        if (age < 13) {
          ageGroup = 'kid';
        } else if (age < 35) {
          ageGroup = 'young';
        } else {
          ageGroup = 'adult';
        }

        return {
          gender: detection.gender as 'male' | 'female',
          ageGroup,
          confidence: detection.genderProbability,
          faceScore,
          boundingBox,
          trackingId: `${detectorUsed}_${Math.round(boundingBox.x)}_${Math.round(boundingBox.y)}`,
          lastSeen: Date.now(),
        } as DetectionResult;
      });

    if (debugMode) {
      console.log(`[Filter] Result: ${results.length}/${rawCount} passed`);
    }

    return { results, rawCount, filteredCount: results.length };
  }, []);

  // Main detection function
  const detectFaces = useCallback(async (
    videoElement: HTMLVideoElement
  ): Promise<DetectionResult[]> => {
    // Prevent overlapping detection calls
    if (inFlightRef.current) {
      return [];
    }

    if (!videoElement || videoElement.readyState < 2 || !isModelLoaded) {
      return [];
    }

    inFlightRef.current = true;
    const startTime = performance.now();

    // Timeout protection to prevent infinite hangs
    const timeoutPromise = new Promise<DetectionResult[]>((_, reject) => {
      setTimeout(() => reject(new Error('Detection timeout')), DETECTION_TIMEOUT);
    });

    const detectionPromise = (async (): Promise<DetectionResult[]> => {
      const config = getConfig();
      const sourceMode = options?.sourceMode ?? 'webcam';
      const isCCTV = options?.cctvMode ?? sourceMode === 'video';
      
      const videoWidth = videoElement.videoWidth || 640;
      const videoHeight = videoElement.videoHeight || 480;

      let detectorUsed: 'tiny' | 'ssd' = 'tiny';
      let passUsed: 1 | 2 = 1;
      let upscaled = false;
      let preprocessingApplied = false;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let detections: any[] = [];
      let scaleBack = 1;
      let roiOffset: { x: number; y: number } | undefined;

      // Calculate ROI offset if enabled
      if (config.roi.enabled) {
        roiOffset = {
          x: config.roi.x * videoWidth,
          y: config.roi.y * videoHeight,
        };
      }

      // Use lower threshold for detection to get more raw faces
      const detectionThreshold = Math.max(config.sensitivity - 0.05, 0.15);
      
      if (config.debugMode) {
        console.log(`[Detection] Config: sensitivity=${config.sensitivity}, threshold=${detectionThreshold.toFixed(2)}, minScore=${config.minFaceScore}`);
      }

      // ========== PASS 1: Standard detection ==========
      if (config.detector === 'ssd' && ssdLoaded) {
        // Use SSD only
        detectorUsed = 'ssd';
        if (config.debugMode) console.log('[Detection] Pass 1: SSD Mobilenet');
        detections = await runSsdDetection(videoElement, detectionThreshold);
      } else if (config.detector === 'tiny') {
        // Use TinyFace only
        if (config.debugMode) console.log('[Detection] Pass 1: TinyFaceDetector');
        const inputSize = isCCTV ? 416 : 512;
        detections = await runTinyDetection(videoElement, inputSize, detectionThreshold);
      } else {
        // Dual mode: Try TinyFace first (faster)
        if (config.debugMode) console.log('[Detection] Pass 1: TinyFaceDetector (dual mode)');
        const inputSize = isCCTV ? 416 : 512;
        detections = await runTinyDetection(videoElement, inputSize, detectionThreshold);
      }

      if (config.debugMode || detections.length > 0) {
        console.log('[Detection] Pass 1 found', detections.length, 'raw faces');
      }

      // ========== PASS 2: CCTV rescue with preprocessing + upscale + SSD ==========
      if (detections.length === 0 && isCCTV && config.detector !== 'tiny') {
        passUsed = 2;
        console.log('[Detection] Pass 2: CCTV rescue with preprocessing...');
        
        // Create preprocessed and upscaled canvas
        const processedCanvas = createProcessedCanvas(
          videoElement,
          config.preprocessing,
          config.upscale,
          config.roi.enabled ? config.roi : undefined
        );

        if (processedCanvas) {
          preprocessingApplied = config.preprocessing.gamma !== 1 || 
                                 config.preprocessing.contrast !== 1 || 
                                 config.preprocessing.sharpen > 0;
          upscaled = config.upscale > 1;
          scaleBack = config.upscale;

          // Try SSD on preprocessed canvas (more accurate for small faces)
          if (ssdLoaded) {
            detectorUsed = 'ssd';
            console.log('[Detection] Pass 2: SSD on preprocessed canvas');
            detections = await runSsdDetection(
              processedCanvas,
              Math.max(config.sensitivity - 0.1, 0.2) // Lower threshold for rescue
            );
          }

          // If still no faces, try TinyFace with larger input size
          if (detections.length === 0) {
            detectorUsed = 'tiny';
            console.log('[Detection] Pass 2: TinyFace with 608 input size');
            detections = await runTinyDetection(
              processedCanvas,
              608,
              Math.max(config.sensitivity - 0.1, 0.2)
            );
          }

          console.log('[Detection] Pass 2 found', detections.length, 'faces');
        }
      }

      // Process and filter detections
      const { results, rawCount, filteredCount } = processDetections(
        detections,
        videoWidth,
        videoHeight,
        scaleBack,
        config,
        detectorUsed,
        roiOffset,
        config.debugMode
      );

      // Update debug info
      const endTime = performance.now();
      const latency = endTime - startTime;
      
      // Calculate FPS
      const stats = statsRef.current;
      stats.frameCount++;
      const now = performance.now();
      if (now - stats.lastFrameTime >= 1000) {
        stats.lastFps = stats.frameCount * 1000 / (now - stats.lastFrameTime);
        stats.frameCount = 0;
        stats.lastFrameTime = now;
      }
      stats.lastLatency = latency;

      debugInfoRef.current = {
        fps: stats.lastFps,
        latencyMs: latency,
        backend: backend || tf.getBackend() || 'unknown',
        detectorUsed: config.detector,
        passUsed,
        rawDetections: rawCount,
        filteredDetections: filteredCount,
        trackedFaces: results.length,
        preprocessing: preprocessingApplied,
        upscaled,
        frameSize: { width: videoWidth, height: videoHeight },
        roiActive: config.roi.enabled,
      };

      return results;
    })();

    try {
      return await Promise.race([detectionPromise, timeoutPromise]);
    } catch (err) {
      console.error('[Detection] Error:', err);
      return [];
    } finally {
      inFlightRef.current = false;
    }
  }, [
    isModelLoaded,
    ssdLoaded,
    backend,
    options,
    getConfig,
    runTinyDetection,
    runSsdDetection,
    createProcessedCanvas,
    processDetections,
  ]);

  // Get current debug info
  const getDebugInfo = useCallback((): DetectionDebugInfo | null => {
    return debugInfoRef.current;
  }, []);

  return {
    isModelLoaded,
    isLoading,
    loadingProgress,
    error,
    backend,
    ssdLoaded,
    detectFaces,
    getDebugInfo,
  };
};

// Reset function (kept for compatibility)
export const resetSimulatedPerson = () => {
  // no-op
};
