import { Composition, registerRoot } from "remotion";
import { Video } from "./Video";

export const RemotionRoot = () => {
  return (
    <Composition
      id="InterviewWalkthrough"
      component={Video}
      durationInFrames={4590}
      fps={30}
      width={1920}
      height={1080}
    />
  );
};

registerRoot(RemotionRoot);
