import React from 'react';
import {Series, staticFile} from 'remotion';
import {TitleCard} from './scenes/TitleCard';
import {SectionCard} from './scenes/SectionCard';
import {DualPhoneScene} from './scenes/DualPhoneScene';

const FPS = 30;
const R2_FREEZE = 30 * FPS;   // R2/R3 clip freezes at 30s = 900 frames into each DualPhoneScene

export const Video: React.FC = () => {
  return (
    <Series>
      {/* 0:00-0:06 — Title card (intro) */}
      <Series.Sequence durationInFrames={6 * FPS}>
        <TitleCard variant="intro" />
      </Series.Sequence>

      {/* 0:06-0:10 — Section card: Flow 1 */}
      <Series.Sequence durationInFrames={4 * FPS}>
        <SectionCard
          flowNumber={1}
          title="Flow 1 — Pool Delivery"
          description="Apple Restaurant assigns a delivery to the nearest available driver from the pool"
        />
      </Series.Sequence>

      {/* 0:10-0:25 — Restaurant login + driver idle */}
      <Series.Sequence durationInFrames={15 * FPS}>
        <DualPhoneScene
          leftClip={staticFile('recordings/R1.mp4')}
          rightClip={staticFile('recordings/D1.mp4')}
          callouts={[
            {
              text: 'Apple Restaurant — demo account',
              startFrame: 3 * FPS,  // 3s after scene starts
              duration: 3 * FPS,
              side: 'left',
              color: '#06C167',
            },
          ]}
        />
      </Series.Sequence>

      {/* 0:25-1:15 — Pool delivery flow (R2 freezes at 30s, D2 continues) */}
      <Series.Sequence durationInFrames={50 * FPS}>
        <DualPhoneScene
          leftClip={staticFile('recordings/R2.mp4')}
          rightClip={staticFile('recordings/D2.mp4')}
          leftEndAt={R2_FREEZE}
          callouts={[
            {text: 'New order received',           startFrame:  1 * FPS, duration: 3 * FPS, side: 'left',   color: '#06C167'},
            {text: 'Assigned to driver pool',      startFrame:  6 * FPS, duration: 3 * FPS, side: 'center', color: '#06C167'},
            {text: 'Driver notified in real time', startFrame: 11 * FPS, duration: 3 * FPS, side: 'right',  color: '#F2994A'},
            {text: 'Driver accepts delivery',      startFrame: 20 * FPS, duration: 3 * FPS, side: 'right',  color: '#F2994A'},
            {text: 'Delivery completed ✓',         startFrame: 28 * FPS, duration: 3 * FPS, side: 'right',  color: '#F2994A'},
          ]}
        />
      </Series.Sequence>

      {/* 1:15-1:20 — Section card: Flow 2 */}
      <Series.Sequence durationInFrames={5 * FPS}>
        <SectionCard
          flowNumber={2}
          title="Flow 2 — Direct Delivery"
          description="Apple Restaurant assigns a delivery directly to a specific driver"
        />
      </Series.Sequence>

      {/* 1:20-2:10 — Direct delivery flow (R3 freezes at 30s, D3 continues) */}
      <Series.Sequence durationInFrames={50 * FPS}>
        <DualPhoneScene
          leftClip={staticFile('recordings/R3.mp4')}
          rightClip={staticFile('recordings/D3.mp4')}
          leftEndAt={R2_FREEZE}
          callouts={[
            {text: 'New order received',           startFrame:  1 * FPS, duration: 3 * FPS, side: 'left',   color: '#06C167'},
            {text: 'Direct assignment — no bidding', startFrame: 6 * FPS, duration: 3 * FPS, side: 'center', color: '#06C167'},
            {text: 'Driver assigned directly',     startFrame: 11 * FPS, duration: 3 * FPS, side: 'right',  color: '#F2994A'},
            {text: 'Driver accepts',               startFrame: 20 * FPS, duration: 3 * FPS, side: 'right',  color: '#F2994A'},
            {text: 'Delivery completed ✓',         startFrame: 30 * FPS, duration: 3 * FPS, side: 'right',  color: '#F2994A'},
          ]}
        />
      </Series.Sequence>

      {/* 2:10-2:20 — End card */}
      <Series.Sequence durationInFrames={10 * FPS}>
        <TitleCard variant="end" />
      </Series.Sequence>
    </Series>
  );
};
