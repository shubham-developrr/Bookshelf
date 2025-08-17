import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Highlight } from '../types/types';
import { ThemeProvider } from '../contexts/ThemeContext';
import EnhancedAIGuruModal from './EnhancedAIGuruModal';
import BookshelfPage from '../pages/BookshelfPage';
import SearchPage from '../pages/SearchPage';
import SubjectPage from '../pages/SubjectPage';
import ReaderPage from '../pages/ReaderPage';
import HighlightsPage from '../pages/HighlightsPage';

function App() {
    const [highlights, setHighlights] = useState<Highlight[]>([]);
    const [isAIGuruModalOpen, setAIGuruModalOpen] = useState(false);
    const [aiInitialPrompt, setAiInitialPrompt] = useState('');

    const addHighlight = (highlight: Highlight) => {
        setHighlights(prev => {
            const newHighlight: Highlight = {
                ...highlight,
                id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                timestamp: new Date()
            };
            console.log('New highlight list:', [...prev, newHighlight]);
            return [...prev, newHighlight];
        });
    };

    const removeHighlight = (id: string) => {
        setHighlights(prev => prev.filter(h => h.id !== id));
    };

    const openAIGuru = (prompt?: string) => {
        setAiInitialPrompt(prompt || '');
        setAIGuruModalOpen(true);
    };

    return (
        <ThemeProvider>
            <Router>
                <div className="theme-bg min-h-screen theme-transition">
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
                                    removeHighlight={removeHighlight}
                                />
                            } 
                        />
                        <Route 
                                path="/highlights/:subjectName/:chapterName" 
                                element={
                                    <HighlightsPage 
                                        highlights={highlights}
                                        openAIGuru={openAIGuru}
                                        removeHighlight={removeHighlight}
                                    />
                                } 
                            />
                    </Routes>

                    <EnhancedAIGuruModal
                        isOpen={isAIGuruModalOpen}
                        onClose={() => setAIGuruModalOpen(false)}
                        initialPrompt={aiInitialPrompt}
                    />
                </div>
            </Router>
        </ThemeProvider>
    );
}

export default App;
