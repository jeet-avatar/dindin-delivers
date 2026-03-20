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
import { PhoneLinkScene } from "./scenes/PhoneLinkScene";
import { EndCard } from "./scenes/EndCard";

const { fontFamily } = loadFont();

export const Video: React.FC = () => (
  <AbsoluteFill style={{ fontFamily, background: "#0F172A" }}>
    <Sequence from={0} durationInFrames={60} name="TitleCard">
      <TitleCard />
    </Sequence>
    <Sequence from={60} durationInFrames={270} name="Purchase">
      <PurchaseScene />
    </Sequence>
    <Sequence from={330} durationInFrames={450} name="Download">
      <DownloadScene />
    </Sequence>
    <Sequence from={780} durationInFrames={210} name="Microphone">
      <MicScene />
    </Sequence>
    <Sequence from={990} durationInFrames={300} name="Overlay">
      <OverlayScene />
    </Sequence>
    <Sequence from={1290} durationInFrames={540} name="Coaching">
      <CoachingScene />
    </Sequence>
    <Sequence from={1830} durationInFrames={600} name="BlackHole">
      <BlackHoleScene />
    </Sequence>
    <Sequence from={2430} durationInFrames={240} name="PhoneLink">
      <PhoneLinkScene />
    </Sequence>
    <Sequence from={2670} durationInFrames={150} name="EndCard">
      <EndCard />
    </Sequence>
  </AbsoluteFill>
);
