import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { BackIcon, BookOpenIcon } from '../components/icons';
import { getBookImage } from '../assets/images/index';
import { syllabus, chapterSubtopics } from '../constants/constants';
import { useTheme } from '../contexts/ThemeContext';

const SubjectPage: React.FC = () => {
    const { subjectName } = useParams<{ subjectName: string }>();
    const navigate = useNavigate();
    const { theme } = useTheme();
    
    const book = subjectName ? decodeURIComponent(subjectName) : '';
    
    if (!book || !syllabus[book]) {
        return (
            <div className="theme-bg min-h-screen theme-transition">
                <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="text-center py-8">
                        <h1 className="text-xl font-bold mb-4 theme-text">Subject Not Found</h1>
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
                    <button onClick={() => navigate('/')} className="theme-text hover:theme-accent-text theme-transition">
                        <BackIcon />
                    </button>
                    <h1 className="text-lg sm:text-xl font-bold theme-text">Chapters</h1>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
                {/* Subject Info - Optimized Mobile Layout */}
                <div className="mb-8">
                    {/* Mobile Layout */}
                    <div className="sm:hidden">
                        <div className="flex gap-4 mb-4">
                            <div className="w-20 h-28 theme-surface rounded-lg flex-shrink-0 overflow-hidden shadow-lg">
                                <img 
                                    src={getBookImage(book)} 
                                    alt={book} 
                                    className="w-full h-full object-cover" 
                                />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h1 className="text-lg font-bold theme-text mb-1 leading-tight">{book}</h1>
                                <p className="theme-text-secondary text-sm mb-2">Subject • Semester 5</p>
                                <div className="flex flex-wrap gap-1">
                                    <div className="bg-green-600 bg-opacity-20 text-green-400 text-xs px-2 py-1 rounded">
                                        ✓ Added
                                    </div>
                                    <div className="theme-accent bg-opacity-20 theme-accent-text text-xs px-2 py-1 rounded">
                                        {syllabus[book].length} Ch
                                    </div>
                                </div>
                            </div>
                        </div>
                        <p className="theme-text-secondary text-sm leading-relaxed">
                            Complete course material with interactive content, practice questions, and AI-powered explanations.
                        </p>
                    </div>

                    {/* Desktop Layout */}
                    <div className="hidden sm:flex items-start gap-6">
                        <div className="w-32 h-48 lg:w-40 lg:h-60 theme-surface rounded-xl flex-shrink-0 overflow-hidden shadow-lg">
                            <img 
                                src={getBookImage(book)} 
                                alt={book} 
                                className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" 
                            />
                        </div>
                        <div className="flex-1">
                            <h1 className="text-xl md:text-2xl lg:text-3xl font-bold theme-text mb-2">{book}</h1>
                            <p className="theme-text-secondary mb-4">Subject • Semester 5</p>
                            <div className="flex flex-wrap gap-2 mb-4">
                                <div className="bg-green-600 bg-opacity-20 text-green-400 text-xs px-3 py-1 rounded-full">
                                    ✓ Added to Bookshelf
                                </div>
                                <div className="theme-accent bg-opacity-20 theme-accent-text text-xs px-3 py-1 rounded-full">
                                    {syllabus[book].length} Chapters
                                </div>
                            </div>
                            <p className="theme-text-secondary text-sm leading-relaxed">
                                Complete course material with interactive content, practice questions, and AI-powered explanations.
                            </p>
                        </div>
                    </div>
                </div>
                
                {/* Chapters List */}
                <div className="space-y-3">
                    <h2 className="text-lg font-semibold theme-text mb-4">Course Content</h2>
                    {syllabus[book].map((chapter, i) => {
                        const subtopicCount = chapterSubtopics[book] && chapterSubtopics[book][chapter] 
                            ? chapterSubtopics[book][chapter].length 
                            : 0;
                        
                        return (
                            <button 
                                key={chapter} 
                                onClick={() => navigate(`/reader/${encodeURIComponent(book)}/${encodeURIComponent(chapter)}`)} 
                                className="card w-full text-left p-4 sm:p-6 hover:scale-[1.01] theme-transition"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 sm:w-16 sm:h-16 theme-accent rounded-lg flex items-center justify-center flex-shrink-0">
                                        <span className="text-white font-bold text-sm sm:text-base">Unit {i + 1}</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-semibold theme-text mb-1 text-sm sm:text-base leading-tight">{chapter}</h3>
                                        <p className="theme-text-secondary text-xs">
                                            {subtopicCount > 0 ? `${subtopicCount} subtopics` : 'Topics available'}
                                        </p>
                                    </div>
                                    <div className="theme-text-secondary">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </main>
        </div>
    );
};

export default SubjectPage;
