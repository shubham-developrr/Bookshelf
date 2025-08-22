import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpenIcon, AlertIcon, AIGuruIcon, PlusIcon, SearchIconSvg, PaperAirplaneIcon, CloudUploadIcon } from '../components/icons';
import { getBookImage } from '../assets/images/index';
import { useTheme } from '../contexts/ThemeContext';
import { useUser } from '../contexts/UserContext';
import { bookLoader } from '../utils/bookModuleLoader';
import { BookModule } from '../types/bookModule';
import ThemeSelector from '../components/ThemeSelector';
import UserProfileDropdown from '../components/UserProfileDropdown';
import BackendMarketplace from '../components/BackendMarketplace';
import CreateBookModal, { BookData } from '../components/CreateBookModal';
import EditBookModal from '../components/EditBookModal';
import SearchModal from '../components/SearchModal';
import BookOptionsMenu from '../components/BookOptionsMenu';
import { MarketplaceBookImportService } from '../services/marketplaceImportService';
import { BackendBookService } from '../services/BackendBookService';
import { MarketplaceBookExportService } from '../services/marketplaceExportService';
import { EnhancedMarketplaceService } from '../services/EnhancedMarketplaceService';
import BookManager from '../utils/BookManager';
import UnifiedBookAdapter from '../services/UnifiedBookAdapter';
import RealTimeSyncService from '../services/RealTimeSyncService';
import { supabase } from '../services/supabaseClient';
import PublishModal from '../components/PublishModal';
import EnhancedAIGuruModal from '../components/EnhancedAIGuruModal';
import MarketplaceBookManager from '../components/MarketplaceBookManager';
import UpdateChecker from '../components/UpdateChecker';
import SyncStatusUI from '../components/SyncStatusUI';
import { BookSyncService, LoadingState } from '../services/BookSyncService';
import { BookMetadata } from '../services/BackendBookService';

// Gear icon component
const GearIcon: React.FC = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
);

interface EnhancedBookshelfPageProps {
    showAuthModal?: boolean;
    setShowAuthModal?: (show: boolean) => void;
}

const EnhancedBookshelfPage: React.FC<EnhancedBookshelfPageProps> = ({ 
    showAuthModal, 
    setShowAuthModal 
}) => {
    const navigate = useNavigate();
    const { theme } = useTheme();
    const { state } = useUser();
    const [isThemeModalOpen, setThemeModalOpen] = useState(false);
    const [isBookstoreOpen, setBookstoreOpen] = useState(false);
    const [isCreateBookOpen, setCreateBookOpen] = useState(false);
    const [isEditBookOpen, setIsEditBookOpen] = useState(false);
    const [isSearchOpen, setSearchOpen] = useState(false);
    const [isPublishModalOpen, setPublishModalOpen] = useState(false);
    const [isAIGuruOpen, setAIGuruOpen] = useState(false);
    const [isMarketplaceOpen, setIsMarketplaceOpen] = useState(false);
    const [marketplaceInitialTab, setMarketplaceInitialTab] = useState<'export' | 'import'>('export');
    const [aiGuruPrompt, setAIGuruPrompt] = useState('');
    const [loadedBooks, setLoadedBooks] = useState<BookModule[]>([]);
    const [isLoadingBackendBooks, setIsLoadingBackendBooks] = useState(false);
    const [backendBooksLoaded, setBackendBooksLoaded] = useState(false);
    
    // PROGRESSIVE LOADING STATE - Backend books integrated into existing sections
    const [bookMetadataList, setBookMetadataList] = useState<BookMetadata[]>([]);
    const [loadingState, setLoadingState] = useState<LoadingState>({
        isLoadingBookList: false,
        isLoadingBook: {},
        lastSync: {},
        syncErrors: {}
    });
    const [syncService] = useState(() => BookSyncService.getInstance());
    
    // Legacy support - keep for compatibility during transition
    const [createdBooks, setCreatedBooks] = useState<Array<BookData & { id: string; isBackendBook?: boolean }>>([]);
    
    const [importedBooks, setImportedBooks] = useState<Array<any>>([]);
    const [loading, setLoading] = useState(true);
    const [editingBook, setEditingBook] = useState<string | null>(null);
    const [editingBookData, setEditingBookData] = useState<BookData | null>(null);
    
    // Import functionality state
    const [isImporting, setIsImporting] = useState(false);
    const [importMessage, setImportMessage] = useState<string>('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    // Publishing functionality state
    const [publishingBooks, setPublishingBooks] = useState<Set<string>>(new Set());
    const [publishMessage, setPublishMessage] = useState<string>('');

    // Legacy subjects for backward compatibility + imported books (default books removed)
    const legacySubjects = [
        // Add imported books to legacy subjects
        ...importedBooks.map(book => book.name)
    ];

    useEffect(() => {
        console.log('🚀 UNIFIED: Initializing unified book system...');
        
        const initializeSystem = async () => {
            try {
                setLoading(true);
                console.log('📚 UNIFIED: Starting book loading...');
                
                // Use the existing unified system initialization
                await initializeUnifiedSystem();
                
                console.log('✅ UNIFIED: System initialized successfully');
                setLoading(false);
                
            } catch (error) {
                console.error('❌ UNIFIED: Initialization failed:', error);
                setLoading(false);
            }
        };

        initializeSystem();
        
        // REAL-TIME SYNC: Initialize for cross-browser sync
        const realTimeSync = RealTimeSyncService.getInstance();
        console.log('🔄 REALTIME: Adding listener bookshelf');
        
        const unsubscribe = realTimeSync.subscribe('bookshelf', (event) => {
            console.log(`🔄 REALTIME: Received sync event:`, event);
            if (event.type === 'book_created' || event.type === 'book_updated') {
                refreshBooksFromUnifiedService();
            }
        });
        
        return () => {
            unsubscribe();
            realTimeSync.stop();
        };
    }, []);

    // UNIFIED SYSTEM: Initialize unified book system
    const initializeUnifiedSystem = async () => {
        try {
            console.log('🚀 UNIFIED: Initializing unified book system...');
            await refreshBooksFromUnifiedService();
            console.log('✅ UNIFIED: System initialized successfully');
        } catch (error) {
            console.error('💥 UNIFIED: Failed to initialize unified system:', error);
        }
    };

    // UNIFIED SYSTEM: Refresh books from unified service with progressive loading
    const refreshBooksFromUnifiedService = async () => {
        try {
            console.log('🔄 UNIFIED: Starting progressive book loading...');
            
            // PHASE 1: Load book metadata quickly (for UI display)
            console.log('📚 PHASE 1: Loading book list metadata...');
            const unifiedAdapter = UnifiedBookAdapter.getInstance();
            const result = await unifiedAdapter.getAllBooks();
            
            if (result.success) {
                // Convert to legacy format for UI compatibility
                const legacyBooks = result.books.map(book => ({
                    id: book.id,
                    name: book.name,
                    image: book.image,
                    creatorName: book.creatorName,
                    university: book.university,
                    semester: book.semester,
                    subjectCode: book.subjectCode,
                    chapters: [],
                    version: book.version,
                    createdAt: book.createdAt,
                    updatedAt: book.updatedAt,
                    isBackendBook: true,
                    // Add loading indicator for content that will be loaded progressively
                    isContentLoaded: false
                }));
                
                setCreatedBooks(legacyBooks);
                console.log(`✅ PHASE 1 COMPLETE: Loaded ${legacyBooks.length} books from unified service`);
                
                // PHASE 2: Background load recently accessed books
                console.log('⚡ PHASE 2: Starting background sync for recent books...');
                setTimeout(() => {
                    if (syncService) {
                        syncService.backgroundSyncRecent().catch(error => {
                            console.error('Background sync failed:', error);
                        });
                    }
                }, 100); // Small delay to not block UI
                
            } else {
                console.error('❌ UNIFIED: Failed to refresh books:', result.error);
                // Fallback to localStorage if available
                const savedBooks = localStorage.getItem('createdBooks');
                if (savedBooks) {
                    console.log('📦 FALLBACK: Using cached books from localStorage');
                    setCreatedBooks(JSON.parse(savedBooks));
                }
            }
        } catch (error) {
            console.error('❌ UNIFIED: Error refreshing books:', error);
            // Fallback to localStorage
            const savedBooks = localStorage.getItem('createdBooks');
            if (savedBooks) {
                console.log('📦 FALLBACK: Using cached books from localStorage');
                setCreatedBooks(JSON.parse(savedBooks));
            }
        }
    };

    // PHASE 2: Progressive book click handler
    const handleProgressiveBookClick = async (bookId: string) => {
        try {
            console.log(`📖 Phase 2: Loading complete book data for ${bookId}...`);
            
            // Track book access for smart background sync
            syncService.trackBookAccess(bookId);
            
            // Load complete book content on-demand
            const bookData = await syncService.loadBookContent(bookId);
            console.log(`✅ Loaded complete book data: ${bookData.metadata.name}`);
            
            // Navigate to book reader with full data available
            navigate(`/shelf/subject/${encodeURIComponent(bookId)}`);
            
        } catch (error) {
            console.error(`💥 Failed to load book ${bookId}:`, error);
            
            // Fallback to legacy navigation if progressive loading fails
            navigate(`/shelf/subject/${encodeURIComponent(bookId)}`);
        }
    };

    // Manual refresh handler for Phase 1
    const handleRefresh = async () => {
        try {
            console.log('🔄 Manually refreshing book list...');
            const books = await syncService.loadBookList(undefined, true);
            setBookMetadataList(books);
            console.log(`✅ Refreshed ${books.length} books`);
        } catch (error) {
            console.error('💥 Manual refresh failed:', error);
        }
    };

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

    const handleBookDownload = async (marketplaceBook: any) => {
        try {
            console.log('🚀 Starting book download:', marketplaceBook.title);

            // For marketplace books, use the enhanced download system
            if (marketplaceBook.id) {
                const result = await EnhancedMarketplaceService.downloadBook(marketplaceBook.id);
                
                if (result.success && result.importResult) {
                    // Create proper imported book entry with complete data
                    const newImportedBook = {
                        id: result.importResult.bookId,
                        name: result.importResult.bookName,
                        description: marketplaceBook.description,
                        creatorName: marketplaceBook.author_name,
                        university: marketplaceBook.university || '',
                        semester: marketplaceBook.semester || '',
                        subjectCode: marketplaceBook.subject_code || '',
                        marketplaceId: marketplaceBook.id,
                        downloadDate: new Date().toISOString(),
                        version: marketplaceBook.version,
                        // Include import statistics for verification
                        importStats: result.importResult.imported,
                        hasCompleteContent: true
                    };
                    
                    const updatedImportedBooks = [...importedBooks, newImportedBook];
                    setImportedBooks(updatedImportedBooks);
                    localStorage.setItem('importedBooks', JSON.stringify(updatedImportedBooks));
                    
                    console.log('✅ Book downloaded and imported successfully:', result.importResult);
                    
                    alert(
                        `Book downloaded successfully!\n\n` +
                        `📖 "${result.importResult.bookName}"\n` +
                        `📚 ${result.importResult.imported.chapters} chapters imported\n` +
                        `📝 ${result.importResult.imported.subtopics} subtopics\n` +
                        `📋 ${result.importResult.imported.tabs} template tabs\n` +
                        `\nCheck "Your Shelf" section to access the content.`
                    );
                } else {
                    throw new Error(result.error || 'Download failed');
                }
            } else {
                // Legacy URL-based download (for backward compatibility)
                const bookModule = await bookLoader.loadBookModule(marketplaceBook);
                setLoadedBooks([...bookLoader.getLoadedBooks()]);
                console.log('Book downloaded successfully:', bookModule.title);
                alert('Book downloaded successfully! Check "Your Shelf" section.');
            }
        } catch (error) {
            console.error('Error downloading book:', error);
            alert(`Failed to download book: ${error instanceof Error ? error.message : 'Unknown error'}`);
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

    const handleCreateBook = async (bookData: BookData) => {
        console.log(`📚 UNIFIED: Creating book with auto-sync: ${bookData.name}`);
        
        try {
            // Use UnifiedBookAdapter for automatic cloud sync
            const unifiedAdapter = UnifiedBookAdapter.getInstance();
            
            const result = await unifiedAdapter.createBook({
                name: bookData.name,
                description: `${bookData.university} - ${bookData.semester}`,
                image: bookData.image,
                creatorName: bookData.creatorName,
                university: bookData.university,
                semester: bookData.semester,
                subjectCode: bookData.subjectCode
            });

            if (result.success && result.book) {
                console.log(`✅ UNIFIED: Book created and auto-synced: ${result.book.name}`);
                
                // UNIFIED SYSTEM: UnifiedBookAdapter already handles ALL storage
                // No need to duplicate in local state - just refresh the UI
                
                // Refresh books from unified service
                await refreshBooksFromUnifiedService();
                
                // Broadcast sync event to other tabs
                const realTimeSync = RealTimeSyncService.getInstance();
                realTimeSync.broadcastSyncEvent({
                    type: 'book_created',
                    bookId: result.book.id,
                    bookName: result.book.name
                });
                
                setCreateBookOpen(false);
                
                // Show success message
                alert(`✅ Book "${result.book.name}" created and synced to cloud!`);
                
            } else {
                console.error('UNIFIED: Failed to create book:', result.error);
                alert(`❌ Failed to create book: ${result.error}`);
            }

        } catch (error) {
            console.error('UNIFIED: Error creating book:', error);
            alert(`❌ Error creating book: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
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

    const handleDeleteBook = async (bookId: string) => {
        try {
            // Use BookManager's async delete method for both local and backend books
            const success = await BookManager.deleteBook(bookId);
            
            if (success) {
                // Remove from display state
                const updatedBooks = createdBooks.filter(book => book.id !== bookId);
                setCreatedBooks(updatedBooks);
                
                // Persist to localStorage (local books only - backend books are managed separately)
                const localOnlyBooks = updatedBooks.filter(book => !book.isBackendBook);
                localStorage.setItem('createdBooks', JSON.stringify(localOnlyBooks));
                
                console.log('✅ Book deleted successfully:', bookId);
            } else {
                console.error('❌ Failed to delete book:', bookId);
                alert('Failed to delete book. Please try again.');
            }
        } catch (error) {
            console.error('Error deleting book:', error);
            alert('Error deleting book. Please try again.');
        }
    };

    const handleDeleteImportedBook = (bookId: string) => {
        const book = importedBooks.find(b => b.id === bookId);
        if (book && confirm(`Are you sure you want to delete "${book.name}"? This action cannot be undone.`)) {
            const updatedBooks = importedBooks.filter(b => b.id !== bookId);
            setImportedBooks(updatedBooks);
            
            // Persist to localStorage
            localStorage.setItem('importedBooks', JSON.stringify(updatedBooks));
            
            console.log('Imported book deleted:', bookId);
        }
    };

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
            // Get preview first
            const preview = await MarketplaceBookImportService.getImportPreview(file);
            
            // Import the book module
            const result = await MarketplaceBookImportService.importBookModule(file, {
                conflictResolution: 'overwrite',
                preserveExisting: false,
                generateNewIds: false,
                validateIntegrity: true
            });
            
            setImportMessage(`Successfully imported "${result.bookName}" with ${result.imported.chapters} chapters!`);
            
            // Refresh the books
            await loadInitialBooks();
            const savedBooks = localStorage.getItem('createdBooks');
            if (savedBooks) {
                setCreatedBooks(JSON.parse(savedBooks));
            }
            
            // Refresh imported books
            const savedImportedBooks = localStorage.getItem('importedBooks');
            if (savedImportedBooks) {
                setImportedBooks(JSON.parse(savedImportedBooks));
            }
            
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

    const handlePublishBooks = async (bookIds: string[]) => {
        console.log('Publishing books:', bookIds);
        
        // For now, publish the first book in the selection
        if (bookIds.length > 0) {
            await handlePublishBook(bookIds[0]);
        }
    };

    const handlePublishBook = async (bookId: string) => {
        setPublishingBooks(prev => new Set(prev).add(bookId));
        setPublishMessage('Publishing book to marketplace...');

        try {
            // Get book data using BookManager
            const bookData = await BookManager.getBookById(bookId);
            
            if (!bookData) {
                throw new Error('Book not found');
            }

            // Export book module for marketplace
            await MarketplaceBookExportService.exportBookModule(bookData.name, bookId);
            
            // Get current user ID
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                throw new Error('User not authenticated');
            }

            // Prepare publish options
            const publishOptions = {
                book_id: bookId,
                title: bookData.name,
                description: bookData.description || `Interactive study book: ${bookData.name}`,
                category: 'Education',
                tags: bookData.tags || ['study', 'education'],
                difficulty: bookData.difficulty || 'intermediate',
                estimated_hours: bookData.estimatedHours || 10,
                file_data: bookData, // The book metadata and content
                release_notes: 'Initial publication'
            };

            // Publish to backend marketplace
            const publishResult = await EnhancedMarketplaceService.publishBook(publishOptions);

            if (publishResult.success) {
                setPublishMessage('Book published successfully!');
                
                // Update local book metadata to mark as published
                BookManager.updateBook(bookId, { 
                    isPublished: true,
                    marketplaceId: publishResult.marketplaceId
                });
            } else {
                throw new Error(publishResult.error || 'Publishing failed');
            }
        } catch (error) {
            console.error('Publishing error:', error);
            setPublishMessage(`Publishing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setPublishingBooks(prev => {
                const newSet = new Set(prev);
                newSet.delete(bookId);
                return newSet;
            });
            // Clear message after 3 seconds
            setTimeout(() => setPublishMessage(''), 3000);
        }
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
            onClick={() => navigate(`/shelf/subject/${encodeURIComponent(book.id)}`)}
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

    // Progressive loading book card renderer
    const renderProgressiveBookCard = (book: BookMetadata) => (
        <div
            key={book.id}
            className="card theme-transition group text-left p-3 sm:p-4 lg:p-6 flex flex-col h-full relative"
        >
            {/* Loading indicator for individual books */}
            {loadingState.isLoadingBook[book.id] && (
                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-20 rounded-lg">
                    <div className="text-white text-center">
                        <div className="animate-spin text-2xl mb-2">📖</div>
                        <div>Loading book...</div>
                    </div>
                </div>
            )}

            <div className="absolute top-2 right-2 z-10">
                <BookOptionsMenu
                    bookId={book.id}
                    bookName={book.name}
                    onEdit={(bookId) => console.log('Edit not yet implemented for progressive books:', bookId)}
                    onDelete={(bookId) => console.log('Delete not yet implemented for progressive books:', bookId)}
                />
            </div>
            <button
                onClick={() => handleProgressiveBookClick(book.id)}
                className="flex-1 w-full"
            >
                <div className="relative aspect-[3/4] mb-3 overflow-hidden rounded-lg bg-gradient-to-br from-blue-100 to-blue-50 dark:from-blue-900 dark:to-blue-800 flex items-center justify-center">
                    {book.coverImage ? (
                        <img 
                            src={book.coverImage} 
                            alt={book.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = getBookImage(book.name);
                            }}
                        />
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-center">
                            <BookOpenIcon className="h-8 w-8 sm:h-12 sm:w-12 text-blue-500 dark:text-blue-400 mb-2" />
                            <span className="text-xs font-medium text-blue-600 dark:text-blue-300 px-2">
                                {book.name}
                            </span>
                        </div>
                    )}
                    
                    {/* Progressive loading badges */}
                    <div className="absolute top-2 left-2">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                            📚 {book.chapterCount} chapters
                        </span>
                    </div>
                    
                    {/* Last sync indicator */}
                    {loadingState.lastSync[book.id] && (
                        <div className="absolute bottom-2 right-2">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                ✅ Synced
                            </span>
                        </div>
                    )}
                </div>
                
                <div className="text-left">
                    <h3 className="font-bold text-base sm:text-lg text-gray-900 dark:text-white mb-1 line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {book.name}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-2 line-clamp-2">
                        By {book.authorName}
                    </p>
                    {book.description && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                            {book.description}
                        </p>
                    )}
                    <div className="mt-2 flex items-center justify-between">
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                            Updated: {new Date(book.lastModified).toLocaleDateString()}
                        </span>
                        {book.isPublished && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                📖 Published
                            </span>
                        )}
                    </div>
                </div>
            </button>
        </div>
    );

    const renderCreatedBookCard = (book: BookData & { id: string, isBackendBook?: boolean }) => {
        const handleBookClick = async () => {
            if (book.isBackendBook) {
                // Backend book: load content first, then navigate
                console.log(`🔄 Loading backend book content: ${book.name}`);
                try {
                    // Phase 2: Load complete book data
                    const fullBookData = await BackendBookService.getInstance().getBookDetails(book.id);
                    console.log(`✅ Loaded backend book data:`, fullBookData);
                    
                    // Store the book data in localStorage for the reader page
                    localStorage.setItem(`book_${book.name}`, JSON.stringify(fullBookData.metadata));
                    localStorage.setItem(`chapters_${book.id}`, JSON.stringify(fullBookData.chapters));
                    
                    // Navigate to the book
                    navigate(`/subject/${encodeURIComponent(book.name)}`);
                } catch (error) {
                    console.error(`❌ Failed to load backend book ${book.name}:`, error);
                    // Still navigate, but with limited data
                    navigate(`/subject/${encodeURIComponent(book.name)}`);
                }
            } else {
                // Local book: navigate directly
                navigate(`/subject/${encodeURIComponent(book.name)}`);
            }
        };

        return (
        <div
            key={`${book.isBackendBook ? 'backend' : 'local'}_${book.id}`}
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
                onClick={handleBookClick}
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
            
            {/* Publish Button */}
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    handlePublishBook(book.id);
                }}
                disabled={publishingBooks.has(book.id)}
                className="mt-3 w-full py-2 px-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 
                         text-white text-xs font-medium rounded-lg theme-transition 
                         flex items-center justify-center gap-2"
                title="Publish to Marketplace"
            >
                {publishingBooks.has(book.id) ? (
                    <>
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                        Publishing...
                    </>
                ) : (
                    <>
                        <CloudUploadIcon className="w-3 h-3" />
                        Publish
                    </>
                )}
            </button>
        </div>
        );
    };

    const renderLegacySubjectCard = (subject: string) => (
        <button
            key={subject}
            onClick={() => navigate(`/shelf/subject/${encodeURIComponent(subject)}`)}
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

    const renderImportedBookCard = (book: any) => (
        <div
            key={book.id}
            className="card theme-transition group text-left p-3 sm:p-4 lg:p-6 flex flex-col h-full relative"
        >
            {/* Three-dot menu - same style as creator section */}
            <div className="absolute top-2 right-2 z-10">
                <BookOptionsMenu
                    bookId={book.id}
                    bookName={book.name}
                    onEdit={() => {}} // No edit function for imported books
                    onDelete={handleDeleteImportedBook}
                    hideEdit={true} // We'll add this prop to hide edit option
                />
            </div>
            
            <button
                onClick={() => navigate(`/shelf/subject/${encodeURIComponent(book.name)}`)}
                className="flex-1 w-full"
            >
                <div className="aspect-[3/4] mb-3 sm:mb-4 rounded-xl overflow-hidden bg-gradient-to-br from-purple-100 to-purple-200 flex-shrink-0 flex items-center justify-center">
                    <BookOpenIcon className="w-12 h-12 text-purple-600" />
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
                        <span className="text-xs px-2 py-1 bg-purple-100 text-purple-800 rounded-full">
                            Downloaded
                        </span>
                        {book.version && (
                            <span className="text-xs theme-text-secondary">
                                v{book.version}
                            </span>
                        )}
                    </div>
                </div>
            </button>
        </div>
    );

    return (
        <div className="theme-bg min-h-screen theme-transition">
            {/* Simplified Header with Title and Controls */}
            <header className="theme-surface px-4 py-4 sm:px-6 theme-transition border-b theme-border">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    {/* Logo and Title */}
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 theme-accent rounded-lg flex items-center justify-center">
                            <BookOpenIcon className="w-5 h-5 text-white" />
                        </div>
                        <h1 className="text-xl sm:text-2xl font-bold theme-text flex items-center">Bookshelf</h1>
                    </div>
                    
                    {/* Action Buttons - Profile moved to the right */}
                    <div className="flex items-center gap-3">
                        {/* Sync Status */}
                        {state.isAuthenticated && (
                            <SyncStatusUI className="hidden sm:flex" />
                        )}
                        
                        {/* Authentication Area */}
                        {state.isAuthenticated ? (
                            <UserProfileDropdown />
                        ) : (
                            <button
                                onClick={() => setShowAuthModal?.(true)}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg
                                         transition-colors duration-200"
                            >
                                Sign In
                            </button>
                        )}
                        
                        
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
                {/* Google-style Search Section in Main Area */}
                <div className="mb-8 text-center">
                    {/* Search SVG */}
                    <div className="mb-4">
                        <svg 
                            width="256" 
                            height="256" 
                            viewBox="0 0 256 256" 
                            fill="none" 
                            xmlns="http://www.w3.org/2000/svg"
                            className="w-64 h-64 mx-auto mobile-search-image theme-text"
                        >
                            {/* Search glass */}
                            <circle cx="110" cy="110" r="70" stroke="currentColor" strokeWidth="8" fill="none" opacity="0.7"/>
                            
                            {/* Search handle */}
                            <path d="m165 165 50 50" stroke="currentColor" strokeWidth="8" strokeLinecap="round" opacity="0.7"/>
                            
                            {/* Magnifying glass inner circle (optional highlight) */}
                            <circle cx="110" cy="110" r="50" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.3"/>
                            
                            {/* Small reflection on glass */}
                            <ellipse cx="95" cy="95" rx="8" ry="12" fill="currentColor" opacity="0.2" transform="rotate(-45 95 95)"/>
                        </svg>
                    </div>
                    
                    {/* Search Bar */}
                    <div className="relative max-w-2xl mx-auto mb-6">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Search your books, chapters, and content..."
                                onClick={() => setSearchOpen(true)}
                                readOnly
                                className="w-full px-4 py-4 pr-12 text-lg border border-gray-300 rounded-full theme-bg theme-text focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm hover:shadow-md theme-transition cursor-pointer mobile-search-input"
                            />
                            <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                                <SearchIconSvg />
                            </div>
                        </div>
                    </div>
                </div>
                {/* Hidden Import File Input */}
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".zip"
                    onChange={handleImportBook}
                    className="hidden"
                    disabled={isImporting}
                />
                
                {/* Import Message */}
                {importMessage && (
                    <div className={`mb-6 p-4 rounded-lg ${
                        importMessage.includes('Successfully') 
                            ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800' 
                            : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
                    }`}>
                        {importMessage}
                    </div>
                )}

                {/* Publish Message */}
                {publishMessage && (
                    <div className={`mb-6 p-4 rounded-lg ${
                        publishMessage.includes('successfully') 
                            ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800' 
                            : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
                    }`}>
                        {publishMessage}
                    </div>
                )}

                {/* Book Management Section */}
                <div className="mb-8">
                    <div className="flex flex-wrap gap-4 justify-center mobile-btn-group">
                        <button
                            onClick={() => setBookstoreOpen(true)}
                            className="btn-primary flex items-center gap-2"
                        >
                            <BookOpenIcon className="w-4 h-4" />
                            Browse Bookstore
                        </button>
                        
                        <button
                            onClick={() => setCreateBookOpen(true)}
                            className="btn-secondary flex items-center gap-2"
                        >
                            <PlusIcon className="w-4 h-4" />
                            Create Book
                        </button>
                        
                        <button 
                            onClick={() => {
                                // Create a file input element
                                const input = document.createElement('input');
                                input.type = 'file';
                                input.accept = '.zip,.json';
                                input.multiple = false;
                                input.onchange = (e) => {
                                    const files = (e.target as HTMLInputElement).files;
                                    if (files && files.length > 0) {
                                        const file = files[0];
                                        if (file.name.endsWith('.zip')) {
                                            // Handle marketplace import - open marketplace modal with import tab
                                            setMarketplaceInitialTab('import');
                                            setIsMarketplaceOpen(true);
                                            // The MarketplaceBookManager will handle the file processing
                                        } else {
                                            // Handle regular JSON import
                                            handleImportBook({ target: { files } } as any);
                                        }
                                    }
                                };
                                input.click();
                            }}
                            disabled={isImporting}
                            className="btn-secondary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Import Books (JSON/ZIP files)"
                        >
                            📥 Import
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center items-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                ) : (
                    <div>
                        {/* Your Shelf Section - Only Imported and Downloaded Books from Bookstore */}
                        <div className="mb-8">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-bold theme-text flex items-center gap-2">
                                    📚 Your Shelf
                                </h2>
                                {state.user && importedBooks.length > 0 && (
                                    <UpdateChecker 
                                        userId={state.user.id} 
                                        onUpdateAvailable={(updates) => console.log('Updates available:', updates)}
                                    />
                                )}
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
                                {loadedBooks.map(renderBookCard)}
                                {importedBooks.map(renderImportedBookCard)}
                                
                                {/* Download from Bookstore Button */}
                                <button
                                    onClick={() => setBookstoreOpen(true)}
                                    className="card theme-transition group text-left flex flex-col h-full"
                                >
                                    <div className="aspect-[3/4] mb-3 sm:mb-4 rounded-xl overflow-hidden bg-gradient-to-br from-green-100 to-green-200 flex-shrink-0 flex items-center justify-center">
                                        <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                                        </svg>
                                    </div>
                                    <div className="flex-grow flex flex-col justify-center">
                                        <h3 className="font-semibold theme-text mb-2 group-hover:theme-accent-text theme-transition text-xs sm:text-sm lg:text-base leading-tight text-center">
                                            Download from Bookstore
                                        </h3>
                                        <p className="text-xs theme-text-secondary text-center">
                                            Browse & download
                                        </p>
                                    </div>
                                </button>
                            </div>
                        </div>

                        {/* Creator Section - Created Books + Create Button */}
                        <div>
                            <h2 className="text-xl font-bold theme-text mb-4 flex items-center gap-2">
                                ✨ Creator Section
                            </h2>
                            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
                                {/* Created Books */}
                                {isLoadingBackendBooks && (
                                    <div className="col-span-2 md:col-span-3 lg:col-span-4 flex items-center justify-center p-8">
                                        <div className="flex items-center gap-3 theme-text">
                                            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                            <span className="text-sm">Loading your books from cloud...</span>
                                        </div>
                                    </div>
                                )}
                                {!isLoadingBackendBooks && createdBooks.map(renderCreatedBookCard)}
                                
                                {/* Create Your Own Books Button */}
                                <button
                                    onClick={() => setCreateBookOpen(true)}
                                    className="card theme-transition group text-left flex flex-col h-full"
                                >
                                    <div className="aspect-[3/4] mb-3 sm:mb-4 rounded-xl overflow-hidden bg-gradient-to-br from-blue-100 to-blue-200 flex-shrink-0 flex items-center justify-center">
                                        <svg className="w-12 h-12 text-blue-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                                        </svg>
                                    </div>
                                    <div className="flex-grow flex flex-col justify-center">
                                        <h3 className="font-semibold theme-text mb-2 group-hover:theme-accent-text theme-transition text-xs sm:text-sm lg:text-base leading-tight text-center">
                                            Create Your Own Books
                                        </h3>
                                        <p className="text-xs theme-text-secondary text-center">
                                            Start building
                                        </p>
                                    </div>
                                </button>
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

            {/* Marketplace Modal */}
            {isMarketplaceOpen && (
                <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden" data-testid="marketplace-modal">
                        <div className="flex justify-between items-center p-4 border-b">
                            <h2 className="text-xl font-semibold theme-text">Marketplace - Export/Import Book Modules</h2>
                            <button
                                onClick={() => {
                                    setIsMarketplaceOpen(false);
                                    setMarketplaceInitialTab('export');
                                }}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                            >
                                ✕
                            </button>
                        </div>
                        <div className="overflow-auto max-h-[80vh]">
                            <MarketplaceBookManager initialTab={marketplaceInitialTab} />
                        </div>
                    </div>
                </div>
            )}

            {/* Book Bookstore Modal */}
            {isBookstoreOpen && (
                <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
                    <div className="theme-surface rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden theme-transition" data-testid="book-bookstore-modal">
                        <div className="flex justify-between items-center p-4 border-b theme-border">
                            <h2 className="text-xl font-semibold theme-text">Book Bookstore</h2>
                            <button
                                onClick={() => setBookstoreOpen(false)}
                                className="p-2 hover:theme-surface2 rounded-lg theme-transition theme-text"
                            >
                                ✕
                            </button>
                        </div>
                        <div className="overflow-auto max-h-[80vh] theme-bg">
                            <BackendMarketplace onDownloadBook={handleBookDownload} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EnhancedBookshelfPage;
