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

export const useFaceDetection = (sensitivity: number = 0.4, options?: FaceDetectionOptions) => {
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const loadingRef = useRef(false);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);

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

  const detectFaces = useCallback(async (
    videoElement: HTMLVideoElement
  ): Promise<DetectionResult[]> => {
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

    try {
      const sourceMode: SourceMode = options?.sourceMode ?? 'webcam';
      const videoWidth = videoElement.videoWidth || 640;
      const videoHeight = videoElement.videoHeight || 480;

      // CCTV/video files often have smaller/blurrier faces. Upscale the frame before running TinyFaceDetector.
      const useUpscaledFrame = sourceMode === 'video';
      const upscale = useUpscaledFrame ? 1.75 : 1;

      const detectionInput: HTMLVideoElement | HTMLCanvasElement = (() => {
        if (!useUpscaledFrame) return videoElement;

        const canvas = offscreenCanvasRef.current ?? document.createElement('canvas');
        offscreenCanvasRef.current = canvas;

        canvas.width = Math.round(videoWidth * upscale);
        canvas.height = Math.round(videoHeight * upscale);

        const ctx = canvas.getContext('2d');
        if (!ctx) return videoElement;

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
        return canvas;
      })();

      // Slightly larger detector input for CCTV; keep threshold user-controlled via slider.
      const inputSize = sourceMode === 'video' ? 640 : 512;

      console.log('[Detection] Running face-api', {
        sourceMode,
        sensitivity,
        inputSize,
        upscale: useUpscaledFrame ? upscale : 1,
      });

      const detections = await faceapi
        .detectAllFaces(
          detectionInput,
          new faceapi.TinyFaceDetectorOptions({
            inputSize,
            scoreThreshold: sensitivity,
          })
        )
        .withAgeAndGender();

      console.log('[Detection] Found', detections.length, 'faces');

      if (detections.length === 0) {
        return [];
      }

      return detections.map((detection) => {
        const box = detection.detection.box;

        // If we detected on an upscaled canvas, convert boxes back to original video coordinates.
        const scaleBack = useUpscaledFrame ? upscale : 1;

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
          boundingBox,
        };
      });
    } catch (err) {
      console.error('[Detection] Error:', err);
      return [];
    }
  }, [isModelLoaded, sensitivity, options?.sourceMode]);

  return { isModelLoaded, isLoading, error, detectFaces };
};

// Reset function (kept for compatibility)
export const resetSimulatedPerson = () => {
  // no-op
};

