import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { BackIcon, AlertIcon } from '../components/icons';
import { Highlight } from '../types/types';

interface HighlightsPageProps {
    highlights: Highlight[];
    openAIGuru: (prompt?: string) => void;
    removeHighlight: (id: string) => void;
}

const HighlightsPage: React.FC<HighlightsPageProps> = ({ highlights, openAIGuru, removeHighlight }) => {
    const { subjectName, chapterName } = useParams<{ subjectName: string; chapterName: string }>();
    const navigate = useNavigate();

    const currentBook = subjectName ? decodeURIComponent(subjectName) : '';
    const currentChapter = chapterName ? decodeURIComponent(chapterName) : '';

    // Filter highlights for the current chapter
    const chapterHighlights = highlights.filter(h => h.chapterId === currentBook);

    // Group highlights by color
    const groupedHighlights = chapterHighlights.reduce((acc, highlight) => {
        if (!acc[highlight.color]) {
            acc[highlight.color] = [];
        }
        acc[highlight.color].push(highlight);
        return acc;
    }, {} as Record<string, Highlight[]>);

    // Get color label
    const getColorLabel = (color: string) => {
        switch(color) {
            case 'yellow': return 'Yellow Highlights';
            case 'green': return 'Green Highlights';
            case 'blue': return 'Blue Highlights (Notes)';
            case 'red': return 'Red Highlights';
            default: return 'Other Highlights';
        }
    };

    // Get color class
    const getColorClass = (color: string) => {
        switch(color) {
            case 'yellow': return 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-300 dark:border-yellow-700';
            case 'green': return 'bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700';
            case 'blue': return 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700';
            case 'red': return 'bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700';
            default: return 'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600';
        }
    };

    if (!currentBook || !currentChapter) {
        return (
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-4 theme-bg min-h-screen">
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
        );
    }

    return (
        <div className="theme-bg min-h-screen theme-text theme-transition">
            <header className="sticky top-0 theme-surface backdrop-blur-sm z-10 p-4 theme-transition">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate(`/reader/${encodeURIComponent(currentBook)}/${encodeURIComponent(currentChapter)}`)}>
                            <BackIcon />
                        </button>
                        <h1 className="font-semibold text-lg theme-text">
                            Highlights & Notes
                        </h1>
                    </div>
                    <AlertIcon />
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
                <div className="mb-6">
                    <h2 className="text-xl font-bold theme-text mb-2">{currentChapter}</h2>
                    <p className="text-sm theme-text-secondary">
                        {chapterHighlights.length} highlight{chapterHighlights.length !== 1 ? 's' : ''}
                    </p>
                </div>

                {chapterHighlights.length === 0 ? (
                    <div className="text-center py-12">
                        <div className="w-16 h-16 mx-auto mb-4 theme-text-secondary">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-medium theme-text mb-2">No highlights yet</h3>
                        <p className="theme-text-secondary mb-4">
                            Select text in the chapter content and click the Highlight button to add highlights.
                        </p>
                        <button 
                            onClick={() => navigate(`/reader/${encodeURIComponent(currentBook)}/${encodeURIComponent(currentChapter)}`)}
                            className="btn-primary"
                        >
                            Go to Chapter
                        </button>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {Object.entries(groupedHighlights).map(([color, highlights]) => (
                            <div key={color} className="theme-transition">
                                <h3 className="text-lg font-semibold theme-text mb-3">
                                    {getColorLabel(color)} ({highlights.length})
                                </h3>
                                <div className="space-y-3">
                                    {highlights.map((highlight) => (
                                        <div 
                                            key={highlight.id} 
                                            className={`rounded-lg border p-4 theme-transition ${getColorClass(color)}`}
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <span className={`inline-block w-3 h-3 rounded-full ${
                                                    color === 'yellow' ? 'bg-yellow-400' :
                                                    color === 'green' ? 'bg-green-400' :
                                                    color === 'blue' ? 'bg-blue-400' :
                                                    color === 'red' ? 'bg-red-400' : 'bg-gray-400'
                                                }`}></span>
                                                <button 
                                                    onClick={() => removeHighlight(highlight.id)}
                                                    className="text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 transition-colors"
                                                    title="Remove highlight"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </button>
                                            </div>
                                            <p className="theme-text">{highlight.text}</p>
                                            {highlight.timestamp && (
                                                <p className="text-xs theme-text-secondary mt-2">
                                                    {highlight.timestamp.toLocaleDateString()} at {highlight.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
};

export default HighlightsPage;