import React, { useState } from 'react';
import Groq from 'groq-sdk';
import { AIGuruIcon, CloseIcon, PaperAirplaneIcon } from './icons';
import { ENHANCED_AI_GURU_PROMPT, AI_GURU_SYSTEM_CONTEXT } from '../utils/aiGuruPrompt';
import EnhancedAIResponse from './EnhancedAIResponse';

const API_KEY = process.env.GROQ_API_KEY;

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
    const chatContainerRef = React.useRef<HTMLDivElement>(null);
    const messagesRef = React.useRef<Message[]>([]);

    // Enhanced Educational AI tutor system prompt
    const getSystemPrompt = (isEnhanced: boolean = false) => {
        if (isEnhanced) {
            return ENHANCED_AI_GURU_PROMPT + '\n\n' + AI_GURU_SYSTEM_CONTEXT;
        }
        return `You are an expert AI tutor and educational companion, designed specifically for Honor Education Platform. You excel at making complex concepts accessible, engaging, and memorable through step-by-step explanations.

🎯 **Core Teaching Philosophy:**
- **Socratic Method**: Guide students to discover answers through thoughtful questions
- **Scaffolded Learning**: Build knowledge systematically from simple to complex
- **Active Learning**: Engage through discussions, examples, and problem-solving
- **Growth Mindset**: Celebrate progress and treat mistakes as learning opportunities

📚 **Subject Coverage:**
✅ Academic subjects (Math, Science, History, Literature, etc.)
✅ Study strategies and learning techniques
✅ Homework assistance and concept explanations
✅ Critical thinking and problem-solving skills
❌ Medical advice, dangerous content, or non-academic planning

🧠 **Teaching Techniques:**
- **Analogies**: Compare complex ideas to familiar concepts
- **Storytelling**: Use narratives to make information memorable
- **Mnemonics**: Provide memory devices for facts and formulas
- **Chunking**: Break large amounts of information into smaller pieces
- **Elaborative Questioning**: Ask "why" and "how" to deepen understanding

💡 **Communication Style:**
- Enthusiastic but not overwhelming
- Patient and understanding
- Clear and concise explanations
- Use age-appropriate language
- Encourage questions and curiosity

Remember: Your goal is not just to provide answers, but to develop independent learners who can think critically and solve problems confidently.`;
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
            if (!API_KEY) {
                throw new Error("API key is not configured.");
            }
            const groq = new Groq({ apiKey: API_KEY, dangerouslyAllowBrowser: true });
            
            // Build conversation context with appropriate system prompt
            const conversationMessages: Array<{role: 'system' | 'user' | 'assistant', content: string}> = [
                { role: 'system', content: getSystemPrompt(isEnhancedRequest) },
                // Include previous context for continuity
                ...messagesRef.current.map(msg => ({
                    role: msg.role === 'user' ? 'user' as const : 'assistant' as const,
                    content: msg.text
                })),
                { role: 'user', content: processedPrompt }
            ];

            const resultStream = await groq.chat.completions.create({
                messages: conversationMessages,
                model: 'moonshotai/kimi-k2-instruct', // Kimmy K2 instructor model for educational content
                stream: true,
                temperature: 0.7,
                max_tokens: isEnhancedRequest ? 1500 : 1000, // More tokens for enhanced responses
            });

            let fullText = '';
            setMessages(prev => [...prev, { role: 'model', text: '...', isEnhanced: isEnhancedRequest }]);

            for await (const chunk of resultStream) {
                fullText += chunk.choices[0]?.delta?.content || '';
                setMessages(prev => {
                    const newMessages = [...prev];
                    newMessages[newMessages.length - 1].text = fullText;
                    return newMessages;
                });
            }
        } catch (error) {
            console.error(error);
            setMessages(prev => [...prev, { role: 'error', text: 'Sorry, I encountered an error. Please try again.', isEnhanced: false }]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    React.useEffect(() => {
        if (isOpen) {
            if (initialPrompt) {
                setMessages([]); // Clear previous chat
                handleSend(initialPrompt);
            } else {
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
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="theme-surface w-full max-w-4xl h-[90vh] rounded-2xl flex flex-col shadow-2xl">
                <header className="flex justify-between items-center p-4 border-b theme-border">
                    <div className="flex items-center gap-2">
                        <AIGuruIcon className="w-6 h-6 theme-accent-text" />
                        <div>
                            <h2 className="text-lg font-bold theme-text">AI Guru</h2>
                            <p className="text-xs theme-text-secondary">Your Personal Learning Assistant</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1 rounded-full hover:theme-surface2 theme-transition">
                        <CloseIcon />
                    </button>
                </header>
                
                {/* Quick Actions */}
                {messages.length <= 1 && (
                    <div className="p-4 border-b theme-border">
                        <p className="text-sm theme-text-secondary mb-3">Quick actions:</p>
                        <div className="grid grid-cols-2 gap-2">
                            {quickActions.map((action, index) => (
                                <button
                                    key={index}
                                    onClick={() => handleQuickAction(action.prompt)}
                                    className="text-left p-2 text-xs btn-secondary theme-transition"
                                >
                                    {action.text}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
                
                <main ref={chatContainerRef} className="flex-1 p-4 overflow-y-auto space-y-4">
                    {messages.map((msg, index) => (
                        <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            {msg.role === 'user' ? (
                                <div className="max-w-md p-3 rounded-2xl theme-accent text-white rounded-br-none">
                                    <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                                </div>
                            ) : msg.role === 'error' ? (
                                <div className="max-w-md p-3 rounded-2xl bg-red-600 text-white rounded-bl-none">
                                    <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                                </div>
                            ) : (
                                <div className="max-w-full w-full">
                                    {msg.isEnhanced ? (
                                        <EnhancedAIResponse 
                                            content={msg.text} 
                                            isLoading={isLoading && index === messages.length - 1 && msg.text === '...'}
                                        />
                                    ) : (
                                        <div className="max-w-md p-3 rounded-2xl theme-surface2 theme-text rounded-bl-none">
                                            <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                    {isLoading && messages[messages.length - 1]?.role !== 'model' && (
                         <div className="flex justify-start">
                             <div className="max-w-md p-3 rounded-2xl theme-surface2 theme-text rounded-bl-none">
                                <div className="flex gap-1.5 items-center">
                                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-0"></span>
                                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-150"></span>
                                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-300"></span>
                                </div>
                             </div>
                         </div>
                    )}
                </main>
                <footer className="p-4 border-t theme-border">
                    <div className="flex items-center gap-2 theme-surface2 rounded-lg px-2">
                        <textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(input); } }}
                            placeholder="Ask me to explain a concept, help with homework, or create a quiz..."
                            className="flex-1 bg-transparent p-2 resize-none focus:outline-none text-sm theme-text"
                            rows={1}
                        />
                        <button 
                            onClick={() => handleSend(input)} 
                            disabled={isLoading || !input.trim()} 
                            className="p-2 theme-accent-text disabled:theme-text-secondary rounded-full hover:theme-surface2 disabled:hover:bg-transparent theme-transition"
                        >
                            <PaperAirplaneIcon className="w-6 h-6" />
                        </button>
                    </div>
                    <p className="text-xs theme-text-secondary mt-2 text-center">
                        💡 Tip: Enhanced responses include LaTeX math, proper formatting, and detailed explanations
                    </p>
                </footer>
            </div>
        </div>
    );
};

export default EnhancedAIGuruModal;
