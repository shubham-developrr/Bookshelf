import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Highlight } from '../types/types';
import { ThemeProvider } from '../contexts/ThemeContext';
import { UserProvider } from '../contexts/UserContext';
import EnhancedAIGuruModal from './EnhancedAIGuruModal';
import EnhancedBookshelfPage from '../pages/EnhancedBookshelfPage';
import SearchPage from '../pages/SearchPage';
import SubjectPage from '../pages/SubjectPage';
import ReaderPage from '../pages/ReaderPage';
import EnhancedReaderPage from '../pages/EnhancedReaderPage';
import HighlightsPage from '../pages/HighlightsPage';
import BookContentPage from '../pages/BookContentPage';

function AppContent() {
    // For now, maintain backward compatibility with local highlight state
    // TODO: Integrate with UserContext highlights after standardizing types
    const [highlights, setHighlights] = useState<Highlight[]>([]);
    const [isAIGuruModalOpen, setAIGuruModalOpen] = useState(false);
    const [aiInitialPrompt, setAiInitialPrompt] = useState('');

    const addHighlight = (highlight: Highlight) => {
        setHighlights(prev => {
            const newHighlight: Highlight = {
                ...highlight,
                id: crypto.randomUUID(),
                timestamp: new Date()
            };
            console.log('New highlight added:', newHighlight);
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
        <Router>
            <div className="theme-bg min-h-screen theme-transition">
                <Routes>
                    <Route path="/" element={<EnhancedBookshelfPage />} />
                    <Route path="/search" element={<SearchPage />} />
                    <Route path="/subject/:subjectName" element={<SubjectPage />} />
                    <Route path="/book/:bookId/content" element={<BookContentPage />} />
                    
                    {/* Reading Mode - Original ReaderPage for viewing content with highlighting */}
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
                    
                    {/* Creation/Editing Mode - EnhancedReaderPage for creating and editing content */}
                    <Route 
                        path="/create/:subjectName/:chapterName" 
                        element={
                            <EnhancedReaderPage 
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
    );
}

function App() {
    return (
        <ThemeProvider>
            <UserProvider>
                <AppContent />
            </UserProvider>
        </ThemeProvider>
    );
}

export default App;
