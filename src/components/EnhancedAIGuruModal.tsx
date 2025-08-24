import React, { useState } from 'react';
import { AIGuruIcon, CloseIcon, PaperAirplaneIcon } from './icons';
import { enhancedAIService } from '../services/EnhancedAIService';
import { geminiAPIService } from '../services/GeminiAPIService';
import EnhancedAIResponse from './EnhancedAIResponse';

// Use Groq with kimi-k2-instruct model - Keep for fallback reference
// const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;

interface Message {
    role: 'user' | 'model' | 'error';
    text: string;
    isEnhanced?: boolean;
}

interface EnhancedAIGuruModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialPrompt: string;
}

const EnhancedAIGuruModal: React.FC<EnhancedAIGuruModalProps> = ({ isOpen, onClose, initialPrompt }) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [streamingText, setStreamingText] = useState('');
    const [isStreaming, setIsStreaming] = useState(false);
    const [expandedMessages, setExpandedMessages] = useState<Set<number>>(new Set());
    const [fastResponseMode, setFastResponseMode] = useState(false); // New state for toggle
    const [isStopRequested, setIsStopRequested] = useState(false); // New state for stop functionality
    const [currentStreamTimer, setCurrentStreamTimer] = useState<NodeJS.Timeout | null>(null); // Track streaming timer
    const chatContainerRef = React.useRef<HTMLDivElement>(null);
    const messagesRef = React.useRef<Message[]>([]);
    const fastResponseModeRef = React.useRef(false); // Ref to track current state
    const pendingResponseRef = React.useRef<string>(''); // Store complete response during streaming

    // Persistent chat history management
    const CHAT_HISTORY_KEY = 'ai_guru_chat_history';
    const MAX_MEMORY_TOKENS = 1000;

    // Load chat history from localStorage on mount
    React.useEffect(() => {
        const savedHistory = localStorage.getItem(CHAT_HISTORY_KEY);
        if (savedHistory && !initialPrompt) {
            try {
                const parsedHistory = JSON.parse(savedHistory);
                if (Array.isArray(parsedHistory) && parsedHistory.length > 0) {
                    setMessages(parsedHistory);
                }
            } catch (error) {
                console.warn('Failed to load chat history:', error);
            }
        }
    }, []);

    // Save chat history to localStorage whenever messages change
    React.useEffect(() => {
        if (messages.length > 0) {
            // Create memory summary for context (max 1000 tokens ~750 words)
            const memorySummary = createMemorySummary(messages);
            localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(messages));
            localStorage.setItem('ai_guru_memory_summary', memorySummary);
        }
    }, [messages]);

    // Create memory summary for context window
    const createMemorySummary = (chatMessages: Message[]): string => {
        if (chatMessages.length === 0) return '';
        
        // Take last 6 messages (3 exchanges) for context
        const recentMessages = chatMessages.slice(-6);
        let summary = 'Previous conversation context:\n';
        
        recentMessages.forEach((msg, index) => {
            const role = msg.role === 'user' ? 'Student' : 'AI Guru';
            const text = msg.text.length > 200 ? msg.text.substring(0, 200) + '...' : msg.text;
            summary += `${role}: ${text}\n`;
        });

        // Ensure summary stays under 1000 tokens (~750 words)
        if (summary.length > 750) {
            summary = summary.substring(0, 750) + '...';
        }

        return summary;
    };

    // Handle modal close with streaming completion
    const handleClose = () => {
        if (isStreaming && pendingResponseRef.current) {
            // Complete the streaming immediately
            setIsStreaming(false);
            setStreamingText('');
            if (currentStreamTimer) {
                clearInterval(currentStreamTimer);
                setCurrentStreamTimer(null);
            }
            
            // Add the complete response to messages
            setMessages(prev => [...prev, { 
                role: 'model', 
                text: pendingResponseRef.current, 
                isEnhanced: true 
            }]);
            
            pendingResponseRef.current = '';
            setIsLoading(false);
        }
        
        onClose();
    };

    // Check if Premium AI is available
    const isPremiumAIActive = geminiAPIService.isAvailable();

    // Detect when complex reasoning is needed for thinking config
    const detectComplexReasoningNeeded = (prompt: string): boolean => {
        const complexityIndicators = [
            // Mathematical and analytical
            'explain the theory', 'theoretical framework', 'analyze', 'compare and contrast',
            'derive', 'prove', 'demonstrate', 'mathematical proof', 'formula derivation',
            
            // Deep reasoning keywords
            'why does', 'how does', 'what would happen if', 'critically evaluate',
            'philosophical', 'conceptual framework', 'underlying principles',
            
            // Multi-step problems
            'step by step', 'solve this problem', 'break down', 'detailed explanation',
            'comprehensive analysis', 'in-depth', 'thorough examination',
            
            // Complex academic topics
            'research methodology', 'literature review', 'hypothesis', 'thesis',
            'argumentation', 'epistemology', 'ontology', 'paradigm'
        ];
        
        const promptLower = prompt.toLowerCase();
        const hasComplexityIndicators = complexityIndicators.some(indicator => 
            promptLower.includes(indicator)
        );
        
        // Also consider prompt length as an indicator of complexity
        const isLongPrompt = prompt.length > 200;
        
        // Enable thinking for mathematical content (contains equations, formulas)
        const hasMathContent = /\b(equation|formula|calculate|solve|derivative|integral|theorem|lemma|proof)\b/i.test(prompt);
        
        return hasComplexityIndicators || isLongPrompt || hasMathContent;
    };

    // Streaming text effect with stop functionality
    const streamText = (text: string, onComplete: () => void) => {
        setStreamingText('');
        setIsStreaming(true);
        setIsStopRequested(false);
        pendingResponseRef.current = text; // Store complete response
        
        let currentIndex = 0;
        const streamingSpeed = 2; // Doubled speed from 5ms to 2ms for faster streaming
        
        const timer = setInterval(() => {
            if (isStopRequested || currentIndex >= text.length) {
                clearInterval(timer);
                setCurrentStreamTimer(null);
                setIsStreaming(false);
                
                if (isStopRequested) {
                    // If stopped, keep current progress and complete the message
                    const currentText = text.substring(0, currentIndex);
                    setStreamingText('');
                    onComplete();
                } else {
                    // Normal completion
                    setStreamingText('');
                    onComplete();
                }
                return;
            }
            
            setStreamingText(text.substring(0, currentIndex + 1));
            currentIndex++;
        }, streamingSpeed);
        
        setCurrentStreamTimer(timer);
        return () => {
            clearInterval(timer);
            setCurrentStreamTimer(null);
        };
    };

    // Stop streaming function
    const stopStreaming = () => {
        setIsStopRequested(true);
        if (currentStreamTimer) {
            clearInterval(currentStreamTimer);
            setCurrentStreamTimer(null);
        }
        setIsStreaming(false);
        
        // Complete the message with current streaming progress
        if (pendingResponseRef.current) {
            setMessages(prev => [...prev, { 
                role: 'model', 
                text: pendingResponseRef.current, 
                isEnhanced: true 
            }]);
        }
        setStreamingText('');
        setIsLoading(false);
        pendingResponseRef.current = '';
    };

    // Component for user messages with collapse functionality
    const UserMessage: React.FC<{ message: string; index: number }> = ({ message, index }) => {
        const isLong = message.length > 200;
        const isExpanded = expandedMessages.has(index);
        
        const toggleExpanded = () => {
            const newExpanded = new Set(expandedMessages);
            if (isExpanded) {
                newExpanded.delete(index);
            } else {
                newExpanded.add(index);
            }
            setExpandedMessages(newExpanded);
        };

        return (
            <div className="w-full max-w-[95%] sm:max-w-md p-2.5 sm:p-3 rounded-2xl theme-accent text-white rounded-br-none">
                <p className="whitespace-pre-wrap leading-snug text-xs sm:text-sm" style={{ lineHeight: '1.3' }}>
                    {isLong && !isExpanded ? message.substring(0, 200) + '...' : message}
                </p>
                {isLong && (
                    <button 
                        onClick={toggleExpanded}
                        className="mt-2 text-xs underline opacity-80 hover:opacity-100"
                    >
                        {isExpanded ? 'Show less' : 'Show more'}
                    </button>
                )}
            </div>
        );
    };

    // Keep messages ref in sync
    React.useEffect(() => {
        messagesRef.current = messages;
    }, [messages]);

    React.useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = React.useCallback(async (prompt: string) => {
        if (!prompt.trim()) return;

        let processedPrompt = prompt;
        let isEnhancedRequest = true; // Always use enhanced mode for better formatting

        // Check if this is an enhanced AI Guru request
        try {
            const parsedRequest = JSON.parse(prompt);
            if (parsedRequest.promptType === 'AI_GURU_ENHANCED') {
                isEnhancedRequest = true;
                processedPrompt = `Selected Text: "${parsedRequest.selectedText}"

Context: ${parsedRequest.context}

Please provide a comprehensive explanation of the selected text, following the AI Guru guidelines for college-level education. Use proper formatting including:
- Bold for key terms (**term**)
- Italics for emphasis (*emphasis*)
- LaTeX for math equations when applicable
- Bullet points for lists
- Examples and analogies
- Clear structure with headers

Focus on helping a college student understand both the concept and its applications.`;
            }
        } catch {
            // Not JSON, handle as regular prompt
            if (prompt.includes('[AI_GURU]')) {
                isEnhancedRequest = true;
                processedPrompt = prompt.replace('[AI_GURU]', '').trim();
            }
        }

        setInput('');
        setMessages(prev => [...prev, { role: 'user', text: prompt, isEnhanced: isEnhancedRequest }]);
        setIsLoading(true);

        try {
            // Use ref to get the most current state
            const currentFastMode = fastResponseModeRef.current;
            
            // Smart thinking detection for complex scenarios
            const shouldEnableThinking = !currentFastMode && detectComplexReasoningNeeded(processedPrompt);
            
            // Add memory context if available
            const memorySummary = localStorage.getItem('ai_guru_memory_summary');
            if (memorySummary && messages.length > 0) {
                processedPrompt = `${memorySummary}\n\nCurrent question: ${processedPrompt}`;
            }
            
            console.log(`🎯 AI Guru calling with fastMode: ${currentFastMode} (UI state: ${fastResponseMode}, ref: ${fastResponseModeRef.current}), thinking: ${shouldEnableThinking}`);
            const response = await enhancedAIService.generateResponse(processedPrompt, currentFastMode, shouldEnableThinking);
            
            console.log('✅ AI Response received:', {
                text: response.text ? `${response.text.substring(0, 100)}...` : 'EMPTY',
                textLength: response.text?.length || 0,
                model: response.model,
                provider: response.provider,
                fastModeUsed: currentFastMode
            });

            if (!response.text || response.text.trim() === '') {
                throw new Error('Empty response received from AI service');
            }

            // Stream the response text
            streamText(response.text, () => {
                setMessages(prev => [...prev, { 
                    role: 'model', 
                    text: response.text, 
                    isEnhanced: isEnhancedRequest 
                }]);
                setIsLoading(false);
            });

        } catch (error) {
            console.error('AI Guru error:', error);
            setMessages(prev => [...prev, { 
                role: 'error', 
                text: error instanceof Error ? error.message : 'An unexpected error occurred. Please try again.',
                isEnhanced: isEnhancedRequest 
            }]);
            setIsLoading(false);
            setIsStreaming(false);
        }
    }, []);

    // Keep ref in sync with state
    React.useEffect(() => {
        fastResponseModeRef.current = fastResponseMode;
        console.log(`🔄 State synced: ${fastResponseMode} → ref: ${fastResponseModeRef.current}`);
    }, [fastResponseMode]);

    React.useEffect(() => {
        if (isOpen) {
            if (initialPrompt) {
                // Only clear if we have a specific initial prompt to handle
                setMessages([]); 
                handleSend(initialPrompt);
            } else if (messages.length === 0) {
                // Only show welcome message if no previous history
                setMessages([{
                    role: 'model',
                    text: "🎓 **Welcome to AI Guru - Your Educational Companion!**\n\nI'm your dedicated AI tutor, designed to make learning engaging and effective for college students. Here's how I can help:\n\n## 📚 **My Capabilities:**\n- **Interactive Learning**: Step-by-step explanations with real-world examples\n- **Guided Discovery**: Socratic questioning to help you understand deeply\n- **Homework Support**: Problem-solving guidance without giving away answers\n- **Practice Sessions**: Adaptive quizzes and exercises tailored to your level\n- **Study Strategies**: Learning techniques backed by educational science\n- **Mathematical Support**: LaTeX rendering for complex equations\n\n## ✨ **What makes me special:**\n• I adapt to your learning style and pace\n• I use **analogies** and *stories* to make concepts memorable\n• I celebrate your progress and help you learn from mistakes\n• I connect new knowledge to what you already know\n• I provide properly formatted responses with math support\n\n**Ready to start your learning journey? What would you like to explore today?** 🚀",
                    isEnhanced: true
                }]);
            }
        }
    }, [isOpen, initialPrompt, handleSend]);

    const quickActions = [
        { text: "📖 Learn a concept", prompt: "I want to understand " },
        { text: "📝 Homework help", prompt: "Help me with this problem: " },
        { text: "🧠 Practice quiz", prompt: "Create practice questions for " },
        { text: "💡 Study strategies", prompt: "What are the best study methods for " },
        { text: "🔍 Explain simply", prompt: "Explain this in simple terms: " },
        { text: "🎯 Break it down", prompt: "Break down this complex topic: " }
    ];

    const handleQuickAction = (prompt: string) => {
        setInput(prompt);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
            {/* Mobile-optimized modal */}
            <div className="theme-surface w-full h-full sm:h-[90vh] sm:max-w-4xl sm:rounded-2xl flex flex-col shadow-2xl sm:m-4">
                <header className="flex justify-between items-center p-3 sm:p-4 border-b theme-border flex-shrink-0">
                    <div className="flex items-center gap-2">
                        <AIGuruIcon className="w-6 h-6 theme-accent-text" />
                        <div>
                            <h2 className="text-base sm:text-lg font-bold theme-text">AI Guru</h2>
                            <p className="text-xs theme-text-secondary">Your Personal Learning Assistant</p>
                        </div>
                    </div>
                    <button onClick={handleClose} className="p-1 rounded-full hover:theme-surface2 theme-transition">
                        <CloseIcon />
                    </button>
                </header>
                
                {/* Quick Actions - Collapsible on mobile */}
                {messages.length <= 1 && (
                    <div className="p-3 sm:p-4 border-b theme-border flex-shrink-0">
                        <p className="text-sm theme-text-secondary mb-3">Quick actions:</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {quickActions.map((action, index) => (
                                <button
                                    key={index}
                                    onClick={() => handleQuickAction(action.prompt)}
                                    className="text-left p-2 text-xs btn-secondary theme-transition rounded-lg"
                                >
                                    {action.text}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
                
                <main ref={chatContainerRef} className="flex-1 overflow-y-auto space-y-4 min-h-0">
                    <div className="px-2 py-3 sm:px-4">
                        {messages.map((msg, index) => (
                            <div key={index} className={`mb-3 flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                {msg.role === 'user' ? (
                                    <UserMessage message={msg.text} index={index} />
                                ) : msg.role === 'error' ? (
                                    <div className="w-full max-w-[95%] sm:max-w-md p-2.5 sm:p-3 rounded-2xl bg-red-600 text-white rounded-bl-none">
                                        <p className="whitespace-pre-wrap leading-snug text-xs sm:text-sm" style={{ lineHeight: '1.3' }}>{msg.text}</p>
                                    </div>
                                ) : (
                                    <div className="w-full max-w-[98%]">
                                        {msg.isEnhanced ? (
                                            <EnhancedAIResponse 
                                                content={msg.text} 
                                                isLoading={isLoading && index === messages.length - 1 && msg.text === '...'}
                                            />
                                        ) : (
                                            <div className="w-full max-w-[95%] p-2.5 sm:p-3 rounded-2xl theme-surface2 theme-text rounded-bl-none">
                                                <p className="whitespace-pre-wrap leading-snug text-xs sm:text-sm" style={{ lineHeight: '1.3' }}>{msg.text}</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                        
                        {/* Streaming Response Display */}
                        {isStreaming && streamingText && (
                            <div className="mb-3 flex justify-start">
                                <div className="w-full max-w-[98%]">
                                    <EnhancedAIResponse 
                                        content={streamingText} 
                                        isLoading={false}
                                    />
                                </div>
                            </div>
                        )}
                        {(isLoading && !isStreaming) && messages[messages.length - 1]?.role !== 'model' && (
                             <div className="flex justify-start">
                                 <div className="max-w-[95%] sm:max-w-md p-4 sm:p-5 rounded-2xl theme-surface2 theme-text rounded-bl-none border-l-4 border-blue-500">
                                    <div className="flex items-center gap-3">
                                        <div className="relative">
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center animate-pulse">
                                                <span className="text-white text-sm">🤖</span>
                                            </div>
                                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-bounce"></div>
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-medium text-sm theme-text">AI Guru</span>
                                                <div className="flex gap-1">
                                                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                                                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '200ms' }}></span>
                                                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '400ms' }}></span>
                                                </div>
                                            </div>
                                            <div className="text-xs theme-text-secondary">
                                                {isLoading ? (fastResponseMode ? '⚡ Generating quick response...' : '🧠 Deep thinking in progress...') : '✍️ Writing response...'}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-3 text-xs theme-text-secondary bg-opacity-50 theme-surface p-2 rounded">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                                            <span>
                                                {isLoading 
                                                    ? (fastResponseMode 
                                                        ? 'Using Gemini 2.5 Flash for rapid analysis' 
                                                        : 'Using Gemini for detailed response')
                                                    : 'Typing response...'
                                                }
                                            </span>
                                        </div>
                                    </div>
                                 </div>
                             </div>
                        )}
                    </div>
                </main>
                
                <footer className="p-2 sm:p-4 border-t theme-border flex-shrink-0">
                    <div className="flex items-end gap-2 sm:gap-3 theme-surface2 rounded-lg p-2">
                        <textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(input); setInput(''); } }}
                            placeholder="Ask me to explain a concept, help with homework, or create a quiz..."
                            className="flex-1 bg-transparent resize-none focus:outline-none text-xs sm:text-sm theme-text min-h-[36px] max-h-[100px] py-2 px-1"
                            rows={1}
                            style={{ 
                                overflowY: input.length > 100 ? 'auto' : 'hidden',
                                lineHeight: '1.3'
                            }}
                            onInput={(e) => {
                                const target = e.target as HTMLTextAreaElement;
                                target.style.height = 'auto';
                                target.style.height = Math.min(target.scrollHeight, 100) + 'px';
                            }}
                        />
                        
                        {/* Fast Response Toggle - Always show for mode selection */}
                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md theme-surface border theme-border">
                            <span className="text-xs theme-text-secondary whitespace-nowrap">
                                {fastResponseMode ? '⚡' : '🧠'}
                            </span>
                            <button
                                onClick={() => {
                                    const newMode = !fastResponseMode;
                                    console.log(`🔄 Toggle clicked: ${fastResponseMode} → ${newMode}`);
                                    setFastResponseMode(newMode);
                                    fastResponseModeRef.current = newMode; // Immediately update ref
                                    console.log(`🔄 State updated: ref now = ${fastResponseModeRef.current}`);
                                }}
                                className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                                    fastResponseMode 
                                        ? 'bg-blue-600' 
                                        : 'bg-gray-300 dark:bg-gray-600'
                                }`}
                                title={
                                    isPremiumAIActive 
                                        ? (fastResponseMode ? 'Fast Response Mode: Quick answers using Gemini 2.5 Flash' : 'Reasoning Mode: Deep thinking using Gemini 2.5 Pro')
                                        : (fastResponseMode ? 'Fast Response Mode: Quick answers' : 'Reasoning Mode: Detailed analysis')
                                }
                            >
                                <span
                                    className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                                        fastResponseMode ? 'translate-x-3.5' : 'translate-x-0.5'
                                    }`}
                                />
                            </button>
                            <span className="text-xs theme-text-secondary whitespace-nowrap">
                                {fastResponseMode ? 'Fast' : 'Reason'}
                            </span>
                        </div>
                        
                        <button 
                            onClick={isStreaming ? stopStreaming : () => {handleSend(input); setInput('');}} 
                            disabled={isLoading && !isStreaming || !input.trim() && !isStreaming} 
                            className={`p-1.5 sm:p-2 text-white rounded-lg hover:bg-opacity-90 disabled:opacity-50 disabled:hover:bg-opacity-100 theme-transition flex-shrink-0 ${
                                isStreaming ? 'bg-red-500 hover:bg-red-600' : 'theme-accent'
                            }`}
                            title={isStreaming ? 'Stop generation' : 'Send message'}
                        >
                            {isStreaming ? (
                                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M6,6H18V18H6V6Z" />
                                </svg>
                            ) : (
                                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M2,21L23,12L2,3V10L17,12L2,14V21Z" />
                                </svg>
                            )}
                        </button>
                    </div>
                    <p className="text-xs theme-text-secondary mt-2 text-center px-2" style={{ lineHeight: '1.2', fontSize: '10px' }}>
                        💡 Tip: Enhanced responses include LaTeX math, proper formatting, and detailed explanations
                        {isPremiumAIActive && (
                            <span className="block mt-1">
                                🧠 Reasoning: Deep analysis with Gemini 2.5 Pro | ⚡ Fast: Quick responses with Gemini 2.5 Flash
                            </span>
                        )}
                    </p>
                </footer>
            </div>
        </div>
    );
};

export default EnhancedAIGuruModal;
