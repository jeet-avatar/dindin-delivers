import React from 'react';
import brand from '../../config/brand';

interface LogoProps {
  variant?: 'full' | 'icon' | 'text';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  theme?: 'light' | 'dark';
  className?: string;
}

const sizeMap = {
  sm: { height: 32, fontSize: 20, iconSize: 28 },
  md: { height: 48, fontSize: 28, iconSize: 40 },
  lg: { height: 64, fontSize: 36, iconSize: 56 },
  xl: { height: 80, fontSize: 44, iconSize: 72 },
};

export const Logo: React.FC<LogoProps> = ({
  variant = 'full',
  size = 'md',
  theme: _theme = 'light',
  className = '',
}) => {
  const { height, fontSize, iconSize } = sizeMap[size];
  // Theme support reserved for future use
  void _theme;

  if (variant === 'icon') {
    return (
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 64 64"
        className={className}
        aria-label={`${brand.name} logo`}
      >
        <defs>
          <linearGradient id="dollarGradIcon" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{ stopColor: brand.colors.primary }} />
            <stop offset="100%" style={{ stopColor: brand.colors.primaryDark }} />
          </linearGradient>
        </defs>
        <circle cx="32" cy="32" r="30" fill="url(#dollarGradIcon)" />
        <text
          x="32"
          y="45"
          fontFamily="Arial Black, sans-serif"
          fontSize="36"
          fontWeight="900"
          fill="white"
          textAnchor="middle"
        >
          $
        </text>
      </svg>
    );
  }

  if (variant === 'text') {
    return (
      <span
        className={className}
        style={{
          fontFamily: 'Arial Black, sans-serif',
          fontSize: `${fontSize}px`,
          fontWeight: 900,
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
        }}
      >
        <span style={{ color: brand.colors.primary }}>$</span>
        <span
          style={{
            background: `linear-gradient(90deg, ${brand.colors.secondary}, ${brand.colors.secondaryLight})`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          ai
        </span>
      </span>
    );
  }

  // Full logo (default)
  return (
    <div
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: size === 'sm' ? '6px' : '10px',
        height: `${height}px`,
      }}
      aria-label={`${brand.name} logo`}
    >
      {/* Dollar Circle Icon */}
      <svg width={height} height={height} viewBox="0 0 64 64">
        <defs>
          <linearGradient id={`dollarGrad-${size}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{ stopColor: brand.colors.primary }} />
            <stop offset="100%" style={{ stopColor: brand.colors.primaryDark }} />
          </linearGradient>
        </defs>
        <circle cx="32" cy="32" r="30" fill={`url(#dollarGrad-${size})`} />
        <text
          x="32"
          y="45"
          fontFamily="Arial Black, sans-serif"
          fontSize="36"
          fontWeight="900"
          fill="white"
          textAnchor="middle"
        >
          $
        </text>
      </svg>

      {/* AI Text */}
      <span
        style={{
          fontFamily: 'Arial Black, sans-serif',
          fontSize: `${fontSize}px`,
          fontWeight: 900,
          background: `linear-gradient(90deg, ${brand.colors.secondary}, ${brand.colors.secondaryLight})`,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}
      >
        ai
      </span>

      {/* Decorative dot */}
      <svg width={height * 0.15} height={height * 0.15} viewBox="0 0 8 8">
        <circle cx="4" cy="4" r="4" fill={brand.colors.secondaryLight} />
      </svg>
    </div>
  );
};

// Animated logo for loading states
export const AnimatedLogo: React.FC<Omit<LogoProps, 'variant'>> = ({
  size = 'lg',
  theme: _theme = 'light',
  className = '',
}) => {
  const { iconSize } = sizeMap[size];
  void _theme; // Theme support reserved for future use

  return (
    <div className={`animated-logo ${className}`}>
      <svg width={iconSize} height={iconSize} viewBox="0 0 64 64">
        <defs>
          <linearGradient id="animGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{ stopColor: brand.colors.primary }}>
              <animate
                attributeName="stop-color"
                values={`${brand.colors.primary};${brand.colors.secondary};${brand.colors.primary}`}
                dur="2s"
                repeatCount="indefinite"
              />
            </stop>
            <stop offset="100%" style={{ stopColor: brand.colors.primaryDark }}>
              <animate
                attributeName="stop-color"
                values={`${brand.colors.primaryDark};${brand.colors.secondaryDark};${brand.colors.primaryDark}`}
                dur="2s"
                repeatCount="indefinite"
              />
            </stop>
          </linearGradient>
        </defs>
        <circle cx="32" cy="32" r="30" fill="url(#animGrad)">
          <animate attributeName="r" values="30;28;30" dur="1s" repeatCount="indefinite" />
        </circle>
        <text
          x="32"
          y="45"
          fontFamily="Arial Black, sans-serif"
          fontSize="36"
          fontWeight="900"
          fill="white"
          textAnchor="middle"
        >
          $
        </text>
      </svg>
      <style>{`
        .animated-logo {
          animation: pulse 2s ease-in-out infinite;
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
      `}</style>
    </div>
  );
};

export default Logo;
