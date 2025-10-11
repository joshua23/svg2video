import { supabase } from '../lib/supabase';
import { SVGGeneration, SVGPathData } from '../types';

export class SVGGenerationService {
  async createGeneration(prompt: string): Promise<string> {
    const { data, error } = await supabase
      .from('svg_generations')
      .insert({
        prompt,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create SVG generation: ${error.message}`);
    }

    return data.id;
  }

  async updateGeneration(
    id: string,
    updates: Partial<Pick<SVGGeneration, 'svg_url' | 'status'>>
  ): Promise<void> {
    const { error } = await supabase
      .from('svg_generations')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to update SVG generation: ${error.message}`);
    }
  }

  async savePaths(generationId: string, paths: SVGPathData[]): Promise<void> {
    const pathRecords = paths.map((path) => ({
      svg_generation_id: generationId,
      path_data: path.pathData,
      path_index: path.index,
      length: path.length,
      stroke: path.stroke,
      fill: path.fill,
      stroke_width: path.strokeWidth,
    }));

    const { error } = await supabase.from('svg_paths').insert(pathRecords);

    if (error) {
      throw new Error(`Failed to save paths: ${error.message}`);
    }
  }

  async getGeneration(id: string): Promise<SVGGeneration | null> {
    const { data, error } = await supabase
      .from('svg_generations')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to get SVG generation: ${error.message}`);
    }

    return data;
  }

  async getGenerationWithPaths(id: string): Promise<(SVGGeneration & { paths: SVGPathData[] }) | null> {
    const { data: generation, error: genError } = await supabase
      .from('svg_generations')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (genError || !generation) {
      return null;
    }

    const { data: paths, error: pathsError } = await supabase
      .from('svg_paths')
      .select('*')
      .eq('svg_generation_id', id)
      .order('path_index', { ascending: true });

    if (pathsError) {
      throw new Error(`Failed to get paths: ${pathsError.message}`);
    }

    const formattedPaths: SVGPathData[] = (paths || []).map((p) => ({
      id: p.id,
      pathData: p.path_data,
      length: p.length,
      stroke: p.stroke || undefined,
      fill: p.fill || undefined,
      strokeWidth: p.stroke_width || undefined,
      index: p.path_index,
    }));

    return {
      ...generation,
      paths: formattedPaths,
    };
  }

  async listGenerations(limit = 50): Promise<SVGGeneration[]> {
    const { data, error } = await supabase
      .from('svg_generations')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to list SVG generations: ${error.message}`);
    }

    return data || [];
  }

  async uploadSVGToStorage(svgContent: string, filename: string): Promise<string> {
    const blob = new Blob([svgContent], { type: 'image/svg+xml' });

    const { data, error } = await supabase.storage
      .from('svg-files')
      .upload(filename, blob, {
        contentType: 'image/svg+xml',
        upsert: false,
      });

    if (error) {
      throw new Error(`Failed to upload SVG: ${error.message}`);
    }

    const { data: urlData } = supabase.storage
      .from('svg-files')
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  }
}

export const svgGenerationService = new SVGGenerationService();
