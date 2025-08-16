import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Groq from 'groq-sdk';
import { Highlight } from '../types/types';
import { AIGuruIcon, CloseIcon, PaperAirplaneIcon } from './icons';
import BookshelfPage from '../pages/BookshelfPage';
import SearchPage from '../pages/SearchPage';
import SubjectPage from '../pages/SubjectPage';
import ReaderPage from '../pages/ReaderPage';

const API_KEY = process.env.GROQ_API_KEY;

// --- AI Guru Modal ---
const AIGuruModal = ({ isOpen, onClose, initialPrompt }: { isOpen: boolean, onClose: () => void, initialPrompt: string }) => {
    const [messages, setMessages] = useState<{ role: 'user' | 'model' | 'error', text: string }[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const chatContainerRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = React.useCallback(async (prompt: string) => {
        if (!prompt.trim()) return;

        setInput('');
        setMessages(prev => [...prev, { role: 'user', text: prompt }]);
        setIsLoading(true);

        try {
            if (!API_KEY) {
                throw new Error("API key is not configured.");
            }
            const groq = new Groq({ apiKey: API_KEY, dangerouslyAllowBrowser: true });
            const resultStream = await groq.chat.completions.create({
                messages: [{ role: 'user', content: prompt }],
                model: 'llama3-8b-8192',
                stream: true,
            });

            let fullText = '';
            setMessages(prev => [...prev, { role: 'model', text: '...' }]);

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
            setMessages(prev => [...prev, { role: 'error', text: 'Sorry, I encountered an error. Please try again.' }]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    React.useEffect(() => {
        if (isOpen && initialPrompt) {
            setMessages([]); // Clear previous chat
            handleSend(initialPrompt);
        } else if (isOpen) {
             setMessages([]);
        }
    }, [isOpen, initialPrompt, handleSend]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-dark-surface w-full max-w-2xl h-[90vh] rounded-2xl flex flex-col shadow-2xl">
                <header className="flex justify-between items-center p-4 border-b border-dark-surface-2">
                    <div className="flex items-center gap-2">
                        <AIGuruIcon className="w-6 h-6 text-dark-accent" />
                        <h2 className="text-lg font-bold">AI Guru</h2>
                    </div>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-dark-surface-2"><CloseIcon /></button>
                </header>
                <main ref={chatContainerRef} className="flex-1 p-4 overflow-y-auto space-y-4">
                    {messages.map((msg, index) => (
                        <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-md p-3 rounded-2xl ${msg.role === 'user' ? 'bg-dark-accent text-white rounded-br-none' : msg.role === 'error' ? 'bg-red-900 text-red-100 rounded-bl-none' : 'bg-dark-surface-2 text-dark-text rounded-bl-none'}`}>
                                <p className="whitespace-pre-wrap">{msg.text}</p>
                            </div>
                        </div>
                    ))}
                    {isLoading && messages[messages.length - 1]?.role !== 'model' && (
                         <div className="flex justify-start">
                             <div className="max-w-md p-3 rounded-2xl bg-dark-surface-2 text-dark-text rounded-bl-none">
                                <div className="flex gap-1.5 items-center">
                                    <span className="w-2 h-2 bg-dark-text-secondary rounded-full animate-pulse delay-0"></span>
                                    <span className="w-2 h-2 bg-dark-text-secondary rounded-full animate-pulse delay-150"></span>
                                    <span className="w-2 h-2 bg-dark-text-secondary rounded-full animate-pulse delay-300"></span>
                                </div>
                             </div>
                         </div>
                    )}
                </main>
                <footer className="p-4 border-t border-dark-surface-2">
                    <div className="flex items-center gap-2 bg-dark-surface-2 rounded-lg px-2">
                        <textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(input); } }}
                            placeholder="Ask anything..."
                            className="flex-1 bg-transparent p-2 resize-none focus:outline-none"
                            rows={1}
                        />
                        <button onClick={() => handleSend(input)} disabled={isLoading || !input.trim()} className="p-2 text-dark-accent disabled:text-dark-text-secondary rounded-full hover:bg-dark-surface disabled:hover:bg-transparent">
                            <PaperAirplaneIcon className="w-6 h-6" />
                        </button>
                    </div>
                </footer>
            </div>
        </div>
    );
};

export default function App() {
    const [highlights, setHighlights] = useState<Highlight[]>([]);
    const [isAIGuruModalOpen, setAIGuruModalOpen] = useState(false);
    const [aiInitialPrompt, setAiInitialPrompt] = useState('');

    const addHighlight = (highlight: Omit<Highlight, 'id'>) => {
        setHighlights(prev => [...prev, { ...highlight, id: Date.now().toString() }]);
    };

    const openAIGuru = (prompt?: string) => {
        setAiInitialPrompt(prompt || '');
        setAIGuruModalOpen(true);
    };

    return (
        <Router>
            <div className="bg-dark-bg min-h-screen">
                <Routes>
                    <Route path="/" element={<BookshelfPage />} />
                    <Route path="/search" element={<SearchPage />} />
                    <Route path="/subject/:subjectName" element={<SubjectPage />} />
                    <Route 
                        path="/reader/:subjectName/:chapterName" 
                        element={
                            <ReaderPage 
                                openAIGuru={openAIGuru}
                                highlights={highlights}
                                addHighlight={addHighlight}
                            />
                        } 
                    />
                </Routes>

                <AIGuruModal
                    isOpen={isAIGuruModalOpen}
                    onClose={() => setAIGuruModalOpen(false)}
                    initialPrompt={aiInitialPrompt}
                />
            </div>
        </Router>
    );
}
