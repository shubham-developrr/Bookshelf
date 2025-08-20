import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { BackIcon, SearchIconSvg, BookOpenIcon, AcademicCapIcon, LightbulbIcon } from '../components/icons';
import { SearchResult } from '../types/types';
import { syllabus, chapterSubtopics } from '../constants/constants';
import { useTheme } from '../contexts/ThemeContext';
import { getBookImage } from '../assets/images/index';

const SearchPage: React.FC = () => {
    const navigate = useNavigate();
    const { theme } = useTheme();
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);

    const handleSearch = useCallback((query: string) => {
        setSearchQuery(query);
        
        if (!query.trim()) {
            setSearchResults([]);
            return;
        }

        const results: SearchResult[] = [];
        const queryLower = query.toLowerCase();

        // Search through subjects
        Object.entries(syllabus).forEach(([subjectName, chapters]) => {
            if (subjectName.toLowerCase().includes(queryLower)) {
                results.push({
                    type: 'subject',
                    title: subjectName,
                    subtitle: 'Subject',
                    category: 'subjects'
                });
            }
            
            // Search chapters
            chapters.forEach(chapter => {
                if (chapter.toLowerCase().includes(queryLower)) {
                    results.push({
                        type: 'chapter',
                        title: chapter,
                        subtitle: subjectName,
                        subject: subjectName,
                        category: 'chapters'
                    });
                }
            });
        });
        
        // Search subtopics
        Object.entries(chapterSubtopics).forEach(([subjectName, chapters]) => {
            Object.entries(chapters).forEach(([chapterName, subtopics]) => {
                subtopics.forEach(subtopic => {
                    if (subtopic.toLowerCase().includes(queryLower)) {
                        results.push({
                            type: 'subtopic',
                            title: subtopic,
                            subtitle: `${subjectName} → ${chapterName}`,
                            subject: subjectName,
                            chapter: chapterName,
                            category: 'subtopics'
                        });
                    }
                });
            });
        });

        setSearchResults(results);
    }, []);

    const handleResultClick = (result: SearchResult) => {
        if (result.category === 'subjects') {
            navigate(`/subject/${encodeURIComponent(result.title)}`);
        } else if (result.category === 'chapters') {
            navigate(`/reader/${encodeURIComponent(result.subject!)}/${encodeURIComponent(result.title)}`);
        } else if (result.category === 'subtopics') {
            navigate(`/reader/${encodeURIComponent(result.subject!)}/${encodeURIComponent(result.chapter!)}`);
        }
    };

    const getResultIcon = (type: string) => {
        switch (type) {
            case 'subject':
                return <BookOpenIcon />;
            case 'chapter':
                return <AcademicCapIcon className="w-5 h-5" />;
            case 'subtopic':
                return <LightbulbIcon />;
            default:
                return <SearchIconSvg className="w-5 h-5" />;
        }
    };

    return (
        <div className="theme-bg min-h-screen theme-transition">
            <header className="theme-surface sticky top-0 z-10 p-4 theme-transition">
                <div className="max-w-7xl mx-auto flex items-center gap-4">
                    <button onClick={() => navigate(-1)} className="theme-text hover:theme-accent-text theme-transition">
                        <BackIcon />
                    </button>
                    <h1 className="text-xl font-bold theme-text">Search</h1>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-3 sm:px-6 py-6 overflow-hidden">
                {/* Search Section with Image Above - Mobile Optimized */}
                <div className="flex flex-col items-center mb-8 space-y-4">
                    <div className="w-32 h-32 sm:w-40 sm:h-40 lg:w-48 lg:h-48 flex-shrink-0 flex items-center justify-center">
                        <SearchIconSvg className="w-32 h-32 sm:w-40 sm:h-40 lg:w-48 lg:h-48 theme-text-secondary" />
                    </div>
                    <div className="w-full max-w-lg">
                        <input
                            type="text"
                            placeholder="Search topics, chapters, subjects..."
                            value={searchQuery}
                            onChange={(e) => handleSearch(e.target.value)}
                            className="w-full px-4 py-3 theme-surface theme-text placeholder:theme-text-secondary rounded-xl border-2 theme-border focus:theme-accent-border focus:outline-none theme-transition"
                            autoFocus
                        />
                    </div>
                </div>

                {/* Search Results */}
                {searchResults.length > 0 && (
                    <div className="space-y-6 w-full overflow-hidden">
                        {['subjects', 'chapters', 'subtopics'].map((category) => {
                            const categoryResults = searchResults.filter(result => result.category === category);
                            if (categoryResults.length === 0) return null;
                            
                            return (
                                <div key={category} className="space-y-3 w-full">
                                    <h2 className="text-lg font-semibold capitalize theme-accent-text px-2">
                                        {category} ({categoryResults.length})
                                    </h2>
                                    <div className="grid gap-3 w-full">
                                        {categoryResults.map((result, index) => (
                                            <div key={index} className="w-full overflow-hidden">
                                                <button
                                                    onClick={() => handleResultClick(result)}
                                                    className="card text-left flex items-center gap-3 p-3 sm:p-4 md:p-6 hover:scale-[1.02] theme-transition w-full overflow-hidden"
                                                >
                                                    <div className="theme-accent-text flex-shrink-0">
                                                        {getResultIcon(result.type)}
                                                    </div>
                                                    <div className="flex-1 min-w-0 overflow-hidden pr-2">
                                                        <h3 className="font-medium theme-text mb-1 text-sm sm:text-base leading-tight">
                                                            {result.title.length > 40 ? result.title.substring(0, 40) + '...' : result.title}
                                                        </h3>
                                                        <p className="text-xs sm:text-sm theme-text-secondary leading-tight">
                                                            {result.subtitle.length > 50 ? result.subtitle.substring(0, 50) + '...' : result.subtitle}
                                                        </p>
                                                    </div>
                                                    <div className="theme-text-secondary flex-shrink-0">
                                                        <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                        </svg>
                                                    </div>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {searchQuery && searchResults.length === 0 && (
                    <div className="text-center py-12">
                        <div className="theme-text-secondary mb-4">
                            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-medium theme-text mb-2">No results found</h3>
                        <p className="theme-text-secondary">Try searching with different keywords</p>
                    </div>
                )}

                {!searchQuery && (
                    <div className="text-center py-12">
                        <div className="theme-text-secondary mb-4">
                            <SearchIconSvg className="w-16 h-16 mx-auto" />
                        </div>
                        <h3 className="text-lg font-medium theme-text mb-2">Start your search</h3>
                        <p className="theme-text-secondary">Search through all subjects, chapters, and subtopics</p>
                    </div>
                )}
            </main>
        </div>
    );
};

export default SearchPage;
