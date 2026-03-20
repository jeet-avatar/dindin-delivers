import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { ZoomCall } from "../ui/ZoomCall";
import { AIOverlay } from "../ui/AIOverlay";
import { StepCard } from "../ui/StepCard";
import { springEntrance, fadeIn, fadeOut } from "../animations/spring";

export const OverlayScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Zoom background fades in first
  const zoomOpacity = fadeIn(frame, 0, 30);
  // Overlay springs in at frame 30
  const overlayScale = springEntrance(frame, fps, 30);

  // ⌘⇧H demo: overlay blinks at frame 200–240 (hidden), reappears at 270
  const overlayOpacity = frame >= 200 && frame <= 270
    ? interpolate(frame, [200, 220, 250, 270], [1, 0, 0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
    : 1;

  // Hotkey badge at frame 180–320
  const hotkeyOpacity = frame >= 180 && frame <= 320 ? fadeIn(frame, 180, 20) : fadeOut(frame, 310, 20);

  // "Invisible to screen share" label appears at frame 340
  const labelOpacity = fadeIn(frame, 340, 25);

  // Drag: overlay moves from top-right (1560,80) toward center-left (80,400) at frame 420–480
  const dragT = interpolate(frame, [420, 480], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const overlayX = interpolate(dragT, [0, 1], [1560, 80]);
  const overlayY = interpolate(dragT, [0, 1], [80, 300]);

  return (
    <AbsoluteFill>
      {/* Zoom background */}
      <div style={{ width: "100%", height: "100%", opacity: zoomOpacity }}>
        <ZoomCall speakerPulse />
      </div>

      {/* AI Overlay */}
      <div style={{
        position: "absolute", left: overlayX, top: overlayY,
        transform: `scale(${overlayScale})`,
        opacity: overlayOpacity,
        transformOrigin: "top right",
      }}>
        <AIOverlay questionText="" answerText="" />
      </div>

      {/* ⌘⇧H hotkey badge */}
      <div style={{
        position: "absolute", top: 40, left: "50%", transform: "translateX(-50%)",
        opacity: hotkeyOpacity,
        background: "rgba(15,23,42,0.9)", borderRadius: 10, padding: "8px 20px",
        fontSize: 18, color: "white", fontWeight: 700, border: "1px solid rgba(255,255,255,0.15)",
      }}>
        ⌘ Shift H — hide / show overlay
      </div>

      {/* Invisible to screen share label */}
      <div style={{
        position: "absolute", bottom: 80, left: "50%", transform: "translateX(-50%)",
        opacity: labelOpacity,
        background: "#10B981", borderRadius: 12, padding: "12px 24px",
        fontSize: 16, color: "white", fontWeight: 700,
      }}>
        👁️ Invisible to Zoom &amp; Teams screen share
      </div>
    </AbsoluteFill>
  );
};
