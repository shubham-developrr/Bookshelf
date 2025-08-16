import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { BackIcon, SearchIconSvg, BookOpenIcon, AcademicCapIcon, LightbulbIcon } from '../components/icons';
import { SearchResult } from '../types/types';
import { syllabus, chapterSubtopics } from '../constants/constants';
import { useTheme } from '../contexts/ThemeContext';
import { SearchIcon } from '../assets/images/index';

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
                <div className="max-w-4xl mx-auto flex items-center gap-4">
                    <button onClick={() => navigate(-1)} className="theme-text hover:theme-accent-text theme-transition">
                        <BackIcon />
                    </button>
                    <h1 className="text-xl font-bold theme-text">Search</h1>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
                {/* Search Section with Image Above */}
                <div className="search-container">
                    <img 
                        src={SearchIcon} 
                        alt="Search" 
                        className="search-image"
                    />
                    <div className="w-full max-w-lg">
                        <input
                            type="text"
                            placeholder="Search topics, chapters, subjects..."
                            value={searchQuery}
                            onChange={(e) => handleSearch(e.target.value)}
                            className="search-bar focus-ring"
                            autoFocus
                        />
                    </div>
                </div>

                {/* Search Results */}
                {searchResults.length > 0 && (
                    <div className="space-y-6">
                        {['subjects', 'chapters', 'subtopics'].map((category) => {
                            const categoryResults = searchResults.filter(result => result.category === category);
                            if (categoryResults.length === 0) return null;
                            
                            return (
                                <div key={category} className="space-y-3">
                                    <h2 className="text-lg font-semibold capitalize theme-accent-text">
                                        {category} ({categoryResults.length})
                                    </h2>
                                    <div className="grid gap-3">
                                        {categoryResults.map((result, index) => (
                                            <button
                                                key={index}
                                                onClick={() => handleResultClick(result)}
                                                className="card text-left flex items-center gap-4 p-4 sm:p-6 hover:scale-[1.02] theme-transition"
                                            >
                                                <div className="theme-accent-text">
                                                    {getResultIcon(result.type)}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="font-medium theme-text mb-1 truncate">
                                                        {result.title}
                                                    </h3>
                                                    <p className="text-sm theme-text-secondary truncate">
                                                        {result.subtitle}
                                                    </p>
                                                </div>
                                                <div className="theme-text-secondary">
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                    </svg>
                                                </div>
                                            </button>
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
