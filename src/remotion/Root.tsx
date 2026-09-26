import { Composition, registerRoot } from 'remotion';
import { SVGComposition } from '../components/remotion/SVGComposition';
import { FatherAndSon, FPS, TOTAL_FRAMES } from '../films/father-and-son/FatherAndSon';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="SVGVideoComposition"
        component={SVGComposition}
        durationInFrames={600}
        fps={60}
        width={1920}
        height={1080}
        defaultProps={{
          svgContent: '',
          paths: [],
          animationConfig: {
            duration: 10,
            fps: 60,
            width: 1920,
            height: 1080,
            backgroundColor: '#ffffff',
            pathAnimationMode: 'sequential' as const,
            staggerDelay: 0.1,
            easingFunction: 'spring' as const,
          },
        }}
      />
      <Composition
        id="FatherAndSon"
        component={FatherAndSon}
        durationInFrames={TOTAL_FRAMES}
        fps={FPS}
        width={1920}
        height={1080}
      />
    </>
  );
};

registerRoot(RemotionRoot);
