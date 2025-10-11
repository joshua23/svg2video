export interface GammaGenerationRequest {
  inputText: string;
  textMode?: 'generate' | 'condense' | 'preserve';
  format?: 'presentation' | 'document' | 'social';
  themeName?: string;
  numCards?: number;
  exportAs?: 'pdf' | 'pptx';
  textOptions?: {
    amount?: string;
    tone?: string;
    audience?: string;
    language?: string;
  };
  imageOptions?: {
    source?: 'aiGenerated' | 'search' | 'none';
    model?: string;
    style?: string;
  };
}

export interface GammaGenerationResponse {
  generationId: string;
  status: string;
  gammaUrl: string;
  pdfUrl?: string;
  pptxUrl?: string;
  credits?: {
    deducted: number;
    remaining: number;
  };
}

const GAMMA_API_BASE = 'https://public-api.gamma.app/v0.2';

export class GammaService {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generateContent(request: GammaGenerationRequest): Promise<GammaGenerationResponse> {
    const response = await fetch(`${GAMMA_API_BASE}/generations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': this.apiKey,
      },
      body: JSON.stringify({
        inputText: request.inputText,
        textMode: request.textMode || 'generate',
        format: request.format || 'presentation',
        themeName: request.themeName,
        numCards: request.numCards || 10,
        exportAs: request.exportAs,
        textOptions: request.textOptions || {
          amount: 'detailed',
          tone: 'professional',
          language: 'en',
        },
        imageOptions: request.imageOptions || {
          source: 'aiGenerated',
          model: 'imagen-4-pro',
          style: 'photorealistic',
        },
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(`Gamma API error: ${error.message || response.statusText}`);
    }

    return response.json();
  }

  async downloadFile(url: string): Promise<Blob> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.statusText}`);
    }
    return response.blob();
  }
}
