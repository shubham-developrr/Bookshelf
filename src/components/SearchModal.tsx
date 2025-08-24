import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SearchIconSvg, CloseIcon } from './icons';
import { getBookImage } from '../assets/images/index';

interface SearchModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface SearchResult {
    type: 'book' | 'chapter' | 'subtopic';
    title: string;
    bookName?: string;
    chapterName?: string;
    path: string;
}

const SearchModal: React.FC<SearchModalProps> = ({ isOpen, onClose }) => {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);

    // Get actual available books and chapters
    const getAvailableContent = (): SearchResult[] => {
        const results: SearchResult[] = [];
        
        // Get created books
        try {
            const savedBooks = JSON.parse(localStorage.getItem('createdBooks') || '[]');
            savedBooks.forEach((book: any) => {
                // Add book
                results.push({
                    type: 'book',
                    title: book.title || book.name,
                    path: `/subject/${encodeURIComponent(book.title || book.name)}`
                });
                
                // Check if chapters exist and is an array
                if (Array.isArray(book.chapters) && book.chapters.length > 0) {
                    book.chapters.forEach((chapter: any) => {
                        results.push({
                            type: 'chapter',
                            title: chapter.title || chapter.name,
                            bookName: book.title || book.name,
                            path: `/reader/${encodeURIComponent(book.title || book.name)}/${encodeURIComponent(chapter.title || chapter.name)}`
                        });
                        
                        // Check subtopics
                        if (Array.isArray(chapter.subtopics) && chapter.subtopics.length > 0) {
                            chapter.subtopics.forEach((subtopic: any) => {
                                results.push({
                                    type: 'subtopic',
                                    title: subtopic.title || subtopic.name,
                                    bookName: book.title || book.name,
                                    chapterName: chapter.title || chapter.name,
                                    path: `/reader/${encodeURIComponent(book.title || book.name)}/${encodeURIComponent(chapter.title || chapter.name)}`
                                });
                            });
                        }
                    });
                }
            });
        } catch (error) {
            console.error('Error loading created books:', error);
        }
        
        // Get imported books and their chapters
        try {
            const importedBooks = JSON.parse(localStorage.getItem('importedBooks') || '[]');
            importedBooks.forEach((book: any) => {
                // Add book
                results.push({
                    type: 'book',
                    title: book.name,
                    path: `/subject/${encodeURIComponent(book.name)}`
                });

                // Check for chapters in imported books
                if (Array.isArray(book.chapters) && book.chapters.length > 0) {
                    book.chapters.forEach((chapter: any) => {
                        results.push({
                            type: 'chapter',
                            title: chapter.title || chapter.name,
                            bookName: book.name,
                            path: `/reader/${encodeURIComponent(book.name)}/${encodeURIComponent(chapter.title || chapter.name)}`
                        });
                        
                        // Check subtopics in imported chapters
                        if (Array.isArray(chapter.subtopics) && chapter.subtopics.length > 0) {
                            chapter.subtopics.forEach((subtopic: any) => {
                                results.push({
                                    type: 'subtopic',
                                    title: subtopic.title || subtopic.name,
                                    bookName: book.name,
                                    chapterName: chapter.title || chapter.name,
                                    path: `/reader/${encodeURIComponent(book.name)}/${encodeURIComponent(chapter.title || chapter.name)}`
                                });
                            });
                        }
                    });
                }
            });
        } catch (error) {
            console.error('Error loading imported books:', error);
        }

        return results;
    };

    const filterResults = (query: string): SearchResult[] => {
        if (!query.trim()) return getAvailableContent().slice(0, 6); // Show first 6 items when no search
        
        const allContent = getAvailableContent();
        const filtered = allContent.filter(item => {
            // Ensure all properties exist before calling toLowerCase
            const title = item.title || '';
            const bookName = item.bookName || '';
            const chapterName = item.chapterName || '';
            
            return title.toLowerCase().includes(query.toLowerCase()) ||
                   bookName.toLowerCase().includes(query.toLowerCase()) ||
                   chapterName.toLowerCase().includes(query.toLowerCase());
        });

        // Sort by hierarchy: Books first, then Chapters, then Subtopics
        const sorted = filtered.sort((a, b) => {
            const typeOrder = { book: 0, chapter: 1, subtopic: 2 };
            const aOrder = typeOrder[a.type];
            const bOrder = typeOrder[b.type];
            
            if (aOrder !== bOrder) {
                return aOrder - bOrder;
            }
            
            // Within same type, sort alphabetically
            return (a.title || '').localeCompare(b.title || '');
        });

        return sorted.slice(0, 15); // Limit to 15 results with hierarchy
    };

    useEffect(() => {
        setSearchResults(filterResults(searchQuery));
    }, [searchQuery]);

    const handleResultClick = (result: SearchResult) => {
        navigate(result.path);
        onClose();
    };

    const getResultIcon = (type: string) => {
        switch (type) {
            case 'book': return '📚';
            case 'chapter': return '📖';
            case 'subtopic': return '📝';
            default: return '📄';
        }
    };

    const getResultSubtext = (result: SearchResult) => {
        if (result.type === 'book') return 'Book';
        if (result.type === 'chapter') return `Chapter in ${result.bookName}`;
        if (result.type === 'subtopic') return `Subtopic in ${result.bookName} → ${result.chapterName}`;
        return '';
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-start justify-center pt-20 p-4">
            <div className="theme-surface rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
                {/* Header */}
                <div className="flex items-center gap-4 p-6 border-b theme-border">
                    <div className="flex-1 relative">
                        <SearchIconSvg className="absolute left-3 top-1/2 transform -translate-y-1/2 theme-text-secondary w-4 h-4" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 theme-surface2 theme-text rounded-lg border theme-border focus:outline-none focus:ring-2 focus:ring-blue-500 theme-transition text-lg"
                            placeholder="Search books, chapters, subtopics..."
                            autoFocus
                        />
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:theme-surface2 rounded-lg theme-transition"
                    >
                        <CloseIcon />
                    </button>
                </div>

                {/* Search Results */}
                <div className="p-6 max-h-96 overflow-y-auto">
                    {searchResults.length > 0 ? (
                        <div>
                            <h3 className="text-sm font-medium theme-text-secondary mb-3">
                                {searchQuery.trim() ? `Results for "${searchQuery}"` : 'Available Content'}
                            </h3>
                            <div className="space-y-2">
                                {searchResults.map((result, index) => (
                                    <button
                                        key={index}
                                        onClick={() => handleResultClick(result)}
                                        className="w-full text-left p-3 hover:theme-surface2 rounded-lg theme-transition flex items-center gap-3"
                                    >
                                        <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0 text-sm">
                                            {getResultIcon(result.type)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="theme-text font-medium truncate">{result.title}</h4>
                                            <p className="text-sm theme-text-secondary truncate">{getResultSubtext(result)}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-3">
                                <span className="text-2xl">🔍</span>
                            </div>
                            <p className="theme-text-secondary">
                                {searchQuery.trim() ? 'No results found' : 'No content available yet'}
                            </p>
                            <p className="text-sm theme-text-secondary mt-1">
                                {searchQuery.trim() ? 'Try a different search term' : 'Create or import books to see them here'}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SearchModal;
