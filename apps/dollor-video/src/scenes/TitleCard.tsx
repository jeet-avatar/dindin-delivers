import React from 'react';
import {staticFile, useCurrentFrame} from 'remotion';
import {fadeIn, fadeOut} from '../utils/spring';

interface TitleCardProps {
  variant: 'intro' | 'end';
}

export const TitleCard: React.FC<TitleCardProps> = ({variant}) => {
  const frame = useCurrentFrame();

  const opacity = variant === 'intro'
    ? fadeIn(frame, 0, 20)
    : fadeOut(frame, 0, 30);

  const title = variant === 'intro'
    ? 'Restaurant & Driver App Demo'
    : 'Connecting Restaurants & Drivers';

  const subtitle = variant === 'intro'
    ? 'Dollor.ai — How It Works'
    : 'dollor.ai';

  return (
    <div
      style={{
        width: 1920,
        height: 1080,
        background: '#0a0a0a',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        opacity,
        fontFamily: '-apple-system, "SF Pro Display", Arial, sans-serif',
      }}
    >
      {/* $ Logo */}
      <div
        style={{
          width: 96,
          height: 96,
          marginBottom: 32,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <img
          src={staticFile('logo.svg')}
          style={{width: 96, height: 96}}
          alt="Dollor.ai"
        />
      </div>

      {/* Title */}
      <div
        style={{
          fontSize: 52,
          fontWeight: 700,
          color: '#ffffff',
          letterSpacing: '-0.5px',
          textAlign: 'center',
          marginBottom: 16,
        }}
      >
        {title}
      </div>

      {/* Subtitle */}
      <div
        style={{
          fontSize: 26,
          fontWeight: 400,
          color: '#888888',
          letterSpacing: '0.5px',
          textAlign: 'center',
        }}
      >
        {subtitle}
      </div>

      {/* Dollor green accent line */}
      <div
        style={{
          width: 64,
          height: 3,
          background: '#06C167',
          borderRadius: 2,
          marginTop: 32,
        }}
      />
    </div>
  );
};
