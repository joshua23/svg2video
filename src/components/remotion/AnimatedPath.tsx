import { evolvePath } from '@remotion/paths';
import { SVGPathData } from '../../types';

interface AnimatedPathProps {
  pathData: SVGPathData;
  progress: number;
}

export const AnimatedPath: React.FC<AnimatedPathProps> = ({ pathData, progress }) => {
  const evolution = evolvePath(progress, pathData.pathData);

  return (
    <path
      d={pathData.pathData}
      stroke={pathData.stroke}
      fill={pathData.fill}
      strokeWidth={pathData.strokeWidth}
      strokeDasharray={evolution.strokeDasharray}
      strokeDashoffset={evolution.strokeDashoffset}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
};
