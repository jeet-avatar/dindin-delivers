import React from "react";
import { MacWindow } from "./MacWindow";

interface FinderProps {
  /** 0–1 progress of the drag animation (0 = icon at source, 1 = icon at target) */
  dragProgress: number;
  showBadge?: boolean;
}

/** Mock macOS Finder window showing DMG drag-to-Applications */
export const Finder: React.FC<FinderProps> = ({ dragProgress, showBadge = false }) => {
  const iconX = dragProgress * 560; // moves from 0 to 560px (left to right in window)

  return (
    <MacWindow title="Downloads" width={760} height={420}>
      <div style={{ display: "flex", height: "100%", background: "#1A2332" }}>
        {/* Sidebar */}
        <div style={{ width: 180, background: "#151E2D", borderRight: "1px solid rgba(255,255,255,0.06)", padding: "12px 8px" }}>
          {["Recents", "Applications", "Downloads", "Desktop", "Documents"].map((label, i) => (
            <div key={i} style={{
              padding: "7px 12px", borderRadius: 6, fontSize: 13, color: i === 2 ? "white" : "#64748B",
              background: i === 2 ? "rgba(37,99,235,0.3)" : "transparent",
              marginBottom: 2,
            }}>{label}</div>
          ))}
        </div>

        {/* Main area */}
        <div style={{ flex: 1, padding: 24, position: "relative" }}>
          <div style={{ fontSize: 12, color: "#64748B", marginBottom: 16 }}>Downloads</div>

          {/* DMG icon — moves with drag */}
          <div style={{
            position: "absolute", left: 60 + iconX, top: 80,
            display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
            transition: "none",
          }}>
            <div style={{
              width: 64, height: 64, borderRadius: 14, background: "#2563EB",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: dragProgress > 0 ? "0 8px 24px rgba(37,99,235,0.4)" : "none",
            }}>
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <rect width="32" height="32" rx="8" fill="#1D4ED8"/>
                <path d="M8 10h16M8 15h10M8 20h12" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                <circle cx="23" cy="21" r="6" fill="#F97316"/>
                <path d="M21 21l1.5 1.5L25 19" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div style={{ fontSize: 11, color: "#94A3B8", textAlign: "center", maxWidth: 80 }}>
              Interview Assistant.dmg
            </div>
          </div>

          {/* Applications arrow target */}
          <div style={{ position: "absolute", right: 40, top: 80, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <div style={{ width: 64, height: 64, borderRadius: 14, background: "rgba(255,255,255,0.05)", border: "2px dashed rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: 28 }}>📁</span>
            </div>
            <div style={{ fontSize: 11, color: "#64748B" }}>Applications</div>
          </div>

          {/* Notarized badge */}
          {showBadge && (
            <div style={{
              position: "absolute", bottom: 16, right: 16,
              background: "#10B981", borderRadius: 20, padding: "6px 14px",
              fontSize: 12, fontWeight: 700, color: "white",
              display: "flex", alignItems: "center", gap: 6,
            }}>
              ✓ Apple notarized
            </div>
          )}
        </div>
      </div>
    </MacWindow>
  );
};
