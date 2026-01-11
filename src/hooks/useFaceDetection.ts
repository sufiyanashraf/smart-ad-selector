import { useState, useEffect, useCallback, useRef } from 'react';
import * as faceapi from 'face-api.js';
import * as tf from '@tensorflow/tfjs';
import { DetectionResult, FaceBoundingBox } from '@/types/ad';

// Use local models from public folder - no CORS issues
const MODEL_URL = '/models';

type SourceMode = 'webcam' | 'video' | 'screen';

type FaceDetectionOptions = {
  sourceMode?: SourceMode;
};

// Configuration constants for tuning
const CONFIG = {
  // Webcam settings (faces are usually larger and clearer)
  webcam: {
    inputSize: 512,
    upscale: 1,
    minFaceScore: 0.5,
    minFaceSizePx: 40,
  },
  // Video/CCTV settings (faces can be small and blurry)
  video: {
    inputSize: 416,        // Fast first pass
    rescueInputSize: 608,  // Second pass if no faces found
    upscale: 1.5,          // Moderate upscale for rescue pass
    minFaceScore: 0.35,    // Allow weaker detections
    minFaceSizePx: 24,     // Allow smaller faces
  },
  // Screen capture - similar to webcam
  screen: {
    inputSize: 512,
    upscale: 1,
    minFaceScore: 0.45,
    minFaceSizePx: 35,
  },
};

export const useFaceDetection = (sensitivity: number = 0.4, options?: FaceDetectionOptions) => {
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const loadingRef = useRef(false);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const inFlightRef = useRef(false); // Prevent detection backlog

  useEffect(() => {
    const loadModels = async () => {
      if (loadingRef.current) return;
      loadingRef.current = true;

      try {
        setIsLoading(true);

        // Initialize TensorFlow.js backend first - this fixes the "backend undefined" error
        console.log('[TensorFlow] Initializing backend...');
        await tf.ready();
        console.log('[TensorFlow] Backend ready:', tf.getBackend());

        console.log('[FaceAPI] Loading models from:', MODEL_URL);

        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.ageGenderNet.loadFromUri(MODEL_URL),
        ]);

        console.log('[FaceAPI] ✅ Models loaded successfully!');
        setIsModelLoaded(true);
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

  // Helper: run detection on a given input with specified options
  const runDetection = useCallback(async (
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

  // Helper: create upscaled canvas from video
  const createUpscaledCanvas = useCallback((
    videoElement: HTMLVideoElement,
    videoWidth: number,
    videoHeight: number,
    scale: number
  ): HTMLCanvasElement | null => {
    const canvas = offscreenCanvasRef.current ?? document.createElement('canvas');
    offscreenCanvasRef.current = canvas;

    canvas.width = Math.round(videoWidth * scale);
    canvas.height = Math.round(videoHeight * scale);

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
    return canvas;
  }, []);

  // Helper: filter and process detections
  const processDetections = useCallback((
    detections: Awaited<ReturnType<typeof faceapi.FaceDetection.prototype.forSize>>[],
    videoWidth: number,
    videoHeight: number,
    scaleBack: number,
    minFaceScore: number,
    minFaceSizePx: number
  ): DetectionResult[] => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (detections as any[])
      .filter(detection => {
        const det = detection.detection ?? detection;
        const box = det.box;
        const faceScore = det.score;
        const faceWidth = box.width / scaleBack;
        const faceHeight = box.height / scaleBack;
        
        // Filter by face detection score
        if (faceScore < minFaceScore) {
          console.log('[Detection] Filtered: low faceScore', faceScore.toFixed(2));
          return false;
        }
        
        // Filter by minimum size
        if (faceWidth < minFaceSizePx || faceHeight < minFaceSizePx) {
          console.log('[Detection] Filtered: too small', faceWidth.toFixed(0), 'x', faceHeight.toFixed(0));
          return false;
        }
        
        // Filter by aspect ratio (faces shouldn't be too elongated)
        const aspectRatio = faceWidth / faceHeight;
        if (aspectRatio < 0.5 || aspectRatio > 2.0) {
          console.log('[Detection] Filtered: bad aspect ratio', aspectRatio.toFixed(2));
          return false;
        }
        
        return true;
      })
      .map(detection => {
        const det = detection.detection ?? detection;
        const box = det.box;
        const faceScore = det.score;

        const boundingBox: FaceBoundingBox = {
          x: Math.max(0, box.x / scaleBack),
          y: Math.max(0, box.y / scaleBack),
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
          trackingId: `${Math.round(boundingBox.x)}_${Math.round(boundingBox.y)}`,
          lastSeen: Date.now(),
        };
      });
  }, []);

  const detectFaces = useCallback(async (
    videoElement: HTMLVideoElement
  ): Promise<DetectionResult[]> => {
    // Prevent overlapping detection calls
    if (inFlightRef.current) {
      console.log('[Detection] Skipping: previous detection still in flight');
      return [];
    }

    if (!videoElement) {
      console.log('[Detection] No video element');
      return [];
    }

    if (videoElement.readyState < 2) {
      console.log('[Detection] Video not ready, readyState:', videoElement.readyState);
      return [];
    }

    if (!isModelLoaded) {
      console.log('[Detection] Models not loaded yet');
      return [];
    }

    inFlightRef.current = true;

    try {
      const sourceMode: SourceMode = options?.sourceMode ?? 'webcam';
      const videoWidth = videoElement.videoWidth || 640;
      const videoHeight = videoElement.videoHeight || 480;

      const config = CONFIG[sourceMode] || CONFIG.webcam;
      const scoreThreshold = sensitivity;

      console.log('[Detection] Running face-api', {
        sourceMode,
        sensitivity,
        inputSize: config.inputSize,
        minFaceScore: config.minFaceScore,
      });

      // ========== PASS 1: Fast detection on original video ==========
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let detections: any[] = await runDetection(videoElement, config.inputSize, scoreThreshold);

      console.log('[Detection] Pass 1 found', detections.length, 'raw faces');

      // ========== PASS 2: CCTV rescue (only for video mode if no faces found) ==========
      if (detections.length === 0 && sourceMode === 'video' && 'rescueInputSize' in config) {
        console.log('[Detection] Pass 2: CCTV rescue with upscale...');
        
        const upscaledCanvas = createUpscaledCanvas(
          videoElement,
          videoWidth,
          videoHeight,
          config.upscale
        );

        if (upscaledCanvas) {
          detections = await runDetection(
            upscaledCanvas,
            (config as typeof CONFIG.video).rescueInputSize,
            Math.max(scoreThreshold - 0.05, 0.25) // Slightly lower threshold, but not below 0.25
          );
          
          console.log('[Detection] Pass 2 found', detections.length, 'faces');
          
          // Process with upscale factor for coordinate correction
          if (detections.length > 0) {
            return processDetections(
              detections,
              videoWidth,
              videoHeight,
              config.upscale,
              config.minFaceScore,
              config.minFaceSizePx
            );
          }
        }
      }

      if (detections.length === 0) {
        return [];
      }

      // Process pass 1 results (no upscale)
      return processDetections(
        detections,
        videoWidth,
        videoHeight,
        1,
        config.minFaceScore,
        'minFaceSizePx' in config ? config.minFaceSizePx : 40
      );
    } catch (err) {
      console.error('[Detection] Error:', err);
      return [];
    } finally {
      inFlightRef.current = false;
    }
  }, [isModelLoaded, sensitivity, options?.sourceMode, runDetection, createUpscaledCanvas, processDetections]);

  return { isModelLoaded, isLoading, error, detectFaces };
};

// Reset function (kept for compatibility)
export const resetSimulatedPerson = () => {
  // no-op
};
