import React from "react";
import { springEntrance, slideUp } from "../animations/spring";

interface StepCardProps {
  num: number;
  title: string;
  frame: number;
  fps: number;
}

/** Numbered step card header that springs in from below */
export const StepCard: React.FC<StepCardProps> = ({ num, title, frame, fps }) => {
  const scale = springEntrance(frame, fps, 0);
  const translateY = slideUp(frame, fps, 0);
  const opacity = Math.min(1, frame / 10);

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 20,
      transform: `scale(${scale}) translateY(${translateY}px)`,
      opacity,
      marginBottom: 32,
    }}>
      <div style={{
        width: 64, height: 64, borderRadius: "50%",
        background: "#2563EB", color: "white",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 28, fontWeight: 800, flexShrink: 0,
      }}>
        {num}
      </div>
      <div style={{ fontSize: 48, fontWeight: 800, color: "#1E293B", lineHeight: 1.1 }}>
        {title}
      </div>
    </div>
  );
};
