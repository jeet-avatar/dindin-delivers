import React from "react";

interface AIOverlayProps {
  questionText: string;         // text in the input box (typewriter-driven)
  answerText: string;           // AI response (wordStream-driven)
  showWaveform?: boolean;       // show mic waveform bars
  waveformFrame?: number;       // current frame for waveform animation
}

/** Floating Interview Assistant overlay window */
export const AIOverlay: React.FC<AIOverlayProps> = ({
  questionText, answerText, showWaveform = false, waveformFrame = 0,
}) => {
  const barHeights = [0.4, 0.7, 1.0, 0.6, 0.8, 0.5, 0.9].map((base, i) =>
    base + 0.3 * Math.sin((waveformFrame / 8 + i * 0.7))
  );

  return (
    <div style={{
      width: 340, background: "rgba(15,23,42,0.95)",
      backdropFilter: "blur(20px)",
      borderRadius: 14, overflow: "hidden",
      boxShadow: "0 24px 60px rgba(0,0,0,0.5)",
      border: "1px solid rgba(37,99,235,0.4)",
    }}>
      {/* Header */}
      <div style={{
        padding: "10px 14px", background: "rgba(37,99,235,0.15)",
        borderBottom: "1px solid rgba(37,99,235,0.2)",
        display: "flex", alignItems: "center", gap: 8,
      }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#10B981" }} />
        <span style={{ fontSize: 12, fontWeight: 700, color: "#93C5FD" }}>Interview Assistant</span>
        {showWaveform && (
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "flex-end", gap: 2, height: 16 }}>
            {barHeights.map((h, i) => (
              <div key={i} style={{ width: 3, height: 16 * h, background: "#10B981", borderRadius: 2 }} />
            ))}
          </div>
        )}
      </div>

      {/* Question input */}
      <div style={{ padding: "10px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{
          background: "rgba(255,255,255,0.06)", borderRadius: 8, padding: "8px 12px",
          fontSize: 13, color: "#CBD5E1", minHeight: 36,
          border: "1px solid rgba(255,255,255,0.1)",
        }}>
          {questionText || <span style={{ color: "#475569" }}>Ask a question or speak...</span>}
          {questionText && <span style={{ opacity: 0.5 }}>|</span>}
        </div>
      </div>

      {/* Answer */}
      <div style={{ padding: "12px 14px", minHeight: 80 }}>
        {answerText ? (
          <div style={{ fontSize: 13, color: "#E2E8F0", lineHeight: 1.7 }}>{answerText}</div>
        ) : (
          <div style={{ fontSize: 12, color: "#475569", fontStyle: "italic" }}>AI response will appear here...</div>
        )}
      </div>
    </div>
  );
};
