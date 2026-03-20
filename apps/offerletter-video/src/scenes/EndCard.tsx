import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, Img, staticFile } from "remotion";
import { springEntrance, fadeIn, pulse } from "../animations/spring";

export const EndCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scale = springEntrance(frame, fps, 0);
  const btnScale = pulse(frame);
  const urlOpacity = fadeIn(frame, 30, 25);

  return (
    <AbsoluteFill style={{
      background: "linear-gradient(135deg, #1D4ED8 0%, #7C3AED 100%)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 28,
    }}>
      <div style={{ transform: `scale(${scale})`, display: "flex", flexDirection: "column", alignItems: "center", gap: 24 }}>
        <Img src={staticFile("logo.svg")} style={{ width: 80, height: 80 }} />
        <div style={{ fontSize: 56, fontWeight: 800, color: "white", textAlign: "center" }}>
          Ace your next interview.
        </div>
        <div style={{ transform: `scale(${btnScale})` }}>
          <div style={{
            background: "#F97316", borderRadius: 16, padding: "20px 48px",
            fontSize: 24, fontWeight: 800, color: "white",
            boxShadow: "0 12px 40px rgba(249,115,22,0.4)",
          }}>
            Get Interview Coach — $19
          </div>
        </div>
        <div style={{ opacity: urlOpacity, fontSize: 18, color: "rgba(255,255,255,0.7)" }}>
          offerletter.ai/interview · One-time payment
        </div>
      </div>
    </AbsoluteFill>
  );
};
