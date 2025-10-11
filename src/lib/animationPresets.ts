import { AnimationConfig } from '../types';

export const animationPresets: Record<string, Partial<AnimationConfig>> = {
  fast: {
    duration: 3,
    fps: 30,
    pathAnimationMode: 'parallel',
    easingFunction: 'linear',
    backgroundColor: '#ffffff',
  },
  slow: {
    duration: 10,
    fps: 30,
    pathAnimationMode: 'sequential',
    easingFunction: 'spring',
    backgroundColor: '#ffffff',
  },
  smooth: {
    duration: 5,
    fps: 60,
    pathAnimationMode: 'staggered',
    staggerDelay: 10,
    easingFunction: 'spring',
    backgroundColor: '#ffffff',
  },
  artistic: {
    duration: 7,
    fps: 30,
    pathAnimationMode: 'staggered',
    staggerDelay: 15,
    easingFunction: 'spring',
    backgroundColor: '#f5f5f5',
  },
  technical: {
    duration: 4,
    fps: 60,
    pathAnimationMode: 'sequential',
    easingFunction: 'linear',
    backgroundColor: '#1a1a1a',
  },
};

export const defaultAnimationConfig: AnimationConfig = {
  duration: 5,
  fps: 30,
  width: 1920,
  height: 1080,
  backgroundColor: '#ffffff',
  pathAnimationMode: 'sequential',
  easingFunction: 'spring',
};

export const getAnimationConfig = (
  presetName?: string,
  overrides?: Partial<AnimationConfig>
): AnimationConfig => {
  const preset = presetName ? animationPresets[presetName] : {};

  return {
    ...defaultAnimationConfig,
    ...preset,
    ...overrides,
  };
};
