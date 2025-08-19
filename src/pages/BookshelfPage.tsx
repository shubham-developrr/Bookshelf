import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpenIcon, MenuIcon, AlertIcon, AIGuruIcon } from '../components/icons';
import { getBookImage, SearchIcon } from '../assets/images/index';
import { useTheme } from '../contexts/ThemeContext';
import ThemeSelector from '../components/ThemeSelector';
import { getSyllabus } from '../constants/constants';
import { BookImportService } from '../services/importService';

const BookshelfPage: React.FC = () => {
    const navigate = useNavigate();
    const { theme } = useTheme();
    const [isThemeModalOpen, setThemeModalOpen] = useState(false);
    const [subjects, setSubjects] = useState<string[]>([]);
    const [isImporting, setIsImporting] = useState(false);
    const [importMessage, setImportMessage] = useState<string>('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Load subjects including imported books
    useEffect(() => {
        const loadSubjects = () => {
            const syllabus = getSyllabus();
            setSubjects(Object.keys(syllabus));
        };
        
        loadSubjects();
        
        // Listen for storage changes to refresh when books are imported
        const handleStorageChange = () => loadSubjects();
        window.addEventListener('storage', handleStorageChange);
        
        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);

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
            setSubjects(Object.keys(syllabus));
            
            // Clear file input
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
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
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isImporting}
                            className="px-3 py-2 theme-accent text-white rounded-lg hover:bg-opacity-90 theme-transition disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium flex items-center gap-2"
                            title="Import Books"
                        >
                            📥 Import
                        </button>
                        <button 
                            onClick={() => setThemeModalOpen(true)}
                            className="p-2 hover:theme-surface2 rounded-lg theme-transition"
                        >
                            <MenuIcon />
                        </button>
                        <AlertIcon />
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
                {/* Search Section with Image Above */}
                <div className="search-container">
                    <img 
                        src={SearchIcon} 
                        alt="Search" 
                        className="search-image"
                    />
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

                {/* Subjects Grid - Mobile First Design with Fixed Alignment */}
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
