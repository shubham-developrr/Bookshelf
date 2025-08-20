import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpenIcon, AlertIcon, AIGuruIcon, PlusIcon, SearchIconSvg } from '../components/icons';
import { getBookImage } from '../assets/images/index';
import { useTheme } from '../contexts/ThemeContext';
import ThemeSelector from '../components/ThemeSelector';
import { getSyllabus } from '../constants/constants';
import { BookImportService } from '../services/importService';

// Gear icon component
const GearIcon: React.FC = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
);

const BookshelfPage: React.FC = () => {
    const navigate = useNavigate();
    const { theme } = useTheme();
    const [isThemeModalOpen, setThemeModalOpen] = useState(false);
    const [isSettingsDropdownOpen, setSettingsDropdownOpen] = useState(false);
    const [subjects, setSubjects] = useState<string[]>([]);
    const [customBooks, setCustomBooks] = useState<string[]>([]);
    const [isImporting, setIsImporting] = useState(false);
    const [importMessage, setImportMessage] = useState<string>('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const uploadFileInputRef = useRef<HTMLInputElement>(null);
    const settingsDropdownRef = useRef<HTMLDivElement>(null);

    // Load subjects including imported books
    useEffect(() => {
        const loadSubjects = () => {
            const syllabus = getSyllabus();
            const syllabusSubjects = Object.keys(syllabus);
            
            // Get custom/imported books from localStorage
            const savedBooks = JSON.parse(localStorage.getItem('createdBooks') || '[]');
            const customBookNames = savedBooks.map((book: any) => book.name).filter((name: string) => !syllabusSubjects.includes(name));
            
            setSubjects(syllabusSubjects);
            setCustomBooks(customBookNames);
        };
        
        loadSubjects();
        
        // Listen for storage changes to refresh when books are imported
        const handleStorageChange = () => loadSubjects();
        window.addEventListener('storage', handleStorageChange);
        
        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);

    // Close settings dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (settingsDropdownRef.current && !settingsDropdownRef.current.contains(event.target as Node)) {
                setSettingsDropdownOpen(false);
            }
        };

        if (isSettingsDropdownOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isSettingsDropdownOpen]);

    const handleImportBook = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!file.name.endsWith('.zip')) {
            setImportMessage('Please select a valid ZIP file.');
            return;
        }

        setIsImporting(true);
        setImportMessage('');

        try {
            // Validate file first
            const validation = await BookImportService.validateImportFile(file);
            if (!validation.isValid) {
                throw new Error(validation.error || 'Invalid import file');
            }

            // Import the book
            await BookImportService.importBook(file);
            
            setImportMessage(`Successfully imported "${validation.bookName}" with ${validation.chapterCount} chapters!`);
            
            // Refresh subjects list
            const syllabus = getSyllabus();
            const syllabusSubjects = Object.keys(syllabus);
            const savedBooks = JSON.parse(localStorage.getItem('createdBooks') || '[]');
            const customBookNames = savedBooks.map((book: any) => book.name).filter((name: string) => !syllabusSubjects.includes(name));
            
            setSubjects(syllabusSubjects);
            setCustomBooks(customBookNames);
            
            // Clear file input
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
            if (uploadFileInputRef.current) {
                uploadFileInputRef.current.value = '';
            }
            
        } catch (error) {
            console.error('Import failed:', error);
            setImportMessage(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setIsImporting(false);
        }
    };

    return (
        <div className="theme-bg min-h-screen theme-transition">
            {/* Header */}
            <header className="theme-surface sticky top-0 z-10 px-4 py-3 sm:px-6 theme-transition backdrop-blur-sm bg-opacity-80">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 theme-accent rounded-lg flex items-center justify-center">
                            <span className="w-5 h-5 text-white flex items-center justify-center">
                                <BookOpenIcon />
                            </span>
                        </div>
                        <h1 className="text-lg sm:text-xl font-bold theme-text">Bookshelf</h1>
                    </div>
                    <div className="flex items-center gap-3 relative">
                        <button 
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isImporting}
                            className="px-3 py-2 theme-accent text-white rounded-lg hover:bg-opacity-90 theme-transition disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium flex items-center gap-2"
                            title="Import Books"
                        >
                            📥 Import
                        </button>
                        
                        {/* Settings Gear Button with Dropdown */}
                        <div className="relative" ref={settingsDropdownRef}>
                            <button 
                                onClick={() => setSettingsDropdownOpen(!isSettingsDropdownOpen)}
                                className="p-2 hover:theme-surface2 rounded-lg theme-transition"
                            >
                                <GearIcon />
                            </button>
                            
                            {/* Settings Dropdown */}
                            {isSettingsDropdownOpen && (
                                <div className="absolute right-0 top-full mt-2 w-48 theme-surface rounded-lg shadow-lg border theme-border z-50">
                                    <div className="py-2">
                                        <button
                                            onClick={() => {
                                                setSettingsDropdownOpen(false);
                                                setThemeModalOpen(true);
                                            }}
                                            className="w-full text-left px-4 py-2 hover:theme-surface2 theme-transition theme-text flex items-center gap-2"
                                        >
                                            🎨 Theme Settings
                                        </button>
                                        <button
                                            onClick={() => {
                                                setSettingsDropdownOpen(false);
                                                uploadFileInputRef.current?.click();
                                            }}
                                            disabled={isImporting}
                                            className="w-full text-left px-4 py-2 hover:theme-surface2 theme-transition theme-text flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            📤 Upload Books
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                        
                        <AlertIcon />
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
                {/* Search Section with Image Above */}
                <div className="search-container">
                    <div className="flex justify-center mb-4">
                        <SearchIconSvg className="w-24 h-24 theme-text-secondary" />
                    </div>
                    <div className="w-full max-w-md">
                        <button
                            onClick={() => navigate('/search')}
                            className="search-bar w-full text-left theme-transition focus-ring"
                        >
                            <span className="theme-text-secondary">Search topics, chapters, subjects...</span>
                        </button>
                    </div>
                </div>

                {/* Book Import Section */}
                <div className="mb-8 p-4 theme-surface rounded-lg border-2 border-dashed theme-border">
                    <div className="text-center">
                        <h3 className="text-lg font-semibold theme-text mb-2">Import Study Book</h3>
                        <p className="theme-text-secondary text-sm mb-4">
                            Import exported study books (.zip) to your library
                        </p>
                        
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".zip"
                            onChange={handleImportBook}
                            className="hidden"
                            disabled={isImporting}
                        />
                        
                        <input
                            ref={uploadFileInputRef}
                            type="file"
                            accept=".zip"
                            onChange={handleImportBook}
                            className="hidden"
                            disabled={isImporting}
                        />
                        
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isImporting}
                            className="px-6 py-3 theme-accent text-white rounded-lg hover:bg-opacity-90 theme-transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isImporting ? (
                                <div className="flex items-center gap-2">
                                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                                    Importing...
                                </div>
                            ) : (
                                '📁 Select ZIP File to Import'
                            )}
                        </button>
                        
                        {importMessage && (
                            <div className={`mt-4 p-3 rounded-lg ${
                                importMessage.includes('Successfully') 
                                    ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800' 
                                    : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
                            }`}>
                                {importMessage}
                            </div>
                        )}
                    </div>
                </div>

                {/* Your Library Section - Custom and Imported Books */}
                {customBooks.length > 0 && (
                    <div className="mb-8">
                        <h2 className="text-xl font-bold theme-text mb-4 flex items-center gap-2">
                            📚 Your Library
                        </h2>
                        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
                            {customBooks.map((subject) => (
                                <button
                                    key={subject}
                                    onClick={() => navigate(`/subject/${encodeURIComponent(subject)}`)}
                                    className="card theme-transition group text-left p-3 sm:p-4 lg:p-6 flex flex-col h-full"
                                >
                                    <div className="aspect-[3/4] mb-3 sm:mb-4 rounded-xl overflow-hidden bg-gradient-to-br from-blue-100 to-purple-200 flex-shrink-0">
                                        <img 
                                            src={getBookImage(subject)} 
                                            alt={subject}
                                            className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
                                        />
                                    </div>
                                    <div className="flex-grow flex flex-col justify-between">
                                        <h3 className="font-semibold theme-text mb-2 group-hover:theme-accent-text theme-transition text-xs sm:text-sm lg:text-base leading-tight">
                                            📖 {subject}
                                        </h3>
                                        <p className="text-xs theme-text-secondary">
                                            Custom content
                                        </p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Default Books Section */}
                <div className="mb-8">
                    <h2 className="text-xl font-bold theme-text mb-4">Default Books</h2>
                    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
                        {subjects.map((subject) => (
                            <button
                                key={subject}
                                onClick={() => navigate(`/subject/${encodeURIComponent(subject)}`)}
                                className="card theme-transition group text-left p-3 sm:p-4 lg:p-6 flex flex-col h-full"
                            >
                                <div className="aspect-[3/4] mb-3 sm:mb-4 rounded-xl overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 flex-shrink-0">
                                    <img 
                                        src={getBookImage(subject)} 
                                        alt={subject}
                                        className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
                                    />
                                </div>
                                <div className="flex-grow flex flex-col justify-between">
                                    <h3 className="font-semibold theme-text mb-2 group-hover:theme-accent-text theme-transition text-xs sm:text-sm lg:text-base leading-tight">
                                        {subject}
                                    </h3>
                                    <p className="text-xs theme-text-secondary">
                                        Multiple chapters
                                    </p>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </main>

            {/* AI Guru Button - Responsive positioning */}
            <button 
                onClick={() => {
                    // AI Guru functionality can be added here if needed
                    console.log('AI Guru clicked');
                }}
                className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 theme-accent p-3 sm:p-4 rounded-full shadow-lg hover:bg-opacity-90 theme-transition transform hover:scale-110 z-20"
            >
                <AIGuruIcon className="w-6 h-6 sm:w-7 sm:h-7 text-white"/>
            </button>

            {/* Theme Selector Modal */}
            <ThemeSelector isOpen={isThemeModalOpen} onClose={() => setThemeModalOpen(false)} />
        </div>
    );
};

export default BookshelfPage;
