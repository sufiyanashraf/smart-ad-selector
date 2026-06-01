export interface AdMetadata {
  id: string;
  filename: string;
  title: string;
  gender: 'male' | 'female' | 'all';
  ageGroup: 'child' | 'teen' | 'youngAdult' | 'middleAged' | 'senior' | 'all';
  duration: number;
  captureStart: number;
  captureEnd: number;
  thumbnail?: string;
  videoUrl: string;
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
