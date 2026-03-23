import { spring } from "remotion";

/** Spring entrance: returns 0→1 scale/opacity value starting at `from` frame */
export function springEntrance(frame: number, fps: number, from: number = 0): number {
  return spring({
    frame: frame - from,
    fps,
    config: { damping: 12, stiffness: 200, mass: 0.5 },
    durationInFrames: 30,
  });
}

/** Slide in from bottom: returns translateY offset (px) starting at `from` frame */
export function slideUp(frame: number, fps: number, from: number = 0, distance: number = 60): number {
  const s = springEntrance(frame, fps, from);
  return distance * (1 - s);
}

/** Fade in: returns opacity 0→1 starting at `from` frame over `durationInFrames` */
export function fadeIn(frame: number, from: number = 0, durationInFrames: number = 20): number {
  if (frame < from) return 0;
  return Math.min(1, (frame - from) / durationInFrames);
}

/** Fade out: returns opacity 1→0 starting at `from` frame over `durationInFrames` */
export function fadeOut(frame: number, from: number, durationInFrames: number = 20): number {
  if (frame < from) return 1;
  return Math.max(0, 1 - (frame - from) / durationInFrames);
}

/** Pulse: returns scale that oscillates around 1 */
export function pulse(frame: number, amplitude: number = 0.04, period: number = 60): number {
  return 1 + amplitude * Math.sin((frame / period) * 2 * Math.PI);
}
