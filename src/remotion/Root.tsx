import { Composition, registerRoot } from 'remotion';
import { SVGComposition } from '../components/remotion/SVGComposition';
import { AfantiKarez } from './afanti/AfantiKarez';
import { AfantiKarez3D } from './afanti3d/AfantiKarez3D';
import { DURATION_FRAMES, FPS } from './afanti/plan';

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
        id="AfantiKarez"
        component={AfantiKarez}
        durationInFrames={DURATION_FRAMES}
        fps={FPS}
        width={1920}
        height={1080}
      />
      <Composition
        id="AfantiKarez3D"
        component={AfantiKarez3D}
        durationInFrames={DURATION_FRAMES}
        fps={FPS}
        width={1920}
        height={1080}
      />
    </>
  );
};

registerRoot(RemotionRoot);
