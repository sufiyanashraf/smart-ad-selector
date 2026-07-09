import type { HeadPose, AttentionState } from '@/utils/headPoseEstimation';

export type { HeadPose, AttentionState };

export type EmotionType = 'neutral' | 'happy' | 'sad' | 'angry' | 'fearful' | 'disgusted' | 'surprised';

export interface EmotionCounts {
  neutral: number;
  happy: number;
  sad: number;
  angry: number;
  fearful: number;
  disgusted: number;
  surprised: number;
}

export interface AdMetadata {
  id: string;
  filename: string;
  title: string;
  gender: 'male' | 'female' | 'all';
  ageGroup: ('child' | 'teen' | 'youngAdult' | 'middleAged' | 'senior' | 'all')[];
  duration: number;
  captureStart: number;
  captureEnd: number;
  thumbnail?: string;
  videoUrl: string;
  video_path?: string;  // Relative path from backend (e.g., 'ads/pepsi.mp4')
}

export interface DemographicCounts {
  male: number;
  female: number;
  child: number;
  teen: number;
  youngAdult: number;
  middleAged: number;
  senior: number;
}

export interface FaceBoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DetectionResult {
  gender: 'male' | 'female';
  ageGroup: 'child' | 'teen' | 'youngAdult' | 'middleAged' | 'senior';
  confidence: number;          // Gender classification confidence
  faceScore: number;           // Face detection confidence (0-1)
  boundingBox?: FaceBoundingBox;
  trackingId?: string;         // For temporal tracking
  lastSeen?: number;           // Timestamp for tracking
  isUserCorrected?: boolean;   // True if user-labeled (100% confidence)
  emotion?: EmotionType;       // Dominant detected emotion
  emotionConfidence?: number;  // Confidence of dominant emotion (0-1)
  emotions?: Partial<Record<EmotionType, number>>; // All emotion probabilities
  // Attention tracking (Phase 7)
  headPose?: HeadPose;         // Estimated head orientation (yaw/pitch/roll)
  attentionState?: AttentionState; // attending | distracted | away
  dwellTimeMs?: number;        // How long this viewer has been attending (ms)
  totalVisibleTimeMs?: number; // How long this viewer has been visible (ms)
  attentionPercent?: number;   // Percentage of time spent attending
  isLookingAtScreen?: boolean; // Simple boolean for quick checks
}

export interface AdScore {
  ad: AdMetadata;
  score: number;
  reasons: string[];
}

export interface SystemState {
  isPlaying: boolean;
  currentAd: AdMetadata | null;
  currentTime: number;
  isCapturing: boolean;
  webcamActive: boolean;
  queue: AdMetadata[];
  demographics: DemographicCounts;
  recentDetections: DetectionResult[];
  logs: LogEntry[];
}

export interface LogEntry {
  timestamp: Date;
  type: 'info' | 'detection' | 'queue' | 'webcam' | 'ad';
  message: string;
}
