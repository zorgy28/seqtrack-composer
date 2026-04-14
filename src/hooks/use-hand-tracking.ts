"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useMidiConnection } from "@/hooks/use-midi-connection";
import { OneEuroFilter } from "@/lib/handtracking/one-euro-filter";
import type {
  CCOutput,
  FaceAxes,
  FaceLandmarks,
  GestureMapping,
  HandDetectionResult,
  HandSign,
  HandState,
  HandTrackingConfig,
  ModelLoadStatus,
  MappingPreset,
  TrackingFrame,
} from "@/lib/handtracking/types";
import { DEFAULT_CONFIG, HIGH_PERF_CONFIG } from "@/lib/handtracking/types";
import { ALL_PRESETS } from "@/lib/handtracking/presets";

// ── localStorage Keys ────────────────────────────────────────────

const LS_KEY_MAPPINGS = "seqtrack-hand-tracking-mappings";
const LS_KEY_CONFIG = "seqtrack-hand-tracking-config";

// ── Cached Module Types ──────────────────────────────────────────

interface MediaPipeLoaderModule {
  initHandLandmarker: typeof import("@/lib/handtracking/mediapipe-loader").initHandLandmarker;
  detectHands: typeof import("@/lib/handtracking/mediapipe-loader").detectHands;
  detectGPUCapabilities: typeof import("@/lib/handtracking/mediapipe-loader").detectGPUCapabilities;
  disposeHandLandmarker: typeof import("@/lib/handtracking/mediapipe-loader").disposeHandLandmarker;
  initFaceLandmarker: typeof import("@/lib/handtracking/mediapipe-loader").initFaceLandmarker;
  detectFace: typeof import("@/lib/handtracking/mediapipe-loader").detectFace;
  disposeFaceLandmarker: typeof import("@/lib/handtracking/mediapipe-loader").disposeFaceLandmarker;
}

interface GestureExtractorModule {
  extractGestureAxes: typeof import("@/lib/handtracking/gesture-extractor").extractGestureAxes;
}

interface MappingEngineModule {
  processFrame: typeof import("@/lib/handtracking/mapping-engine").processFrame;
}

interface MidiSenderModule {
  sendCC: typeof import("@/lib/webmidi/midi-sender").sendCC;
}

interface LandmarkRendererModule {
  drawLandmarks: typeof import("@/lib/handtracking/landmark-renderer").drawLandmarks;
  drawGestureIndicators: typeof import("@/lib/handtracking/landmark-renderer").drawGestureIndicators;
}

interface FaceExtractorModule {
  extractFaceAxes: typeof import("@/lib/handtracking/face-extractor").extractFaceAxes;
}

interface SignDetectorModule {
  detectHandSign: typeof import("@/lib/handtracking/sign-detector").detectHandSign;
}

interface FaceRendererModule {
  drawFaceMesh: typeof import("@/lib/handtracking/face-renderer").drawFaceMesh;
}

// ── Helpers ──────────────────────────────────────────────────────

function loadMappingsFromStorage(): GestureMapping[] | null {
  try {
    const raw = localStorage.getItem(LS_KEY_MAPPINGS);
    if (raw) return JSON.parse(raw) as GestureMapping[];
  } catch {
    // Ignore corrupt data
  }
  return null;
}

function loadConfigFromStorage(): HandTrackingConfig | null {
  try {
    const raw = localStorage.getItem(LS_KEY_CONFIG);
    if (raw) return JSON.parse(raw) as HandTrackingConfig;
  } catch {
    // Ignore corrupt data
  }
  return null;
}

function saveMappingsToStorage(mappings: GestureMapping[]): void {
  try {
    localStorage.setItem(LS_KEY_MAPPINGS, JSON.stringify(mappings));
  } catch {
    // Storage full or unavailable
  }
}

function saveConfigToStorage(config: HandTrackingConfig): void {
  try {
    localStorage.setItem(LS_KEY_CONFIG, JSON.stringify(config));
  } catch {
    // Storage full or unavailable
  }
}

// ── Return Type ──────────────────────────────────────────────────

export interface UseHandTrackingReturn {
  isTracking: boolean;
  isPaused: boolean;
  modelStatus: ModelLoadStatus;
  frame: TrackingFrame | null;
  ccOutputs: CCOutput[];
  mappings: GestureMapping[];
  config: HandTrackingConfig;
  error: string | null;
  fps: number;

  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;

  start: () => Promise<void>;
  stop: () => void;
  togglePause: () => void;
  loadPreset: (preset: MappingPreset) => void;
  updateMapping: (id: string, updates: Partial<GestureMapping>) => void;
  addMapping: (mapping: GestureMapping) => void;
  removeMapping: (id: string) => void;
  reorderMappings: (reordered: GestureMapping[]) => void;
  updateConfig: (updates: Partial<HandTrackingConfig>) => void;
}

// ── Hook ─────────────────────────────────────────────────────────

export function useHandTracking(): UseHandTrackingReturn {
  // ── React State ──────────────────────────────────────────────

  const [isTracking, setIsTracking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [modelStatus, setModelStatus] = useState<ModelLoadStatus>("idle");
  const [frame, setFrame] = useState<TrackingFrame | null>(null);
  const [ccOutputs, setCcOutputs] = useState<CCOutput[]>([]);
  const [mappings, setMappings] = useState<GestureMapping[]>(
    () => loadMappingsFromStorage() ?? [...ALL_PRESETS[0].mappings],
  );
  const [config, setConfig] = useState<HandTrackingConfig>(
    () => loadConfigFromStorage() ?? DEFAULT_CONFIG,
  );
  const [error, setError] = useState<string | null>(null);
  const [fps, setFps] = useState(0);
  const fpsRef = useRef(0);

  // ── Refs ─────────────────────────────────────────────────────

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const landmarkerRef = useRef<any>(null); // HandLandmarker instance
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const faceLandmarkerRef = useRef<any>(null); // FaceLandmarker instance
  const filtersRef = useRef<Map<string, OneEuroFilter>>(new Map());
  const lastSentRef = useRef<Map<string, number>>(new Map());
  const rafRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameCountRef = useRef(0);
  const fpsTimerRef = useRef(performance.now());
  const lastStateUpdateRef = useRef(0);
  const consecutiveFailuresRef = useRef(0);
  const MAX_CONSECUTIVE_FAILURES = 30; // ~0.5s at 60fps

  // Signature refs: gate React state setters for CC outputs and FPS so the
  // 30fps loop only re-renders those consumers when values materially change.
  // Note: `setFrame` is NOT gated because consumers read live axis values.
  const lastCcSignatureRef = useRef<string>("");
  const lastFpsStateRef = useRef<number>(-1);

  // Cached dynamic module refs — populated once in start(), used every frame
  const mediapipeModRef = useRef<MediaPipeLoaderModule | null>(null);
  const gestureModRef = useRef<GestureExtractorModule | null>(null);
  const mappingModRef = useRef<MappingEngineModule | null>(null);
  const midiSenderModRef = useRef<MidiSenderModule | null>(null);
  const rendererModRef = useRef<LandmarkRendererModule | null>(null);
  const faceExtractorModRef = useRef<FaceExtractorModule | null>(null);
  const signDetectorModRef = useRef<SignDetectorModule | null>(null);
  const faceRendererModRef = useRef<FaceRendererModule | null>(null);

  // We keep refs for values the rAF loop needs to read without re-creating
  const mappingsRef = useRef(mappings);
  const configRef = useRef(config);
  const isPausedRef = useRef(isPaused);

  // Sync refs directly in render body — safe because refs are not reactive
  mappingsRef.current = mappings;
  configRef.current = config;
  isPausedRef.current = isPaused;

  // ── MIDI connection (for sendCC) ─────────────────────────────

  const { device } = useMidiConnection();
  const deviceIdRef = useRef<string | null>(null);
  deviceIdRef.current = device?.id ?? null;

  // ── localStorage persistence ─────────────────────────────────

  useEffect(() => { saveMappingsToStorage(mappings); }, [mappings]);
  useEffect(() => { saveConfigToStorage(config); }, [config]);

  // ── Detection Loop ───────────────────────────────────────────

  const startDetectionLoop = useCallback(() => {
    function loop() {
      const now = performance.now();

      const mediapipeMod = mediapipeModRef.current;
      const gestureMod = gestureModRef.current;
      const mappingMod = mappingModRef.current;
      const midiSenderMod = midiSenderModRef.current;
      const rendererMod = rendererModRef.current;
      const faceExtractorMod = faceExtractorModRef.current;
      const signDetectorMod = signDetectorModRef.current;
      const faceRendererMod = faceRendererModRef.current;
      const landmarker = landmarkerRef.current;
      const faceLandmarker = faceLandmarkerRef.current;
      const video = videoRef.current;

      if (!mediapipeMod || !gestureMod || !mappingMod || !landmarker || !video
          || video.readyState < 2) {
        rafRef.current = requestAnimationFrame(loop);
        return;
      }

      // ── Detect hands ──────────────────────────────────────────
      let result: HandDetectionResult;
      try {
        result = mediapipeMod.detectHands(landmarker, video, now);
        consecutiveFailuresRef.current = 0;
      } catch (err) {
        consecutiveFailuresRef.current += 1;
        if (consecutiveFailuresRef.current === 1) {
          console.error("[HandTracking] Detection failed:", err);
        }
        if (consecutiveFailuresRef.current >= MAX_CONSECUTIVE_FAILURES) {
          setError("Hand detection stopped responding. Try stopping and restarting.");
          setModelStatus("error");
          return; // stop the loop
        }
        rafRef.current = requestAnimationFrame(loop);
        return;
      }

      // ── Detect face ───────────────────────────────────────────
      let faceAxes: FaceAxes | null = null;
      let faceLandmarks: FaceLandmarks | null = null;
      if (faceLandmarker && faceExtractorMod) {
        try {
          const faceResult = mediapipeMod.detectFace(faceLandmarker, video, now);
          if (faceResult.landmarks.length > 0) {
            faceAxes = faceExtractorMod.extractFaceAxes(faceResult.blendshapes);
            faceLandmarks = faceResult.landmarks[0];
          }
        } catch {
          // Non-fatal: face detection failure doesn't stop tracking
        }
      }

      // ── Build HandState[] ─────────────────────────────────────
      const hands: HandState[] = result.landmarks.map((landmarks, i) => {
        const sign: HandSign = signDetectorMod
          ? signDetectorMod.detectHandSign(landmarks)
          : "none";
        return {
          handedness: result.handedness[i] ?? "Right",
          axes: gestureMod.extractGestureAxes(landmarks),
          landmarks,
          sign,
          isTracked: true,
        };
      });

      // ── Build TrackingFrame ───────────────────────────────────
      const currentMappings = mappingsRef.current;
      const currentConfig = configRef.current;

      // FPS calculation
      frameCountRef.current += 1;
      const elapsed = now - fpsTimerRef.current;
      let currentFps = fpsRef.current;
      if (elapsed >= 1000) {
        currentFps = Math.round(
          (frameCountRef.current / elapsed) * 1000,
        );
        frameCountRef.current = 0;
        fpsTimerRef.current = now;
        fpsRef.current = currentFps;
      }

      const trackingFrame: TrackingFrame = {
        timestamp: now,
        hands,
        face: faceAxes,
        faceLandmarks,
        fps: currentFps,
      };

      // ── Process mappings → CC outputs ─────────────────────────
      const outputs = mappingMod.processFrame(
        trackingFrame,
        currentMappings,
        filtersRef.current,
        lastSentRef.current,
        currentConfig.deadZone,
      );

      // ── Send MIDI CC (if not paused) ──────────────────────────
      if (!isPausedRef.current && midiSenderMod && deviceIdRef.current) {
        try {
          for (const output of outputs) {
            if (output.changed) {
              midiSenderMod.sendCC(
                deviceIdRef.current,
                output.mapping.channel,
                output.mapping.cc,
                output.ccValue,
              );
            }
          }
        } catch {
          // MIDI device disconnected mid-tracking — tracking continues for visual feedback
        }
      }

      // ── Draw landmarks on canvas ──────────────────────────────
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          // Use CSS display size (not buffer size which may be DPR-scaled)
          const cw = canvas.clientWidth || canvas.width;
          const ch = canvas.clientHeight || canvas.height;
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          // Draw face mesh
          if (faceRendererMod && faceLandmarks) {
            faceRendererMod.drawFaceMesh(ctx, faceLandmarks, cw, ch);
          }

          // Draw hand landmarks
          if (rendererMod) {
            for (const hand of hands) {
              // mirror=false: CSS scaleX(-1) handles mirroring on both video and canvas
              rendererMod.drawLandmarks(
                ctx,
                hand.landmarks,
                hand.handedness,
                cw,
                ch,
                false,
              );
              rendererMod.drawGestureIndicators(
                ctx,
                hand.axes,
                hand.landmarks,
                cw,
                ch,
                false,
              );
            }
          }
        }
      }

      // ── Throttled React state updates (~30fps) with selective gating ──
      // CC outputs and FPS only update on material change. Frame must update
      // on every tick because consumers (OutputMonitor, MappingPanel) read
      // live axis values from trackingFrame.hands[i].axes.
      if (now - lastStateUpdateRef.current >= 33) {
        lastStateUpdateRef.current = now;

        // Frame: always update at 30fps so axis readouts stay live
        setFrame(trackingFrame);

        // CC outputs: signature-gated to skip re-renders when values are stable
        let ccSignature = "";
        for (const o of outputs) {
          ccSignature += `${o.mapping.channel}-${o.mapping.cc}-${o.ccValue}|`;
        }
        if (ccSignature !== lastCcSignatureRef.current) {
          lastCcSignatureRef.current = ccSignature;
          setCcOutputs(outputs);
        }

        // FPS: integer-gated (filter sub-Hz jitter). Also fixes a pre-existing
        // bug where the comparison was always false because fpsRef.current had
        // already been assigned to currentFps at line 288.
        const fpsInt = Math.round(currentFps);
        if (fpsInt !== lastFpsStateRef.current) {
          lastFpsStateRef.current = fpsInt;
          setFps(fpsInt);
        }
      }

      rafRef.current = requestAnimationFrame(loop);
    }

    rafRef.current = requestAnimationFrame(loop);
  }, []);

  // ── stop() ───────────────────────────────────────────────────

  const stopDetectionLoop = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    stopDetectionLoop();

    // Stop camera stream
    const stream = streamRef.current;
    if (stream) {
      for (const track of stream.getTracks()) {
        track.stop();
      }
      streamRef.current = null;
    }

    // Dispose MediaPipe landmarkers
    const landmarker = landmarkerRef.current;
    if (landmarker && mediapipeModRef.current) {
      mediapipeModRef.current.disposeHandLandmarker(landmarker);
      landmarkerRef.current = null;
    }
    const faceLandmarker = faceLandmarkerRef.current;
    if (faceLandmarker && mediapipeModRef.current) {
      try { mediapipeModRef.current.disposeFaceLandmarker(faceLandmarker); } catch { /* best-effort */ }
      faceLandmarkerRef.current = null;
    }

    // Clear video source
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    // Reset state
    setIsTracking(false);
    setIsPaused(false);
    setModelStatus("idle");
    setFrame(null);
    setCcOutputs([]);
    setError(null);
    setFps(0);

    // Clear filters and last-sent values
    filtersRef.current.clear();
    lastSentRef.current.clear();
    frameCountRef.current = 0;
    fpsTimerRef.current = performance.now();
    lastStateUpdateRef.current = 0;
    // Reset signature gates so next start() emits fresh state
    lastCcSignatureRef.current = "";
    lastFpsStateRef.current = -1;
  }, [stopDetectionLoop]);

  // ── start() ──────────────────────────────────────────────────

  const start = useCallback(async () => {
    setError(null);
    setModelStatus("loading");

    try {
      // ── 1. Get camera stream ────────────────────────────────
      const currentConfig = configRef.current;
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: currentConfig.resolution.width,
          height: currentConfig.resolution.height,
          facingMode: "user",
        },
      });
      streamRef.current = stream;

      // Attach stream to video element
      const video = videoRef.current;
      if (!video) {
        throw new Error("Video element not attached. Assign videoRef to a <video> element.");
      }
      video.srcObject = stream;

      // Wait for video to be ready
      await new Promise<void>((resolve, reject) => {
        const onLoaded = () => {
          video.removeEventListener("loadeddata", onLoaded);
          resolve();
        };
        video.addEventListener("loadeddata", onLoaded);

        // Timeout after 10 seconds
        setTimeout(() => {
          video.removeEventListener("loadeddata", onLoaded);
          reject(new Error("Camera failed to start within 10 seconds."));
        }, 10000);

        // Ensure video plays (needed for some browsers)
        video.play().catch((e: unknown) => {
          if (e instanceof Error && e.name === "NotAllowedError") {
            video.removeEventListener("loadeddata", onLoaded);
            reject(new Error("Autoplay blocked. Click the page and try again."));
          }
          // Other errors fall through to the timeout
        });
      });

      // ── 2. Dynamic imports (cached in refs) ─────────────────
      const [
        mediapipeMod, gestureMod, mappingMod, midiSenderMod, rendererMod,
        faceExtractorMod, signDetectorMod, faceRendererMod,
      ] = await Promise.all([
        import("@/lib/handtracking/mediapipe-loader") as Promise<MediaPipeLoaderModule>,
        import("@/lib/handtracking/gesture-extractor") as Promise<GestureExtractorModule>,
        import("@/lib/handtracking/mapping-engine") as Promise<MappingEngineModule>,
        import("@/lib/webmidi/midi-sender") as Promise<MidiSenderModule>,
        import("@/lib/handtracking/landmark-renderer") as Promise<LandmarkRendererModule>,
        import("@/lib/handtracking/face-extractor") as Promise<FaceExtractorModule>,
        import("@/lib/handtracking/sign-detector") as Promise<SignDetectorModule>,
        import("@/lib/handtracking/face-renderer") as Promise<FaceRendererModule>,
      ]);

      mediapipeModRef.current = mediapipeMod;
      gestureModRef.current = gestureMod;
      mappingModRef.current = mappingMod;
      midiSenderModRef.current = midiSenderMod;
      rendererModRef.current = rendererMod;
      faceExtractorModRef.current = faceExtractorMod;
      signDetectorModRef.current = signDetectorMod;
      faceRendererModRef.current = faceRendererMod;

      // ── 3. GPU capability detection ─────────────────────────
      const gpuCaps = await mediapipeMod.detectGPUCapabilities();
      let resolvedConfig = currentConfig;
      if (gpuCaps.performanceMode === "high") {
        resolvedConfig = { ...currentConfig, ...HIGH_PERF_CONFIG };
        setConfig(resolvedConfig);
        configRef.current = resolvedConfig;
      }

      // ── 4. Initialize MediaPipe landmarkers (hand + face in parallel) ──
      const [landmarker, faceLandmarker] = await Promise.all([
        mediapipeMod.initHandLandmarker(resolvedConfig),
        mediapipeMod.initFaceLandmarker(resolvedConfig).catch((err) => {
          console.warn("[HandTracking] Face landmarker failed to init, skipping:", err);
          return null;
        }),
      ]);
      landmarkerRef.current = landmarker;
      faceLandmarkerRef.current = faceLandmarker;

      // ── 5. Ready — start detection loop ─────────────────────
      setModelStatus("ready");
      setIsTracking(true);
      // Reset FPS counters right before starting the loop
      fpsTimerRef.current = performance.now();
      frameCountRef.current = 0;
      fpsRef.current = 0;
      startDetectionLoop();
    } catch (err) {
      let message = "Failed to start hand tracking";
      if (err instanceof DOMException) {
        switch (err.name) {
          case "NotAllowedError":
            message = "Camera permission denied. Click the camera icon in your browser's address bar to allow access.";
            break;
          case "NotFoundError":
            message = "No camera found. Connect a webcam and try again.";
            break;
          case "NotReadableError":
            message = "Camera is in use by another application. Close other apps using the camera and try again.";
            break;
          case "OverconstrainedError":
            message = "Camera does not support the requested resolution.";
            break;
          default:
            message = err.message || message;
        }
      } else if (err instanceof Error) {
        message = err.message;
      }
      setError(message);
      setModelStatus("error");
      setIsTracking(false);

      // Clean up partial initialization
      const stream = streamRef.current;
      if (stream) {
        for (const track of stream.getTracks()) {
          track.stop();
        }
        streamRef.current = null;
      }
    }
  }, [startDetectionLoop]);

  // ── togglePause() ────────────────────────────────────────────

  const togglePause = useCallback(() => {
    setIsPaused((prev) => !prev);
  }, []);

  // ── loadPreset() ─────────────────────────────────────────────

  const loadPreset = useCallback((preset: MappingPreset) => {
    setMappings([...preset.mappings]);
    filtersRef.current.clear();
    lastSentRef.current.clear();
  }, []);

  // ── updateMapping() ──────────────────────────────────────────

  const updateMapping = useCallback(
    (id: string, updates: Partial<GestureMapping>) => {
      setMappings((prev) =>
        prev.map((m) => {
          if (m.id !== id) return m;
          const updated = { ...m, ...updates };
          // Reset filter for this mapping
          filtersRef.current.delete(id);
          return updated;
        }),
      );
    },
    [],
  );

  // ── addMapping() ─────────────────────────────────────────────

  const addMapping = useCallback((mapping: GestureMapping) => {
    setMappings((prev) => [...prev, mapping]);
  }, []);

  // ── removeMapping() ──────────────────────────────────────────

  const removeMapping = useCallback((id: string) => {
    setMappings((prev) => prev.filter((m) => m.id !== id));
    filtersRef.current.delete(id);
    lastSentRef.current.delete(id);
  }, []);

  // ── reorderMappings() ──────────────────────────────────────

  const reorderMappings = useCallback((reordered: GestureMapping[]) => {
    setMappings(reordered);
  }, []);

  // ── updateConfig() ───────────────────────────────────────────

  const updateConfig = useCallback(
    (updates: Partial<HandTrackingConfig>) => {
      setConfig((prev) => ({ ...prev, ...updates }));
    },
    [],
  );

  // ── Cleanup on unmount ───────────────────────────────────────

  useEffect(() => {
    return () => {
      // Cancel rAF
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }

      // Stop camera stream
      const stream = streamRef.current;
      if (stream) {
        for (const track of stream.getTracks()) {
          track.stop();
        }
        streamRef.current = null;
      }

      // Dispose MediaPipe landmarkers (use cached module ref, no new dynamic import)
      const landmarker = landmarkerRef.current;
      const mediapipeMod = mediapipeModRef.current;
      if (landmarker) {
        if (mediapipeMod) {
          try { mediapipeMod.disposeHandLandmarker(landmarker); } catch { /* best-effort cleanup */ }
        }
        landmarkerRef.current = null;
      }
      const faceLandmarker = faceLandmarkerRef.current;
      if (faceLandmarker) {
        if (mediapipeMod) {
          try { mediapipeMod.disposeFaceLandmarker(faceLandmarker); } catch { /* best-effort cleanup */ }
        }
        faceLandmarkerRef.current = null;
      }
    };
  }, []);

  // ── Return ───────────────────────────────────────────────────

  return {
    isTracking,
    isPaused,
    modelStatus,
    frame,
    ccOutputs,
    mappings,
    config,
    error,
    fps,

    videoRef,
    canvasRef,

    start,
    stop,
    togglePause,
    loadPreset,
    updateMapping,
    addMapping,
    removeMapping,
    reorderMappings,
    updateConfig,
  };
}
