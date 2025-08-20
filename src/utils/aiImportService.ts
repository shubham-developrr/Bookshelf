import Groq from 'groq-sdk';
import { MCQ_IMPORT_PROMPT, QA_IMPORT_PROMPT, FLASHCARD_IMPORT_PROMPT } from './aiImportPrompts';

const API_KEY = import.meta.env.VITE_GROQ_API_KEY;

export type ImportFormat = 'mcq' | 'qa' | 'flashcard';

interface AIImportResult {
    success: boolean;
    data: any[];
    error?: string;
    message: string;
}

/**
 * Process text content using AI to extract structured learning materials
 * @param textContent - The raw text content to process
 * @param format - The format to extract (mcq, qa, flashcard)
 * @returns Promise with AI processing results
 */
export const processAIImport = async (textContent: string, format: ImportFormat): Promise<AIImportResult> => {
    try {
        if (!API_KEY) {
            return {
                success: false,
                data: [],
                error: "API key not configured",
                message: "AI import requires API configuration. Please check your environment settings."
            };
        }

        if (!textContent.trim()) {
            return {
                success: false,
                data: [],
                error: "Empty content",
                message: "No text content provided for processing."
            };
        }

        // Initialize Groq client
        const groq = new Groq({ 
            apiKey: API_KEY, 
            dangerouslyAllowBrowser: true 
        });

        // Get appropriate prompt based on format
        const prompt = getPromptForFormat(format);
        const fullPrompt = prompt + "\n\n" + textContent;

        // Make AI API call
        const completion = await groq.chat.completions.create({
            messages: [
                {
                    role: 'system',
                    content: 'You are an expert educational content processor. Always return valid JSON as specified in the prompt. Never include additional text, explanations, or markdown formatting. Return only the JSON array.'
                },
                {
                    role: 'user',
                    content: fullPrompt
                }
            ],
            model: 'moonshotai/kimi-k2-instruct',
            temperature: 0.3, // Lower temperature for more consistent JSON output
            max_tokens: 2000
        });

        const responseContent = completion.choices[0]?.message?.content;
        if (!responseContent) {
            throw new Error('No response from AI service');
        }

        // Parse and validate JSON response
        let parsedData: any;
        try {
            // Try to parse as direct JSON first
            parsedData = JSON.parse(responseContent);
            
            // If it's an object with an array property, extract the array
            if (parsedData && typeof parsedData === 'object' && !Array.isArray(parsedData)) {
                // Look for array properties (questions, items, data, etc.)
                const possibleArrayKeys = ['questions', 'items', 'data', 'results', 'content'];
                for (const key of possibleArrayKeys) {
                    if (Array.isArray(parsedData[key])) {
                        parsedData = parsedData[key];
                        break;
                    }
                }
                
                // If still not an array, try to convert object to array
                if (!Array.isArray(parsedData)) {
                    const values = Object.values(parsedData);
                    if (values.length > 0 && Array.isArray(values[0])) {
                        parsedData = values[0];
                    } else {
                        parsedData = [];
                    }
                }
            }
        } catch (parseError) {
            console.error('JSON parsing error:', parseError);
            console.log('Raw AI response:', responseContent);
            
            // Try to extract JSON array from response using regex as fallback
            const jsonMatch = responseContent.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                try {
                    parsedData = JSON.parse(jsonMatch[0]);
                } catch {
                    throw new Error('Invalid JSON format from AI response');
                }
            } else {
                throw new Error('No valid JSON array found in AI response');
            }
        }

        // Ensure we have an array
        if (!Array.isArray(parsedData)) {
            parsedData = [];
        }

        // Validate and clean the data based on format
        const validatedData = validateAndCleanData(parsedData, format);

        return {
            success: true,
            data: validatedData,
            message: `Successfully processed ${validatedData.length} ${format} items from text content.`
        };

    } catch (error) {
        console.error('AI import error:', error);
        return {
            success: false,
            data: [],
            error: error instanceof Error ? error.message : 'Unknown error',
            message: `Failed to process text content. Error: ${error instanceof Error ? error.message : 'Unknown error'}`
        };
    }
};

/**
 * Get the appropriate prompt for the specified format
 */
function getPromptForFormat(format: ImportFormat): string {
    switch (format) {
        case 'mcq':
            return MCQ_IMPORT_PROMPT;
        case 'qa':
            return QA_IMPORT_PROMPT;
        case 'flashcard':
            return FLASHCARD_IMPORT_PROMPT;
        default:
            throw new Error(`Unsupported format: ${format}`);
    }
}

/**
 * Validate and clean the AI response data based on format requirements
 */
function validateAndCleanData(data: any[], format: ImportFormat): any[] {
    const validatedItems: any[] = [];
    
    for (const item of data) {
        if (!item || typeof item !== 'object') continue;
        
        try {
            let validatedItem: any;
            
            switch (format) {
                case 'mcq':
                    validatedItem = validateMCQItem(item);
                    break;
                case 'qa':
                    validatedItem = validateQAItem(item);
                    break;
                case 'flashcard':
                    validatedItem = validateFlashCardItem(item);
                    break;
                default:
                    continue;
            }
            
            if (validatedItem) {
                validatedItems.push(validatedItem);
            }
        } catch (error) {
            console.warn(`Skipping invalid ${format} item:`, item, error);
        }
    }
    
    return validatedItems;
}

/**
 * Validate and clean MCQ data structure
 */
function validateMCQItem(item: any): any {
    if (!item.question || !item.options || !Array.isArray(item.options)) {
        return null;
    }
    
    // Ensure exactly 4 options
    const options = item.options.slice(0, 4);
    while (options.length < 4) {
        options.push({ text: `Option ${String.fromCharCode(65 + options.length)}`, isCorrect: false });
    }
    
    // Ensure exactly one correct answer
    const correctCount = options.filter((opt: any) => opt.isCorrect).length;
    if (correctCount === 0) {
        options[0].isCorrect = true; // Default to first option if none marked correct
    } else if (correctCount > 1) {
        // If multiple correct, keep only the first one
        let foundFirst = false;
        options.forEach((opt: any) => {
            if (opt.isCorrect && !foundFirst) {
                foundFirst = true;
            } else if (opt.isCorrect) {
                opt.isCorrect = false;
            }
        });
    }
    
    return {
        id: generateUniqueId(),
        question: String(item.question).trim(),
        options: options.map((opt: any, index: number) => ({
            id: generateUniqueId(),
            text: String(opt.text || `Option ${String.fromCharCode(65 + index)}`).trim(),
            isCorrect: Boolean(opt.isCorrect)
        })),
        explanation: item.explanation ? String(item.explanation).trim() : undefined,
        category: item.category ? String(item.category).trim() : undefined,
        difficulty: ['easy', 'medium', 'hard'].includes(item.difficulty) ? item.difficulty : 'medium'
    };
}

/**
 * Validate and clean Q&A data structure
 */
function validateQAItem(item: any): any {
    if (!item.question || !item.answer) {
        return null;
    }
    
    // Validate marks
    let marks = item.marks || 2;
    const validMarks = [1, 2, 5, 7, 10];
    if (!validMarks.includes(marks)) {
        // Find closest valid mark
        marks = validMarks.reduce((prev, curr) => 
            Math.abs(curr - marks) < Math.abs(prev - marks) ? curr : prev
        );
    }
    
    return {
        id: generateUniqueId(),
        question: String(item.question).trim(),
        answer: String(item.answer).trim(),
        marks: marks,
        category: item.category ? String(item.category).trim() : undefined,
        difficulty: ['easy', 'medium', 'hard'].includes(item.difficulty) ? item.difficulty : 'medium',
        timestamp: new Date()
    };
}

/**
 * Validate and clean FlashCard data structure
 */
function validateFlashCardItem(item: any): any {
    if (!item.question || !item.answer) {
        return null;
    }
    
    return {
        id: generateUniqueId(),
        question: String(item.question).trim(),
        answer: String(item.answer).trim(),
        created: new Date(),
        difficulty: ['easy', 'medium', 'hard'].includes(item.difficulty) ? item.difficulty : 'medium'
    };
}

/**
 * Generate a unique ID for database items
 */
function generateUniqueId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}
