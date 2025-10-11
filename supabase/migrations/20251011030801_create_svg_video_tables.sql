/*
  # SVG to Video Conversion System Schema

  1. New Tables
    - `svg_generations`
      - `id` (uuid, primary key)
      - `prompt` (text) - The prompt used to generate the SVG
      - `svg_url` (text) - URL to the generated SVG file
      - `svg_content` (text) - Raw SVG content
      - `status` (text) - Generation status: pending, completed, failed
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `svg_paths`
      - `id` (uuid, primary key)
      - `svg_generation_id` (uuid, foreign key)
      - `path_data` (text) - The SVG path d attribute
      - `path_index` (integer) - Order of the path in the SVG
      - `length` (numeric) - Calculated path length
      - `stroke` (text) - Stroke color
      - `fill` (text) - Fill color
      - `stroke_width` (numeric) - Stroke width
      - `created_at` (timestamptz)
    
    - `video_jobs`
      - `id` (uuid, primary key)
      - `svg_generation_id` (uuid, foreign key)
      - `animation_config` (jsonb) - Animation configuration object
      - `status` (text) - Job status: queued, rendering, completed, failed
      - `progress` (integer) - Rendering progress 0-100
      - `output_url` (text) - URL to the rendered video
      - `error_message` (text) - Error details if failed
      - `created_at` (timestamptz)
      - `completed_at` (timestamptz)
    
    - `api_usage`
      - `id` (uuid, primary key)
      - `api_name` (text) - API name: recraft, gamma
      - `request_count` (integer) - Number of requests
      - `estimated_cost` (numeric) - Estimated cost in USD
      - `timestamp` (timestamptz)

  2. Storage Buckets
    - `svg-files` - For storing generated SVG files
    - `rendered-videos` - For storing output video files

  3. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
*/

-- Create svg_generations table
CREATE TABLE IF NOT EXISTS svg_generations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt text NOT NULL,
  svg_url text,
  svg_content text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create svg_paths table
CREATE TABLE IF NOT EXISTS svg_paths (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  svg_generation_id uuid NOT NULL REFERENCES svg_generations(id) ON DELETE CASCADE,
  path_data text NOT NULL,
  path_index integer NOT NULL DEFAULT 0,
  length numeric DEFAULT 0,
  stroke text,
  fill text,
  stroke_width numeric,
  created_at timestamptz DEFAULT now()
);

-- Create video_jobs table
CREATE TABLE IF NOT EXISTS video_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  svg_generation_id uuid NOT NULL REFERENCES svg_generations(id) ON DELETE CASCADE,
  animation_config jsonb NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'queued',
  progress integer DEFAULT 0,
  output_url text,
  error_message text,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

-- Create api_usage table
CREATE TABLE IF NOT EXISTS api_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  api_name text NOT NULL,
  request_count integer DEFAULT 1,
  estimated_cost numeric DEFAULT 0,
  timestamp timestamptz DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_svg_paths_svg_id ON svg_paths(svg_generation_id);
CREATE INDEX IF NOT EXISTS idx_video_jobs_svg_id ON video_jobs(svg_generation_id);
CREATE INDEX IF NOT EXISTS idx_video_jobs_status ON video_jobs(status);
CREATE INDEX IF NOT EXISTS idx_api_usage_timestamp ON api_usage(timestamp);

-- Enable Row Level Security
ALTER TABLE svg_generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE svg_paths ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (since there's no auth in the current setup)
CREATE POLICY "Allow public read access to svg_generations"
  ON svg_generations FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow public insert to svg_generations"
  ON svg_generations FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow public update to svg_generations"
  ON svg_generations FOR UPDATE
  TO anon
  USING (true);

CREATE POLICY "Allow public read access to svg_paths"
  ON svg_paths FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow public insert to svg_paths"
  ON svg_paths FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow public read access to video_jobs"
  ON video_jobs FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow public insert to video_jobs"
  ON video_jobs FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow public update to video_jobs"
  ON video_jobs FOR UPDATE
  TO anon
  USING (true);

CREATE POLICY "Allow public read access to api_usage"
  ON api_usage FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow public insert to api_usage"
  ON api_usage FOR INSERT
  TO anon
  WITH CHECK (true);

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('svg-files', 'svg-files', true),
  ('rendered-videos', 'rendered-videos', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies
CREATE POLICY "Public read access to svg-files"
  ON storage.objects FOR SELECT
  TO anon
  USING (bucket_id = 'svg-files');

CREATE POLICY "Public insert to svg-files"
  ON storage.objects FOR INSERT
  TO anon
  WITH CHECK (bucket_id = 'svg-files');

CREATE POLICY "Public read access to rendered-videos"
  ON storage.objects FOR SELECT
  TO anon
  USING (bucket_id = 'rendered-videos');

CREATE POLICY "Public insert to rendered-videos"
  ON storage.objects FOR INSERT
  TO anon
  WITH CHECK (bucket_id = 'rendered-videos');
