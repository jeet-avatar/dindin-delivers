import React from "react";

interface MacWindowProps {
  title: string;
  width: number;
  height: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
}

/** Generic macOS window chrome — traffic light buttons + title bar */
export const MacWindow: React.FC<MacWindowProps> = ({ title, width, height, children, style }) => (
  <div style={{
    width, height,
    borderRadius: 12, overflow: "hidden",
    boxShadow: "0 32px 80px rgba(0,0,0,0.5)",
    background: "#1E293B", border: "1px solid rgba(255,255,255,0.08)",
    display: "flex", flexDirection: "column",
    ...style,
  }}>
    {/* Title bar */}
    <div style={{
      height: 40, background: "#2D3748",
      display: "flex", alignItems: "center", gap: 8, padding: "0 16px",
      flexShrink: 0, borderBottom: "1px solid rgba(255,255,255,0.06)",
    }}>
      <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#FF5F57" }} />
      <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#FEBC2E" }} />
      <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#28C840" }} />
      <div style={{ flex: 1, textAlign: "center", fontSize: 13, color: "#94A3B8", fontWeight: 600, marginRight: 36 }}>
        {title}
      </div>
    </div>
    {/* Content */}
    <div style={{ flex: 1, overflow: "hidden" }}>{children}</div>
  </div>
);
