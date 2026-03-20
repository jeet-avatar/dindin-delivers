import React from "react";
import { AbsoluteFill } from "remotion";

export const Video: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: "#0F172A", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <span style={{ color: "white", fontSize: 48, fontWeight: 800 }}>Interview Assistant</span>
    </AbsoluteFill>
  );
};
