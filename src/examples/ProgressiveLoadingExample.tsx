/**
 * PROGRESSIVE LOADING IMPLEMENTATION EXAMPLE
 * 
 * How to integrate the new progressive loading system into your main pages
 * This shows the complete pattern for phase 1, 2, and 3 loading
 */

import React, { useState, useEffect } from 'react';
import { BookSyncService, LoadingState } from '../services/BookSyncService';
import { BookMetadata, FullBookData } from '../services/BackendBookService';

// Example: Enhanced Bookshelf Page with Progressive Loading
const EnhancedBookshelfPageExample: React.FC = () => {
  const [bookList, setBookList] = useState<BookMetadata[]>([]);
  const [loadingState, setLoadingState] = useState<LoadingState>({
    isLoadingBookList: false,
    isLoadingBook: {},
    lastSync: {},
    syncErrors: {}
  });
  const [selectedBook, setSelectedBook] = useState<FullBookData | null>(null);

  // Initialize progressive loading system
  useEffect(() => {
    const syncService = BookSyncService.getInstance();
    
    // Subscribe to loading state changes for UI feedback
    const unsubscribe = syncService.subscribe((state: LoadingState) => {
      setLoadingState(state);
    });

    // PHASE 1: Load book list immediately on page load
    loadBookList();

    // Start background sync for recent books
    startBackgroundSync();

    return unsubscribe;
  }, []);

  /**
   * PHASE 1: Quick book list loading
   */
  const loadBookList = async (forceRefresh = false) => {
    try {
      const syncService = BookSyncService.getInstance();
      const books = await syncService.loadBookList(undefined, forceRefresh);
      setBookList(books);
      
      console.log(`📚 Loaded ${books.length} books for bookshelf`);
    } catch (error) {
      console.error('Failed to load book list:', error);
      // Show error message to user
    }
  };

  /**
   * PHASE 2: Load complete book data when user clicks
   */
  const handleBookClick = async (bookId: string) => {
    try {
      const syncService = BookSyncService.getInstance();
      
      // This loads complete book data on-demand
      const bookData = await syncService.loadBookContent(bookId);
      setSelectedBook(bookData);
      
      console.log(`📖 Loaded complete data for book: ${bookData.metadata.name}`);
      
      // Navigate to book reader with full data available
      // router.push(`/reader/${bookId}`);
      
    } catch (error) {
      console.error(`Failed to load book ${bookId}:`, error);
      // Show error message to user
    }
  };

  /**
   * PHASE 3: Background sync for performance
   */
  const startBackgroundSync = async () => {
    try {
      const syncService = BookSyncService.getInstance();
      
      // This runs in background without blocking UI
      await syncService.backgroundSyncRecent();
      
    } catch (error) {
      console.warn('Background sync failed:', error);
      // Non-critical, don't show to user
    }
  };

  // Manual refresh handler
  const handleRefresh = () => {
    loadBookList(true); // Force refresh from backend
  };

  // Error retry handler
  const handleRetry = (bookId: string) => {
    const syncService = BookSyncService.getInstance();
    syncService.refreshBook(bookId); // Force refresh specific book
  };

  return (
    <div className="bookshelf-container">
      {/* Header with loading indicator */}
      <div className="header">
        <h1>Your Books</h1>
        {loadingState.isLoadingBookList && (
          <div className="loading-indicator">
            📚 Loading books...
          </div>
        )}
        <button onClick={handleRefresh} disabled={loadingState.isLoadingBookList}>
          🔄 Refresh
        </button>
      </div>

      {/* Error messages */}
      {Object.entries(loadingState.syncErrors).map(([key, error]) => (
        <div key={key} className="error-message">
          ❌ {error} 
          <button onClick={() => handleRetry(key)}>Retry</button>
        </div>
      ))}

      {/* Book grid */}
      <div className="book-grid">
        {bookList.map((book) => (
          <div 
            key={book.id} 
            className="book-card"
            onClick={() => handleBookClick(book.id)}
          >
            {/* Loading indicator for individual books */}
            {loadingState.isLoadingBook[book.id] && (
              <div className="book-loading">📖 Loading...</div>
            )}
            
            <img src={book.coverImage} alt={book.name} />
            <h3>{book.name}</h3>
            <p>By {book.authorName}</p>
            <p>{book.chapterCount} chapters</p>
            
            {/* Show last sync time */}
            {loadingState.lastSync[book.id] && (
              <small>
                Last synced: {loadingState.lastSync[book.id].toLocaleTimeString()}
              </small>
            )}
          </div>
        ))}
      </div>

      {/* Empty state */}
      {bookList.length === 0 && !loadingState.isLoadingBookList && (
        <div className="empty-state">
          📚 No books found. Create your first book!
        </div>
      )}
    </div>
  );
};

// Example: Enhanced Reader Page with Progressive Loading
const EnhancedReaderPageExample: React.FC<{ bookId: string }> = ({ bookId }) => {
  const [bookData, setBookData] = useState<FullBookData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadBookForReading();
  }, [bookId]);

  const loadBookForReading = async () => {
    try {
      setLoading(true);
      setError(null);

      const syncService = BookSyncService.getInstance();
      
      // PHASE 2: Load complete book data for reading
      const data = await syncService.loadBookContent(bookId);
      setBookData(data);
      
      console.log(`📖 Reader loaded book: ${data.metadata.name}`);

    } catch (err) {
      console.error('Failed to load book for reading:', err);
      setError(err instanceof Error ? err.message : 'Failed to load book');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="reader-loading">
        📖 Loading book content...
      </div>
    );
  }

  if (error) {
    return (
      <div className="reader-error">
        ❌ {error}
        <button onClick={loadBookForReading}>Retry</button>
      </div>
    );
  }

  if (!bookData) {
    return (
      <div className="reader-empty">
        📚 Book not found
      </div>
    );
  }

  return (
    <div className="reader-container">
      <h1>{bookData.metadata.name}</h1>
      <p>By {bookData.metadata.authorName}</p>
      
      {/* Chapter navigation */}
      <div className="chapter-list">
        {bookData.chapters.map((chapter) => (
          <div key={chapter.id} className="chapter-item">
            <h3>{chapter.title}</h3>
            {/* All template data is now available */}
            <p>Templates: {Object.keys(bookData.templateData).length}</p>
            <p>Custom tabs: {Object.keys(bookData.customTabs).length}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

// Example: Background Service Usage
export const useProgressiveLoading = () => {
  const [syncService] = useState(() => BookSyncService.getInstance());
  const [loadingState, setLoadingState] = useState<LoadingState>({
    isLoadingBookList: false,
    isLoadingBook: {},
    lastSync: {},
    syncErrors: {}
  });

  useEffect(() => {
    // Subscribe to loading state changes
    const unsubscribe = syncService.subscribe(setLoadingState);
    return unsubscribe;
  }, [syncService]);

  return {
    syncService,
    loadingState,
    
    // Convenience methods
    loadBookList: (forceRefresh?: boolean) => syncService.loadBookList(undefined, forceRefresh),
    loadBookContent: (bookId: string, forceRefresh?: boolean) => syncService.loadBookContent(bookId, forceRefresh),
    refreshBook: (bookId: string) => syncService.refreshBook(bookId),
    backgroundSync: () => syncService.backgroundSyncRecent(),
    trackBookAccess: (bookId: string) => syncService.trackBookAccess(bookId),
  };
};

export { EnhancedBookshelfPageExample, EnhancedReaderPageExample };
