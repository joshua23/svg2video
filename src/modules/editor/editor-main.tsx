import React, { useState } from 'react';
import { Loader2, Sparkles, Download } from 'lucide-react';
import { GammaEditorService } from './gamma-service';
import { PDFSVGExtractor } from '../svg-extraction/pdf-svg-extractor';
import { StorageService } from '../shared/storage-service';
import { AnimationConfig } from '../shared/project-types';

export const EditorMain: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [projectId, setProjectId] = useState<string | null>(null);

  const gammaService = new GammaEditorService();
  const pdfExtractor = new PDFSVGExtractor();
  const storage = new StorageService();

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      alert('请输入提示词');
      return;
    }

    setLoading(true);
    setStatus('正在使用 Gamma AI 生成演示文稿...');

    try {
      const generation = await gammaService.generatePresentation(prompt);
      setStatus(`生成已开始：${generation.generationId}`);

      setStatus('等待生成完成...');
      const completed = await gammaService.pollGenerationStatus(generation.generationId);

      if (!completed.pdfUrl) {
        throw new Error('生成响应中没有 PDF URL');
      }

      setStatus('正在下载 PDF...');
      const pdfBlob = await gammaService.downloadPDF(completed.pdfUrl);

      setStatus('正在从 PDF 中提取 SVG...');
      const extractedSVG = await pdfExtractor.extractBestSVG(pdfBlob);

      if (!extractedSVG) {
        throw new Error('在 PDF 中未找到 SVG');
      }

      setStatus('正在保存到数据库...');
      const svgGeneration = await storage.createSVGGeneration({
        prompt,
        gamma_generation_id: generation.generationId,
        gamma_url: completed.gammaUrl,
        svg_url: completed.pdfUrl,
        svg_content: extractedSVG.svg_content,
        paths: extractedSVG.paths,
        dimensions: extractedSVG.dimensions,
        status: 'completed',
      });

      const defaultAnimationConfig: AnimationConfig = {
        duration: 10,
        fps: 60,
        width: 1920,
        height: 1080,
        backgroundColor: '#ffffff',
        pathAnimationMode: 'sequential',
        staggerDelay: 0.1,
        easingFunction: 'spring',
      };

      const project = await storage.createProject({
        title: prompt.substring(0, 50),
        svg_generation: svgGeneration,
        animation_config: defaultAnimationConfig,
      });

      setProjectId(project.id);
      setStatus('项目创建成功！');

      setTimeout(() => {
        window.location.href = `/preview.html?projectId=${project.id}`;
      }, 1500);

    } catch (error) {
      console.error('Generation error:', error);
      setStatus(`错误：${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold text-slate-900 mb-4">
              SVG 视频生成器
            </h1>
            <p className="text-xl text-slate-600">
              用 AI 将你的想法转化为 SVG 动画视频
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
            <label className="block text-lg font-semibold text-slate-700 mb-3">
              描述你的演示文稿创意
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="例如：创建一个关于机器学习基础的演示文稿，使用矢量插图..."
              className="w-full h-40 px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all resize-none text-slate-700"
              disabled={loading}
            />

            <button
              onClick={handleGenerate}
              disabled={loading || !prompt.trim()}
              className="mt-6 w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 px-8 rounded-xl font-semibold text-lg hover:from-blue-700 hover:to-indigo-700 disabled:from-slate-400 disabled:to-slate-500 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-3 shadow-lg hover:shadow-xl"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={24} />
                  生成中...
                </>
              ) : (
                <>
                  <Sparkles size={24} />
                  生成 SVG 视频
                </>
              )}
            </button>
          </div>

          {status && (
            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6">
              <div className="flex items-start gap-3">
                {loading && <Loader2 className="animate-spin text-blue-600 mt-1" size={20} />}
                <div>
                  <p className="text-blue-900 font-medium mb-1">状态</p>
                  <p className="text-blue-700">{status}</p>
                </div>
              </div>
            </div>
          )}

          {projectId && (
            <div className="bg-green-50 border-2 border-green-200 rounded-xl p-6 mt-4">
              <div className="flex items-start gap-3">
                <Download className="text-green-600 mt-1" size={20} />
                <div>
                  <p className="text-green-900 font-medium mb-1">成功！</p>
                  <p className="text-green-700">正在跳转到预览页面...</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
