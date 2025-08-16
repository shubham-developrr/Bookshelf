import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { BackIcon, SparklesIcon } from '../components/icons';
import { Highlight } from '../types/types';
import { useTheme } from '../contexts/ThemeContext';

interface HighlightsPageProps {
    highlights: Highlight[];
    openAIGuru: (prompt?: string) => void;
}

const HighlightsPage: React.FC<HighlightsPageProps> = ({ highlights, openAIGuru }) => {
    const { subjectName, chapterName } = useParams<{ subjectName: string; chapterName: string }>();
    const navigate = useNavigate();
    const { theme } = useTheme();
    const [activeTab, setActiveTab] = useState<'highlights' | 'notes'>('highlights');

    const currentBook = subjectName ? decodeURIComponent(subjectName) : '';
    const currentChapter = chapterName ? decodeURIComponent(chapterName) : '';
    
    const chapterHighlights = highlights.filter(h => h.chapterId === currentBook);
    const highlightColors = chapterHighlights.filter(h => h.color !== 'blue');
    const notes = chapterHighlights.filter(h => h.color === 'blue'); // Using blue for notes

    const getColorClass = (color: string) => {
        switch(color) {
            case 'yellow': return 'bg-yellow-400';
            case 'green': return 'bg-green-400';
            case 'blue': return 'bg-blue-400';
            case 'red': return 'bg-red-400';
            default: return 'bg-yellow-400';
        }
    };

    const handleExplain = (text: string) => {
        openAIGuru(`Explain this text from ${currentChapter} chapter: "${text}"`);
    };

    if (!currentBook || !currentChapter) {
        return (
            <div className="theme-bg min-h-screen theme-transition">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
                    <div className="text-center py-8">
                        <h1 className="text-xl font-bold mb-4 theme-text">Chapter Not Found</h1>
                        <button 
                            onClick={() => navigate('/')} 
                            className="btn-primary"
                        >
                            Go Back to Bookshelf
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="theme-bg min-h-screen theme-transition">
            {/* Header */}
            <header className="theme-surface sticky top-0 z-10 p-4 theme-transition">
                <div className="max-w-7xl mx-auto flex items-center gap-4">
                    <button 
                        onClick={() => navigate(`/reader/${encodeURIComponent(currentBook)}/${encodeURIComponent(currentChapter)}`)} 
                        className="theme-text hover:theme-accent-text theme-transition"
                    >
                        <BackIcon />
                    </button>
                    <div className="flex-1 min-w-0">
                        <h1 className="text-lg sm:text-xl font-bold theme-text">Highlights & Notes</h1>
                        <p className="text-sm theme-text-secondary truncate">{currentChapter} • {currentBook}</p>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
                {/* Tabs */}
                <div className="flex gap-1 mb-6 theme-surface rounded-lg p-1">
                    <button
                        onClick={() => setActiveTab('highlights')}
                        className={`flex-1 px-4 py-2 text-sm font-medium rounded-md theme-transition ${
                            activeTab === 'highlights' 
                                ? 'theme-accent text-white' 
                                : 'theme-text hover:theme-surface2'
                        }`}
                    >
                        Highlights ({highlightColors.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('notes')}
                        className={`flex-1 px-4 py-2 text-sm font-medium rounded-md theme-transition ${
                            activeTab === 'notes' 
                                ? 'theme-accent text-white' 
                                : 'theme-text hover:theme-surface2'
                        }`}
                    >
                        Notes ({notes.length})
                    </button>
                </div>

                {/* Highlights Tab */}
                {activeTab === 'highlights' && (
                    <div className="space-y-4">
                        {highlightColors.length > 0 ? (
                            highlightColors.map((highlight) => (
                                <div key={highlight.id} className="card p-4 sm:p-6">
                                    <div className="flex items-start justify-between gap-4 mb-3">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-4 h-4 rounded-full ${getColorClass(highlight.color)}`}></div>
                                            <span className="text-xs theme-text-secondary">Highlighted</span>
                                        </div>
                                        <button
                                            onClick={() => handleExplain(highlight.text)}
                                            className="p-1.5 rounded-full hover:bg-purple-600/20 theme-transition"
                                            title="AI Explain"
                                        >
                                            <SparklesIcon className="w-4 h-4 text-purple-400" />
                                        </button>
                                    </div>
                                    <p className="theme-text leading-relaxed text-justify" style={{ fontSize: '15px', fontFamily: 'Georgia, serif' }}>
                                        "{highlight.text}"
                                    </p>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-12">
                                <div className="w-16 h-16 theme-surface rounded-full flex items-center justify-center mx-auto mb-4">
                                    <div className="w-6 h-6 bg-yellow-400 rounded-full"></div>
                                </div>
                                <h3 className="text-lg font-medium theme-text mb-2">No highlights yet</h3>
                                <p className="theme-text-secondary">Start highlighting text to see them here</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Notes Tab */}
                {activeTab === 'notes' && (
                    <div className="space-y-4">
                        {notes.length > 0 ? (
                            notes.map((note) => (
                                <div key={note.id} className="card p-4 sm:p-6">
                                    <div className="flex items-start justify-between gap-4 mb-3">
                                        <div className="flex items-center gap-2">
                                            <svg className="w-4 h-4 theme-accent-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                            </svg>
                                            <span className="text-xs theme-text-secondary">Note</span>
                                        </div>
                                        <button
                                            onClick={() => handleExplain(note.text)}
                                            className="p-1.5 rounded-full hover:bg-purple-600/20 theme-transition"
                                            title="AI Explain"
                                        >
                                            <SparklesIcon className="w-4 h-4 text-purple-400" />
                                        </button>
                                    </div>
                                    <p className="theme-text leading-relaxed text-justify" style={{ fontSize: '15px', fontFamily: 'Georgia, serif' }}>
                                        "{note.text}"
                                    </p>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-12">
                                <div className="w-16 h-16 theme-surface rounded-full flex items-center justify-center mx-auto mb-4">
                                    <svg className="w-6 h-6 theme-accent-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                </div>
                                <h3 className="text-lg font-medium theme-text mb-2">No notes yet</h3>
                                <p className="theme-text-secondary">Add notes to text selections to see them here</p>
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
};

export default HighlightsPage;
