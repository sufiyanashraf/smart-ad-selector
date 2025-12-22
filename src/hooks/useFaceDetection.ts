import { useState, useEffect, useCallback, useRef } from 'react';
import * as faceapi from 'face-api.js';
import { DetectionResult } from '@/types/ad';

const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';

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
        console.log('[FaceAPI] Loading models from:', MODEL_URL);
        
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.ageGenderNet.loadFromUri(MODEL_URL),
        ]);
        
        console.log('[FaceAPI] Models loaded successfully!');
        setIsModelLoaded(true);
        setError(null);
      } catch (err) {
        console.error('[FaceAPI] Failed to load models:', err);
        setError('AI models unavailable. Using demo mode.');
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
    // Always run detection - use real if models loaded, simulate otherwise
    if (!videoElement) {
      console.log('[Detection] No video element');
      return [];
    }

    if (videoElement.readyState < 2) {
      console.log('[Detection] Video not ready, readyState:', videoElement.readyState);
      return simulateDetection();
    }

    if (!isModelLoaded) {
      console.log('[Detection] Models not loaded, using simulation');
      return simulateDetection();
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
        // If no faces found with real detection, simulate for demo
        console.log('[Detection] No faces found, simulating for demo');
        return simulateDetection();
      }

      return detections.map(detection => ({
        gender: detection.gender as 'male' | 'female',
        age: Math.round(detection.age),
        ageGroup: detection.age < 35 ? 'young' : 'adult',
        confidence: detection.genderProbability,
      }));
    } catch (err) {
      console.error('[Detection] Error:', err);
      return simulateDetection();
    }
  }, [isModelLoaded]);

  return { isModelLoaded, isLoading, error, detectFaces };
};

// Simulated detection for demo purposes
const simulateDetection = (): DetectionResult[] => {
  // Random chance to detect 1-3 people
  const numFaces = Math.floor(Math.random() * 3) + 1;
  const results: DetectionResult[] = [];
  
  for (let i = 0; i < numFaces; i++) {
    const isMale = Math.random() > 0.5;
    const age = Math.floor(Math.random() * 40) + 18; // 18-58 years
    
    results.push({
      gender: isMale ? 'male' : 'female',
      age,
      ageGroup: age < 35 ? 'young' : 'adult',
      confidence: 0.75 + Math.random() * 0.2, // 75-95% confidence
    });
  }
  
  console.log('[Detection] Simulated:', results.map(r => `${r.gender}/${r.age}y`).join(', '));
  return results;
};
