import { supabase } from '../../lib/supabase';
import { ProjectData, SVGGeneration, VideoJob } from './project-types';

export class StorageService {
  async createSVGGeneration(data: Omit<SVGGeneration, 'id' | 'created_at'>): Promise<SVGGeneration> {
    const { data: result, error } = await supabase
      .from('svg_generations')
      .insert({
        prompt: data.prompt,
        gamma_generation_id: data.gamma_generation_id,
        gamma_url: data.gamma_url,
        svg_url: data.svg_url,
        svg_content: data.svg_content,
        paths: data.paths,
        dimensions: data.dimensions,
        status: data.status,
      })
      .select()
      .single();

    if (error) throw error;
    return result;
  }

  async updateSVGGeneration(id: string, data: Partial<SVGGeneration>): Promise<SVGGeneration> {
    const { data: result, error } = await supabase
      .from('svg_generations')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return result;
  }

  async getSVGGeneration(id: string): Promise<SVGGeneration | null> {
    const { data, error } = await supabase
      .from('svg_generations')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  async createProject(data: Omit<ProjectData, 'id' | 'created_at' | 'updated_at'>): Promise<ProjectData> {
    const { data: result, error } = await supabase
      .from('projects')
      .insert({
        title: data.title,
        svg_generation_id: data.svg_generation.id,
        animation_config: data.animation_config,
      })
      .select()
      .single();

    if (error) throw error;

    const svgGeneration = await this.getSVGGeneration(data.svg_generation.id);
    return {
      ...result,
      svg_generation: svgGeneration!,
    };
  }

  async getProject(id: string): Promise<ProjectData | null> {
    const { data, error } = await supabase
      .from('projects')
      .select(`
        *,
        svg_generation:svg_generations(*)
      `)
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  async updateProject(id: string, data: Partial<ProjectData>): Promise<ProjectData> {
    const { data: result, error } = await supabase
      .from('projects')
      .update({
        title: data.title,
        animation_config: data.animation_config,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    const project = await this.getProject(id);
    return project!;
  }

  async listProjects(): Promise<ProjectData[]> {
    const { data, error } = await supabase
      .from('projects')
      .select(`
        *,
        svg_generation:svg_generations(*)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async createVideoJob(projectId: string): Promise<VideoJob> {
    const { data, error } = await supabase
      .from('video_jobs')
      .insert({
        project_id: projectId,
        status: 'queued',
        progress: 0,
        rendered_frames: 0,
        total_frames: 0,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateVideoJob(id: string, data: Partial<VideoJob>): Promise<VideoJob> {
    const { data: result, error } = await supabase
      .from('video_jobs')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return result;
  }

  async getVideoJob(id: string): Promise<VideoJob | null> {
    const { data, error } = await supabase
      .from('video_jobs')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data;
  }
}
