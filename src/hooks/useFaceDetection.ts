import { useState, useEffect, useCallback, useRef } from 'react';
import * as faceapi from 'face-api.js';
import * as tf from '@tensorflow/tfjs';
import { DetectionResult, FaceBoundingBox } from '@/types/ad';

// Use local models from public folder - no CORS issues
const MODEL_URL = '/models';

export const useFaceDetection = () => {
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const loadingRef = useRef(false);

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
      console.log('[Detection] Running face-api detection...');
      
      // Lower threshold for better detection, larger input for accuracy
      const options = new faceapi.TinyFaceDetectorOptions({
        inputSize: 416,
        scoreThreshold: 0.3
      });

      const detections = await faceapi
        .detectAllFaces(videoElement, options)
        .withAgeAndGender();

      console.log('[Detection] Found', detections.length, 'faces');

      if (detections.length === 0) {
        return [];
      }

      const videoWidth = videoElement.videoWidth || 640;
      const videoHeight = videoElement.videoHeight || 480;

      return detections.map(detection => {
        const box = detection.detection.box;
        const boundingBox: FaceBoundingBox = {
          x: Math.max(0, box.x),
          y: Math.max(0, box.y),
          width: Math.min(box.width, videoWidth - box.x),
          height: Math.min(box.height, videoHeight - box.y),
        };

        return {
          gender: detection.gender as 'male' | 'female',
          age: Math.round(detection.age),
          ageGroup: detection.age < 35 ? 'young' : 'adult',
          confidence: detection.genderProbability,
          boundingBox,
        };
      });
    } catch (err) {
      console.error('[Detection] Error:', err);
      return [];
    }
  }, [isModelLoaded]);

  return { isModelLoaded, isLoading, error, detectFaces };
};

// Reset function (kept for compatibility)
export const resetSimulatedPerson = () => {
  // no-op
};
