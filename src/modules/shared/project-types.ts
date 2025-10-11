export interface SVGPathData {
  id: string;
  pathData: string;
  length: number;
  stroke?: string;
  fill?: string;
  strokeWidth?: number;
  index: number;
}

export interface SVGGeneration {
  id: string;
  prompt: string;
  gamma_generation_id?: string;
  gamma_url?: string;
  svg_url: string;
  svg_content?: string;
  paths: SVGPathData[];
  dimensions?: {
    width: number;
    height: number;
    viewBox?: string;
  };
  created_at: string;
  status: 'pending' | 'completed' | 'failed';
}

export interface AnimationConfig {
  duration: number;
  fps: number;
  width: number;
  height: number;
  backgroundColor: string;
  pathAnimationMode: 'sequential' | 'parallel' | 'staggered';
  staggerDelay?: number;
  easingFunction?: 'linear' | 'spring' | 'ease-in' | 'ease-out';
}

export interface ProjectData {
  id: string;
  title: string;
  svg_generation: SVGGeneration;
  animation_config: AnimationConfig;
  created_at: string;
  updated_at: string;
}

export interface VideoJob {
  id: string;
  project_id: string;
  status: 'queued' | 'bundling' | 'selecting' | 'rendering' | 'completed' | 'failed';
  progress: number;
  rendered_frames: number;
  total_frames: number;
  output_url?: string;
  error_message?: string;
  created_at: string;
  completed_at?: string;
}
