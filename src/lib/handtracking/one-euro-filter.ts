/**
 * One Euro Filter — adaptive low-pass filter for noisy signals.
 *
 * Smooths heavily when the signal is still (low jitter),
 * reduces lag when the signal moves fast (responsive tracking).
 *
 * Reference: Casiez, Roussel, Vogel — "1 Euro Filter"
 * http://cristal.univ-lille.fr/~casiez/1euro/
 *
 * Pure class — no React, no DOM, no browser APIs.
 */

import type { OneEuroFilterConfig } from "./types";

// ─── Low-Pass Filter ─────────────────────────────────────────

/**
 * Simple exponential low-pass filter.
 * Each call blends the new value with the previous output
 * using the given smoothing factor alpha.
 */
class LowPassFilter {
  private y: number | undefined;
  private s: number | undefined;

  /**
   * Apply one filter step.
   * @param value  Raw input value
   * @param alpha  Smoothing factor (0-1). Higher = less smoothing.
   * @returns Filtered value
   */
  filter(value: number, alpha: number): number {
    if (this.s === undefined) {
      this.s = value;
    } else {
      this.s = alpha * value + (1 - alpha) * this.s;
    }
    this.y = value;
    return this.s;
  }

  /** Return the last raw input value, or 0 if never called. */
  lastValue(): number {
    return this.y ?? 0;
  }
}

// ─── Helpers ─────────────────────────────────────────────────

/** Convert a cutoff frequency (Hz) to the smoothing factor alpha. */
function smoothingFactor(tE: number, cutoff: number): number {
  const r = 2 * Math.PI * cutoff * tE;
  return r / (r + 1);
}

// ─── Default Config ──────────────────────────────────────────

const DEFAULT_CONFIG: OneEuroFilterConfig = {
  minCutoff: 1.0,
  beta: 0.007,
  dCutoff: 1.0,
};

// ─── One Euro Filter ─────────────────────────────────────────

export class OneEuroFilter {
  private readonly minCutoff: number;
  private readonly beta: number;
  private readonly dCutoff: number;

  private readonly xFilter: LowPassFilter;
  private readonly dxFilter: LowPassFilter;

  private lastTimestamp: number | undefined;

  constructor(config?: Partial<OneEuroFilterConfig>) {
    const { minCutoff, beta, dCutoff } = { ...DEFAULT_CONFIG, ...config };
    this.minCutoff = minCutoff;
    this.beta = beta;
    this.dCutoff = dCutoff;

    this.xFilter = new LowPassFilter();
    this.dxFilter = new LowPassFilter();
  }

  /**
   * Filter a single value at a given timestamp.
   *
   * @param value     Raw input signal
   * @param timestamp Time in seconds (monotonic)
   * @returns         Filtered value
   */
  filter(value: number, timestamp: number): number {
    // Time elapsed since last sample (seconds)
    const tE =
      this.lastTimestamp === undefined ? 1 / 120 : timestamp - this.lastTimestamp;
    this.lastTimestamp = timestamp;

    // Guard against zero or negative dt
    const dt = Math.max(tE, 1e-6);

    // ── Estimate derivative (speed) ───────────────────────────
    const dx = (value - this.xFilter.lastValue()) / dt;
    const edx = this.dxFilter.filter(dx, smoothingFactor(dt, this.dCutoff));

    // ── Adaptive cutoff based on speed ────────────────────────
    const cutoff = this.minCutoff + this.beta * Math.abs(edx);

    // ── Filter the value ──────────────────────────────────────
    const alpha = smoothingFactor(dt, cutoff);
    return this.xFilter.filter(value, alpha);
  }

  /** Reset filter state so the next call is treated as the first sample. */
  reset(): void {
    this.lastTimestamp = undefined;
    // Recreate internal filters by resetting their private state.
    // Since LowPassFilter checks `s === undefined`, we create fresh instances
    // by re-assigning (the class fields are readonly but the objects are mutable).
    (this as Record<string, unknown>)["xFilter"] = new LowPassFilter();
    (this as Record<string, unknown>)["dxFilter"] = new LowPassFilter();
  }
}
