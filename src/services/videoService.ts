import { supabase } from '../lib/supabase';
import { SVGPathData, AnimationConfig, VideoJob } from '../types';

export class VideoService {
  async createVideoJob(
    svgGenerationId: string,
    paths: SVGPathData[],
    config: AnimationConfig
  ): Promise<string> {
    const { data, error } = await supabase
      .from('video_jobs')
      .insert({
        svg_generation_id: svgGenerationId,
        animation_config: config,
        status: 'queued',
        progress: 0,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create video job: ${error.message}`);
    }

    return data.id;
  }

  async updateJobProgress(jobId: string, progress: number): Promise<void> {
    const { error } = await supabase
      .from('video_jobs')
      .update({ progress })
      .eq('id', jobId);

    if (error) {
      throw new Error(`Failed to update job progress: ${error.message}`);
    }
  }

  async updateJobStatus(
    jobId: string,
    status: VideoJob['status'],
    outputUrl?: string,
    errorMessage?: string
  ): Promise<void> {
    const updates: Partial<VideoJob> = {
      status,
      ...(outputUrl && { output_url: outputUrl }),
      ...(errorMessage && { error_message: errorMessage }),
      ...(status === 'completed' || status === 'failed' ? { completed_at: new Date().toISOString() } : {}),
    };

    const { error } = await supabase
      .from('video_jobs')
      .update(updates)
      .eq('id', jobId);

    if (error) {
      throw new Error(`Failed to update job status: ${error.message}`);
    }
  }

  async getVideoJob(jobId: string): Promise<VideoJob | null> {
    const { data, error } = await supabase
      .from('video_jobs')
      .select('*')
      .eq('id', jobId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to get video job: ${error.message}`);
    }

    return data;
  }

  async listVideoJobs(limit = 50): Promise<VideoJob[]> {
    const { data, error } = await supabase
      .from('video_jobs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to list video jobs: ${error.message}`);
    }

    return data || [];
  }

  async uploadVideoToStorage(file: Blob, filename: string): Promise<string> {
    const { data, error } = await supabase.storage
      .from('rendered-videos')
      .upload(filename, file, {
        contentType: 'video/mp4',
        upsert: false,
      });

    if (error) {
      throw new Error(`Failed to upload video: ${error.message}`);
    }

    const { data: urlData } = supabase.storage
      .from('rendered-videos')
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  }
}

export const videoService = new VideoService();
