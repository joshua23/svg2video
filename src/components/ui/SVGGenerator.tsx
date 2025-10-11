import { useState } from 'react';
import { Wand2, Loader2 } from 'lucide-react';
import { RecraftService } from '../../services/recraft';
import { SVGProcessor } from '../../services/svgProcessor';
import { svgGenerationService } from '../../services/svgGenerationService';

interface SVGGeneratorProps {
  onGenerated: (generationId: string) => void;
}

export const SVGGenerator: React.FC<SVGGeneratorProps> = ({ onGenerated }) => {
  const [prompt, setPrompt] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim() || !apiKey.trim()) {
      setError('Please provide both prompt and API key');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const generationId = await svgGenerationService.createGeneration(prompt);

      const recraftService = new RecraftService(apiKey);
      const svgContent = await recraftService.generateAndDownload(prompt, 'vector_illustration');

      const filename = `svg-${Date.now()}.svg`;
      const svgUrl = await svgGenerationService.uploadSVGToStorage(svgContent, filename);

      const svgProcessor = new SVGProcessor();
      const { paths } = await svgProcessor.processAndExtractPaths(svgContent);

      await svgGenerationService.savePaths(generationId, paths);
      await svgGenerationService.updateGeneration(generationId, {
        svg_url: svgUrl,
        status: 'completed',
      });

      onGenerated(generationId);
      setPrompt('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate SVG');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl bg-white rounded-lg shadow-lg p-6 space-y-4">
      <h2 className="text-2xl font-bold text-gray-800">Generate SVG with Recraft</h2>

      <div className="space-y-4">
        <div>
          <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 mb-1">
            Recraft API Key
          </label>
          <input
            id="apiKey"
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Enter your Recraft API key"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label htmlFor="prompt" className="block text-sm font-medium text-gray-700 mb-1">
            Prompt
          </label>
          <textarea
            id="prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe the SVG you want to generate..."
            rows={4}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <button
          onClick={handleGenerate}
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Wand2 className="w-5 h-5" />
              Generate SVG
            </>
          )}
        </button>
      </div>
    </div>
  );
};
