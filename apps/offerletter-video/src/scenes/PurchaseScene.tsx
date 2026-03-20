import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { StepCard } from "../ui/StepCard";
import { MacWindow } from "../ui/MacWindow";
import { springEntrance, fadeIn } from "../animations/spring";

export const PurchaseScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const cardScale = springEntrance(frame, fps, 0);
  const windowSlide = springEntrance(frame, fps, 15);
  // Payment confirmed appears at frame 300 (10s in)
  const confirmOpacity = fadeIn(frame, 300, 20);
  // Redirect pulse at frame 420
  const redirectOpacity = fadeIn(frame, 420, 20);

  return (
    <AbsoluteFill style={{ background: "#F8FAFC", padding: "80px 120px" }}>
      <div style={{ transform: `scale(${cardScale})` }}>
        <StepCard num={1} title="Purchase — $19" frame={frame} fps={fps} />
      </div>

      <div style={{ display: "flex", justifyContent: "center", marginTop: 40, transform: `translateY(${60 * (1 - windowSlide)}px)`, opacity: windowSlide }}>
        <MacWindow title="checkout.stripe.com" width={520} height={340}>
          <div style={{ padding: 28, background: "#0F172A", height: "100%", display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: "white" }}>Interview Assistant</div>
            <div style={{ fontSize: 32, fontWeight: 800, color: "white" }}>$19.00</div>
            <div style={{ fontSize: 13, color: "#64748B" }}>One-time payment · Use forever</div>

            {/* Fake card form */}
            <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 8, padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: 6, padding: "10px 12px", fontSize: 13, color: "#64748B" }}>•••• •••• •••• 4242</div>
              <div style={{ display: "flex", gap: 8 }}>
                <div style={{ flex: 1, background: "rgba(255,255,255,0.08)", borderRadius: 6, padding: "10px 12px", fontSize: 13, color: "#64748B" }}>12/28</div>
                <div style={{ flex: 1, background: "rgba(255,255,255,0.08)", borderRadius: 6, padding: "10px 12px", fontSize: 13, color: "#64748B" }}>•••</div>
              </div>
            </div>

            {/* Payment confirmed state */}
            <div style={{ opacity: confirmOpacity, background: "#10B981", borderRadius: 8, padding: "12px 16px", display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 20 }}>✓</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: "white" }}>Payment confirmed — redirecting...</span>
            </div>
          </div>
        </MacWindow>
      </div>

      {/* Callout */}
      <div style={{
        position: "absolute", bottom: 80, left: "50%", transform: "translateX(-50%)",
        opacity: redirectOpacity,
        background: "#FEF3C7", border: "1px solid #FDE68A", borderRadius: 12,
        padding: "12px 24px", fontSize: 16, color: "#92400E", fontWeight: 600,
      }}>
        💡 One-time payment — use forever
      </div>
    </AbsoluteFill>
  );
};
