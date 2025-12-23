import { useState, useEffect, useCallback, useRef } from 'react';
import * as faceapi from 'face-api.js';
import { DetectionResult, FaceBoundingBox } from '@/types/ad';

const MODEL_BASE_URL = 'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js-models@master';
const TINY_FACE_DETECTOR_URL = `${MODEL_BASE_URL}/tiny_face_detector_model`;
const AGE_GENDER_URL = `${MODEL_BASE_URL}/age_gender_model`;

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
        console.log('[FaceAPI] Loading models from:', { TINY_FACE_DETECTOR_URL, AGE_GENDER_URL });
        
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(TINY_FACE_DETECTOR_URL),
          faceapi.nets.ageGenderNet.loadFromUri(AGE_GENDER_URL),
        ]);
        
        console.log('[FaceAPI] Models loaded successfully!');
        setIsModelLoaded(true);
        setError(null);
      } catch (err) {
        console.error('[FaceAPI] Failed to load models:', err);
        setError('AI models failed to load (network/CORS).');
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
      
      const options = new faceapi.TinyFaceDetectorOptions({
        inputSize: 320,
        scoreThreshold: 0.5
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
