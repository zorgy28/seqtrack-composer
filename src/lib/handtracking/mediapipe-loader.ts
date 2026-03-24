/**
 * Browser-only module for MediaPipe Hand Landmarker initialization and
 * detection. This file is always dynamically imported at runtime — never
 * imported by server components.
 */

import {
  FilesetResolver,
  HandLandmarker,
} from "@mediapipe/tasks-vision";

import type { HandDetectionResult, HandTrackingConfig, Handedness } from "./types";

// ─── Constants ──────────────────────────────────────────────────

const WASM_CDN = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm";

const MODEL_CDN =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";

// ─── GPU Capabilities ───────────────────────────────────────────

/**
 * Probes the browser for WebGPU support and, if available, checks whether the
 * adapter belongs to Apple Silicon hardware.
 *
 * @returns Delegate is always "GPU"; `performanceMode` is "high" on Apple
 *          Silicon, "standard" otherwise.
 */
export async function detectGPUCapabilities(): Promise<{
  delegate: "GPU";
  performanceMode: "standard" | "high";
}> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const gpu = (navigator as any).gpu;

  if (!gpu) {
    return { delegate: "GPU", performanceMode: "standard" };
  }

  try {
    const adapter = await gpu.requestAdapter();
    if (!adapter) {
      return { delegate: "GPU", performanceMode: "standard" };
    }

    // adapter.info is the standard property; some browsers may still use
    // the older requestAdapterInfo() method.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const info = (adapter as any).info ?? (await (adapter as any).requestAdapterInfo?.());
    const vendor = (info?.vendor ?? "").toLowerCase();

    if (vendor.includes("apple")) {
      return { delegate: "GPU", performanceMode: "high" };
    }
  } catch (err) {
    console.warn("[HandTracking] WebGPU probe failed, using standard mode:", err);
  }

  return { delegate: "GPU", performanceMode: "standard" };
}

// ─── Hand Landmarker Init ───────────────────────────────────────

/**
 * Creates and returns a fully initialised `HandLandmarker` using the MediaPipe
 * WASM runtime loaded from CDN.
 *
 * @param config - Hand tracking configuration (max hands, confidence
 *                 thresholds, etc.)
 * @returns A ready-to-use `HandLandmarker` instance.
 */
export async function initHandLandmarker(
  config: HandTrackingConfig,
): Promise<HandLandmarker> {
  let vision;
  try {
    vision = await FilesetResolver.forVisionTasks(WASM_CDN);
  } catch (err) {
    throw new Error(
      "Failed to download hand tracking runtime. Check your internet connection. " +
      `(${err instanceof Error ? err.message : "Unknown error"})`,
    );
  }

  try {
    return await HandLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: MODEL_CDN,
        delegate: "GPU",
      },
      runningMode: "VIDEO",
      numHands: config.maxHands,
      minHandDetectionConfidence: config.minDetectionConfidence,
      minHandPresenceConfidence: config.minDetectionConfidence,
      minTrackingConfidence: config.minTrackingConfidence,
    });
  } catch (err) {
    throw new Error(
      "Failed to initialize hand tracking model. Your browser may not support GPU acceleration. " +
      `(${err instanceof Error ? err.message : "Unknown error"})`,
    );
  }
}

// ─── Detection ──────────────────────────────────────────────────

/**
 * Runs hand landmark detection on a single video frame and converts the
 * MediaPipe result into the app's `HandDetectionResult` type.
 *
 * @param landmarker   - An initialised `HandLandmarker` (running mode "VIDEO")
 * @param video        - The `<video>` element providing camera frames
 * @param timestampMs  - Frame timestamp in milliseconds (must be monotonically
 *                       increasing between calls)
 * @returns Detected hand landmarks, world landmarks, and handedness labels.
 */
export function detectHands(
  landmarker: HandLandmarker,
  video: HTMLVideoElement,
  timestampMs: number,
): HandDetectionResult {
  const raw = landmarker.detectForVideo(video, timestampMs);

  // Map MediaPipe Category[][] handedness to our flat Handedness[]
  const handedness: Handedness[] = (raw.handedness ?? []).map(
    (categories) => {
      // Each hand's handedness is an array of Category sorted by score.
      // The top category's categoryName is "Left" or "Right".
      const top = categories[0];
      const label = top?.categoryName ?? "Right";
      return label === "Left" ? "Left" : "Right";
    },
  );

  // Convert MediaPipe NormalizedLandmark[][] to our HandLandmarks[][]
  // The shapes are compatible — both have { x, y, z }.
  const landmarks = (raw.landmarks ?? []).map((hand) =>
    hand.map((lm) => ({ x: lm.x, y: lm.y, z: lm.z })),
  );

  const worldLandmarks = (raw.worldLandmarks ?? []).map((hand) =>
    hand.map((lm) => ({ x: lm.x, y: lm.y, z: lm.z })),
  );

  return {
    landmarks,
    worldLandmarks,
    handedness,
  };
}

// ─── Disposal ───────────────────────────────────────────────────

/**
 * Closes and releases all resources held by the `HandLandmarker` instance.
 */
export function disposeHandLandmarker(landmarker: HandLandmarker): void {
  landmarker.close();
}
