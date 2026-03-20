import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { StepCard } from "../ui/StepCard";
import { Finder } from "../ui/Finder";
import { CursorSVG, moveCursor } from "../animations/cursor";
import { springEntrance, fadeIn } from "../animations/spring";

const CURSOR_PATH = [
  { frame: 30, x: 960, y: 700 },   // starts center-bottom
  { frame: 90, x: 1100, y: 460 },  // moves to download button
  { frame: 180, x: 560, y: 480 },  // moves to DMG icon
  { frame: 500, x: 1100, y: 480 }, // moves to Applications (end of drag)
];

export const DownloadScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const finderOpacity = springEntrance(frame, fps, 20);
  // Drag starts at frame 180, ends at frame 500 (10.7s)
  const dragProgress = interpolate(frame, [180, 500], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const showBadge = frame >= 520;
  const cursor = moveCursor(CURSOR_PATH, frame);

  return (
    <AbsoluteFill style={{ background: "#F8FAFC", padding: "80px 120px" }}>
      <StepCard num={2} title="Download & Install" frame={frame} fps={fps} />

      <div style={{ display: "flex", justifyContent: "center", opacity: finderOpacity, transform: `translateY(${30 * (1 - finderOpacity)}px)` }}>
        <Finder dragProgress={dragProgress} showBadge={showBadge} />
      </div>

      <CursorSVG x={cursor.x} y={cursor.y} opacity={frame > 30 ? 1 : 0} />
    </AbsoluteFill>
  );
};
