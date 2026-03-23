import React from 'react';

const PHONE_W = 380;
const PHONE_H = 820;
const CORNER_R = 46;
const BEZEL = 5;
const SCREEN_W = PHONE_W - BEZEL * 2;
const SCREEN_H = PHONE_H - BEZEL * 2;
const SCREEN_CORNER_R = CORNER_R - 2;
const DI_W = 116;
const DI_H = 34;
const DI_X = (PHONE_W - DI_W) / 2;
const DI_Y = 12;
const DI_R = DI_H / 2;

interface IPhoneFrameProps {
  width?: number;
  height?: number;
  children?: React.ReactNode;
}

export const IPhoneFrame: React.FC<IPhoneFrameProps> = ({
  width = PHONE_W,
  height = PHONE_H,
  children,
}) => {
  const scaleX = width / PHONE_W;
  const scaleY = height / PHONE_H;

  return (
    <div
      style={{
        width,
        height,
        position: 'relative',
        transform: `scale(${scaleX}, ${scaleY})`,
        transformOrigin: 'top left',
      }}
    >
      {/* Phone bezel */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: '#1c1c1e',
          borderRadius: CORNER_R,
          boxShadow: '0 0 0 1.5px #3a3a3c, 0 24px 64px rgba(0,0,0,0.7)',
        }}
      />

      {/* Screen area — clips video */}
      <div
        style={{
          position: 'absolute',
          left: BEZEL,
          top: BEZEL,
          width: SCREEN_W,
          height: SCREEN_H,
          borderRadius: SCREEN_CORNER_R,
          overflow: 'hidden',
          background: '#000',
        }}
      >
        {children}
      </div>

      {/* Dynamic Island */}
      <div
        style={{
          position: 'absolute',
          left: DI_X,
          top: DI_Y,
          width: DI_W,
          height: DI_H,
          borderRadius: DI_R,
          background: '#000',
          zIndex: 10,
        }}
      />

      {/* Side buttons (decorative) */}
      <div
        style={{
          position: 'absolute',
          right: -3,
          top: 140,
          width: 3,
          height: 72,
          background: '#2c2c2e',
          borderRadius: '0 2px 2px 0',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: -3,
          top: 120,
          width: 3,
          height: 44,
          background: '#2c2c2e',
          borderRadius: '2px 0 0 2px',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: -3,
          top: 180,
          width: 3,
          height: 44,
          background: '#2c2c2e',
          borderRadius: '2px 0 0 2px',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: -3,
          top: 240,
          width: 3,
          height: 44,
          background: '#2c2c2e',
          borderRadius: '2px 0 0 2px',
        }}
      />
    </div>
  );
};
