/**
 * Extended types for CCTV-optimized face detection
 */

import { FaceBoundingBox, DetectionResult } from './ad';
import { PreprocessingOptions, ROIConfig } from '@/utils/imagePreprocessing';

export interface TrackedFace {
  id: string;
  boundingBox: FaceBoundingBox;
  velocity: { vx: number; vy: number };
  confidence: number;
  faceScore: number;
  gender: 'male' | 'female';
  ageGroup: 'kid' | 'young' | 'adult';
  consecutiveHits: number;
  missedFrames: number;
  firstSeenAt: number;
  lastSeenAt: number;
  detectorUsed: 'tiny' | 'ssd';
}

export interface DetectionDebugInfo {
  fps: number;
  latencyMs: number;
  backend: string;
  detectorUsed: 'tiny' | 'ssd' | 'dual';
  passUsed: 1 | 2;
  rawDetections: number;
  filteredDetections: number;
  trackedFaces: number;
  preprocessing: boolean;
  upscaled: boolean;
  frameSize: { width: number; height: number };
  roiActive: boolean;
}

export interface CCTVDetectionConfig {
  // Detection settings
  detector: 'tiny' | 'ssd' | 'dual';
  sensitivity: number;        // 0.2-0.6 (lower = more sensitive)
  
  // Preprocessing
  preprocessing: PreprocessingOptions;
  upscale: number;           // 1-2x
  
  // Filtering
  roi: ROIConfig;
  minFaceScore: number;      // 0.2-0.6
  minFaceSizePx: number;     // 20-60
  minFaceSizePercent: number; // 0.5-5% of frame
  aspectRatioMin: number;    // 0.5
  aspectRatioMax: number;    // 2.0
  
  // Tracking
  minConsecutiveFrames: number; // 2-5
  holdFrames: number;           // 2-8
  maxVelocityPx: number;        // Max movement between frames
  
  // Debug
  debugMode: boolean;
}

export const DEFAULT_CCTV_CONFIG: CCTVDetectionConfig = {
  detector: 'dual',
  sensitivity: 0.35,
  preprocessing: { gamma: 1.2, contrast: 1.3, sharpen: 0.3, denoise: false },
  upscale: 1.5,
  roi: { enabled: false, x: 0, y: 0, width: 1, height: 1 },
  minFaceScore: 0.3,
  minFaceSizePx: 24,
  minFaceSizePercent: 1,
  aspectRatioMin: 0.5,
  aspectRatioMax: 2.0,
  minConsecutiveFrames: 2,
  holdFrames: 4,
  maxVelocityPx: 150,
  debugMode: false,
};

export const DEFAULT_WEBCAM_CONFIG: CCTVDetectionConfig = {
  detector: 'tiny',
  sensitivity: 0.4,
  preprocessing: { gamma: 1.0, contrast: 1.0, sharpen: 0, denoise: false },
  upscale: 1,
  roi: { enabled: false, x: 0, y: 0, width: 1, height: 1 },
  minFaceScore: 0.45,
  minFaceSizePx: 40,
  minFaceSizePercent: 2,
  aspectRatioMin: 0.6,
  aspectRatioMax: 1.8,
  minConsecutiveFrames: 1,
  holdFrames: 2,
  maxVelocityPx: 200,
  debugMode: false,
};

export function toDetectionResult(tracked: TrackedFace): DetectionResult {
  return {
    gender: tracked.gender,
    ageGroup: tracked.ageGroup,
    confidence: tracked.confidence,
    faceScore: tracked.faceScore,
    boundingBox: tracked.boundingBox,
    trackingId: tracked.id,
    lastSeen: tracked.lastSeenAt,
  };
}
