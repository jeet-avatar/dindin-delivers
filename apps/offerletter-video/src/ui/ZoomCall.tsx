import React from "react";

interface ZoomCallProps {
  speakerPulse?: boolean; // animate speaking ring on interviewer tile
}

/**
 * Mock Zoom call UI.
 * Layout: 2-tile grid — interviewer left 70% width, candidate right 30%.
 * All tiles blurred (filter: blur(4px)) to avoid distraction.
 * Bottom toolbar with mic/camera icons.
 */
export const ZoomCall: React.FC<ZoomCallProps> = ({ speakerPulse = false }) => (
  <div style={{ width: "100%", height: "100%", background: "#1C1C1E", display: "flex", flexDirection: "column" }}>
    {/* Video tiles */}
    <div style={{ flex: 1, display: "flex", gap: 4, padding: 4 }}>
      {/* Interviewer — 70% */}
      <div style={{ flex: 7, background: "#2C2C2E", borderRadius: 10, position: "relative", overflow: "hidden" }}>
        <div style={{ width: "100%", height: "100%", background: "linear-gradient(135deg,#374151,#1F2937)", filter: "blur(4px)", transform: "scale(1.05)" }} />
        {speakerPulse && (
          <div style={{
            position: "absolute", inset: 0, borderRadius: 10,
            border: "3px solid #10B981",
            boxShadow: "inset 0 0 20px rgba(16,185,129,0.2)",
          }} />
        )}
        <div style={{ position: "absolute", bottom: 10, left: 12, fontSize: 12, color: "white", background: "rgba(0,0,0,0.5)", borderRadius: 4, padding: "2px 8px" }}>Interviewer</div>
      </div>

      {/* Candidate — 30% */}
      <div style={{ flex: 3, background: "#2C2C2E", borderRadius: 10, position: "relative", overflow: "hidden" }}>
        <div style={{ width: "100%", height: "100%", background: "linear-gradient(135deg,#1E3A5F,#0F172A)", filter: "blur(4px)", transform: "scale(1.05)" }} />
        <div style={{ position: "absolute", bottom: 10, left: 12, fontSize: 12, color: "white", background: "rgba(0,0,0,0.5)", borderRadius: 4, padding: "2px 8px" }}>You</div>
      </div>
    </div>

    {/* Bottom toolbar */}
    <div style={{ height: 64, background: "#1C1C1E", display: "flex", alignItems: "center", justifyContent: "center", gap: 16 }}>
      {["🎙️", "📷", "🖥️", "💬", "👥"].map((icon, i) => (
        <div key={i} style={{
          width: 44, height: 44, borderRadius: "50%",
          background: i === 0 ? "#10B981" : "rgba(255,255,255,0.1)",
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
        }}>{icon}</div>
      ))}
    </div>
  </div>
);
