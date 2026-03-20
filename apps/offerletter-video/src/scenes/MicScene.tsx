import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { StepCard } from "../ui/StepCard";
import { MacDialog } from "../ui/MacDialog";
import { CursorSVG, moveCursor } from "../animations/cursor";
import { springEntrance, fadeIn } from "../animations/spring";

const CURSOR_PATH = [
  { frame: 0, x: 960, y: 800 },
  { frame: 30, x: 1100, y: 580 }, // cursor reaches Allow button
];

export const MicScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const dialogScale = springEntrance(frame, fps, 10);
  const dialogY = -40 * (1 - dialogScale);
  const confirmOpacity = fadeIn(frame, 90, 20);
  // Waveform bars: appear after clicking allow
  const waveformOpacity = fadeIn(frame, 100, 30);
  const cursor = moveCursor(CURSOR_PATH, frame);

  const barHeights = [0.4, 0.8, 1.0, 0.6, 0.9, 0.5, 0.7].map((base, i) =>
    waveformOpacity > 0 ? base + 0.2 * Math.sin((frame / 8 + i * 0.9)) : 0
  );

  return (
    <AbsoluteFill style={{ background: "#F8FAFC", padding: "80px 120px" }}>
      <StepCard num={3} title="Allow Microphone" frame={frame} fps={fps} />

      <div style={{ display: "flex", justifyContent: "center", marginTop: 48, transform: `scale(${dialogScale}) translateY(${dialogY}px)` }}>
        <MacDialog
          icon="🎙️"
          title='"Interview Assistant" would like to access the microphone'
          message="This app needs microphone access to listen to interview questions and generate AI coaching responses in real time."
          allowLabel="Allow"
          denyLabel="Don't Allow"
        />
      </div>

      {/* Waveform + confirmation */}
      <div style={{ display: "flex", justifyContent: "center", marginTop: 32, opacity: waveformOpacity }}>
        <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 12, padding: "16px 28px", display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 28 }}>
            {barHeights.map((h, i) => (
              <div key={i} style={{ width: 4, height: 28 * h, background: "#10B981", borderRadius: 2 }} />
            ))}
          </div>
          <span style={{ fontSize: 16, fontWeight: 700, color: "#166534" }}>AI can hear you ✓</span>
        </div>
      </div>

      <CursorSVG x={cursor.x} y={cursor.y} opacity={frame > 10 ? 1 : 0} />
    </AbsoluteFill>
  );
};
