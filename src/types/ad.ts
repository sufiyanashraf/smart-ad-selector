export interface AdMetadata {
  id: string;
  filename: string;
  title: string;
  gender: 'male' | 'female' | 'all';
  ageGroup: 'young' | 'adult' | 'all';
  duration: number;
  captureStart: number;
  captureEnd: number;
  thumbnail?: string;
  videoUrl: string;
}

export interface DemographicCounts {
  male: number;
  female: number;
  young: number;
  adult: number;
}

export interface DetectionResult {
  gender: 'male' | 'female';
  age: number;
  ageGroup: 'young' | 'adult';
  confidence: number;
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
