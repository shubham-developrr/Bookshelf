import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Highlight } from '../types/types';
import { ThemeProvider } from '../contexts/ThemeContext';
import { UserProvider, useUser } from '../contexts/UserContext';
import UserProfileDropdown from './UserProfileDropdown';
import EnhancedAuthModal from './EnhancedAuthModal';
import EnhancedAIGuruModal from './EnhancedAIGuruModal';
import EnhancedBookshelfPage from '../pages/EnhancedBookshelfPage';
import SearchPage from '../pages/SearchPage';
import SubjectPage from '../pages/SubjectPage';
import EnhancedReaderPage from '../pages/EnhancedReaderPage';
import HighlightsPage from '../pages/HighlightsPage';
import BookContentPage from '../pages/BookContentPage';
import ExamModePage from '../pages/ExamModePage';
import AuthCallback from '../pages/AuthCallback';
import { tabPersistenceManager } from '../services/TabPersistenceManager';

/**
 * @description The main component that renders the application's UI, including the router,
 * routes, and global modals. It also manages global state like highlights and the AI Guru modal.
 * @returns {JSX.Element} The AppContent component.
 */
function AppContent() {
    const { state } = useUser();
    const [highlights, setHighlights] = useState<Highlight[]>([]);
    const [isAIGuruModalOpen, setAIGuruModalOpen] = useState(false);
    const [aiInitialPrompt, setAiInitialPrompt] = useState('');
    const [showAuthModal, setShowAuthModal] = useState(false);

    /**
     * @description Initializes the tabPersistenceManager when a user logs in.
     */
    useEffect(() => {
        if (state.isAuthenticated && state.user) {
            tabPersistenceManager.initialize(state.user.id);
        } else {
            tabPersistenceManager.cleanup();
        }
    }, [state.isAuthenticated, state.user]);

    /**
     * @description Adds a new highlight to the global highlights state.
     * @param {Highlight} highlight - The highlight object to add.
     */
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

    /**
     * @description Removes a highlight from the global highlights state.
     * @param {string} id - The ID of the highlight to remove.
     */
    const removeHighlight = (id: string) => {
        setHighlights(prev => prev.filter(h => h.id !== id));
    };

    /**
     * @description Opens the AI Guru modal with an optional initial prompt.
     * @param {string} [prompt] - The initial prompt for the AI Guru.
     */
    const openAIGuru = (prompt?: string) => {
        setAiInitialPrompt(prompt || '');
        setAIGuruModalOpen(true);
    };

    return (
        <Router>
            <div className="theme-bg min-h-screen theme-transition">
                <Routes>
                    <Route path="/" element={
                        <EnhancedBookshelfPage 
                            showAuthModal={showAuthModal}
                            setShowAuthModal={setShowAuthModal}
                        />
                    } />
                    <Route path="/auth/callback" element={<AuthCallback />} />
                    <Route path="/search" element={<SearchPage />} />
                    <Route path="/subject/:subjectName" element={<SubjectPage />} />
                    <Route path="/book/:bookId/content" element={<BookContentPage />} />
                    
                    {/* Exam Mode Page */}
                    <Route path="/exam/:subjectName/:chapterName" element={<ExamModePage />} />
                    
                    {/* Reading Mode - Enhanced ReaderPage with template system */}
                    <Route 
                        path="/reader/:subjectName/:chapterName" 
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

                {/* Modals */}
                <EnhancedAuthModal 
                    isOpen={showAuthModal} 
                    onClose={() => setShowAuthModal(false)} 
                />

                <EnhancedAIGuruModal
                    isOpen={isAIGuruModalOpen}
                    onClose={() => setAIGuruModalOpen(false)}
                    initialPrompt={aiInitialPrompt}
                />
            </div>
        </Router>
    );
}

/**
 * @description The root component of the application. Its primary role is to wrap the
 * AppContent with the necessary context providers (ThemeProvider, UserProvider).
 * @returns {JSX.Element} The App component.
 */
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
