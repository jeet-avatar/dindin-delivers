import React from 'react';
import {useCurrentFrame, useVideoConfig} from 'remotion';
import {slideUp, fadeIn, fadeOut} from '../utils/spring';

export interface CalloutConfig {
  text: string;
  startFrame: number;   // relative to containing sequence frame 0
  duration: number;     // hold frames (spring in/out adds ~10f each)
  side: 'left' | 'right' | 'center';
  color: string;        // left border color
}

// Canvas-absolute positions per side (1920×1080 canvas)
// Left phone center: (480, 540), frame 380×820, bottom at y=950
// Right phone center: (1440, 540), frame 380×820, bottom at y=950
const CALLOUT_X: Record<CalloutConfig['side'], number> = {
  left: 295,    // left edge of left phone (480 - 190 = 290, +5 padding)
  right: 1255,  // left edge of right phone (1440 - 190 = 1250, +5 padding)
  center: 760,  // center channel midpoint (960 - ~200px half-width estimate)
};
const CALLOUT_Y = 870; // near bottom of phone frame

const SPRING_IN = 10;  // frames for entrance animation
const SPRING_OUT = 10; // frames for exit animation

interface CalloutProps extends CalloutConfig {}

export const Callout: React.FC<CalloutProps> = ({
  text,
  startFrame,
  duration,
  side,
  color,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const inStart = startFrame - SPRING_IN;
  const outStart = startFrame + duration;
  const outEnd = outStart + SPRING_OUT;

  // Not visible yet or already gone
  if (frame < inStart || frame > outEnd) return null;

  const opacity =
    frame < startFrame
      ? fadeIn(frame, inStart, SPRING_IN)
      : frame > outStart
      ? fadeOut(frame, outStart, SPRING_OUT)
      : 1;

  const translateY =
    frame < startFrame
      ? slideUp(frame, fps, inStart, 20)
      : frame > outStart
      ? -slideUp(outEnd - frame, fps, 0, 20) // spring out upward
      : 0;

  return (
    <div
      style={{
        position: 'absolute',
        left: CALLOUT_X[side],
        top: CALLOUT_Y,
        opacity,
        transform: `translateY(${translateY}px)`,
        background: '#1a1a1a',
        borderLeft: `4px solid ${color}`,
        borderRadius: 6,
        padding: '8px 16px',
        color: '#ffffff',
        fontSize: 14,
        fontWeight: 500,
        letterSpacing: '0.3px',
        whiteSpace: 'nowrap',
        zIndex: 20,
        fontFamily: '-apple-system, "SF Pro Text", Arial, sans-serif',
      }}
    >
      {text}
    </div>
  );
};
