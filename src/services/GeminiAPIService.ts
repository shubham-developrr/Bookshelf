import { GoogleGenAI } from '@google/genai';

/**
 * @interface UserGeminiConfig
 * @description Defines the structure for storing a user's Gemini API key configuration.
 * @property {string} apiKey - The user's Gemini API key.
 * @property {boolean} isValid - Whether the key has been validated.
 * @property {string} [lastValidated] - ISO string of the last validation date.
 */
interface UserGeminiConfig {
  apiKey: string;
  isValid: boolean;
  lastValidated?: string;
}

/**
 * @class GeminiAPIService
 * @description A singleton service to manage a user-provided Google Gemini API key
 * and handle API calls with it.
 */
export class GeminiAPIService {
  private static instance: GeminiAPIService;
  private userApiKey: string | null = null;
  private geminiClient: GoogleGenAI | null = null;
  private readonly storageKey = 'user_gemini_api_key';

  private constructor() {
    this.loadApiKeyFromStorage();
  }

  /**
   * @description Gets the singleton instance of the GeminiAPIService.
   * @returns {GeminiAPIService} The singleton instance.
   */
  static getInstance(): GeminiAPIService {
    if (!GeminiAPIService.instance) {
      GeminiAPIService.instance = new GeminiAPIService();
    }
    return GeminiAPIService.instance;
  }

  /**
   * @description Sets and validates a user-provided Gemini API key.
   * @param {string} apiKey - The user's Gemini API key.
   * @returns {Promise<boolean>} A promise that resolves to true if the key is valid and set, false otherwise.
   */
  async setUserApiKey(apiKey: string): Promise<boolean> {
    try {
      // Basic validation
      if (!apiKey || !apiKey.startsWith('AIza') || apiKey.length < 30) {
        throw new Error('Invalid API key format');
      }

      // Test the API key
      const isValid = await this.testApiKey(apiKey);
      if (!isValid) {
        throw new Error('API key is not valid or has no quota available');
      }

      this.userApiKey = apiKey;
      this.geminiClient = new GoogleGenAI({ apiKey });
      this.saveApiKeyToStorage();
      
      return true;
    } catch (error) {
      console.error('Failed to set user API key:', error);
      return false;
    }
  }

  /**
   * @description Tests a given API key for validity by making a simple request.
   * @param {string} apiKey - The API key to test.
   * @returns {Promise<boolean>} A promise that resolves to true if the key is valid, false otherwise.
   */
  async testApiKey(apiKey: string): Promise<boolean> {
    try {
      const testClient = new GoogleGenAI({ apiKey });
      
      // Test with the primary model (gemini-2.5-pro)
      const response = await testClient.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: 'Respond with just "OK" if you can see this.',
      });

      const text = response.text;
      return text.toLowerCase().includes('ok');
    } catch (error: any) {
      console.error('API key test failed:', error);
      
      // Check for specific error types
      if (error.message?.includes('API_KEY_INVALID')) {
        return false;
      }
      
      // If it's just a quota error, the key might still be valid
      if (error.message?.includes('quota') || error.message?.includes('limit')) {
        return true; // Key is valid but quota exceeded
      }
      
      return false;
    }
  }

  /**
   * @description Checks if a valid, initialized API key is currently stored in the service.
   * @returns {boolean} True if a valid key is available.
   */
  hasValidApiKey(): boolean {
    return this.userApiKey !== null && this.geminiClient !== null;
  }

  /**
   * @description Returns a masked version of the API key for safe display in the UI.
   * @returns {string | null} The masked API key, or null if no key is set.
   */
  getMaskedApiKey(): string | null {
    if (!this.userApiKey) return null;
    const key = this.userApiKey;
    return `${key.substring(0, 8)}...${key.substring(key.length - 4)}`;
  }

  /**
   * @description Generates content using the Gemini API with a cascading model fallback strategy
   * to ensure reliability and performance.
   * @param {string} prompt - The prompt to send to the AI.
   * @param {boolean} [fastMode=false] - If true, prioritizes faster models.
   * @param {boolean} [enableThinking=false] - If true, enables deeper reasoning for supported models.
   * @returns {Promise<any>} A promise that resolves with the response data from the API.
   */
  async generateContent(prompt: string, fastMode: boolean = false, enableThinking: boolean = false): Promise<any> {
    if (!this.geminiClient) {
      throw new Error('No valid Gemini API key configured');
    }

    console.log(`🚀 Gemini API called with fastMode: ${fastMode}, enableThinking: ${enableThinking}`);

    // Cascading model fallback based on mode
    const modelFallbackOrder = fastMode 
      ? [
          'gemini-2.5-flash',    // Fast: Primary fast model
          'gemini-2.0-flash',    // Fallback: Reliable baseline
          'gemini-1.5-flash'     // Final fallback
        ]
      : [
          'gemini-2.5-pro',      // Reasoning: Use Pro first for advanced reasoning
          'gemini-2.5-flash',    // Fallback: Fast model if Pro fails
          'gemini-2.0-flash'     // Final fallback
        ];

    console.log(`📋 Model fallback order:`, modelFallbackOrder);

    let lastError: any = null;

    for (const model of modelFallbackOrder) {
      try {
        console.log(`🔄 Attempting Gemini API with model: ${model}`);
        
        // Configure request for different models
        const requestConfig: any = {
          model: model,
          contents: prompt,
        };

        // Only add thinking config for 2.5-pro (not flash models) and when explicitly enabled
        if (model === 'gemini-2.5-pro' && enableThinking) {
          requestConfig.config = {
            thinking_config: {
              thinking_budget: -1  // Unlimited thinking for complex reasoning
            }
          };
          console.log(`🧠 Using ${model} WITH thinking config (deep reasoning mode)`);
        } else if (model === 'gemini-2.5-pro') {
          console.log(`🎯 Using ${model} without thinking config (for stability)`);
        } else {
          console.log(`⚡ Using ${model} for fast response`);
        }

        const response = await this.geminiClient.models.generateContent(requestConfig);

        console.log(`✅ Successfully used Gemini model: ${model}`);
        console.log('📊 Response structure:', {
          hasText: !!response.text,
          candidates: response.candidates?.length || 0,
          textLength: response.text?.length || 0,
          responseKeys: Object.keys(response),
          candidateStructure: response.candidates?.[0] ? Object.keys(response.candidates[0]) : []
        });

        // Enhanced text extraction with multiple fallback methods
        let responseText = '';
        
        // Method 1: Direct text property
        if (response.text && response.text.trim()) {
          responseText = response.text;
          console.log('✅ Extracted via response.text');
        }
        // Method 2: Candidates array with content parts
        else if (response.candidates?.[0]?.content?.parts?.[0]?.text) {
          responseText = response.candidates[0].content.parts[0].text;
          console.log('✅ Extracted via candidates[0].content.parts[0].text');
        }
        // Method 3: Check for finishReason and alternative structures
        else if (response.candidates?.[0]) {
          const candidate = response.candidates[0];
          console.log('🔍 Candidate structure:', {
            hasContent: !!candidate.content,
            hasParts: !!candidate.content?.parts,
            partsLength: candidate.content?.parts?.length || 0,
            finishReason: candidate.finishReason,
            safetyRatings: candidate.safetyRatings
          });
          
          // Check if response was blocked
          if (candidate.finishReason === 'SAFETY') {
            throw new Error('Response was blocked by safety filters');
          }
          
          console.error('❌ No text found in response structure:', response);
          throw new Error('No text content in API response');
        } else {
          console.error('❌ No candidates found in response:', response);
          throw new Error('No candidates in API response');
        }

        console.log('📝 Extracted text preview:', responseText ? `${responseText.substring(0, 100)}...` : 'EMPTY');

        if (!responseText || responseText.trim() === '') {
          throw new Error('Empty response text from Gemini API');
        }

        return {
          text: responseText,
          model: model,
          provider: 'gemini',
          thinking_tokens: response.usageMetadata?.thoughtsTokenCount || 0
        };
      } catch (error: any) {
        console.warn(`❌ Model ${model} failed:`, error.message);
        lastError = error;
        
        // If it's an API key issue, don't try other models
        if (error.message?.includes('API_KEY_INVALID')) {
          this.clearApiKey();
          throw new Error('Invalid Gemini API key. Please configure a new one.');
        }
        
        // If it's a content safety issue, don't try other models
        if (error.message?.includes('blocked') || error.message?.includes('safety')) {
          throw new Error('Content was blocked by Gemini safety filters.');
        }
        
        // For quota/limit errors, try the next model
        if (error.message?.includes('quota') || error.message?.includes('limit') || 
            error.message?.includes('rate') || error.message?.includes('exceed')) {
          console.log(`📊 Model ${model} hit quota/rate limit, trying next model...`);
          continue;
        }
        
        // For other errors, also try the next model
        console.log(`🔄 Model ${model} failed with error, trying next model...`);
        continue;
      }
    }

    // If all models failed, throw the last error
    console.error('🚨 All Gemini models failed');
    
    if (lastError?.message?.includes('quota') || lastError?.message?.includes('limit')) {
      throw new Error('All Gemini models have exceeded quota limits. Falling back to alternative provider.');
    }
    
    throw new Error(`All Gemini models failed: ${lastError?.message || 'Unknown error'}`);
  }

  /**
   * @description Removes the user's API key from the service and from localStorage.
   */
  clearApiKey(): void {
    this.userApiKey = null;
    this.geminiClient = null;
    localStorage.removeItem(this.storageKey);
  }

  /**
   * @description Provides a structured set of instructions for users on how to obtain a Gemini API key.
   * @returns {object} An object containing the title, steps, benefits, and quota information.
   */
  getApiKeyInstructions(): {
    title: string;
    steps: string[];
    benefits: string[];
    quotaInfo: string;
  } {
    return {
      title: 'Get Your Free Gemini API Key',
      steps: [
        'Go to https://aistudio.google.com/app/apikey',
        'Sign in with your Google account',
        'Click "Create API Key" button',
        'Copy the generated API key',
        'Paste it in the Premium AI settings below'
      ],
      benefits: [
        'Access to Gemini 2.5 Pro (most advanced reasoning model)',
        'Automatic fallback: 2.5 Pro → 2.5 Flash → 2.0 Flash',
        'Dynamic thinking enabled for enhanced reasoning',
        'Uses YOUR quota, not shared limits',
        'Completely free for personal use (1,500 requests/day)'
      ],
      quotaInfo: 'Free quota: 1,500 requests per day'
    };
  }

  /**
   * @description A convenience method to check if the service is ready to make API calls.
   * @returns {boolean} True if the service has a valid API key.
   */
  isAvailable(): boolean {
    return this.hasValidApiKey();
  }

  /**
   * @description Returns the current configuration status of the service.
   * @returns {object} An object containing the configuration status.
   */
  getStatus(): {
    configured: boolean;
    apiKey: string | null;
    lastValidated?: string;
  } {
    return {
      configured: this.hasValidApiKey(),
      apiKey: this.getMaskedApiKey(),
      lastValidated: localStorage.getItem(`${this.storageKey}_validated`) || undefined
    };
  }

  // ==================== PRIVATE METHODS ====================

  /**
   * @description Saves the current user API key to localStorage.
   * @private
   */
  private saveApiKeyToStorage(): void {
    if (this.userApiKey) {
      localStorage.setItem(this.storageKey, this.userApiKey);
      localStorage.setItem(`${this.storageKey}_validated`, new Date().toISOString());
    }
  }

  /**
   * @description Loads the user API key from localStorage on initialization.
   * @private
   */
  private loadApiKeyFromStorage(): void {
    const stored = localStorage.getItem(this.storageKey);
    if (stored) {
      try {
        this.userApiKey = stored;
        this.geminiClient = new GoogleGenAI({ apiKey: stored });
        console.log('✅ Loaded Gemini API key from storage');
      } catch (error) {
        console.error('Failed to load stored API key:', error);
        localStorage.removeItem(this.storageKey);
      }
    }
  }
}

/**
 * @const geminiAPIService
 * @description The exported singleton instance of the GeminiAPIService class.
 */
export const geminiAPIService = GeminiAPIService.getInstance();
