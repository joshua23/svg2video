import { Composition, registerRoot } from 'remotion';
import { SVGComposition } from '../components/remotion/SVGComposition';

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
    </>
  );
};

registerRoot(RemotionRoot);
