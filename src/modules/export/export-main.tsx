import React, { useEffect, useState } from 'react';
import { Loader2, Download, CheckCircle, XCircle } from 'lucide-react';
import { StorageService } from '../shared/storage-service';
import { ProjectData, VideoJob } from '../shared/project-types';

const RENDER_SERVER_URL = 'http://localhost:3002';

export const ExportMain: React.FC = () => {
  const [project, setProject] = useState<ProjectData | null>(null);
  const [videoJob, setVideoJob] = useState<VideoJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [rendering, setRendering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const storage = new StorageService();

  useEffect(() => {
    loadProject();
  }, []);

  useEffect(() => {
    if (videoJob && (videoJob.status === 'rendering' || videoJob.status === 'bundling' || videoJob.status === 'selecting')) {
      const interval = setInterval(checkRenderProgress, 2000);
      return () => clearInterval(interval);
    }
  }, [videoJob]);

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

  const startRender = async () => {
    if (!project) return;

    setRendering(true);
    setError(null);

    try {
      const job = await storage.createVideoJob(project.id);
      setVideoJob(job);

      const durationInFrames = Math.ceil(project.animation_config.duration * project.animation_config.fps);

      const renderPayload = {
        projectData: {
          svgContent: project.svg_generation.svg_content,
          paths: project.svg_generation.paths,
          animationConfig: project.animation_config,
          durationInFrames,
        },
        config: {
          codec: 'h264',
          fps: project.animation_config.fps,
          width: project.animation_config.width,
          height: project.animation_config.height,
        },
      };

      const response = await fetch(`${RENDER_SERVER_URL}/api/render`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(renderPayload),
      });

      if (!response.ok) {
        throw new Error('启动渲染失败');
      }

      const result = await response.json();

      await storage.updateVideoJob(job.id, {
        status: 'bundling',
      });

      checkRenderProgress();

    } catch (err) {
      console.error('Error starting render:', err);
      setError(err instanceof Error ? err.message : '启动渲染失败');
      setRendering(false);
    }
  };

  const checkRenderProgress = async () => {
    if (!videoJob) return;

    try {
      const response = await fetch(`${RENDER_SERVER_URL}/api/render/${videoJob.id}`);

      if (!response.ok) {
        throw new Error('检查渲染进度失败');
      }

      const serverJob = await response.json();

      await storage.updateVideoJob(videoJob.id, {
        status: serverJob.status,
        progress: serverJob.progress || 0,
        rendered_frames: serverJob.renderedFrames || 0,
        total_frames: serverJob.totalFrames || 0,
      });

      setVideoJob(prev => prev ? {
        ...prev,
        status: serverJob.status,
        progress: serverJob.progress || 0,
        rendered_frames: serverJob.renderedFrames || 0,
        total_frames: serverJob.totalFrames || 0,
      } : null);

      if (serverJob.status === 'completed') {
        setRendering(false);
        downloadVideo();
      } else if (serverJob.status === 'failed') {
        setRendering(false);
        setError(serverJob.error || '渲染失败');
      }

    } catch (err) {
      console.error('Error checking render progress:', err);
    }
  };

  const downloadVideo = async () => {
    if (!videoJob) return;

    try {
      const response = await fetch(`${RENDER_SERVER_URL}/api/render/${videoJob.id}/download`);

      if (!response.ok) {
        throw new Error('下载视频失败');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project?.title || 'video'}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

    } catch (err) {
      console.error('Error downloading video:', err);
      setError(err instanceof Error ? err.message : '下载视频失败');
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

  if (error && !project) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="bg-red-900/20 border-2 border-red-500 rounded-xl p-8 max-w-md">
          <p className="text-red-400 text-lg">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-white mb-4">导出视频</h1>
            <p className="text-slate-400 text-lg">{project?.title}</p>
          </div>

          <div className="bg-slate-800 rounded-2xl p-8 shadow-2xl">
            {!rendering && !videoJob && (
              <div className="text-center">
                <p className="text-slate-300 mb-6">
准备好渲染你的 SVG 动画视频
                </p>
                <button
                  onClick={startRender}
                  className="px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold text-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg"
                >
开始渲染
                </button>
              </div>
            )}

            {(rendering || videoJob) && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {videoJob?.status === 'completed' ? (
                      <CheckCircle className="text-green-500" size={32} />
                    ) : videoJob?.status === 'failed' ? (
                      <XCircle className="text-red-500" size={32} />
                    ) : (
                      <Loader2 className="animate-spin text-blue-500" size={32} />
                    )}
                    <div>
                      <p className="text-white font-semibold text-xl">
                        {videoJob?.status === 'completed' ? '完成' :
                         videoJob?.status === 'failed' ? '失败' :
                         videoJob?.status === 'bundling' ? '打包中...' :
                         videoJob?.status === 'selecting' ? '选择组合...' :
                         videoJob?.status === 'rendering' ? '渲染中...' : '队列中'}
                      </p>
                      <p className="text-slate-400">
{videoJob?.progress || 0}% 完成
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-slate-400 text-sm">帧数</p>
                    <p className="text-white font-mono">
                      {videoJob?.rendered_frames || 0} / {videoJob?.total_frames || 0}
                    </p>
                  </div>
                </div>

                <div className="bg-slate-700 rounded-full h-4 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full transition-all duration-300"
                    style={{ width: `${videoJob?.progress || 0}%` }}
                  />
                </div>

                {videoJob?.status === 'completed' && (
                  <button
                    onClick={downloadVideo}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-all"
                  >
                    <Download size={20} />
下载视频
                  </button>
                )}

                {error && (
                  <div className="bg-red-900/20 border-2 border-red-500 rounded-lg p-4">
                    <p className="text-red-400">{error}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
