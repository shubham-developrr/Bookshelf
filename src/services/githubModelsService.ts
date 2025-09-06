/**
 * @file GitHub Models API Service
 * @description Provides a service for AI inference using the GitHub Models API with Mistral AI.
 */

/**
 * @interface GitHubModelsMessage
 * @description Defines the structure for a single message in a chat completion request.
 */
export interface GitHubModelsMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

/**
 * @interface GitHubModelsResponse
 * @description Defines the structure of the response from the GitHub Models API.
 */
export interface GitHubModelsResponse {
    choices: Array<{
        message: {
            role: string;
            content: string;
        };
        finish_reason?: string;
    }>;
    usage?: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
}

/**
 * @class GitHubModelsService
 * @description A service to interact with the GitHub Models API for AI chat completions, specifically using a Mistral model.
 */
export class GitHubModelsService {
    private apiKey: string;
    private baseUrl = 'https://models.github.ai/inference/chat/completions';
    private model = 'mistral-ai/mistral-medium-2505';

    /**
     * @description The constructor initializes the service and retrieves the API key from environment variables.
     */
    constructor() {
        this.apiKey = import.meta.env.VITE_GITHUB_MODELS_TOKEN;
        if (!this.apiKey) {
            throw new Error('GitHub Models API key not found. Please set VITE_GITHUB_MODELS_TOKEN in .env.local');
        }
    }

    /**
     * @description The core method for making a `chat/completions` request to the API.
     * @param {GitHubModelsMessage[]} messages - An array of message objects for the chat.
     * @param {object} [options={}] - Optional parameters for the request, like temperature and max_tokens.
     * @returns {Promise<GitHubModelsResponse>} A promise that resolves with the API response.
     */
    async chatCompletion(
        messages: GitHubModelsMessage[],
        options: {
            temperature?: number;
            max_tokens?: number;
            top_p?: number;
        } = {}
    ): Promise<GitHubModelsResponse> {
        try {
            const response = await fetch(this.baseUrl, {
                method: 'POST',
                headers: {
                    'Accept': 'application/vnd.github+json',
                    'Authorization': `Bearer ${this.apiKey}`,
                    'X-GitHub-Api-Version': '2022-11-28',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: this.model,
                    messages,
                    temperature: options.temperature ?? 0.7,
                    max_tokens: options.max_tokens ?? 1000,
                    top_p: options.top_p ?? 0.9
                })
            });

            if (!response.ok) {
                const errorData = await response.text();
                throw new Error(`GitHub Models API error: ${response.status} - ${errorData}`);
            }

            const result = await response.json();
            return result;
        } catch (error) {
            console.error('GitHub Models API error:', error);
            throw error;
        }
    }

    /**
     * @description A higher-level convenience method for generating a response from a simple prompt,
     * with optional system context and conversation history.
     * @param {string} prompt - The user's prompt.
     * @param {string} [systemContext] - Optional system context to guide the AI.
     * @param {GitHubModelsMessage[]} [conversationHistory=[]] - The previous messages in the conversation.
     * @returns {Promise<string>} A promise that resolves with the AI's response text.
     */
    async generateResponse(
        prompt: string,
        systemContext?: string,
        conversationHistory: GitHubModelsMessage[] = []
    ): Promise<string> {
        const messages: GitHubModelsMessage[] = [];

        // Add system context if provided
        if (systemContext) {
            messages.push({
                role: 'system',
                content: systemContext
            });
        }

        // Add conversation history
        messages.push(...conversationHistory);

        // Add current user prompt
        messages.push({
            role: 'user',
            content: prompt
        });

        const response = await this.chatCompletion(messages, {
            temperature: 0.7,
            max_tokens: 1500
        });

        return response.choices[0]?.message?.content || 'No response generated';
    }
}

/**
 * @const githubModelsService
 * @description The exported singleton instance of the GitHubModelsService class.
 */
export const githubModelsService = new GitHubModelsService();

/**
 * @description A specific helper function for the AI Guru feature, which formats the
 * conversation history correctly for the GitHub Models API.
 * @param {string} prompt - The user's current prompt.
 * @param {string} systemPrompt - The system prompt that defines the AI's role and behavior.
 * @param {Array<{ role: 'user' | 'assistant'; content: string }>} [conversationHistory=[]] - The history of the conversation.
 * @returns {Promise<string>} A promise that resolves with the AI's response text.
 */
export const generateAIGuruResponse = async (
    prompt: string,
    systemPrompt: string,
    conversationHistory: { role: 'user' | 'assistant'; content: string }[] = []
): Promise<string> => {
    const messages: GitHubModelsMessage[] = [
        {
            role: 'system',
            content: systemPrompt
        }
    ];

    // Convert conversation history to GitHub Models format
    conversationHistory.forEach(msg => {
        messages.push({
            role: msg.role,
            content: msg.content
        });
    });

    // Add current prompt
    messages.push({
        role: 'user',
        content: prompt
    });

    const response = await githubModelsService.chatCompletion(messages, {
        temperature: 0.7,
        max_tokens: 1500
    });

    return response.choices[0]?.message?.content || 'No response generated';
};
