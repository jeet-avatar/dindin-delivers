import React from 'react';
import {Freeze, OffthreadVideo, useCurrentFrame} from 'remotion';
import {IPhoneFrame} from './IPhoneFrame';

interface PhoneVideoProps {
  src: string;
  startFrom?: number;   // skip N frames at start of source clip
  endAt?: number;       // freeze clip at this frame within the composition sequence
  width?: number;
  height?: number;
}

export const PhoneVideo: React.FC<PhoneVideoProps> = ({
  src,
  startFrom = 0,
  endAt,
  width = 380,
  height = 820,
}) => {
  const frame = useCurrentFrame();
  const shouldFreeze = endAt !== undefined && frame >= endAt;

  const videoEl = (
    <OffthreadVideo
      src={src}
      startFrom={startFrom}
      style={{width: '100%', height: '100%', objectFit: 'cover'}}
    />
  );

  return (
    <IPhoneFrame width={width} height={height}>
      {shouldFreeze && endAt !== undefined ? (
        <Freeze frame={endAt}>{videoEl}</Freeze>
      ) : (
        videoEl
      )}
    </IPhoneFrame>
  );
};
