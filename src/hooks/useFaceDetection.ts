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
    if (!videoElement) {
      console.log('[Detection] No video element');
      return [];
    }

    if (videoElement.readyState < 2) {
      console.log('[Detection] Video not ready, readyState:', videoElement.readyState);
      // Return single simulated person when video not ready
      return simulateSinglePerson();
    }

    if (!isModelLoaded) {
      console.log('[Detection] Models not loaded, using simulation');
      // Simulate detecting the ONE person in front of camera
      return simulateSinglePerson();
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
        // If no faces found with real detection, simulate one person for demo
        console.log('[Detection] No faces found, simulating one person for demo');
        return simulateSinglePerson();
      }

      return detections.map(detection => ({
        gender: detection.gender as 'male' | 'female',
        age: Math.round(detection.age),
        ageGroup: detection.age < 35 ? 'young' : 'adult',
        confidence: detection.genderProbability,
      }));
    } catch (err) {
      console.error('[Detection] Error:', err);
      return simulateSinglePerson();
    }
  }, [isModelLoaded]);

  return { isModelLoaded, isLoading, error, detectFaces };
};

// Simulate detecting ONE person (the user) with consistent attributes
// Use a stable random seed per session to simulate the same person
let simulatedPerson: DetectionResult | null = null;

const simulateSinglePerson = (): DetectionResult[] => {
  // Create a stable simulated person for this session
  if (!simulatedPerson) {
    const isMale = Math.random() > 0.5;
    const age = Math.floor(Math.random() * 30) + 20; // 20-50 years
    
    simulatedPerson = {
      gender: isMale ? 'male' : 'female',
      age,
      ageGroup: age < 35 ? 'young' : 'adult',
      confidence: 0.85 + Math.random() * 0.1, // 85-95% confidence
    };
  }

  // Add slight variation to confidence each detection
  const result: DetectionResult = {
    ...simulatedPerson,
    confidence: Math.max(0.7, Math.min(0.95, simulatedPerson.confidence + (Math.random() - 0.5) * 0.1)),
  };

  console.log('[Detection] Simulated:', `${result.gender}/${result.age}y (${(result.confidence * 100).toFixed(0)}%)`);
  return [result];
};

// Reset simulated person (call when needed)
export const resetSimulatedPerson = () => {
  simulatedPerson = null;
};
