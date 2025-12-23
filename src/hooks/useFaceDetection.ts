import { useState, useEffect, useCallback, useRef } from 'react';
import { AutoModel, AutoProcessor, RawImage } from '@huggingface/transformers';
import * as faceDetection from '@tensorflow-models/face-detection';
import * as tf from '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-backend-webgl';
import { DetectionResult, FaceBoundingBox } from '@/types/ad';

const AGE_GENDER_MODEL_ID = 'onnx-community/age-gender-prediction-ONNX';

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

export const useFaceDetection = () => {
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadingRef = useRef(false);
  const ageGenderModelRef = useRef<any>(null);
  const ageGenderProcessorRef = useRef<any>(null);
  const faceDetectorRef = useRef<faceDetection.FaceDetector | null>(null);

  useEffect(() => {
    const loadModels = async () => {
      if (loadingRef.current) return;
      loadingRef.current = true;

      try {
        setIsLoading(true);
        setError(null);

        // TFJS backend
        await tf.setBackend('webgl');
        await tf.ready();

        // Face detector (MediaPipe)
        const detector = await faceDetection.createDetector(
          faceDetection.SupportedModels.MediaPipeFaceDetector,
          {
            runtime: 'tfjs',
            maxFaces: 3,
            modelType: 'short',
          }
        );
        faceDetectorRef.current = detector;

        // Age/Gender model (Transformers.js)
        const [model, processor] = await Promise.all([
          AutoModel.from_pretrained(AGE_GENDER_MODEL_ID, { device: 'wasm' }),
          AutoProcessor.from_pretrained(AGE_GENDER_MODEL_ID),
        ]);
        ageGenderModelRef.current = model;
        ageGenderProcessorRef.current = processor;

        setIsModelLoaded(true);
      } catch (e) {
        console.error('[Detection] Model load error:', e);
        setIsModelLoaded(false);
        setError('AI models unavailable.');
      } finally {
        setIsLoading(false);
      }
    };

    loadModels();
  }, []);

  const detectFaces = useCallback(async (videoElement: HTMLVideoElement): Promise<DetectionResult[]> => {
    if (!videoElement) return [];
    if (videoElement.readyState < 2) return [];

    const detector = faceDetectorRef.current;
    if (!detector) return [];

    // 1) Face boxes
    const faces = await detector.estimateFaces(videoElement, { flipHorizontal: false });
    if (!faces?.length) return [];

    const vw = videoElement.videoWidth || 640;
    const vh = videoElement.videoHeight || 480;

    // 2) For each face, crop + age/gender
    const model = ageGenderModelRef.current;
    const processor = ageGenderProcessorRef.current;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return [];

    const results: DetectionResult[] = [];

    for (const face of faces) {
      // FaceDetection returns box in pixels for the input source
      const box = face.box;
      const x = clamp(box.xMin ?? 0, 0, vw);
      const y = clamp(box.yMin ?? 0, 0, vh);
      const w = clamp(box.width ?? 0, 0, vw - x);
      const h = clamp(box.height ?? 0, 0, vh - y);
      if (w < 10 || h < 10) continue;

      const boundingBox: FaceBoundingBox = { x, y, width: w, height: h };

      // If age/gender model isn't ready, still return the box (so UI can show it)
      if (!model || !processor) {
        results.push({
          gender: 'male',
          age: 0,
          ageGroup: 'young',
          confidence: 0,
          boundingBox,
        });
        continue;
      }

      // Crop to 224x224
      canvas.width = 224;
      canvas.height = 224;
      ctx.drawImage(videoElement, x, y, w, h, 0, 0, 224, 224);
      const imageData = ctx.getImageData(0, 0, 224, 224);

      // RawImage expects RGBA
      const image = new RawImage(imageData.data, 224, 224, 4);
      const inputs = await processor(image);
      const { logits } = await model(inputs);

      const [ageLogits, genderLogits] = logits.tolist()[0] as [number, number];
      const age = clamp(Math.round(ageLogits), 1, 100);
      const isFemale = genderLogits >= 0.5;
      const confidence = Math.max(genderLogits, 1 - genderLogits);

      results.push({
        gender: isFemale ? 'female' : 'male',
        age,
        ageGroup: age < 35 ? 'young' : 'adult',
        confidence,
        boundingBox,
      });
    }

    return results;
  }, []);

  return { isModelLoaded, isLoading, error, detectFaces };
};

export const resetSimulatedPerson = () => {
  // no-op (kept for backwards compatibility)
};
