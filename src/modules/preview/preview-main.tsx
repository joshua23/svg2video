import React, { useEffect, useState } from 'react';
import { Player } from '@remotion/player';
import { Loader2, Play, Download } from 'lucide-react';
import { StorageService } from '../shared/storage-service';
import { ProjectData } from '../shared/project-types';
import { SVGComposition } from '../../components/remotion/SVGComposition';

export const PreviewMain: React.FC = () => {
  const [project, setProject] = useState<ProjectData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const storage = new StorageService();

  useEffect(() => {
    loadProject();
  }, []);

  const loadProject = async () => {
    try {
      const params = new URLSearchParams(window.location.search);
      const projectId = params.get('projectId');

      if (!projectId) {
        setError('未提供项目 ID');
        setLoading(false);
        return;
      }

      const projectData = await storage.getProject(projectId);

      if (!projectData) {
        setError('未找到项目');
        setLoading(false);
        return;
      }

      setProject(projectData);
      setLoading(false);
    } catch (err) {
      console.error('Error loading project:', err);
      setError(err instanceof Error ? err.message : '加载项目失败');
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (project) {
      window.location.href = `/export.html?projectId=${project.id}`;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin text-blue-500 mx-auto mb-4" size={48} />
          <p className="text-slate-300 text-lg">正在加载项目...</p>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="bg-red-900/20 border-2 border-red-500 rounded-xl p-8 max-w-md">
          <p className="text-red-400 text-lg">{error || '未找到项目'}</p>
          <button
            onClick={() => window.location.href = '/editor.html'}
            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
返回编辑器
          </button>
        </div>
      </div>
    );
  }

  const durationInFrames = Math.ceil(project.animation_config.duration * project.animation_config.fps);

  return (
    <div className="min-h-screen bg-slate-900">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">{project.title}</h1>
            <p className="text-slate-400">预览你的 SVG 动画</p>
          </div>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg"
          >
            <Download size={20} />
导出视频
          </button>
        </div>

        <div className="bg-slate-800 rounded-2xl p-6 shadow-2xl">
          <div className="aspect-video bg-black rounded-lg overflow-hidden">
            <Player
              component={SVGComposition}
              inputProps={{
                svgContent: project.svg_generation.svg_content || '',
                paths: project.svg_generation.paths,
                animationConfig: project.animation_config,
              }}
              durationInFrames={durationInFrames}
              fps={project.animation_config.fps}
              compositionWidth={project.animation_config.width}
              compositionHeight={project.animation_config.height}
              style={{ width: '100%' }}
              controls
            />
          </div>

          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-700 rounded-lg p-4">
              <p className="text-slate-400 text-sm mb-1">时长</p>
              <p className="text-white font-semibold">{project.animation_config.duration}s</p>
            </div>
            <div className="bg-slate-700 rounded-lg p-4">
              <p className="text-slate-400 text-sm mb-1">FPS</p>
              <p className="text-white font-semibold">{project.animation_config.fps}</p>
            </div>
            <div className="bg-slate-700 rounded-lg p-4">
              <p className="text-slate-400 text-sm mb-1">分辨率</p>
              <p className="text-white font-semibold">{project.animation_config.width}x{project.animation_config.height}</p>
            </div>
            <div className="bg-slate-700 rounded-lg p-4">
              <p className="text-slate-400 text-sm mb-1">路径数</p>
              <p className="text-white font-semibold">{project.svg_generation.paths.length}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
