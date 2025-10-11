export interface RecraftGenerationRequest {
  prompt: string;
  style?: 'realistic_image' | 'digital_illustration' | 'vector_illustration' | 'icon';
  size?: string;
  model?: 'recraftv3' | 'recraft20b';
}

export interface RecraftGenerationResponse {
  data: Array<{
    url: string;
    b64_json?: string;
  }>;
  created: number;
}

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
  svg_url: string;
  paths: SVGPathData[];
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

export interface VideoJob {
  id: string;
  svg_generation_id: string;
  animation_config: AnimationConfig;
  status: 'queued' | 'rendering' | 'completed' | 'failed';
  progress: number;
  output_url?: string;
  error_message?: string;
  created_at: string;
  completed_at?: string;
}

export interface ApiUsageRecord {
  id: string;
  api_name: 'recraft' | 'gamma';
  request_count: number;
  estimated_cost: number;
  timestamp: string;
}
