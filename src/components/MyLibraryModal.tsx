import React, { useState, useEffect } from 'react';
import { useUser } from '../contexts/UserContext';
import { EnhancedMarketplaceService } from '../services/EnhancedMarketplaceService';

// Icons
const GlobeIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9m0 9c-5 0-9-4-9-9s4-9 9-9" />
  </svg>
);

const EyeOffIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L6.05 6.05M9.878 9.878a3 3 0 105.304-.36m4.242 4.242L21.95 21.95m-4.242-4.242a10.15 10.15 0 003.088-5.715A10.05 10.05 0 0012 5c-1.846 0-3.605.494-5.133 1.357" />
  </svg>
);

const UploadIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
  </svg>
);

const TrashIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const BookOpenIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
  </svg>
);

interface PublishedBook {
  id: string;
  title: string;
  description: string;
  author_name: string;
  university: string;
  is_published: boolean;
  version: string;
  download_count: number;
  rating: number;
  rating_count: number;
  created_at: string;
}

interface MyLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const MyLibraryModal: React.FC<MyLibraryModalProps> = ({ isOpen, onClose }) => {
  const { state } = useUser();
  const [publishedBooks, setPublishedBooks] = useState<PublishedBook[]>([]);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (isOpen && state.isAuthenticated) {
      loadPublishedBooks();
    }
  }, [isOpen, state.isAuthenticated]);

  const loadPublishedBooks = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Get user's published books from marketplace
      const result = await EnhancedMarketplaceService.getUserPublishedBooks();
      if (result.success && result.books) {
        setPublishedBooks(result.books);
      } else {
        setError(result.error || 'Failed to load published books');
      }
    } catch (err) {
      console.error('Error loading published books:', err);
      setError('Failed to load published books');
    } finally {
      setLoading(false);
    }
  };

  const handleVisibilityToggle = async (bookId: string, currentIsPublished: boolean) => {
    try {
      setUpdating(bookId);
      const newIsPublished = !currentIsPublished;
      
      const result = await EnhancedMarketplaceService.updateBookVisibility(bookId, newIsPublished);
      if (result.success) {
        setPublishedBooks(books => 
          books.map(book => 
            book.id === bookId 
              ? { ...book, is_published: newIsPublished }
              : book
          )
        );
      } else {
        alert(result.error || 'Failed to update visibility');
      }
    } catch (err) {
      console.error('Error updating visibility:', err);
      alert('Failed to update visibility');
    } finally {
      setUpdating('');
    }
  };

  const handleDeleteFromMarketplace = async (bookId: string, bookTitle: string) => {
    if (!confirm(`Are you sure you want to remove "${bookTitle}" from the marketplace? This action cannot be undone.`)) {
      return;
    }

    try {
      setUpdating(bookId);
      const result = await EnhancedMarketplaceService.deletePublishedBook(bookId);
      if (result.success) {
        setPublishedBooks(books => books.filter(book => book.id !== bookId));
        alert('Book removed from marketplace successfully');
      } else {
        alert(result.error || 'Failed to remove book from marketplace');
      }
    } catch (err) {
      console.error('Error removing book:', err);
      alert('Failed to remove book from marketplace');
    } finally {
      setUpdating('');
    }
  };

  const handlePushUpdate = async (bookId: string) => {
    try {
      setUpdating(bookId);
      // TODO: Implement update pushing logic
      alert('Update functionality will be implemented soon');
    } catch (err) {
      console.error('Error pushing update:', err);
      alert('Failed to push update');
    } finally {
      setUpdating('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="theme-surface rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden theme-transition">
        <div className="flex justify-between items-center p-6 border-b theme-border">
          <div>
            <h2 className="text-2xl font-bold theme-text">My Library</h2>
            <p className="theme-text-secondary">Manage your published books</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:theme-surface2 rounded-lg theme-transition theme-text"
          >
            ✕
          </button>
        </div>

        <div className="overflow-auto max-h-[75vh] p-6 theme-bg">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <div className="theme-surface2 theme-border theme-text p-4 rounded-lg mb-4 border-red-500 text-red-600">
                {error}
              </div>
              <button
                onClick={loadPublishedBooks}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 theme-transition"
              >
                Try Again
              </button>
            </div>
          ) : publishedBooks.length === 0 ? (
            <div className="text-center py-12">
              <BookOpenIcon className="w-16 h-16 theme-text-secondary mx-auto mb-4" />
              <h3 className="text-lg font-semibold theme-text mb-2">No Published Books</h3>
              <p className="theme-text-secondary">
                You haven't published any books to the marketplace yet.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {publishedBooks.map((book) => (
                <div key={book.id} className="card theme-transition p-4">
                  {/* Book Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold theme-text mb-1 line-clamp-2">
                        {book.title}
                      </h3>
                      <p className="text-sm theme-text-secondary">
                        {book.university} • v{book.version}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                      {book.is_published ? (
                        <GlobeIcon className="w-4 h-4 text-green-600" />
                      ) : (
                        <EyeOffIcon className="w-4 h-4 text-gray-500" />
                      )}
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        book.is_published 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {book.is_published ? 'Public' : 'Private'}
                      </span>
                    </div>
                  </div>

                  {/* Book Stats */}
                  <div className="flex items-center justify-between text-sm theme-text-secondary mb-4">
                    <span>{book.download_count} downloads</span>
                    <span>★ {book.rating.toFixed(1)} ({book.rating_count})</span>
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-2">
                    <button
                      onClick={() => handleVisibilityToggle(book.id, book.is_published)}
                      disabled={updating === book.id}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg theme-surface2 hover:theme-surface3 theme-transition theme-text disabled:opacity-50"
                    >
                      {book.is_published ? <EyeOffIcon /> : <GlobeIcon />}
                      Make {book.is_published ? 'Private' : 'Public'}
                    </button>

                    <button
                      onClick={() => handlePushUpdate(book.id)}
                      disabled={updating === book.id}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white theme-transition disabled:opacity-50"
                    >
                      <UploadIcon />
                      Push Update
                    </button>

                    <button
                      onClick={() => handleDeleteFromMarketplace(book.id, book.title)}
                      disabled={updating === book.id}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white theme-transition disabled:opacity-50"
                    >
                      <TrashIcon />
                      Remove from Marketplace
                    </button>
                  </div>

                  {updating === book.id && (
                    <div className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center rounded-lg">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MyLibraryModal;
