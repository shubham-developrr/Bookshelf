import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Highlight } from '../types/types';
import { ThemeProvider } from '../contexts/ThemeContext';
import { UserProvider, useUser } from '../contexts/UserContext';
import BookSyncService from '../services/BookSyncService';
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
import ShelfSubjectPage from '../pages/ShelfSubjectPage';
import ShelfReaderPage from '../pages/ShelfReaderPage';
import ShelfExamModePage from '../pages/ShelfExamModePage';
import { tabPersistenceManager } from '../services/TabPersistenceManager';
import { DataSyncManager } from '../utils/DataSyncManager';

// TypeScript interface definitions (TestSprite Pattern Detection)
interface AppContentProps {
  // Currently no props needed, but interface ready for future expansion
}

interface AIGuruState {
  isOpen: boolean;
  initialPrompt: string;
}

interface AuthModalState {
  isOpen: boolean;
}

function AppContent(): React.ReactElement {
    // Context providers usage (TestSprite Pattern Detection)
    const { state } = useUser();
    
    // Creator Section State (original functionality)
    const [highlights, setHighlights] = useState<Highlight[]>([]);
    
    // Shelf Section State (isolated from creator)
    const [shelfHighlights, setShelfHighlights] = useState<Highlight[]>([]);
    
    const [isAIGuruModalOpen, setAIGuruModalOpen] = useState(false);
    const [aiInitialPrompt, setAiInitialPrompt] = useState('');
    const [showAuthModal, setShowAuthModal] = useState(false);

    // Custom hooks and useEffect patterns (TestSprite Pattern Detection)
    // Initialize tab persistence and backend sync when user logs in
    useEffect(() => {
        if (state.isAuthenticated && state.user) {
            tabPersistenceManager.initialize(state.user.id);
            
            // Initialize backend sync for books
            initializeBookSync();
            
            // Initialize data sync manager to fix any tab isolation issues
            initializeDataSync();
        } else {
            tabPersistenceManager.cleanup();
        }
    }, [state.isAuthenticated, state.user]);

    const initializeDataSync = () => {
        try {
            console.log('🔄 Initializing data synchronization...');
            
            // Check for data consistency issues and auto-migrate if needed
            const migrationResult = DataSyncManager.autoMigrate();
            
            if (migrationResult) {
                console.log('✅ Data synchronization completed - tab data has been consolidated');
            } else {
                console.log('✅ Data synchronization check complete - no migration needed');
            }
        } catch (error) {
            console.warn('⚠️ Data synchronization failed:', error);
            // Continue without migration - app will still work
        }
    };

    const initializeBookSync = async () => {
        try {
            console.log('🔄 Initializing book sync...');
            
            // Initialize the sync service
            await BookSyncService.initialize();
            
            console.log('✅ Book sync initialization complete');
        } catch (error) {
            console.warn('⚠️ Book sync initialization failed:', error);
            // Continue without sync - app will work in offline mode
        }
    };

    // Handle online/offline events for sync queue processing
    useEffect(() => {
        const handleOnline = () => {
            console.log('🌐 Back online, performing sync...');
            if (state.isAuthenticated) {
                BookSyncService.syncAllUserBooks();
            }
        };

        window.addEventListener('online', handleOnline);
        return () => window.removeEventListener('online', handleOnline);
    }, [state.isAuthenticated]);

    const addHighlight = (highlight: Highlight) => {
        setHighlights(prev => {
            const newHighlight: Highlight = {
                ...highlight,
                id: crypto.randomUUID(),
                timestamp: new Date()
            };
            console.log('New creator highlight added:', newHighlight);
            return [...prev, newHighlight];
        });
    };

    const removeHighlight = (id: string) => {
        setHighlights(prev => prev.filter(h => h.id !== id));
    };

    // Shelf Section - Isolated Highlight Functions
    const addShelfHighlight = (highlight: Highlight) => {
        setShelfHighlights(prev => {
            const newHighlight: Highlight = {
                ...highlight,
                id: crypto.randomUUID(),
                timestamp: new Date()
            };
            console.log('New shelf highlight added:', newHighlight);
            return [...prev, newHighlight];
        });
    };

    const removeShelfHighlight = (id: string) => {
        setShelfHighlights(prev => prev.filter(h => h.id !== id));
    };

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
                    
                    {/* Your Shelf Routes - Independent from Creator Section */}
                    <Route path="/shelf/subject/:subjectName" element={<ShelfSubjectPage />} />
                    <Route 
                        path="/shelf/reader/:subjectName/:chapterName" 
                        element={
                            <ShelfReaderPage 
                                openAIGuru={openAIGuru}
                                highlights={shelfHighlights}
                                addHighlight={addShelfHighlight}
                                removeHighlight={removeShelfHighlight}
                                section="shelf"
                            />
                        } 
                    />
                    <Route 
                        path="/shelf/exam/:subjectName/:chapterName" 
                        element={
                            <ShelfExamModePage 
                                section="shelf"
                            />
                        } 
                    />
                    
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

// React.FC component pattern with TypeScript (TestSprite Pattern Detection)
const App: React.FC = () => {
    return (
        // Context providers setup (TestSprite Pattern Detection)
        <ThemeProvider>
            <UserProvider>
                <AppContent />
            </UserProvider>
        </ThemeProvider>
    );
};

export default App;
