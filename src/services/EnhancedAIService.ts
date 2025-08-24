import Groq from 'groq-sdk';
import { geminiAPIService } from './GeminiAPIService';

interface AIResponse {
  text: string;
  model: string;
  provider: 'gemini' | 'groq';
  usage?: any;
}

interface AIServiceConfig {
  preferGemini: boolean;
  fallbackToGroq: boolean;
}

export class EnhancedAIService {
  private static instance: EnhancedAIService;
  private groqClient: Groq | null = null;
  private config: AIServiceConfig = {
    preferGemini: true,
    fallbackToGroq: true
  };

  private constructor() {
    this.initializeGroq();
  }

  static getInstance(): EnhancedAIService {
    if (!EnhancedAIService.instance) {
      EnhancedAIService.instance = new EnhancedAIService();
    }
    return EnhancedAIService.instance;
  }

  private initializeGroq(): void {
    const groqApiKey = import.meta.env.VITE_GROQ_API_KEY;
    if (groqApiKey) {
      this.groqClient = new Groq({
        apiKey: groqApiKey,
        dangerouslyAllowBrowser: true
      });
    }
  }

  /**
   * Generate AI response with intelligent provider selection
   */
  async generateResponse(prompt: string, fastMode: boolean = false, enableThinking: boolean = false): Promise<AIResponse> {
    // Try Gemini first if user has configured it and prefers it
    if (this.config.preferGemini && geminiAPIService.isAvailable()) {
      try {
        console.log('🤖 Using Gemini API (Premium) with cascading model fallback');
        console.log(fastMode ? '⚡ Fast response mode enabled' : '🧠 Reasoning mode enabled');
        const response = await geminiAPIService.generateContent(prompt, fastMode, enableThinking);
        console.log(`✅ Gemini success with model: ${response.model}`);
        console.log('📝 Response text preview:', response.text ? `${response.text.substring(0, 150)}...` : 'EMPTY RESPONSE');
        
        if (!response.text || response.text.trim() === '') {
          throw new Error('Empty response from Gemini API');
        }
        
        return response;
      } catch (error: any) {
        console.warn('🚨 All Gemini models failed, falling back to Groq:', error.message);
        
        // If fallback is disabled, throw the error
        if (!this.config.fallbackToGroq) {
          throw error;
        }
        
        // If it's a safety/content issue, don't fallback
        if (error.message?.includes('blocked') || error.message?.includes('safety')) {
          throw error;
        }
        
        // If it's an API key issue, don't fallback
        if (error.message?.includes('Invalid Gemini API key')) {
          throw error;
        }
      }
    }

    // Fallback to Groq
    if (this.groqClient) {
      try {
        console.log('🤖 Using Groq API (Fallback)');
        const response = await this.groqClient.chat.completions.create({
          messages: [{ role: 'user', content: prompt }],
          model: 'llama-3.3-70b-versatile',
          temperature: 0.7,
          max_tokens: 4000,
        });

        console.log('✅ Groq fallback successful');
        return {
          text: response.choices[0]?.message?.content || 'No response generated',
          model: 'llama-3.3-70b-versatile',
          provider: 'groq',
          usage: response.usage
        };
      } catch (error) {
        console.error('❌ Groq API failed:', error);
        throw new Error('Both Gemini and Groq APIs failed. Please try again.');
      }
    }

    throw new Error('No AI providers available. Please configure Gemini API key or check Groq configuration.');
  }

  /**
   * Get available providers and their status
   */
  getProviderStatus(): {
    gemini: { available: boolean; configured: boolean; apiKey?: string };
    groq: { available: boolean; configured: boolean };
  } {
    const geminiStatus = geminiAPIService.getStatus();
    
    return {
      gemini: {
        available: geminiAPIService.isAvailable(),
        configured: geminiStatus.configured,
        apiKey: geminiStatus.apiKey || undefined
      },
      groq: {
        available: this.groqClient !== null,
        configured: import.meta.env.VITE_GROQ_API_KEY !== undefined
      }
    };
  }

  /**
   * Configure AI service preferences
   */
  setConfig(config: Partial<AIServiceConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): AIServiceConfig {
    return { ...this.config };
  }

  /**
   * Test connectivity to all available providers
   */
  async testConnectivity(): Promise<{
    gemini: { success: boolean; error?: string };
    groq: { success: boolean; error?: string };
  }> {
    const results = {
      gemini: { success: false, error: undefined as string | undefined },
      groq: { success: false, error: undefined as string | undefined }
    };

    // Test Gemini
    if (geminiAPIService.isAvailable()) {
      try {
        await geminiAPIService.generateContent('Test connection. Respond with "OK".');
        results.gemini.success = true;
      } catch (error: any) {
        results.gemini.error = error.message;
      }
    } else {
      results.gemini.error = 'Not configured';
    }

    // Test Groq
    if (this.groqClient) {
      try {
        await this.groqClient.chat.completions.create({
          messages: [{ role: 'user', content: 'Test connection. Respond with "OK".' }],
          model: 'llama-3.3-70b-versatile',
          max_tokens: 10,
        });
        results.groq.success = true;
      } catch (error: any) {
        results.groq.error = error.message;
      }
    } else {
      results.groq.error = 'Not configured';
    }

    return results;
  }
}

// Export singleton instance
export const enhancedAIService = EnhancedAIService.getInstance();
