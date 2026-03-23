import React from 'react';
import {staticFile} from 'remotion';
import {PhoneVideo} from '../components/PhoneVideo';
import {Callout, CalloutConfig} from '../components/Callout';

const PHONE_W = 380;
const PHONE_H = 820;

// Phone center positions on 1920×1080 canvas
const LEFT_CENTER_X = 480;
const RIGHT_CENTER_X = 1440;
const CENTER_Y = 530;

// Top-left corner of each phone
const LEFT_X = LEFT_CENTER_X - PHONE_W / 2;   // 290
const LEFT_Y = CENTER_Y - PHONE_H / 2;         // 120
const RIGHT_X = RIGHT_CENTER_X - PHONE_W / 2;  // 1250
const RIGHT_Y = CENTER_Y - PHONE_H / 2;        // 120

interface DualPhoneSceneProps {
  leftClip: string;
  rightClip: string;
  leftStartFrom?: number;
  rightStartFrom?: number;
  leftEndAt?: number;    // freeze left phone at this frame within this sequence
  rightEndAt?: number;
  leftLabel?: string;    // label under left phone, default 'Restaurant'
  rightLabel?: string;   // label under right phone, default 'Driver'
  callouts: CalloutConfig[];
}

export const DualPhoneScene: React.FC<DualPhoneSceneProps> = ({
  leftClip,
  rightClip,
  leftStartFrom = 0,
  rightStartFrom = 0,
  leftEndAt,
  rightEndAt,
  leftLabel = 'Restaurant',
  rightLabel = 'Driver',
  callouts,
}) => {
  return (
    <div
      style={{
        width: 1920,
        height: 1080,
        background: '#0a0a0a',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Left phone */}
      <div style={{position: 'absolute', left: LEFT_X, top: LEFT_Y}}>
        <PhoneVideo
          src={leftClip}
          startFrom={leftStartFrom}
          endAt={leftEndAt}
          width={PHONE_W}
          height={PHONE_H}
        />
      </div>

      {/* Left label */}
      <div
        style={{
          position: 'absolute',
          left: LEFT_X,
          top: LEFT_Y + PHONE_H + 14,
          width: PHONE_W,
          textAlign: 'center',
          fontSize: 13,
          fontWeight: 700,
          letterSpacing: '1.5px',
          textTransform: 'uppercase',
          color: '#06C167',
          fontFamily: '-apple-system, "SF Pro Text", Arial, sans-serif',
        }}
      >
        {leftLabel}
      </div>

      {/* Right phone */}
      <div style={{position: 'absolute', left: RIGHT_X, top: RIGHT_Y}}>
        <PhoneVideo
          src={rightClip}
          startFrom={rightStartFrom}
          endAt={rightEndAt}
          width={PHONE_W}
          height={PHONE_H}
        />
      </div>

      {/* Right label */}
      <div
        style={{
          position: 'absolute',
          left: RIGHT_X,
          top: RIGHT_Y + PHONE_H + 14,
          width: PHONE_W,
          textAlign: 'center',
          fontSize: 13,
          fontWeight: 700,
          letterSpacing: '1.5px',
          textTransform: 'uppercase',
          color: '#F2994A',
          fontFamily: '-apple-system, "SF Pro Text", Arial, sans-serif',
        }}
      >
        {rightLabel}
      </div>

      {/* Center channel connector line (subtle) */}
      <div
        style={{
          position: 'absolute',
          left: LEFT_X + PHONE_W + 20,
          top: CENTER_Y - 1,
          width: RIGHT_X - (LEFT_X + PHONE_W) - 40,
          height: 1,
          background: 'rgba(255,255,255,0.06)',
        }}
      />

      {/* Callouts */}
      {callouts.map((c, i) => (
        <Callout key={i} {...c} />
      ))}
    </div>
  );
};
