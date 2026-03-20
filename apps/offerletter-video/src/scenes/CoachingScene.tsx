import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { ZoomCall } from "../ui/ZoomCall";
import { AIOverlay } from "../ui/AIOverlay";
import { charByChar, wordStream } from "../animations/typewriter";
import { fadeIn } from "../animations/spring";
import { CursorSVG, moveCursor } from "../animations/cursor";

const AI_ANSWER_1 = "I bring 5+ years of experience in full-stack development with a focus on building scalable systems. At my last role, I led a team that reduced API response times by 60% through strategic caching and database optimization. I thrive in collaborative environments and love turning complex problems into elegant solutions.";
const AI_ANSWER_2 = "My biggest strength is systematic problem-solving. I break down complex challenges into smaller pieces, validate assumptions early, and iterate quickly. This approach helped me deliver a critical payment integration 2 weeks ahead of schedule.";

const CURSOR_PATH = [
  { frame: 0, x: 1500, y: 600 },
  { frame: 20, x: 1540, y: 480 }, // cursor to AI overlay input
];

export const CoachingScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Sub-sequence: 0-150f manual typewriter, 150-375f AI answer, 375f auto-detect, 400f Q2, 490f answer2
  const question1 = charByChar("Tell me about yourself", frame, 2);
  const answer1 = frame >= 150 ? wordStream(AI_ANSWER_1, frame - 150, 3) : "";

  // Auto-detect mode: show waveform from frame 375
  const showWaveform = frame >= 375;
  const question2 = frame >= 400 ? charByChar("What is your biggest strength?", frame - 400, 3) : "";
  const answer2 = frame >= 490 ? wordStream(AI_ANSWER_2, frame - 490, 4) : "";

  // Badges
  const speedBadgeOpacity = fadeIn(frame, 150, 20);
  const autoDetectOpacity = fadeIn(frame, 375, 25);
  const poweredByOpacity = fadeIn(frame, 510, 30);

  const cursor = moveCursor(CURSOR_PATH, frame);
  const speakerPulse = frame >= 375; // interviewer pulse during auto-detect phase

  return (
    <AbsoluteFill style={{ display: "flex" }}>
      {/* Zoom — left 65% */}
      <div style={{ width: "65%", height: "100%" }}>
        <ZoomCall speakerPulse={speakerPulse} />
      </div>

      {/* Right side — AI Overlay + badges */}
      <div style={{ width: "35%", height: "100%", background: "#0F172A", padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
        <AIOverlay
          questionText={question2 || question1}
          answerText={answer2 || answer1}
          showWaveform={showWaveform}
          waveformFrame={frame}
        />

        {/* ~3 second badge */}
        <div style={{ opacity: speedBadgeOpacity, background: "rgba(37,99,235,0.2)", border: "1px solid rgba(37,99,235,0.4)", borderRadius: 10, padding: "10px 16px", fontSize: 13, color: "#93C5FD", fontWeight: 600 }}>
          ⚡ ~3 second response
        </div>

        {/* Auto-detect badge */}
        {showWaveform && (
          <div style={{ opacity: autoDetectOpacity, background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: 10, padding: "10px 16px", fontSize: 13, color: "#6EE7B7", fontWeight: 600 }}>
            🎧 Auto-detect mode — no typing needed
          </div>
        )}
      </div>

      {/* "Powered by Claude AI" watermark */}
      <div style={{
        position: "absolute", bottom: 20, right: 20,
        opacity: poweredByOpacity, fontSize: 12, color: "#475569",
      }}>
        Powered by Claude AI
      </div>

      <CursorSVG x={cursor.x} y={cursor.y} opacity={frame < 60 ? 1 : 0} />
    </AbsoluteFill>
  );
};
