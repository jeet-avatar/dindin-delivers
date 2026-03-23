import React from 'react';
import {useCurrentFrame} from 'remotion';
import {fadeIn, fadeOut} from '../utils/spring';

interface SectionCardProps {
  flowNumber: number;
  title: string;
  description: string;
}

export const SectionCard: React.FC<SectionCardProps> = ({
  flowNumber,
  title,
  description,
}) => {
  const frame = useCurrentFrame();

  // 120-frame section card: fade in 10f, hold 100f, fade out 10f
  const opacity =
    frame < 10
      ? fadeIn(frame, 0, 10)
      : frame > 110
      ? fadeOut(frame, 110, 10)
      : 1;

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
      {/* Flow number badge */}
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '2px',
          color: '#FFD700',
          textTransform: 'uppercase',
          marginBottom: 20,
        }}
      >
        Flow {flowNumber}
      </div>

      {/* Title */}
      <div
        style={{
          fontSize: 52,
          fontWeight: 700,
          color: '#ffffff',
          letterSpacing: '-0.5px',
          textAlign: 'center',
          marginBottom: 20,
        }}
      >
        {title}
      </div>

      {/* Description */}
      <div
        style={{
          fontSize: 22,
          fontWeight: 400,
          color: '#888888',
          textAlign: 'center',
          maxWidth: 800,
          lineHeight: 1.5,
        }}
      >
        {description}
      </div>

      {/* Green accent bar */}
      <div
        style={{
          width: 48,
          height: 3,
          background: '#06C167',
          borderRadius: 2,
          marginTop: 36,
        }}
      />
    </div>
  );
};
