import React from "react";
import { AbsoluteFill, Sequence } from "remotion";
import { loadFont } from "@remotion/google-fonts/PlusJakartaSans";
import { TitleCard } from "./scenes/TitleCard";
import { PurchaseScene } from "./scenes/PurchaseScene";
import { DownloadScene } from "./scenes/DownloadScene";
import { MicScene } from "./scenes/MicScene";
import { OverlayScene } from "./scenes/OverlayScene";
import { CoachingScene } from "./scenes/CoachingScene";
import { BlackHoleScene } from "./scenes/BlackHoleScene";
import { EndCard } from "./scenes/EndCard";

const { fontFamily } = loadFont();

export const Video: React.FC = () => (
  <AbsoluteFill style={{ fontFamily, background: "#0F172A" }}>
    <Sequence from={0} durationInFrames={90} name="TitleCard">
      <TitleCard />
    </Sequence>
    <Sequence from={90} durationInFrames={600} name="Purchase">
      <PurchaseScene />
    </Sequence>
    <Sequence from={690} durationInFrames={900} name="Download">
      <DownloadScene />
    </Sequence>
    <Sequence from={1590} durationInFrames={450} name="Microphone">
      <MicScene />
    </Sequence>
    <Sequence from={2040} durationInFrames={600} name="Overlay">
      <OverlayScene />
    </Sequence>
    <Sequence from={2640} durationInFrames={1200} name="Coaching">
      <CoachingScene />
    </Sequence>
    <Sequence from={3840} durationInFrames={450} name="BlackHole">
      <BlackHoleScene />
    </Sequence>
    <Sequence from={4290} durationInFrames={300} name="EndCard">
      <EndCard />
    </Sequence>
  </AbsoluteFill>
);
