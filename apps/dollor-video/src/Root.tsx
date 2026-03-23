import React from 'react';
import {Composition, registerRoot} from 'remotion';
import {Video} from './Video';

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="DollorDemo"
      component={Video}
      durationInFrames={4200}
      fps={30}
      width={1920}
      height={1080}
    />
  );
};

registerRoot(RemotionRoot);
