import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, Img, staticFile } from "remotion";
import { springEntrance, fadeIn } from "../animations/spring";

export const TitleCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const scale = springEntrance(frame, fps, 0);
  const taglineOpacity = fadeIn(frame, 20, 25);

  return (
    <AbsoluteFill style={{
      background: "linear-gradient(135deg, #1D4ED8 0%, #7C3AED 100%)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 24,
    }}>
      <div style={{ transform: `scale(${scale})`, display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
        <Img src={staticFile("logo.svg")} style={{ width: 80, height: 80 }} />
        <div style={{ fontSize: 72, fontWeight: 800, color: "white", textAlign: "center", lineHeight: 1 }}>
          Interview Assistant
        </div>
        <div style={{ fontSize: 26, color: "rgba(255,255,255,0.8)", opacity: taglineOpacity, textAlign: "center" }}>
          AI that coaches you through every interview.
        </div>
        <div style={{ background: "rgba(255,255,255,0.15)", borderRadius: 24, padding: "8px 24px", fontSize: 16, color: "white", opacity: taglineOpacity }}>
          offerletter.ai
        </div>
      </div>
    </AbsoluteFill>
  );
};
