/**
 * Head Pose Estimation from 68-point Face Landmarks
 * 
 * Uses geometric analysis of facial landmarks to estimate head orientation
 * (yaw, pitch, roll) without requiring a full PnP solver. This approach
 * is fast and runs entirely in the browser.
 * 
 * Attention Logic:
 * - A viewer is "attending" if their head yaw and pitch are within thresholds
 * - Dwell time tracks how long a viewer has been attending continuously
 * - "Ignored" means the viewer looked away (exceeded yaw/pitch thresholds)
 */

export interface HeadPose {
  yaw: number;    // Left/right rotation in degrees (-90 to +90, 0 = facing camera)
  pitch: number;  // Up/down rotation in degrees (-90 to +90, 0 = level)
  roll: number;   // Tilt rotation in degrees (-180 to +180, 0 = upright)
}

export type AttentionState = 'attending' | 'distracted' | 'away';

export interface AttentionMetrics {
  headPose: HeadPose;
  attentionState: AttentionState;
  dwellTimeMs: number;          // Total time spent attending (ms)
  totalVisibleTimeMs: number;   // Total time face has been visible (ms)
  attentionPercent: number;     // dwellTimeMs / totalVisibleTimeMs * 100
  lastAttendingAt: number;      // Timestamp of last attending state
  isLookingAtScreen: boolean;   // Simplified boolean for quick checks
}

// Thresholds for attention classification
const ATTENTION_YAW_THRESHOLD = 25;      // degrees - face turned left/right
const ATTENTION_PITCH_THRESHOLD = 20;     // degrees - face looking up/down
const DISTRACTED_YAW_THRESHOLD = 45;      // degrees - clearly looking away
const DISTRACTED_PITCH_THRESHOLD = 35;    // degrees - clearly looking away

/**
 * Estimate head pose from 68-point face landmarks using geometric ratios.
 * 
 * Key landmarks used:
 * - Nose tip (30), nose bridge (27)
 * - Left eye corners (36, 39), right eye corners (42, 45)
 * - Mouth corners (48, 54)
 * - Jaw outline (0, 8, 16)
 * - Chin (8), forehead approximation from nose bridge
 */
export function estimateHeadPose(landmarks: { x: number; y: number }[]): HeadPose {
  if (!landmarks || landmarks.length < 68) {
    return { yaw: 0, pitch: 0, roll: 0 };
  }

  // Key landmark indices (68-point model)
  const noseTip = landmarks[30];
  const noseBridge = landmarks[27];
  const leftEyeInner = landmarks[39];
  const rightEyeInner = landmarks[42];
  const leftEyeOuter = landmarks[36];
  const rightEyeOuter = landmarks[45];
  const mouthLeft = landmarks[48];
  const mouthRight = landmarks[54];
  const jawLeft = landmarks[0];
  const jawRight = landmarks[16];
  const chin = landmarks[8];

  // ====== YAW (horizontal rotation) ======
  // Compare distances from nose tip to left vs right face edges
  const noseToLeftJaw = Math.sqrt(
    Math.pow(noseTip.x - jawLeft.x, 2) + Math.pow(noseTip.y - jawLeft.y, 2)
  );
  const noseToRightJaw = Math.sqrt(
    Math.pow(noseTip.x - jawRight.x, 2) + Math.pow(noseTip.y - jawRight.y, 2)
  );
  
  // Ratio indicates yaw direction: > 1 = looking right, < 1 = looking left
  const jawRatio = noseToLeftJaw / (noseToRightJaw + 0.001);
  // Convert ratio to degrees (empirically calibrated)
  const yaw = Math.atan2(jawRatio - 1, 0.6) * (180 / Math.PI);

  // ====== PITCH (vertical rotation) ======
  // Compare vertical position of nose tip relative to eye line and mouth
  const eyeCenterY = (leftEyeInner.y + rightEyeInner.y) / 2;
  const mouthCenterY = (mouthLeft.y + mouthRight.y) / 2;
  const faceHeight = mouthCenterY - eyeCenterY;
  
  // Nose position relative to face
  const noseRelative = (noseTip.y - eyeCenterY) / (faceHeight + 0.001);
  // Normal ratio is ~0.6-0.7. Higher = looking down, lower = looking up
  const pitch = (noseRelative - 0.65) * 80; // Scale to approximate degrees

  // ====== ROLL (tilt) ======
  // Angle of the line connecting the two eye centers
  const leftEyeCenter = {
    x: (leftEyeInner.x + leftEyeOuter.x) / 2,
    y: (leftEyeInner.y + leftEyeOuter.y) / 2,
  };
  const rightEyeCenter = {
    x: (rightEyeInner.x + rightEyeOuter.x) / 2,
    y: (rightEyeInner.y + rightEyeOuter.y) / 2,
  };
  const roll = Math.atan2(
    rightEyeCenter.y - leftEyeCenter.y,
    rightEyeCenter.x - leftEyeCenter.x
  ) * (180 / Math.PI);

  return {
    yaw: clamp(yaw, -90, 90),
    pitch: clamp(pitch, -90, 90),
    roll: clamp(roll, -180, 180),
  };
}

/**
 * Classify attention state based on head pose
 */
export function classifyAttention(headPose: HeadPose): AttentionState {
  const absYaw = Math.abs(headPose.yaw);
  const absPitch = Math.abs(headPose.pitch);

  if (absYaw > DISTRACTED_YAW_THRESHOLD || absPitch > DISTRACTED_PITCH_THRESHOLD) {
    return 'away';
  }
  if (absYaw > ATTENTION_YAW_THRESHOLD || absPitch > ATTENTION_PITCH_THRESHOLD) {
    return 'distracted';
  }
  return 'attending';
}

/**
 * Get attention indicator emoji
 */
export function getAttentionEmoji(state: AttentionState): string {
  switch (state) {
    case 'attending': return '👀';
    case 'distracted': return '👁️';
    case 'away': return '🚫';
  }
}

/**
 * Format dwell time for display
 */
export function formatDwellTime(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
