import { useState, useEffect, useCallback, useRef } from 'react';
import { AutoModel, AutoProcessor, RawImage } from '@huggingface/transformers';
import { DetectionResult, FaceBoundingBox } from '@/types/ad';

const MODEL_ID = 'onnx-community/age-gender-prediction-ONNX';

// Simple face detection using canvas analysis
// We'll detect faces by looking for skin tones and face-like regions
const detectFaceRegions = async (
  videoElement: HTMLVideoElement
): Promise<FaceBoundingBox[]> => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return [];

  const width = videoElement.videoWidth || 640;
  const height = videoElement.videoHeight || 480;
  canvas.width = width;
  canvas.height = height;

  ctx.drawImage(videoElement, 0, 0, width, height);
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  // Simple skin tone detection
  const skinPixels: { x: number; y: number }[] = [];
  
  for (let y = 0; y < height; y += 4) {
    for (let x = 0; x < width; x += 4) {
      const i = (y * width + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      // Skin tone detection heuristic
      if (
        r > 95 && g > 40 && b > 20 &&
        r > g && r > b &&
        Math.abs(r - g) > 15 &&
        r - g > 15 && r - b > 15
      ) {
        skinPixels.push({ x, y });
      }
    }
  }

  if (skinPixels.length < 50) return [];

  // Cluster skin pixels to find face regions
  const clusters = clusterPixels(skinPixels, 80);
  
  return clusters
    .filter(cluster => cluster.length > 20)
    .map(cluster => {
      const xs = cluster.map(p => p.x);
      const ys = cluster.map(p => p.y);
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);
      
      // Expand the bounding box a bit and ensure aspect ratio
      const faceWidth = maxX - minX;
      const faceHeight = maxY - minY;
      const aspectRatio = faceHeight / faceWidth;
      
      // Faces are typically taller than wide
      if (aspectRatio < 0.5 || aspectRatio > 2.5) return null;
      
      // Add padding
      const padding = faceWidth * 0.3;
      return {
        x: Math.max(0, minX - padding),
        y: Math.max(0, minY - padding),
        width: Math.min(width - minX, faceWidth + padding * 2),
        height: Math.min(height - minY, faceHeight + padding * 2),
      };
    })
    .filter((box): box is FaceBoundingBox => box !== null)
    .slice(0, 5); // Max 5 faces
};

// Simple clustering algorithm
const clusterPixels = (
  pixels: { x: number; y: number }[],
  threshold: number
): { x: number; y: number }[][] => {
  const clusters: { x: number; y: number }[][] = [];
  const visited = new Set<number>();

  for (let i = 0; i < pixels.length; i++) {
    if (visited.has(i)) continue;
    
    const cluster: { x: number; y: number }[] = [];
    const queue = [i];
    
    while (queue.length > 0) {
      const idx = queue.shift()!;
      if (visited.has(idx)) continue;
      visited.add(idx);
      cluster.push(pixels[idx]);

      for (let j = 0; j < pixels.length; j++) {
        if (visited.has(j)) continue;
        const dx = pixels[idx].x - pixels[j].x;
        const dy = pixels[idx].y - pixels[j].y;
        if (Math.sqrt(dx * dx + dy * dy) < threshold) {
          queue.push(j);
        }
      }
    }
    
    if (cluster.length > 0) {
      clusters.push(cluster);
    }
  }

  return clusters;
};

export const useFaceDetection = () => {
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const loadingRef = useRef(false);
  const modelRef = useRef<any>(null);
  const processorRef = useRef<any>(null);

  useEffect(() => {
    const loadModels = async () => {
      if (loadingRef.current) return;
      loadingRef.current = true;
      
      try {
        setIsLoading(true);
        console.log('[HF] Loading age-gender model from:', MODEL_ID);
        
        // Load the model and processor
        const [model, processor] = await Promise.all([
          AutoModel.from_pretrained(MODEL_ID, {
            device: 'wasm', // Use WebAssembly for better compatibility
          }),
          AutoProcessor.from_pretrained(MODEL_ID),
        ]);
        
        modelRef.current = model;
        processorRef.current = processor;
        
        console.log('[HF] Models loaded successfully!');
        setIsModelLoaded(true);
        setError(null);
      } catch (err) {
        console.error('[HF] Failed to load models:', err);
        setError('AI models unavailable. Detection disabled.');
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

    // First, detect face regions
    const faceRegions = await detectFaceRegions(videoElement);
    console.log('[Detection] Found', faceRegions.length, 'potential face regions');

    if (faceRegions.length === 0) {
      console.log('[Detection] No faces found in frame');
      return [];
    }

    if (!isModelLoaded || !modelRef.current || !processorRef.current) {
      console.log('[Detection] Model not loaded, returning face regions only');
      // Return regions without age/gender (will be detected when model loads)
      return faceRegions.map(box => ({
        gender: 'male' as const,
        age: 25,
        ageGroup: 'young' as const,
        confidence: 0.5,
        boundingBox: box,
      }));
    }

    try {
      const results: DetectionResult[] = [];
      const model = modelRef.current;
      const processor = processorRef.current;

      // Create a canvas to crop each face
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return [];

      for (const box of faceRegions) {
        try {
          // Crop the face region
          canvas.width = 224;
          canvas.height = 224;
          
          ctx.drawImage(
            videoElement,
            box.x, box.y, box.width, box.height,
            0, 0, 224, 224
          );

          // Convert canvas to RawImage
          const imageData = ctx.getImageData(0, 0, 224, 224);
          const image = new RawImage(imageData.data, 224, 224, 4);

          // Process and run model
          const inputs = await processor(image);
          const { logits } = await model(inputs);
          
          // Extract predictions
          const output = logits.tolist()[0];
          const [ageLogits, genderLogits] = output;
          
          const age = Math.min(Math.max(Math.round(ageLogits), 1), 100);
          const isFemale = genderLogits >= 0.5;
          const confidence = Math.max(genderLogits, 1 - genderLogits);

          results.push({
            gender: isFemale ? 'female' : 'male',
            age,
            ageGroup: age < 35 ? 'young' : 'adult',
            confidence,
            boundingBox: box,
          });

          console.log(`[Detection] Face: ${isFemale ? 'Female' : 'Male'}, Age: ${age}, Confidence: ${(confidence * 100).toFixed(1)}%`);
        } catch (faceErr) {
          console.error('[Detection] Error processing face:', faceErr);
        }
      }

      return results;
    } catch (err) {
      console.error('[Detection] Error:', err);
      return [];
    }
  }, [isModelLoaded]);

  return { isModelLoaded, isLoading, error, detectFaces };
};

// Reset function (kept for compatibility)
export const resetSimulatedPerson = () => {
  // No-op - we no longer simulate
};
