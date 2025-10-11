import { useState, useEffect } from 'react';
import { Player } from '@remotion/player';
import { Play, Download, Settings } from 'lucide-react';
import { SVGComposition } from '../remotion/SVGComposition';
import { svgGenerationService } from '../../services/svgGenerationService';
import { videoService } from '../../services/videoService';
import { getAnimationConfig } from '../../lib/animationPresets';
import { AnimationConfig } from '../../types';

interface VideoPreviewProps {
  generationId: string;
}

export const VideoPreview: React.FC<VideoPreviewProps> = ({ generationId }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [svgData, setSvgData] = useState<any>(null);
  const [selectedPreset, setSelectedPreset] = useState('smooth');
  const [config, setConfig] = useState<AnimationConfig>(getAnimationConfig('smooth'));
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    loadSVGData();
  }, [generationId]);

  const loadSVGData = async () => {
    try {
      const data = await svgGenerationService.getGenerationWithPaths(generationId);
      if (data && data.paths.length > 0) {
        setSvgData(data);
      } else {
        setError('No paths found in SVG');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load SVG data');
    } finally {
      setLoading(false);
    }
  };

  const handlePresetChange = (preset: string) => {
    setSelectedPreset(preset);
    setConfig(getAnimationConfig(preset));
  };

  const handleConfigChange = (updates: Partial<AnimationConfig>) => {
    setConfig({ ...config, ...updates });
  };

  const handleCreateVideo = async () => {
    if (!svgData) return;

    try {
      const jobId = await videoService.createVideoJob(generationId, svgData.paths, config);
      alert(`Video job created! Job ID: ${jobId}\n\nNote: Actual video rendering requires server-side setup with @remotion/renderer.`);
    } catch (err) {
      alert(`Failed to create video job: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading SVG data...</div>;
  }

  if (error) {
    return <div className="text-center py-8 text-red-600">{error}</div>;
  }

  if (!svgData) {
    return <div className="text-center py-8">No SVG data available</div>;
  }

  return (
    <div className="w-full max-w-4xl bg-white rounded-lg shadow-lg p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">Video Preview</h2>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
        >
          <Settings className="w-4 h-4" />
          Settings
        </button>
      </div>

      {showSettings && (
        <div className="bg-gray-50 rounded-lg p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Preset</label>
            <select
              value={selectedPreset}
              onChange={(e) => handlePresetChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="fast">Fast</option>
              <option value="slow">Slow</option>
              <option value="smooth">Smooth</option>
              <option value="artistic">Artistic</option>
              <option value="technical">Technical</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Duration (seconds)</label>
              <input
                type="number"
                value={config.duration}
                onChange={(e) => handleConfigChange({ duration: Number(e.target.value) })}
                min="1"
                max="60"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">FPS</label>
              <select
                value={config.fps}
                onChange={(e) => handleConfigChange({ fps: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="24">24</option>
                <option value="30">30</option>
                <option value="60">60</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Animation Mode</label>
              <select
                value={config.pathAnimationMode}
                onChange={(e) => handleConfigChange({ pathAnimationMode: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="parallel">Parallel</option>
                <option value="sequential">Sequential</option>
                <option value="staggered">Staggered</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Background</label>
              <input
                type="color"
                value={config.backgroundColor}
                onChange={(e) => handleConfigChange({ backgroundColor: e.target.value })}
                className="w-full h-10 border border-gray-300 rounded-lg"
              />
            </div>
          </div>
        </div>
      )}

      <div className="bg-gray-100 rounded-lg p-4 flex items-center justify-center">
        <Player
          component={SVGComposition}
          inputProps={{
            paths: svgData.paths,
            config,
          }}
          durationInFrames={config.duration * config.fps}
          compositionWidth={config.width}
          compositionHeight={config.height}
          fps={config.fps}
          style={{
            width: '100%',
            maxWidth: '800px',
          }}
          controls
        />
      </div>

      <div className="flex gap-4">
        <button
          onClick={handleCreateVideo}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <Play className="w-5 h-5" />
          Create Video
        </button>
      </div>

      <div className="text-sm text-gray-600 bg-blue-50 border border-blue-200 rounded-lg p-3">
        <strong>Note:</strong> Video rendering requires server-side setup. This preview shows how your animation will look.
        Click "Create Video" to queue a rendering job in the database.
      </div>
    </div>
  );
};
