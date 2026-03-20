import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { fadeIn } from "../animations/spring";

const steps = [
  {
    frame: 0,
    icon: "⬇️",
    title: "Download BlackHole 2ch",
    color: "#2563EB",
    body: 'Free at existential.audio/blackhole — click "BlackHole 2ch" → fill email → download installer (.pkg)',
    warning: false,
  },
  {
    frame: 100,
    icon: "🔒",
    title: "Allow in Security & Privacy",
    color: "#DC2626",
    body: 'macOS blocks the audio driver. Go to System Settings → Privacy & Security → scroll down → click "Allow" next to "Existential Audio". Restart Mac.',
    warning: true,
  },
  {
    frame: 220,
    icon: "🎛️",
    title: "Create Multi-Output Device",
    color: "#7C3AED",
    body: 'Open Audio MIDI Setup (⌘Space → "Audio MIDI") → click + bottom-left → "Create Multi-Output Device" → check ✓ BlackHole 2ch + ✓ Built-in Output (your headphones)',
    warning: false,
  },
  {
    frame: 370,
    icon: "🔊",
    title: "Volume: use app controls",
    color: "#D97706",
    body: "⚠️ System volume slider is disabled on Multi-Output devices. Control volume inside each app — Zoom, Spotify, browser — individually.",
    warning: true,
  },
  {
    frame: 470,
    icon: "✅",
    title: "Set as macOS Output",
    color: "#059669",
    body: 'System Settings → Sound → Output → select "Multi-Output Device". Interview Assistant shows: 🎧 Capturing: BlackHole 2ch',
    warning: false,
  },
];

export const BlackHoleScene: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={{
      background: "#0F172A",
      padding: "60px 100px",
      display: "flex",
      flexDirection: "column",
      gap: 0,
    }}>
      {/* Header */}
      <div style={{ opacity: fadeIn(frame, 0, 20), marginBottom: 32 }}>
        <div style={{
          fontSize: 13,
          color: "#64748B",
          fontWeight: 600,
          letterSpacing: 2,
          textTransform: "uppercase" as const,
          marginBottom: 8,
        }}>
          Optional — Hands-Free Audio Setup
        </div>
        <div style={{ fontSize: 40, fontWeight: 800, color: "white" }}>
          BlackHole 2ch Installation
        </div>
      </div>

      {/* Step cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {steps.map((step, i) => {
          if (frame < step.frame) return null;
          const opacity = fadeIn(frame, step.frame, 20);
          const translateY = opacity < 1 ? 20 * (1 - opacity) : 0;
          return (
            <div key={i} style={{
              opacity,
              transform: `translateY(${translateY}px)`,
              display: "flex",
              gap: 16,
              alignItems: "flex-start",
            }}>
              <div style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: step.color,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 20,
                flexShrink: 0,
                boxShadow: `0 8px 20px ${step.color}44`,
              }}>
                {step.icon}
              </div>
              <div style={{
                flex: 1,
                background: step.warning ? "rgba(220,38,38,0.08)" : "rgba(255,255,255,0.04)",
                border: `1px solid ${step.warning ? "rgba(220,38,38,0.2)" : "rgba(255,255,255,0.07)"}`,
                borderRadius: 12,
                padding: "12px 16px",
              }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: "white", marginBottom: 4 }}>
                  {step.title}
                </div>
                <div style={{ fontSize: 13, color: "#94A3B8", lineHeight: 1.6 }}>
                  {step.body}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
