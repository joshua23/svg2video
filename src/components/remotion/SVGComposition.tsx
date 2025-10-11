import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { SVGPathData, AnimationConfig } from '../../modules/shared/project-types';
import { AnimatedPath } from './AnimatedPath';

interface SVGCompositionProps {
  svgContent?: string;
  paths: SVGPathData[];
  animationConfig: AnimationConfig;
  viewBox?: string;
}

export const SVGComposition: React.FC<SVGCompositionProps> = ({ paths, animationConfig, viewBox }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const calculateProgress = (pathIndex: number): number => {
    if (animationConfig.pathAnimationMode === 'parallel') {
      if (animationConfig.easingFunction === 'spring') {
        return spring({
          frame,
          fps,
          config: { damping: 100, stiffness: 200 },
        });
      }
      return interpolate(frame, [0, animationConfig.duration * fps], [0, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      });
    }

    if (animationConfig.pathAnimationMode === 'sequential') {
      const framesPerPath = (animationConfig.duration * fps) / paths.length;
      const pathStartFrame = pathIndex * framesPerPath;
      const pathEndFrame = pathStartFrame + framesPerPath;

      if (animationConfig.easingFunction === 'spring') {
        return spring({
          frame: frame - pathStartFrame,
          fps,
          config: { damping: 100, stiffness: 200 },
        });
      }

      return interpolate(frame, [pathStartFrame, pathEndFrame], [0, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      });
    }

    if (animationConfig.pathAnimationMode === 'staggered') {
      const staggerDelay = animationConfig.staggerDelay || 5;
      const pathStartFrame = pathIndex * staggerDelay;
      const animationDuration = animationConfig.duration * fps - (paths.length - 1) * staggerDelay;
      const pathEndFrame = pathStartFrame + animationDuration;

      if (animationConfig.easingFunction === 'spring') {
        return spring({
          frame: frame - pathStartFrame,
          fps,
          config: { damping: 100, stiffness: 200 },
        });
      }

      return interpolate(frame, [pathStartFrame, pathEndFrame], [0, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      });
    }

    return 0;
  };

  return (
    <AbsoluteFill
      style={{
        backgroundColor: animationConfig.backgroundColor,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <svg
        width={animationConfig.width}
        height={animationConfig.height}
        viewBox={viewBox || `0 0 ${animationConfig.width} ${animationConfig.height}`}
        style={{
          maxWidth: '100%',
          maxHeight: '100%',
        }}
      >
        {paths.map((path, index) => (
          <AnimatedPath key={path.id} pathData={path} progress={calculateProgress(index)} />
        ))}
      </svg>
    </AbsoluteFill>
  );
};
