import { GammaGenerationRequest, GammaGenerationResponse, GammaService } from '../../services/gamma';

const GAMMA_API_KEY = import.meta.env.VITE_GAMMA_API_KEY;

export class GammaEditorService {
  private gammaService: GammaService;

  constructor() {
    if (!GAMMA_API_KEY) {
      throw new Error('Gamma API key not found. Please set VITE_GAMMA_API_KEY in .env file');
    }
    this.gammaService = new GammaService(GAMMA_API_KEY);
  }

  async generatePresentation(prompt: string): Promise<GammaGenerationResponse> {
    const request: GammaGenerationRequest = {
      inputText: prompt,
      textMode: 'generate',
      format: 'presentation',
      numCards: 5,
      exportAs: 'pdf',
      textOptions: {
        amount: 'detailed',
        tone: 'professional',
        language: 'en',
      },
      imageOptions: {
        source: 'aiGenerated',
        model: 'imagen-4-pro',
        style: 'vector_illustration',
      },
    };

    return this.gammaService.generateContent(request);
  }

  async pollGenerationStatus(generationId: string, maxAttempts = 30): Promise<GammaGenerationResponse> {
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise(resolve => setTimeout(resolve, 2000));

      const status = await this.checkGenerationStatus(generationId);

      if (status.status === 'completed') {
        return status;
      }

      if (status.status === 'failed') {
        throw new Error('Generation failed');
      }
    }

    throw new Error('Generation timeout');
  }

  private async checkGenerationStatus(generationId: string): Promise<GammaGenerationResponse> {
    const response = await fetch(`https://public-api.gamma.app/v0.2/generations/${generationId}`, {
      headers: {
        'X-API-KEY': GAMMA_API_KEY,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to check status: ${response.statusText}`);
    }

    return response.json();
  }

  async downloadPDF(url: string): Promise<Blob> {
    return this.gammaService.downloadFile(url);
  }
}
