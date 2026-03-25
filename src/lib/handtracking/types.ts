import type { SeqtrackChannel } from "@/lib/midi/types";

// ─── MediaPipe Landmark Types ──────────────────────────────────

export interface NormalizedLandmark {
  x: number; // 0-1, left-to-right in image
  y: number; // 0-1, top-to-bottom in image
  z: number; // depth relative to wrist
}

export type HandLandmarks = NormalizedLandmark[]; // 21 landmarks
export type Handedness = "Left" | "Right";

export interface HandDetectionResult {
  landmarks: HandLandmarks[];
  worldLandmarks: HandLandmarks[];
  handedness: Handedness[];
}

export type FaceLandmarks = NormalizedLandmark[]; // 478 landmarks

export interface FaceDetectionResult {
  landmarks: FaceLandmarks[];
  blendshapes: Map<string, number>; // blendshape name → score 0-1
}

// ─── Gesture Extraction ────────────────────────────────────────

/** Continuous gesture axes extracted from hand landmarks */
export interface GestureAxes {
  /** Palm X position (0-1, left-right, mirrored) */
  palmX: number;
  /** Palm Y position (0-1, bottom=0, top=1) */
  palmY: number;
  /** Palm Z depth (0-1, closer=higher) */
  palmZ: number;
  /** Thumb-index pinch distance (0=touching, 1=fully open) */
  pinchThumbIndex: number;
  /** Thumb-middle pinch distance */
  pinchThumbMiddle: number;
  /** Hand openness (0=fist, 1=fully open) */
  openness: number;
  /** Hand roll angle (-1 to 1, wrist rotation) */
  roll: number;
  /** Finger spread (0=closed, 1=max spread) */
  spread: number;
}

// ─── Face Expression Axes ──────────────────────────────────────

/** Curated face expression axes from 52 ARKit blendshapes */
export interface FaceAxes {
  jawOpen: number;      // 0-1, mouth openness
  mouthSmile: number;   // 0-1, avg left+right smile
  mouthFrown: number;   // 0-1, avg left+right frown
  mouthPucker: number;  // 0-1, kiss/pucker
  mouthFunnel: number;  // 0-1, O-shape
  browInnerUp: number;  // 0-1, eyebrow raise
  browDown: number;     // 0-1, avg left+right brow down
  eyeWide: number;      // 0-1, avg left+right eye wide
  eyeBlink: number;     // 0-1, avg left+right blink
  eyeSquint: number;    // 0-1, avg left+right squint
  cheekPuff: number;    // 0-1
  noseSneer: number;    // 0-1, avg left+right
}

// ─── Hand Signs ───────────────────────────────────────────────

export type HandSign =
  | "none"
  | "middle_finger"
  | "heart"
  | "peace"
  | "rock"
  | "thumbs_up"
  | "thumbs_down"
  | "ok_sign";

export const HAND_SIGN_LABELS: Record<HandSign, { label: string; emoji: string }> = {
  none: { label: "None", emoji: "" },
  middle_finger: { label: "Middle Finger", emoji: "\uD83D\uDD95" },
  heart: { label: "Heart", emoji: "\uD83E\uDEF0" },
  peace: { label: "Peace", emoji: "✌️" },
  rock: { label: "Rock", emoji: "\uD83E\uDD18" },
  thumbs_up: { label: "Thumbs Up", emoji: "\uD83D\uDC4D" },
  thumbs_down: { label: "Thumbs Down", emoji: "\uD83D\uDC4E" },
  ok_sign: { label: "OK", emoji: "\uD83D\uDC4C" },
};

// ─── Extended State Types ─────────────────────────────────────

export interface HandState {
  handedness: Handedness;
  axes: GestureAxes;
  landmarks: HandLandmarks;
  sign: HandSign;
  isTracked: boolean;
}

export interface TrackingFrame {
  timestamp: number;
  hands: HandState[]; // 0-2 hands
  face: FaceAxes | null;
  faceLandmarks: FaceLandmarks | null;
  fps: number;
}

// ─── Gesture-to-CC Mapping ─────────────────────────────────────

export type GestureAxis = keyof GestureAxes | keyof FaceAxes;

export const HAND_AXIS_KEYS: (keyof GestureAxes)[] = [
  "palmX", "palmY", "palmZ", "pinchThumbIndex", "pinchThumbMiddle", "openness", "roll", "spread",
];

export const FACE_AXIS_KEYS: (keyof FaceAxes)[] = [
  "jawOpen", "mouthSmile", "mouthFrown", "mouthPucker", "mouthFunnel",
  "browInnerUp", "browDown", "eyeWide", "eyeBlink", "eyeSquint", "cheekPuff", "noseSneer",
];

export const GESTURE_AXIS_LABELS: Record<GestureAxis, string> = {
  // Hand axes
  palmX: "Palm X (horizontal)",
  palmY: "Palm Y (vertical)",
  palmZ: "Palm Z (depth)",
  pinchThumbIndex: "Pinch (thumb-index)",
  pinchThumbMiddle: "Pinch (thumb-middle)",
  openness: "Hand openness",
  roll: "Hand roll",
  spread: "Finger spread",
  // Face axes
  jawOpen: "Jaw open",
  mouthSmile: "Mouth smile",
  mouthFrown: "Mouth frown",
  mouthPucker: "Mouth pucker",
  mouthFunnel: "Mouth funnel (O)",
  browInnerUp: "Eyebrow raise",
  browDown: "Eyebrow down",
  eyeWide: "Eyes wide",
  eyeBlink: "Eye blink",
  eyeSquint: "Eye squint",
  cheekPuff: "Cheek puff",
  noseSneer: "Nose sneer",
};

export interface GestureMapping {
  id: string;
  name: string;
  hand: Handedness | "any";
  axis: GestureAxis;
  channel: SeqtrackChannel;
  cc: number;
  inputRange: [number, number];
  outputRange: [number, number];
  invert: boolean;
  enabled: boolean;
}

export interface MappingPreset {
  id: string;
  name: string;
  description: string;
  mappings: GestureMapping[];
}

// ─── One Euro Filter Config ───────────────────────────────────

export interface OneEuroFilterConfig {
  /** Minimum cutoff frequency (Hz). Lower = smoother when still. Default: 1.0 */
  minCutoff: number;
  /** Speed coefficient. Higher = less lag when moving fast. Default: 0.007 */
  beta: number;
  /** Derivative cutoff frequency. Default: 1.0 */
  dCutoff: number;
}

// ─── Hand Tracking Session Config ──────────────────────────────

export type PerformanceMode = "standard" | "high";
export type ModelLoadStatus = "idle" | "loading" | "ready" | "error";

export interface HandTrackingConfig {
  maxHands: 1 | 2;
  minDetectionConfidence: number;
  minTrackingConfidence: number;
  resolution: { width: number; height: number };
  filter: OneEuroFilterConfig;
  deadZone: number; // CC units, values changing less than this are suppressed
  mirrorVideo: boolean;
  performanceMode: PerformanceMode;
}

export const DEFAULT_CONFIG: HandTrackingConfig = {
  maxHands: 2,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5,
  resolution: { width: 640, height: 480 },
  filter: { minCutoff: 1.0, beta: 0.007, dCutoff: 1.0 },
  deadZone: 2,
  mirrorVideo: true,
  performanceMode: "standard",
};

export const HIGH_PERF_CONFIG: Partial<HandTrackingConfig> = {
  resolution: { width: 1280, height: 720 },
  performanceMode: "high",
};

// ─── CC Output State ───────────────────────────────────────────

export interface CCOutput {
  mapping: GestureMapping;
  rawValue: number; // Before filter
  filteredValue: number; // After 1€ filter
  ccValue: number; // Final MIDI CC value (0-127)
  changed: boolean; // Whether ccValue changed from last frame
}
