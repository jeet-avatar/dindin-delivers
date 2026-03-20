import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { fadeIn } from "../animations/spring";

// Simple QR-like SVG pattern
const QRPattern: React.FC = () => (
  <svg width="180" height="180" viewBox="0 0 180 180" fill="none">
    {/* Corner squares — top-left */}
    <rect x="10" y="10" width="50" height="50" rx="4" fill="white" />
    <rect x="20" y="20" width="30" height="30" rx="2" fill="#0F172A" />
    <rect x="25" y="25" width="20" height="20" rx="1" fill="white" />
    {/* Corner squares — top-right */}
    <rect x="120" y="10" width="50" height="50" rx="4" fill="white" />
    <rect x="130" y="20" width="30" height="30" rx="2" fill="#0F172A" />
    <rect x="135" y="25" width="20" height="20" rx="1" fill="white" />
    {/* Corner squares — bottom-left */}
    <rect x="10" y="120" width="50" height="50" rx="4" fill="white" />
    <rect x="20" y="130" width="30" height="30" rx="2" fill="#0F172A" />
    <rect x="25" y="135" width="20" height="20" rx="1" fill="white" />
    {/* Data modules — scattered pattern */}
    <rect x="70" y="10" width="8" height="8" rx="1" fill="white" />
    <rect x="82" y="10" width="8" height="8" rx="1" fill="white" />
    <rect x="94" y="10" width="8" height="8" rx="1" fill="white" />
    <rect x="106" y="10" width="8" height="8" rx="1" fill="white" />
    <rect x="70" y="22" width="8" height="8" rx="1" fill="white" />
    <rect x="94" y="22" width="8" height="8" rx="1" fill="white" />
    <rect x="106" y="22" width="8" height="8" rx="1" fill="white" />
    <rect x="70" y="34" width="8" height="8" rx="1" fill="white" />
    <rect x="82" y="34" width="8" height="8" rx="1" fill="white" />
    <rect x="106" y="34" width="8" height="8" rx="1" fill="white" />
    <rect x="70" y="46" width="8" height="8" rx="1" fill="white" />
    <rect x="94" y="46" width="8" height="8" rx="1" fill="white" />
    <rect x="10" y="70" width="8" height="8" rx="1" fill="white" />
    <rect x="22" y="70" width="8" height="8" rx="1" fill="white" />
    <rect x="46" y="70" width="8" height="8" rx="1" fill="white" />
    <rect x="58" y="70" width="8" height="8" rx="1" fill="white" />
    <rect x="10" y="82" width="8" height="8" rx="1" fill="white" />
    <rect x="34" y="82" width="8" height="8" rx="1" fill="white" />
    <rect x="58" y="82" width="8" height="8" rx="1" fill="white" />
    <rect x="22" y="94" width="8" height="8" rx="1" fill="white" />
    <rect x="46" y="94" width="8" height="8" rx="1" fill="white" />
    <rect x="10" y="106" width="8" height="8" rx="1" fill="white" />
    <rect x="34" y="106" width="8" height="8" rx="1" fill="white" />
    <rect x="58" y="106" width="8" height="8" rx="1" fill="white" />
    <rect x="120" y="70" width="8" height="8" rx="1" fill="white" />
    <rect x="144" y="70" width="8" height="8" rx="1" fill="white" />
    <rect x="162" y="70" width="8" height="8" rx="1" fill="white" />
    <rect x="132" y="82" width="8" height="8" rx="1" fill="white" />
    <rect x="156" y="82" width="8" height="8" rx="1" fill="white" />
    <rect x="120" y="94" width="8" height="8" rx="1" fill="white" />
    <rect x="144" y="94" width="8" height="8" rx="1" fill="white" />
    <rect x="132" y="106" width="8" height="8" rx="1" fill="white" />
    <rect x="162" y="106" width="8" height="8" rx="1" fill="white" />
    <rect x="70" y="70" width="8" height="8" rx="1" fill="white" />
    <rect x="94" y="70" width="8" height="8" rx="1" fill="white" />
    <rect x="106" y="82" width="8" height="8" rx="1" fill="white" />
    <rect x="70" y="94" width="8" height="8" rx="1" fill="white" />
    <rect x="82" y="94" width="8" height="8" rx="1" fill="white" />
    <rect x="94" y="106" width="8" height="8" rx="1" fill="white" />
    <rect x="70" y="120" width="8" height="8" rx="1" fill="white" />
    <rect x="94" y="120" width="8" height="8" rx="1" fill="white" />
    <rect x="106" y="120" width="8" height="8" rx="1" fill="white" />
    <rect x="82" y="132" width="8" height="8" rx="1" fill="white" />
    <rect x="106" y="132" width="8" height="8" rx="1" fill="white" />
    <rect x="70" y="144" width="8" height="8" rx="1" fill="white" />
    <rect x="94" y="144" width="8" height="8" rx="1" fill="white" />
    <rect x="120" y="120" width="8" height="8" rx="1" fill="white" />
    <rect x="144" y="120" width="8" height="8" rx="1" fill="white" />
    <rect x="162" y="120" width="8" height="8" rx="1" fill="white" />
    <rect x="132" y="132" width="8" height="8" rx="1" fill="white" />
    <rect x="156" y="132" width="8" height="8" rx="1" fill="white" />
    <rect x="120" y="144" width="8" height="8" rx="1" fill="white" />
    <rect x="144" y="144" width="8" height="8" rx="1" fill="white" />
    <rect x="162" y="144" width="8" height="8" rx="1" fill="white" />
    {/* Center branding square */}
    <rect x="76" y="76" width="28" height="28" rx="6" fill="#2563EB" />
    <text x="90" y="95" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">OL</text>
  </svg>
);

export const PhoneLinkScene: React.FC = () => {
  const frame = useCurrentFrame();

  const headerOpacity = fadeIn(frame, 0, 20);
  const leftOpacity = fadeIn(frame, 15, 25);
  const orOpacity = fadeIn(frame, 20, 20);
  const rightOpacity = fadeIn(frame, 30, 25);
  const urlOpacity = fadeIn(frame, 80, 20);

  return (
    <AbsoluteFill style={{
      background: "linear-gradient(135deg, #0F172A 0%, #1E1B4B 100%)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 32,
    }}>
      {/* Title */}
      <div style={{
        opacity: headerOpacity,
        fontSize: 36,
        fontWeight: 800,
        color: "white",
        textAlign: "center",
      }}>
        Access on Your Phone
      </div>

      {/* Main row */}
      <div style={{ display: "flex", gap: 80, alignItems: "center" }}>

        {/* QR Code panel */}
        <div style={{
          opacity: leftOpacity,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 16,
        }}>
          <div style={{
            background: "#0F172A",
            borderRadius: 16,
            padding: 20,
            border: "2px solid rgba(255,255,255,0.1)",
          }}>
            <QRPattern />
          </div>
          <div style={{ fontSize: 14, color: "#64748B", textAlign: "center" }}>
            Scan to open on phone
          </div>
        </div>

        {/* Divider */}
        <div style={{ opacity: orOpacity, color: "#475569", fontSize: 24, fontWeight: 700 }}>
          or
        </div>

        {/* Mock iPhone */}
        <div style={{
          opacity: rightOpacity,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 12,
        }}>
          <div style={{
            width: 200,
            height: 360,
            background: "#1E293B",
            borderRadius: 36,
            border: "6px solid #334155",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            boxShadow: "0 24px 60px rgba(0,0,0,0.4)",
          }}>
            {/* Status bar */}
            <div style={{
              background: "#0F172A",
              padding: "12px 16px 0",
              display: "flex",
              justifyContent: "space-between",
              fontSize: 10,
              color: "#94A3B8",
            }}>
              <span>9:41</span>
              <span>●●●</span>
            </div>
            {/* Safari URL bar */}
            <div style={{ background: "#0F172A", padding: "8px 10px" }}>
              <div style={{
                background: "#1E293B",
                borderRadius: 8,
                padding: "6px 10px",
                fontSize: 11,
                color: "#94A3B8",
                textAlign: "center",
              }}>
                offerletter.ai/interview
              </div>
            </div>
            {/* Page content */}
            <div style={{
              flex: 1,
              background: "#F8FAFC",
              padding: 12,
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}>
              <div style={{
                background: "#2563EB",
                borderRadius: 8,
                height: 48,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}>
                <span style={{ color: "white", fontSize: 11, fontWeight: 700 }}>
                  Interview Assistant
                </span>
              </div>
              <div style={{ background: "#E2E8F0", borderRadius: 6, height: 8 }} />
              <div style={{ background: "#E2E8F0", borderRadius: 6, height: 8, width: "70%" }} />
              <div style={{ background: "#E2E8F0", borderRadius: 6, height: 8, width: "85%" }} />
              <div style={{
                background: "#F97316",
                borderRadius: 8,
                height: 36,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginTop: 8,
              }}>
                <span style={{ color: "white", fontSize: 11, fontWeight: 700 }}>
                  Get — $19
                </span>
              </div>
            </div>
          </div>
          <div style={{ fontSize: 14, color: "#64748B" }}>
            Type the URL in Safari
          </div>
        </div>
      </div>

      {/* URL callout */}
      <div style={{
        opacity: urlOpacity,
        background: "rgba(37,99,235,0.15)",
        border: "1px solid rgba(37,99,235,0.3)",
        borderRadius: 12,
        padding: "14px 32px",
        fontSize: 20,
        fontWeight: 700,
        color: "#93C5FD",
        letterSpacing: 1,
      }}>
        offerletter.ai/interview
      </div>
    </AbsoluteFill>
  );
};
