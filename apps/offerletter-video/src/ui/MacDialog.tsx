import React from "react";

interface MacDialogProps {
  icon: string;
  title: string;
  message: string;
  allowLabel?: string;
  denyLabel?: string;
  highlightAllow?: boolean;
}

/** macOS system permission dialog */
export const MacDialog: React.FC<MacDialogProps> = ({
  icon, title, message, allowLabel = "Allow", denyLabel = "Don't Allow", highlightAllow = true,
}) => (
  <div style={{
    width: 420, background: "rgba(30,41,59,0.97)",
    backdropFilter: "blur(40px)",
    borderRadius: 16, padding: "28px 28px 22px",
    boxShadow: "0 32px 80px rgba(0,0,0,0.6)",
    border: "1px solid rgba(255,255,255,0.1)",
    display: "flex", flexDirection: "column", alignItems: "center", gap: 12,
  }}>
    <div style={{ fontSize: 48 }}>{icon}</div>
    <div style={{ fontSize: 17, fontWeight: 700, color: "white", textAlign: "center" }}>{title}</div>
    <div style={{ fontSize: 13, color: "#94A3B8", textAlign: "center", lineHeight: 1.6 }}>{message}</div>
    <div style={{ display: "flex", gap: 10, marginTop: 8, width: "100%" }}>
      <button style={{
        flex: 1, padding: "10px 0", borderRadius: 8, border: "1px solid rgba(255,255,255,0.15)",
        background: "transparent", color: "#94A3B8", fontSize: 14, fontWeight: 600, cursor: "pointer",
      }}>{denyLabel}</button>
      <button style={{
        flex: 1, padding: "10px 0", borderRadius: 8, border: "none",
        background: highlightAllow ? "#2563EB" : "rgba(255,255,255,0.1)",
        color: "white", fontSize: 14, fontWeight: 700, cursor: "pointer",
      }}>{allowLabel}</button>
    </div>
  </div>
);
