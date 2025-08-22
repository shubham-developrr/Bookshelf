import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { BackIcon, BookOpenIcon, PlusIcon, TrashIcon, ExamIcon } from '../components/icons';
import { getBookImage } from '../assets/images/index';
import { syllabus, chapterSubtopics } from '../constants/constants';
import { useTheme } from '../contexts/ThemeContext';
import UnifiedBookAdapter from '../services/UnifiedBookAdapter';

interface Chapter {
    id: string;
    number: number;
    name: string;
    subtopics: string[];
}

const SubjectPage: React.FC = () => {
    const { subjectName } = useParams<{ subjectName: string }>();
    const navigate = useNavigate();
    const { theme } = useTheme();
    
    const book = subjectName ? decodeURIComponent(subjectName) : '';
    
    // Custom book management state
    const [isCustomBook, setIsCustomBook] = useState(false);
    const [isImportedBook, setIsImportedBook] = useState(false);
    const [customChapters, setCustomChapters] = useState<Chapter[]>([]);
    const [customBookData, setCustomBookData] = useState<any>(null); // Store custom book data including image
    const [showAddChapter, setShowAddChapter] = useState(false);
    const [editingChapter, setEditingChapter] = useState<Chapter | null>(null);
    const [newChapterNumber, setNewChapterNumber] = useState(1);
    const [newChapterName, setNewChapterName] = useState('');

    // Function to get the correct book image
    const getCorrectBookImage = (): string => {
        // If it's a custom book with an image, use that
        if (customBookData && customBookData.image) {
            return customBookData.image;
        }
        
        // Otherwise use the default placeholder
        return getBookImage(book);
    };

    useEffect(() => {
        // Check if this is a custom book created by user
        const savedBooks = JSON.parse(localStorage.getItem('createdBooks') || '[]');
        const customBook = savedBooks.find((savedBook: any) => savedBook.name === book);
        
        if (customBook) {
            setIsCustomBook(true);
            setCustomBookData(customBook); // Store the full custom book data
            loadCustomChapters(customBook.id);
            return;
        }

        // Check if this is a backend book (from EnhancedBookshelfPage)
        const bookDataKey = `book_${book}`;
        const savedBookData = localStorage.getItem(bookDataKey);
        
        if (savedBookData) {
            try {
                const bookData = JSON.parse(savedBookData);
                
                // Look for chapters data with various possible keys
                let chaptersData = null;
                const possibleKeys = [
                    `chapters_${book}`,
                    `chapters_${bookData.id}`, 
                ];
                
                for (const key of possibleKeys) {
                    const storedChapters = localStorage.getItem(key);
                    if (storedChapters) {
                        chaptersData = JSON.parse(storedChapters);
                        break;
                    }
                }
                
                if (chaptersData && Array.isArray(chaptersData)) {
                    setIsCustomBook(true);
                    setCustomBookData(bookData);
                    
                    // Convert backend chapters to expected format
                    const backendChapters = chaptersData.map((chapter: any, index: number) => ({
                        id: chapter.id || `backend-${index + 1}`,
                        number: chapter.number || index + 1,
                        name: chapter.name || chapter.title || `Chapter ${index + 1}`,
                        subtopics: chapter.subtopics || []
                    }));
                    
                    setCustomChapters(backendChapters);
                    console.log(`📚 Loaded ${backendChapters.length} chapters for backend book: ${book}`);
                    return;
                }
            } catch (error) {
                console.error('Error loading backend book data:', error);
            }
        }

        // Check if this is an imported book
        const importedBooks = JSON.parse(localStorage.getItem('importedBooks') || '[]');
        const importedBook = importedBooks.find((importBook: any) => importBook.name === book);
        
        if (importedBook) {
            setIsImportedBook(true);
            // Convert imported book chapters to the expected format
            const importedChapters = importedBook.chapters.map((chapterName: string, index: number) => ({
                id: `imported-${importedBook.id}-${index + 1}`,
                number: index + 1,
                name: chapterName,
                subtopics: [] // Will be loaded separately if needed
            }));
            setCustomChapters(importedChapters);
            return;
        }
    }, [book]);

    const loadCustomChapters = (bookId: string) => {
        const saved = localStorage.getItem(`chapters_${bookId}`);
        if (saved) {
            setCustomChapters(JSON.parse(saved));
        }
    };

    const saveCustomChapters = (bookId: string, chapters: Chapter[]) => {
        localStorage.setItem(`chapters_${bookId}`, JSON.stringify(chapters));
        setCustomChapters(chapters);
    };

    const handleAddChapter = async () => {
        if (!newChapterName.trim()) return;
        
        console.log(`📄 UNIFIED: Adding chapter to book: ${book}`);
        
        try {
            // Try to find in created books first
            const savedBooks = JSON.parse(localStorage.getItem('createdBooks') || '[]');
            const customBook = savedBooks.find((savedBook: any) => savedBook.name === book);
            
            let bookId;
            
            if (customBook) {
                bookId = customBook.id;
            } else if (customBookData) {
                bookId = customBookData.id || book;
            } else {
                bookId = book;
            }

            // Use UnifiedBookAdapter for automatic cloud sync
            const unifiedAdapter = UnifiedBookAdapter.getInstance();
            
            const result = await unifiedAdapter.addChapter(bookId, {
                number: newChapterNumber,
                name: newChapterName.trim()
            });

            if (result.success) {
                // Update local state
                const newChapter: Chapter = {
                    id: `chapter_${Date.now()}`,
                    number: newChapterNumber,
                    name: newChapterName.trim(),
                    subtopics: []
                };

                const updatedChapters = [...customChapters, newChapter];
                setCustomChapters(updatedChapters);
                
                console.log(`✅ UNIFIED: Chapter added and synced: ${newChapter.name}`);
                
                setNewChapterName('');
                setNewChapterNumber(updatedChapters.length + 1);
                setShowAddChapter(false);
            } else {
                console.error('UNIFIED: Failed to add chapter:', result.error);
                // Fallback to old method
                const newChapter: Chapter = {
                    id: `chapter_${Date.now()}`,
                    number: newChapterNumber,
                    name: newChapterName.trim(),
                    subtopics: []
                };

                const updatedChapters = [...customChapters, newChapter];
                
                // Save locally with fallback keys
                localStorage.setItem(`chapters_${bookId}`, JSON.stringify(updatedChapters));
                localStorage.setItem(`chapters_${book}`, JSON.stringify(updatedChapters));
                
                setCustomChapters(updatedChapters);
                setNewChapterName('');
                setNewChapterNumber(updatedChapters.length + 1);
                setShowAddChapter(false);
            }

        } catch (error) {
            console.error('UNIFIED: Error adding chapter:', error);
            
            // Fallback to old method
            const newChapter: Chapter = {
                id: `chapter_${Date.now()}`,
                number: newChapterNumber,
                name: newChapterName.trim(),
                subtopics: []
            };

            const updatedChapters = [...customChapters, newChapter];
            setCustomChapters(updatedChapters);
            setNewChapterName('');
            setNewChapterNumber(updatedChapters.length + 1);
            setShowAddChapter(false);
        }
    };

    const handleEditChapter = (chapter: Chapter) => {
        setEditingChapter(chapter);
        setNewChapterNumber(chapter.number);
        setNewChapterName(chapter.name);
    };

    const handleUpdateChapter = () => {
        if (!editingChapter || !newChapterName.trim()) return;
        
        // Try to find in created books first
        const savedBooks = JSON.parse(localStorage.getItem('createdBooks') || '[]');
        const customBook = savedBooks.find((savedBook: any) => savedBook.name === book);
        
        let bookId;
        
        if (customBook) {
            bookId = customBook.id;
        } else if (customBookData) {
            // This is a backend book, use its ID
            bookId = customBookData.id || book;
        } else {
            // Fallback - use book name as ID
            bookId = book;
        }

        const updatedChapters = customChapters.map(ch => 
            ch.id === editingChapter.id 
                ? { ...ch, number: newChapterNumber, name: newChapterName.trim() }
                : ch
        );
        
        // Save chapters with multiple possible keys for backend compatibility
        localStorage.setItem(`chapters_${bookId}`, JSON.stringify(updatedChapters));
        localStorage.setItem(`chapters_${book}`, JSON.stringify(updatedChapters));
        
        setCustomChapters(updatedChapters);
        setEditingChapter(null);
        setNewChapterName('');
    };

    const handleDeleteChapter = (chapterId: string) => {
        if (confirm('Are you sure you want to delete this chapter?')) {
            // Try to find in created books first
            const savedBooks = JSON.parse(localStorage.getItem('createdBooks') || '[]');
            const customBook = savedBooks.find((savedBook: any) => savedBook.name === book);
            
            let bookId;
            
            if (customBook) {
                bookId = customBook.id;
            } else if (customBookData) {
                // This is a backend book, use its ID
                bookId = customBookData.id || book;
            } else {
                // Fallback - use book name as ID
                bookId = book;
            }

            const updatedChapters = customChapters.filter(ch => ch.id !== chapterId);
            
            // Save chapters with multiple possible keys for backend compatibility
            localStorage.setItem(`chapters_${bookId}`, JSON.stringify(updatedChapters));
            localStorage.setItem(`chapters_${book}`, JSON.stringify(updatedChapters));
            
            setCustomChapters(updatedChapters);
        }
    };

    if (!book || (!isCustomBook && !isImportedBook && !syllabus[book])) {
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
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate('/')} className="theme-text hover:theme-accent-text theme-transition">
                            <BackIcon />
                        </button>
                        <h1 className="text-lg sm:text-xl font-bold theme-text">Chapters</h1>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Add Chapter button for custom books */}
                        {isCustomBook && (
                            <button
                                onClick={() => setShowAddChapter(!showAddChapter)}
                                className="flex items-center gap-2 px-4 py-2 theme-accent text-white rounded-lg hover:bg-opacity-90 theme-transition"
                            >
                                <PlusIcon />
                                <span className="hidden sm:inline">Add Chapter</span>
                            </button>
                        )}
                        
                        {/* Exam Mode button - Available for all books with chapters */}
                        {((customChapters.length > 0) || (!isCustomBook && syllabus[book] && syllabus[book].length > 0)) && (
                            <button
                                onClick={() => {
                                    // Navigate to exam mode for the first chapter
                                    let firstChapter;
                                    if (isCustomBook && customChapters.length > 0) {
                                        firstChapter = customChapters[0].name;
                                    } else if (!isCustomBook && syllabus[book] && syllabus[book].length > 0) {
                                        firstChapter = syllabus[book][0];
                                    } else {
                                        firstChapter = 'Chapter 1';
                                    }
                                    navigate(`/exam/${encodeURIComponent(book)}/${encodeURIComponent(firstChapter)}`);
                                }}
                                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 theme-transition"
                                title="Open Exam Mode"
                            >
                                <ExamIcon />
                                <span className="hidden sm:inline">Exam Mode</span>
                            </button>
                        )}
                    </div>
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
                                    src={getCorrectBookImage()} 
                                    alt={book} 
                                    className="w-full h-full object-cover" 
                                />
                            </div>
                        <div className="flex-1 min-w-0">
                            <h1 className="text-lg font-bold theme-text mb-1 leading-tight">{book}</h1>
                            {(() => {
                                if (isCustomBook) {
                                    const savedBooks = JSON.parse(localStorage.getItem('createdBooks') || '[]');
                                    const customBook = savedBooks.find((savedBook: any) => savedBook.name === book);
                                    if (customBook) {
                                        return (
                                            <div className="space-y-1 mb-2">
                                                <p className="theme-text-secondary text-xs">Created by {customBook.creatorName}</p>
                                                <p className="theme-text-secondary text-xs">{customBook.university} • {customBook.semester}</p>
                                                {customBook.subjectCode && (
                                                    <p className="theme-text-secondary text-xs">Code: {customBook.subjectCode}</p>
                                                )}
                                            </div>
                                        );
                                    }
                                }
                                return <p className="theme-text-secondary text-sm mb-2">Subject • Semester 5</p>;
                            })()}
                                <div className="flex flex-wrap gap-1">
                                    <div className="bg-green-600 bg-opacity-20 text-green-400 text-xs px-2 py-1 rounded">
                                        ✓ Added
                                    </div>
                                    <div className="theme-accent bg-opacity-20 theme-accent-text text-xs px-2 py-1 rounded">
                                        {(isCustomBook || isImportedBook) ? customChapters.length : syllabus[book]?.length || 0} Ch
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
                                src={getCorrectBookImage()} 
                                alt={book} 
                                className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" 
                            />
                        </div>
                        <div className="flex-1">
                            <h1 className="text-xl md:text-2xl lg:text-3xl font-bold theme-text mb-2">{book}</h1>
                            {(() => {
                                if (isCustomBook) {
                                    const savedBooks = JSON.parse(localStorage.getItem('createdBooks') || '[]');
                                    const customBook = savedBooks.find((savedBook: any) => savedBook.name === book);
                                    if (customBook) {
                                        return (
                                            <div className="space-y-1 mb-4">
                                                <p className="theme-text-secondary text-sm">Created by {customBook.creatorName}</p>
                                                <p className="theme-text-secondary text-sm">{customBook.university} • {customBook.semester}</p>
                                                {customBook.subjectCode && (
                                                    <p className="theme-text-secondary text-sm">Subject Code: {customBook.subjectCode}</p>
                                                )}
                                            </div>
                                        );
                                    }
                                }
                                return <p className="theme-text-secondary mb-4">Subject • Semester 5</p>;
                            })()}
                            <div className="flex flex-wrap gap-2 mb-4">
                                <div className="bg-green-600 bg-opacity-20 text-green-400 text-xs px-3 py-1 rounded-full">
                                    ✓ Added to Bookshelf
                                </div>
                                <div className="theme-accent bg-opacity-20 theme-accent-text text-xs px-3 py-1 rounded-full">
                                    {(isCustomBook || isImportedBook) ? customChapters.length : syllabus[book]?.length || 0} Chapters
                                </div>
                            </div>
                            <p className="theme-text-secondary text-sm leading-relaxed">
                                Complete course material with interactive content, practice questions, and AI-powered explanations.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Add Chapter Form */}
                {isCustomBook && showAddChapter && (
                    <div className="mb-6 card p-6">
                        <h3 className="text-lg font-semibold theme-text mb-4">Add New Chapter</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium theme-text mb-2">Chapter Number</label>
                                <input
                                    type="number"
                                    value={newChapterNumber}
                                    onChange={(e) => setNewChapterNumber(parseInt(e.target.value) || 1)}
                                    className="w-full px-3 py-2 theme-surface border border-gray-300 rounded-lg theme-text"
                                    min="1"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium theme-text mb-2">Chapter Name</label>
                                <input
                                    type="text"
                                    value={newChapterName}
                                    onChange={(e) => setNewChapterName(e.target.value)}
                                    placeholder="e.g., Introduction to React Hooks"
                                    className="w-full px-3 py-2 theme-surface border border-gray-300 rounded-lg theme-text"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 mt-4">
                            <button
                                onClick={() => setShowAddChapter(false)}
                                className="px-4 py-2 text-gray-600 hover:text-gray-800 theme-transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddChapter}
                                className="px-4 py-2 theme-accent text-white rounded-lg hover:bg-opacity-90 theme-transition"
                            >
                                Add Chapter
                            </button>
                        </div>
                    </div>
                )}

                {/* Edit Chapter Form */}
                {isCustomBook && editingChapter && (
                    <div className="mb-6 card p-6">
                        <h3 className="text-lg font-semibold theme-text mb-4">Edit Chapter</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium theme-text mb-2">Chapter Number</label>
                                <input
                                    type="number"
                                    value={newChapterNumber}
                                    onChange={(e) => setNewChapterNumber(parseInt(e.target.value) || 1)}
                                    className="w-full px-3 py-2 theme-surface border border-gray-300 rounded-lg theme-text"
                                    min="1"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium theme-text mb-2">Chapter Name</label>
                                <input
                                    type="text"
                                    value={newChapterName}
                                    onChange={(e) => setNewChapterName(e.target.value)}
                                    placeholder="e.g., Introduction to React Hooks"
                                    className="w-full px-3 py-2 theme-surface border border-gray-300 rounded-lg theme-text"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 mt-4">
                            <button
                                onClick={() => setEditingChapter(null)}
                                className="px-4 py-2 text-gray-600 hover:text-gray-800 theme-transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleUpdateChapter}
                                className="px-4 py-2 theme-accent text-white rounded-lg hover:bg-opacity-90 theme-transition"
                            >
                                Save Changes
                            </button>
                        </div>
                    </div>
                )}
                
                {/* Chapters List */}
                <div className="space-y-3">
                    <h2 className="text-lg font-semibold theme-text mb-4">Course Content</h2>
                    
                    {/* Custom Book Chapters & Imported Book Chapters */}
                    {(isCustomBook || isImportedBook) && customChapters.map((chapter) => {
                        // Get book details
                        const savedBooks = JSON.parse(localStorage.getItem('createdBooks') || '[]');
                        const bookDetails = savedBooks.find((b: any) => b.name === book);
                        
                        return (
                            <div key={chapter.id} className="card w-full hover:scale-[1.01] theme-transition cursor-pointer mobile-chapter-card"
                                 onClick={() => navigate(`/reader/${encodeURIComponent(book)}/${encodeURIComponent(chapter.name)}`)}>
                                <div className="flex items-center gap-3 p-3 sm:p-4">
                                    <div className="w-14 h-10 sm:w-16 sm:h-12 theme-accent rounded-lg flex items-center justify-center flex-shrink-0 mobile-unit-left">
                                        <span className="text-white font-bold text-xs sm:text-sm whitespace-nowrap">Unit {chapter.number}</span>
                                    </div>
                                    <div className="flex-1 min-w-0 ml-2">
                                        <h3 className="font-semibold theme-text text-sm sm:text-base line-clamp-1">{chapter.name}</h3>
                                        <p className="theme-text-secondary text-xs mt-1">
                                            {(chapter.subtopics && chapter.subtopics.length > 0) ? `${chapter.subtopics.length} subtopics` : 'No content yet'}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-1 mobile-actions-right">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleEditChapter(chapter);
                                            }}
                                            className="p-1.5 bg-blue-100 hover:bg-blue-200 text-blue-600 hover:text-blue-800 rounded-lg theme-transition"
                                            title="Edit chapter"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                            </svg>
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteChapter(chapter.id);
                                            }}
                                            className="p-1.5 bg-red-100 hover:bg-red-200 text-red-600 hover:text-red-800 rounded-lg theme-transition"
                                            title="Delete chapter"
                                        >
                                            <TrashIcon />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {/* Legacy Book Chapters */}
                    {!isCustomBook && syllabus[book] && syllabus[book].map((chapter: string, i: number) => {
                        const subtopicCount = chapterSubtopics[book] && chapterSubtopics[book][chapter] 
                            ? chapterSubtopics[book][chapter].length 
                            : 0;

                        return (
                            <button 
                                key={chapter} 
                                onClick={() => navigate(`/reader/${encodeURIComponent(book)}/${encodeURIComponent(chapter)}`)} 
                                className="card w-full text-left p-3 sm:p-4 hover:scale-[1.01] theme-transition mobile-chapter-card"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-14 h-10 sm:w-16 sm:h-12 theme-accent rounded-lg flex items-center justify-center flex-shrink-0 mobile-unit-left">
                                        <span className="text-white font-bold text-xs sm:text-sm whitespace-nowrap">Unit {i + 1}</span>
                                    </div>
                                    <div className="flex-1 min-w-0 ml-2">
                                        <h3 className="font-semibold theme-text text-sm sm:text-base line-clamp-1">{chapter}</h3>
                                        <p className="theme-text-secondary text-xs mt-1">
                                            {subtopicCount > 0 ? `${subtopicCount} subtopics` : 'Topics available'}
                                        </p>
                                    </div>
                                    <div className="theme-text-secondary pt-1">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </div>
                                </div>
                            </button>
                        );
                    })}

                    {/* Empty State for Custom Books */}
                    {isCustomBook && customChapters.length === 0 && (
                        <div className="text-center py-12">
                            <div className="w-16 h-16 mx-auto mb-4 theme-text-secondary">
                                <BookOpenIcon />
                            </div>
                            <h3 className="text-lg font-medium theme-text mb-2">No chapters yet</h3>
                            <p className="theme-text-secondary mb-6">Click "Add Chapter" to get started</p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default SubjectPage;
