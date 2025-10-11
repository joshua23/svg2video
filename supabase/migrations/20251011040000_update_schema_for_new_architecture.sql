/*
  # Update Schema for New Architecture

  1. Changes
    - Add projects table to organize SVG generations
    - Update svg_generations table to include Gamma-specific fields
    - Add paths array directly to svg_generations (JSONB)
    - Add dimensions field to svg_generations
    - Update video_jobs to reference projects instead of svg_generations

  2. Security
    - Enable RLS on projects table
    - Update policies for new structure
*/

-- Create projects table
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  svg_generation_id uuid NOT NULL REFERENCES svg_generations(id) ON DELETE CASCADE,
  animation_config jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add new fields to svg_generations
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'svg_generations' AND column_name = 'gamma_generation_id'
  ) THEN
    ALTER TABLE svg_generations ADD COLUMN gamma_generation_id text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'svg_generations' AND column_name = 'gamma_url'
  ) THEN
    ALTER TABLE svg_generations ADD COLUMN gamma_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'svg_generations' AND column_name = 'paths'
  ) THEN
    ALTER TABLE svg_generations ADD COLUMN paths jsonb DEFAULT '[]';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'svg_generations' AND column_name = 'dimensions'
  ) THEN
    ALTER TABLE svg_generations ADD COLUMN dimensions jsonb DEFAULT '{}';
  END IF;
END $$;

-- Update video_jobs to reference projects
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'video_jobs' AND column_name = 'project_id'
  ) THEN
    ALTER TABLE video_jobs ADD COLUMN project_id uuid REFERENCES projects(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'video_jobs' AND column_name = 'rendered_frames'
  ) THEN
    ALTER TABLE video_jobs ADD COLUMN rendered_frames integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'video_jobs' AND column_name = 'total_frames'
  ) THEN
    ALTER TABLE video_jobs ADD COLUMN total_frames integer DEFAULT 0;
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_projects_svg_generation ON projects(svg_generation_id);
CREATE INDEX IF NOT EXISTS idx_video_jobs_project_id ON video_jobs(project_id);

-- Enable RLS on projects
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Create policies for projects
CREATE POLICY "Allow public read access to projects"
  ON projects FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow public insert to projects"
  ON projects FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow public update to projects"
  ON projects FOR UPDATE
  TO anon
  USING (true);
