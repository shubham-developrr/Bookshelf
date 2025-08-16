import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { BackIcon, AlertIcon, SparklesIcon, PlayCircleIcon } from '../components/icons';
import { Highlight } from '../types/types';
import { READER_TEXT, chapterSubtopics } from '../constants/constants';
import { AIGuruIcon } from '../components/icons';
import { useTheme } from '../contexts/ThemeContext';

interface ReaderPageProps {
    openAIGuru: (prompt?: string) => void;
    highlights: Highlight[];
    addHighlight: (highlight: Omit<Highlight, 'id'>) => void;
}

// --- Helper to escape regex special characters ---
function escapeRegExp(string: string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const ReaderPage: React.FC<ReaderPageProps> = ({ openAIGuru, highlights, addHighlight }) => {
    const { subjectName, chapterName } = useParams<{ subjectName: string; chapterName: string }>();
    const navigate = useNavigate();
    const { theme } = useTheme();
    
    const [highlightMenu, setHighlightMenu] = useState<{ top: number; left: number; show: boolean }>({ 
        top: 0, left: 0, show: false 
    });
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [renderedHtml, setRenderedHtml] = useState(READER_TEXT);
    const [expandedSubtopics, setExpandedSubtopics] = useState<Set<string>>(new Set());
    const contentRef = useRef<HTMLDivElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    const currentBook = subjectName ? decodeURIComponent(subjectName) : '';
    const currentChapter = chapterName ? decodeURIComponent(chapterName) : '';
    
    const currentSubtopics = currentChapter && chapterSubtopics[currentBook] 
        ? chapterSubtopics[currentBook][currentChapter] || []
        : [];

    // Sample content for each subtopic (in a real app, this would come from a database)
    const subtopicContent: Record<string, string> = {
        'Introduction': 'This section covers the basic concepts and foundational knowledge needed to understand the topic. We explore the fundamental principles that form the backbone of this subject area.',
        'Historical Background': 'The historical development and key milestones in this field include significant contributions from various researchers and practitioners over the decades.',
        'Key Concepts': 'The fundamental principles and core ideas that form the basis of this subject are essential for building a solid understanding of the advanced topics.',
        'Applications': 'Real-world applications and practical uses of these concepts span across multiple industries including technology, healthcare, finance, and manufacturing.',
        'Examples': 'Detailed examples demonstrating the practical application of theoretical concepts help bridge the gap between theory and practice.',
        'Case Studies': 'In-depth analysis of specific scenarios and their solutions provide valuable insights into real-world problem-solving approaches.',
        'Advanced Topics': 'Advanced concepts build upon the foundational knowledge and explore more complex scenarios and applications.',
        'Best Practices': 'Industry best practices and recommended approaches for implementing these concepts in professional environments.',
        'Common Pitfalls': 'Understanding common mistakes and how to avoid them is crucial for successful implementation.',
        'Future Trends': 'Emerging trends and future directions in this field point toward exciting developments and opportunities.',
    };

    const toggleSubtopic = (subtopic: string) => {
        setExpandedSubtopics(prev => {
            const newSet = new Set(prev);
            if (newSet.has(subtopic)) {
                newSet.delete(subtopic);
            } else {
                newSet.add(subtopic);
            }
            return newSet;
        });
    };

    useEffect(() => {
        let html = READER_TEXT;
        const chapterHighlights = highlights.filter(h => h.chapterId === currentBook);
        
        chapterHighlights.forEach(highlight => {
            const markElement = `<mark class="bg-${highlight.color}-500 bg-opacity-40 rounded px-1" data-highlight-id="${highlight.id}">${highlight.text}</mark>`;
            html = html.replace(new RegExp(escapeRegExp(highlight.text), 'g'), markElement);
        });

        setRenderedHtml(html);
    }, [highlights, currentBook]);

    const hideMenu = useCallback(() => {
        setHighlightMenu(prev => ({ ...prev, show: false }));
    }, []);

    const handleMouseUp = useCallback(() => {
        const selection = window.getSelection();
        if (selection && !selection.isCollapsed && contentRef.current) {
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            const containerRect = contentRef.current.getBoundingClientRect();

            setShowColorPicker(false);
            setHighlightMenu({
                top: rect.top - containerRect.top - 60,
                left: rect.left - containerRect.left + rect.width / 2 - 100,
                show: true
            });
        }
    }, []);
    
    useEffect(() => {
        const handleMouseDown = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                hideMenu();
            }
        };
        document.addEventListener('mousedown', handleMouseDown);
        return () => {
            document.removeEventListener('mousedown', handleMouseDown);
        };
    }, [hideMenu]);

    const applyHighlight = (color: string) => {
        const selection = window.getSelection();
        if (selection && !selection.isCollapsed) {
            const text = selection.toString();
            addHighlight({ text, color, chapterId: currentBook });
            selection.removeAllRanges();
        }
        hideMenu();
    };
    
    const handleExplain = () => {
        const selection = window.getSelection();
        if (selection) {
            const selectedText = selection.toString().trim();
            if (selectedText) {
                openAIGuru(selectedText);
            }
        }
        hideMenu();
    };

    const handleSubtopicExplain = (subtopic: string) => {
        openAIGuru(`Explain "${subtopic}" from ${currentChapter} chapter of ${currentBook} subject in detail.`);
    };

    const handleVideoLink = (subtopic: string) => {
        console.log(`Video for: ${subtopic} from ${currentChapter} - ${currentBook}`);
        alert(`Video feature for "${subtopic}" will be implemented with YouTube links later.`);
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
                <div className="max-w-7xl mx-auto w-full flex justify-between items-center">
                    <button onClick={() => navigate(`/subject/${encodeURIComponent(currentBook)}`)}>
                        <BackIcon />
                    </button>
                    <div className="flex items-center gap-2">
                        <h1 className="font-semibold text-center text-sm md:text-base theme-text">
                            {currentChapter}
                        </h1>
                    </div>
                    <AlertIcon />
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 sm:px-6" onMouseUp={handleMouseUp}>
                <div className="py-4 flex flex-wrap gap-2 text-sm">
                    <button className="btn-secondary">Read</button>
                    <button 
                        onClick={() => navigate(`/practice/${encodeURIComponent(currentBook)}/${encodeURIComponent(currentChapter)}`)} 
                        className="btn-secondary hover:btn-primary"
                    >
                        Practice
                    </button>
                    <button className="btn-secondary">NCERT Solutions</button>
                    <button 
                        onClick={() => navigate(`/highlights/${encodeURIComponent(currentBook)}/${encodeURIComponent(currentChapter)}`)} 
                        className="btn-secondary"
                    >
                        Highlights & Notes
                    </button>
                </div>

                {/* Subtopics - All displayed on page */}
                {currentSubtopics.length > 0 && (
                    <div className="mb-8">
                        <h2 className="text-lg font-semibold theme-text mb-4">
                            Chapter Topics ({currentSubtopics.length})
                        </h2>
                        <div className="subtopic-container">
                            {currentSubtopics.map((subtopic, index) => (
                                <div key={index} className="subtopic-bar theme-transition">
                                    <div 
                                        className="subtopic-header cursor-pointer"
                                        onClick={() => toggleSubtopic(subtopic)}
                                    >
                                        <span className="font-medium theme-text">{subtopic}</span>
                                        <div className="subtopic-actions">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleSubtopicExplain(subtopic);
                                                }}
                                                className="p-1.5 rounded-full hover:bg-purple-600/20 theme-transition"
                                                title="AI Explanation"
                                            >
                                                <SparklesIcon className="w-4 h-4 text-purple-400" />
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleVideoLink(subtopic);
                                                }}
                                                className="p-1.5 rounded-full hover:bg-red-600/20 theme-transition"
                                                title="Video Tutorial"
                                            >
                                                <PlayCircleIcon className="w-4 h-4 text-red-400" />
                                            </button>
                                        </div>
                                    </div>
                                    
                                    <div className={`subtopic-content ${expandedSubtopics.has(subtopic) ? 'expanded' : ''}`}>
                                        <p className="subtopic-text">
                                            {subtopicContent[subtopic] || 'Content for this subtopic will be added soon. Click the AI button above for an explanation.'}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                
                <div className="relative pb-16" ref={contentRef}>
                    {highlightMenu.show && (
                        <div ref={menuRef} className="absolute theme-surface2 p-2 rounded-lg flex gap-1 items-center shadow-lg z-20" style={{ top: `${highlightMenu.top}px`, left: `${highlightMenu.left}px` }}>
                            {showColorPicker ? (
                                <>
                                    <button onClick={() => applyHighlight('red')} className="w-6 h-6 bg-red-500 rounded-full border-2 theme-border"></button>
                                    <button onClick={() => applyHighlight('orange')} className="w-6 h-6 bg-orange-500 rounded-full border-2 theme-border"></button>
                                    <button onClick={() => applyHighlight('green')} className="w-6 h-6 bg-green-500 rounded-full border-2 theme-border"></button>
                                    <button className="text-red-500 text-xl px-1">🗑️</button>
                                </>
                            ) : (
                                <>
                                    <button className="px-3 py-1.5 text-xs rounded-md hover:theme-surface" onClick={() => setShowColorPicker(true)}>Highlight</button>
                                    <button className="px-3 py-1.5 text-xs rounded-md hover:theme-surface">Note</button>
                                    <button onClick={handleExplain} className="px-3 py-1.5 text-xs rounded-md hover:theme-surface flex items-center gap-1">
                                        <SparklesIcon className="w-4 h-4 text-purple-400"/>
                                        Explain
                                    </button>
                                </>
                            )}
                        </div>
                    )}
                    
                    <div className="prose prose-lg max-w-none theme-text" dangerouslySetInnerHTML={{ __html: renderedHtml }} />
                </div>
            </main>
            
            <button 
                onClick={() => openAIGuru()} 
                className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 theme-accent p-3 sm:p-4 rounded-full shadow-lg hover:bg-opacity-90 theme-transition transform hover:scale-110 z-20"
            >
                <AIGuruIcon className="w-6 h-6 sm:w-7 sm:h-7 text-white"/>
            </button>
        </div>
    );
};

export default ReaderPage;
