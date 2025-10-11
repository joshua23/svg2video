import { RecraftGenerationRequest, RecraftGenerationResponse } from '../types';

const RECRAFT_API_BASE = 'https://external.api.recraft.ai/v1';

export class RecraftService {
  private apiToken: string;

  constructor(apiToken: string) {
    this.apiToken = apiToken;
  }

  async generateSVG(request: RecraftGenerationRequest): Promise<RecraftGenerationResponse> {
    const response = await fetch(`${RECRAFT_API_BASE}/images/generations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiToken}`,
      },
      body: JSON.stringify({
        prompt: request.prompt,
        style: request.style || 'vector_illustration',
        size: request.size || '1024x1024',
        model: request.model || 'recraftv3',
        response_format: 'url',
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(`Recraft API error: ${error.error || response.statusText}`);
    }

    return response.json();
  }

  async downloadSVG(url: string): Promise<string> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download SVG: ${response.statusText}`);
    }
    return response.text();
  }

  async generateAndDownload(prompt: string, style?: RecraftGenerationRequest['style']): Promise<string> {
    const result = await this.generateSVG({ prompt, style });

    if (!result.data || result.data.length === 0) {
      throw new Error('No image generated');
    }

    const imageUrl = result.data[0].url;
    return this.downloadSVG(imageUrl);
  }
}
