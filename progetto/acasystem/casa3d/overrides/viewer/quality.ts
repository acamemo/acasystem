// Quality levels of the 3D view (ADR-0014, section 5; T5). Pure data and functions: no three.js, no DOM, so the
// main bundle, the 3D bundle and the tests can all import it.
//
// The host (Acasystem) always chooses the level; the viewer never picks one by itself. Every level starts from
// the previous one and removes work: Light is the base on every device (T1: the tablet level of the original demo
// was at the limit on the Tab M11, so Light has to be lighter still).

export type Quality = "light" | "medium" | "high";

export const QUALITIES: readonly Quality[] = ["light", "medium", "high"];

export interface QualityTier {
  /** Multisampling of the drawing buffer (only High). */
  antialias: boolean;
  powerPreference: "low-power" | "default";
  /** The device pixel ratio is capped to this (Light: one buffer pixel per CSS pixel). */
  pixelRatioCap: number;
  /**
   * Shortest time between two drawn frames while something moves, as seen from the times of the frame callbacks
   * (ms); 0 draws at every display frame. 21 stands for a 24 ms gap: a callback may come 3 ms early.
   * Light spaces the frames only on a fast screen (90 or 120 Hz, see `mustWait`): on a 60 Hz screen the gap would
   * skip every other display frame and leave exactly 30 fps, with no room for the 30 fps criterion of T11.
   */
  drawGapMs: number;
}

export const TIERS: Readonly<Record<Quality, QualityTier>> = {
  light: { antialias: false, powerPreference: "low-power", pixelRatioCap: 1, drawGapMs: 21 },
  medium: { antialias: false, powerPreference: "default", pixelRatioCap: 1.25, drawGapMs: 0 },
  high: { antialias: true, powerPreference: "default", pixelRatioCap: 2, drawGapMs: 0 },
};

/**
 * Accepts the three levels and the names of the original viewer («low» = tablet level, «auto»): anything else, and
 * «auto» too, is Light (the start is Light on every device).
 */
export function normalizeQuality(value: unknown): Quality {
  if (value === "medium" || value === "high") return value;
  return "light";
}

/** Pixel ratio of the drawing buffer for a level on a screen with the given device pixel ratio. */
export function pixelRatioFor(level: Quality, devicePixelRatio: number): number {
  const ratio = Number.isFinite(devicePixelRatio) && devicePixelRatio > 0 ? devicePixelRatio : 1;
  return Math.min(ratio, TIERS[level].pixelRatioCap);
}

/** The names the time travel replay still uses for the level («low» ticks slowest). */
export function toLegacyQuality(level: Quality): "auto" | "low" | "high" {
  return level === "light" ? "low" : level === "high" ? "high" : "auto";
}

/**
 * Whether a frame asked at `now` must wait because the last drawn one was too close (see `drawGapMs`).
 * `periodMs` is the measured time between display frames (`displayPeriodMeter`); 99 while unknown. A screen that is
 * slower than 75 Hz (period over 14 ms, or not measured yet) is never held back: its frames are already far enough
 * apart.
 */
export function mustWait(now: number, lastDrawn: number, gapMs: number, periodMs: number): boolean {
  // no gap (gapMs 0) never waits: the elapsed time is not negative
  return periodMs <= 14 && now >= lastDrawn && now - lastDrawn < gapMs;
}

/**
 * Measures the time between display frames from the times of the animation frame callbacks. The estimate drops to
 * any shorter gap at once and grows by at most 10% a frame, so a frame that took long (a longer gap) hardly moves
 * it. A pause (nothing asked a frame) is not a sample. Returns a function: give it the time of each frame
 * callback (ms) and it answers with the period measured so far, or 99 (slow) before the second frame.
 */
export function displayPeriodMeter(): (now: number) => number {
  let last = 0;
  let period = 99;
  return (now) => {
    const gap = now - last;
    last = now;
    if (gap > 2 && gap < 40) period = Math.min(gap, period * 1.1);
    return period;
  };
}

/** What the viewer tells the host about its drawing context. */
export interface ContextEvent {
  /**
   * lost: the browser took the context away; restored: it came back; failed: no renderer could be made;
   * error: the view could not start for another reason (its code did not load, its data was refused).
   */
  state: "lost" | "restored" | "failed" | "error";
}
