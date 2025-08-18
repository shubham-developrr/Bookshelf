import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpenIcon, MenuIcon, AlertIcon, AIGuruIcon, PlusIcon, SearchIconSvg, PaperAirplaneIcon } from '../components/icons';
import { getBookImage } from '../assets/images/index';
import { useTheme } from '../contexts/ThemeContext';
import { bookLoader } from '../utils/bookModuleLoader';
import { BookModule } from '../types/bookModule';
import ThemeSelector from '../components/ThemeSelector';
import { BookMarketplace } from '../components/BookMarketplace';
import CreateBookModal, { BookData } from '../components/CreateBookModal';
import EditBookModal from '../components/EditBookModal';
import SearchModal from '../components/SearchModal';
import BookOptionsMenu from '../components/BookOptionsMenu';
import PublishModal from '../components/PublishModal';
import EnhancedAIGuruModal from '../components/EnhancedAIGuruModal';

const EnhancedBookshelfPage: React.FC = () => {
    const navigate = useNavigate();
    const { theme } = useTheme();
    const [isThemeModalOpen, setThemeModalOpen] = useState(false);
    const [isMarketplaceOpen, setMarketplaceOpen] = useState(false);
    const [isCreateBookOpen, setCreateBookOpen] = useState(false);
    const [isEditBookOpen, setIsEditBookOpen] = useState(false);
    const [isSearchOpen, setSearchOpen] = useState(false);
    const [isPublishModalOpen, setPublishModalOpen] = useState(false);
    const [isAIGuruOpen, setAIGuruOpen] = useState(false);
    const [aiGuruPrompt, setAIGuruPrompt] = useState('');
    const [loadedBooks, setLoadedBooks] = useState<BookModule[]>([]);
    const [createdBooks, setCreatedBooks] = useState<Array<BookData & { id: string }>>([]);
    const [loading, setLoading] = useState(true);
    const [editingBook, setEditingBook] = useState<string | null>(null);
    const [editingBookData, setEditingBookData] = useState<BookData | null>(null);

    // Legacy subjects for backward compatibility
    const legacySubjects = [
        'Object Oriented System Design with C++', 
        'Application of Soft Computing', 
        'Database Management System', 
        'Web Technology', 
        'Design and Analysis of Algorithm', 
        'Mechanics of Robots'
    ];

    useEffect(() => {
        loadInitialBooks();
        // Load created books from localStorage
        const savedBooks = localStorage.getItem('createdBooks');
        if (savedBooks) {
            setCreatedBooks(JSON.parse(savedBooks));
        }
    }, []);

    const loadInitialBooks = async () => {
        try {
            setLoading(true);
            
            // Load any existing book modules
            const existingBooks = bookLoader.getLoadedBooks();
            
            // If no modules are loaded, we can show the legacy books
            if (existingBooks.length === 0) {
                console.log('No book modules loaded, showing legacy books');
            }
            
            setLoadedBooks(existingBooks);
        } catch (error) {
            console.error('Error loading initial books:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleBookDownload = async (bookUrl: string) => {
        try {
            const bookModule = await bookLoader.loadBookModule(bookUrl);
            setLoadedBooks([...bookLoader.getLoadedBooks()]);
            console.log('Book downloaded successfully:', bookModule.title);
        } catch (error) {
            console.error('Error downloading book:', error);
            alert('Failed to download book. Please check the URL and try again.');
        }
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            const bookModule = await bookLoader.loadBookModule(file);
            setLoadedBooks([...bookLoader.getLoadedBooks()]);
            console.log('Book uploaded successfully:', bookModule.title);
        } catch (error) {
            console.error('Error uploading book:', error);
            alert('Failed to upload book. Please check the file format.');
        }
    };

    const openBookCreator = () => {
        window.open('http://localhost:5180', '_blank');
    };

    const handleCreateBook = (bookData: BookData) => {
        const newBook = {
            ...bookData,
            id: `created-${Date.now()}`, // Simple ID generation
            chapters: [] // Initialize with empty chapters
        };
        const updatedBooks = [...createdBooks, newBook];
        setCreatedBooks(updatedBooks);
        
        // Persist to localStorage
        localStorage.setItem('createdBooks', JSON.stringify(updatedBooks));
        
        console.log('Book created:', newBook);
    };

    const handleEditBook = (bookId: string) => {
        const book = createdBooks.find(b => b.id === bookId);
        if (book) {
            setEditingBookData({
                name: book.name,
                image: book.image,
                creatorName: book.creatorName,
                university: book.university,
                semester: book.semester,
                subjectCode: book.subjectCode
            });
            setEditingBook(bookId);
            setIsEditBookOpen(true);
        }
    };

    const handleUpdateBook = (bookData: BookData) => {
        if (editingBook) {
            const updatedBooks = createdBooks.map(book => 
                book.id === editingBook ? { ...book, ...bookData } : book
            );
            setCreatedBooks(updatedBooks);
            
            // Persist to localStorage
            localStorage.setItem('createdBooks', JSON.stringify(updatedBooks));
            
            console.log('Book updated:', editingBook, bookData);
        }
        setEditingBook(null);
        setEditingBookData(null);
        setIsEditBookOpen(false);
    };

    const handleDeleteBook = (bookId: string) => {
        const updatedBooks = createdBooks.filter(book => book.id !== bookId);
        setCreatedBooks(updatedBooks);
        
        // Persist to localStorage
        localStorage.setItem('createdBooks', JSON.stringify(updatedBooks));
        
        console.log('Book deleted:', bookId);
    };

    const handlePublishBooks = (bookIds: string[]) => {
        console.log('Publishing books:', bookIds);
        // TODO: Implement actual publishing logic
        alert(`Published ${bookIds.length} book(s) to marketplace!`);
    };

    const handleAIGuruClick = () => {
        setAIGuruPrompt('I need help understanding a concept. Can you explain it to me?');
        setAIGuruOpen(true);
    };

    // Get completed books for publishing (mock data for now)
    const getCompletedBooks = () => {
        return createdBooks.map(book => ({
            id: book.id,
            name: book.name,
            image: book.image,
            completionPercentage: 85, // Mock completion percentage
            totalSteps: 20,
            completedSteps: 17
        }));
    };

    const renderBookCard = (book: BookModule) => (
        <button
            key={book.id}
            onClick={() => navigate(`/book/${book.id}`)}
            className="card theme-transition group text-left p-3 sm:p-4 lg:p-6 flex flex-col h-full relative"
        >
            <div className="absolute top-2 right-2 z-10">
                <BookOptionsMenu
                    bookId={book.id}
                    bookName={book.title}
                    onEdit={handleEditBook}
                    onDelete={handleDeleteBook}
                />
            </div>
            <div className="aspect-[3/4] mb-3 sm:mb-4 rounded-xl overflow-hidden bg-gradient-to-br from-blue-100 to-blue-200 flex-shrink-0 flex items-center justify-center">
                <BookOpenIcon className="w-12 h-12 text-blue-600" />
            </div>
            <div className="flex-grow flex flex-col justify-between">
                <div>
                    <h3 className="font-semibold theme-text mb-2 group-hover:theme-accent-text theme-transition text-xs sm:text-sm lg:text-base leading-tight">
                        {book.title}
                    </h3>
                    <p className="text-xs theme-text-secondary mb-1">by {book.author}</p>
                    <p className="text-xs theme-text-secondary mb-2">{book.subjects.length} subjects</p>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                        {book.metadata.difficulty}
                    </span>
                    <span className="text-xs theme-text-secondary">
                        v{book.version}
                    </span>
                </div>
            </div>
        </button>
    );

    const renderCreatedBookCard = (book: BookData & { id: string }) => (
        <div
            key={book.id}
            className="card theme-transition group text-left p-3 sm:p-4 lg:p-6 flex flex-col h-full relative"
        >
            <div className="absolute top-2 right-2 z-10">
                <BookOptionsMenu
                    bookId={book.id}
                    bookName={book.name}
                    onEdit={handleEditBook}
                    onDelete={handleDeleteBook}
                />
            </div>
            <button
                onClick={() => navigate(`/subject/${encodeURIComponent(book.name)}`)}
                className="flex-1 w-full"
            >
                <div className="aspect-[3/4] mb-3 sm:mb-4 rounded-xl overflow-hidden bg-gradient-to-br from-green-100 to-green-200 flex-shrink-0 flex items-center justify-center">
                    {book.image ? (
                        <img 
                            src={book.image} 
                            alt={book.name}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <BookOpenIcon className="w-12 h-12 text-green-600" />
                    )}
                </div>
                <div className="flex-grow flex flex-col justify-between">
                    <div>
                        <h3 className="font-semibold theme-text mb-2 group-hover:theme-accent-text theme-transition text-xs sm:text-sm lg:text-base leading-tight">
                            {book.name}
                        </h3>
                        <p className="text-xs theme-text-secondary mb-1">by {book.creatorName}</p>
                        <p className="text-xs theme-text-secondary mb-2">{book.university}</p>
                    </div>
                    <div className="flex items-center justify-between">
                        {book.semester && (
                            <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full">
                                Sem {book.semester}
                            </span>
                        )}
                        {book.subjectCode && (
                            <span className="text-xs theme-text-secondary">
                                {book.subjectCode}
                            </span>
                        )}
                    </div>
                </div>
            </button>
        </div>
    );

    const renderLegacySubjectCard = (subject: string) => (
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
    );

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
                        <h1 className="text-lg sm:text-xl font-bold theme-text">Book Creator</h1>
                    </div>
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={() => setMarketplaceOpen(true)}
                            className="p-2 hover:theme-surface2 rounded-lg theme-transition"
                            title="Browse Book Marketplace"
                        >
                            <BookOpenIcon />
                        </button>
                        <button 
                            onClick={() => setSearchOpen(true)}
                            className="p-2 hover:theme-surface2 rounded-lg theme-transition"
                            title="Search"
                        >
                            <SearchIconSvg />
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
                {/* Book Management Section */}
                <div className="mb-8">
                    <div className="flex flex-wrap gap-4 justify-center">
                        <button
                            onClick={() => setPublishModalOpen(true)}
                            className="btn-primary flex items-center gap-2"
                        >
                            <PaperAirplaneIcon className="w-4 h-4" />
                            Publish in Marketplace
                        </button>
                        
                        <button
                            onClick={() => setCreateBookOpen(true)}
                            className="btn-secondary flex items-center gap-2"
                        >
                            <PlusIcon className="w-4 h-4" />
                            Create Book
                        </button>
                        
                        <label className="btn-secondary flex items-center gap-2 cursor-pointer">
                            <input
                                type="file"
                                accept=".json"
                                onChange={handleFileUpload}
                                className="hidden"
                            />
                            <PlusIcon className="w-4 h-4" />
                            Upload Book
                        </label>
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center items-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                ) : (
                    <div>
                        {/* Created Books */}
                        {createdBooks.length > 0 && (
                            <div className="mb-8">
                                <h2 className="text-xl font-semibold theme-text mb-4">Your Books</h2>
                                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
                                    {createdBooks.map(renderCreatedBookCard)}
                                </div>
                            </div>
                        )}

                        {/* Dynamic Book Modules */}
                        {loadedBooks.length > 0 && (
                            <div className="mb-8">
                                <h2 className="text-xl font-semibold theme-text mb-4">
                                    {createdBooks.length > 0 ? 'Downloaded Books' : 'Your Books'}
                                </h2>
                                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
                                    {loadedBooks.map(renderBookCard)}
                                </div>
                            </div>
                        )}

                        {/* Legacy Subjects */}
                        <div>
                            <h2 className="text-xl font-semibold theme-text mb-4">
                                {(loadedBooks.length > 0 || createdBooks.length > 0) ? 'Legacy Subjects' : 'Subjects'}
                            </h2>
                            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
                                {legacySubjects.map(renderLegacySubjectCard)}
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* AI Guru Button - Responsive positioning */}
            <button 
                onClick={handleAIGuruClick}
                className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 theme-accent p-3 sm:p-4 rounded-full shadow-lg hover:bg-opacity-90 theme-transition transform hover:scale-110 z-20"
            >
                <AIGuruIcon className="w-6 h-6 sm:w-7 sm:h-7 text-white"/>
            </button>

            {/* Theme Selector Modal */}
            <ThemeSelector isOpen={isThemeModalOpen} onClose={() => setThemeModalOpen(false)} />

            {/* Create Book Modal */}
            <CreateBookModal 
                isOpen={isCreateBookOpen} 
                onClose={() => {
                    setCreateBookOpen(false);
                    setEditingBook(null);
                }} 
                onSave={handleCreateBook}
            />

            {/* Edit Book Modal */}
            <EditBookModal 
                isOpen={isEditBookOpen} 
                onClose={() => {
                    setIsEditBookOpen(false);
                    setEditingBook(null);
                    setEditingBookData(null);
                }} 
                onSave={handleUpdateBook}
                initialData={editingBookData}
            />

            {/* Search Modal */}
            <SearchModal isOpen={isSearchOpen} onClose={() => setSearchOpen(false)} />

            {/* Publish Modal */}
            <PublishModal
                isOpen={isPublishModalOpen}
                onClose={() => setPublishModalOpen(false)}
                completedBooks={getCompletedBooks()}
                onPublish={handlePublishBooks}
            />

            {/* AI Guru Modal */}
            <EnhancedAIGuruModal
                isOpen={isAIGuruOpen}
                onClose={() => setAIGuruOpen(false)}
                initialPrompt={aiGuruPrompt}
            />

            {/* Book Marketplace Modal */}
            {isMarketplaceOpen && (
                <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
                        <div className="flex justify-between items-center p-4 border-b">
                            <h2 className="text-xl font-semibold theme-text">Book Marketplace</h2>
                            <button
                                onClick={() => setMarketplaceOpen(false)}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                            >
                                ✕
                            </button>
                        </div>
                        <div className="overflow-auto max-h-[80vh]">
                            <BookMarketplace onDownloadBook={handleBookDownload} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EnhancedBookshelfPage;
