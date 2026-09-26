import { Composition, registerRoot } from 'remotion';
import { SVGComposition } from '../components/remotion/SVGComposition';
import { MING_DURATION, MingVideo } from '../videos/ming/MingVideo';

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
        id="MingIndustrialParty"
        component={MingVideo}
        durationInFrames={MING_DURATION}
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
};

registerRoot(RemotionRoot);
