import React from "react";

export interface Waypoint {
  frame: number;
  x: number;
  y: number;
}

/**
 * moveCursor: linearly interpolates between waypoints.
 * Returns {x, y} position at the given currentFrame.
 */
export function moveCursor(waypoints: Waypoint[], currentFrame: number): { x: number; y: number } {
  if (waypoints.length === 0) return { x: 0, y: 0 };
  if (currentFrame <= waypoints[0].frame) return { x: waypoints[0].x, y: waypoints[0].y };
  if (currentFrame >= waypoints[waypoints.length - 1].frame) {
    const last = waypoints[waypoints.length - 1];
    return { x: last.x, y: last.y };
  }
  for (let i = 0; i < waypoints.length - 1; i++) {
    const a = waypoints[i];
    const b = waypoints[i + 1];
    if (currentFrame >= a.frame && currentFrame <= b.frame) {
      const t = (currentFrame - a.frame) / (b.frame - a.frame);
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
    }
  }
  return { x: 0, y: 0 };
}

/**
 * CursorSVG: renders an animated SVG cursor arrow at the given position.
 * Position is in 1920x1080 canvas coordinates.
 */
export const CursorSVG: React.FC<{ x: number; y: number; opacity?: number }> = ({ x, y, opacity = 1 }) => (
  <svg
    width={16}
    height={24}
    viewBox="0 0 16 24"
    style={{ position: "absolute", left: x, top: y, opacity, pointerEvents: "none", zIndex: 999 }}
  >
    <path d="M0 0 L0 20 L5 15 L9 23 L11 22 L7 14 L14 14 Z" fill="white" stroke="#1E293B" strokeWidth="1.5" />
  </svg>
);
