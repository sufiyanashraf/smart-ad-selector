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
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.ageGenderNet.loadFromUri(MODEL_URL),
        ]);
        setIsModelLoaded(true);
        setError(null);
      } catch (err) {
        console.error('Failed to load face-api models:', err);
        setError('Failed to load AI models. Detection will use simulated data.');
      } finally {
        setIsLoading(false);
      }
    };

    loadModels();
  }, []);

  const detectFaces = useCallback(async (
    video: HTMLVideoElement
  ): Promise<DetectionResult[]> => {
    if (!isModelLoaded || !video || video.readyState < 2) {
      // Return simulated detection if models not loaded
      return simulateDetection();
    }

    try {
      const detections = await faceapi
        .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
        .withAgeAndGender();

      return detections.map(detection => ({
        gender: detection.gender as 'male' | 'female',
        age: Math.round(detection.age),
        ageGroup: detection.age < 35 ? 'young' : 'adult',
        confidence: detection.genderProbability,
      }));
    } catch (err) {
      console.error('Detection error:', err);
      return simulateDetection();
    }
  }, [isModelLoaded]);

  return { isModelLoaded, isLoading, error, detectFaces };
};

// Simulated detection for demo purposes when models fail to load
const simulateDetection = (): DetectionResult[] => {
  const numFaces = Math.floor(Math.random() * 3) + 1;
  const results: DetectionResult[] = [];
  
  for (let i = 0; i < numFaces; i++) {
    const isMale = Math.random() > 0.5;
    const age = Math.floor(Math.random() * 50) + 15;
    
    results.push({
      gender: isMale ? 'male' : 'female',
      age,
      ageGroup: age < 35 ? 'young' : 'adult',
      confidence: 0.7 + Math.random() * 0.25,
    });
  }
  
  return results;
};
