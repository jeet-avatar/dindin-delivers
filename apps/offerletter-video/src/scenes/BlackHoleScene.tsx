import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { springEntrance, fadeIn } from "../animations/spring";

const nodes = [
  { label: "Zoom Call", icon: "📹", color: "#2563EB" },
  { label: "BlackHole 2ch", icon: "🕳️", color: "#7C3AED" },
  { label: "Interview Assistant", icon: "🤖", color: "#F97316" },
];

export const BlackHoleScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ background: "#0F172A", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 32 }}>
      <div style={{ fontSize: 16, color: "#64748B", fontWeight: 600, opacity: fadeIn(frame, 0, 20), letterSpacing: 2, textTransform: "uppercase" }}>
        Optional — Hands-Free Audio Mode
      </div>

      {/* Routing diagram */}
      <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
        {nodes.map((node, i) => {
          const nodeOpacity = springEntrance(frame, fps, i * 20);
          const arrowOpacity = i < nodes.length - 1 ? fadeIn(frame, i * 20 + 30, 20) : 0;
          return (
            <React.Fragment key={i}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, transform: `scale(${nodeOpacity})`, opacity: nodeOpacity }}>
                <div style={{ width: 96, height: 96, borderRadius: 24, background: node.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 40, boxShadow: `0 12px 40px ${node.color}55` }}>
                  {node.icon}
                </div>
                <div style={{ fontSize: 14, color: "white", fontWeight: 700, textAlign: "center", maxWidth: 120 }}>{node.label}</div>
              </div>
              {i < nodes.length - 1 && (
                <div style={{ display: "flex", alignItems: "center", margin: "0 20px", opacity: arrowOpacity, marginBottom: 28 }}>
                  <div style={{ width: 80, height: 2, background: "rgba(255,255,255,0.2)" }} />
                  <div style={{ width: 0, height: 0, borderTop: "8px solid transparent", borderBottom: "8px solid transparent", borderLeft: "12px solid rgba(255,255,255,0.4)" }} />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      <div style={{ opacity: fadeIn(frame, 120, 30), fontSize: 20, color: "#94A3B8", textAlign: "center" }}>
        AI listens automatically — <strong style={{ color: "white" }}>no typing needed</strong>
      </div>
    </AbsoluteFill>
  );
};
