/**
 * GitHub Models API Service
 * Provides AI inference using GitHub Models API with Mistral AI
 */

export interface GitHubModelsMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

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

export class GitHubModelsService {
    private apiKey: string;
    private baseUrl = 'https://models.github.ai/inference/chat/completions';
    private model = 'mistral-ai/mistral-medium-2505';

    constructor() {
        this.apiKey = import.meta.env.VITE_GITHUB_MODELS_TOKEN;
        if (!this.apiKey) {
            throw new Error('GitHub Models API key not found. Please set VITE_GITHUB_MODELS_TOKEN in .env.local');
        }
    }

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

// Create a singleton instance
export const githubModelsService = new GitHubModelsService();

// Helper function for AI Guru specifically
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
