import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useUser } from '../contexts/UserContext';
import EnhancedMarketplaceService, { MarketplaceBook } from '../services/EnhancedMarketplaceService';
import { MarketplaceBookImportService } from '../services/marketplaceImportService';
import { BookOpenIcon, DownloadIcon, SearchIconSvg, StarIcon } from './icons';

interface BackendMarketplaceProps {
  onDownloadBook?: (book: any) => void;
}

interface FilterOptions {
  category: string;
  difficulty: string;
  sortBy: 'popularity' | 'rating' | 'newest' | 'title';
  search: string;
}

const BackendMarketplace: React.FC<BackendMarketplaceProps> = ({ onDownloadBook }) => {
  const { theme } = useTheme();
  const { state } = useUser();
  const [books, setBooks] = useState<MarketplaceBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [downloading, setDownloading] = useState<string>('');
  
  const [filters, setFilters] = useState<FilterOptions>({
    category: '',
    difficulty: '',
    sortBy: 'newest',
    search: ''
  });

  const [categories] = useState([
    'Mathematics', 'Science', 'Technology', 'Literature', 
    'History', 'Business', 'Engineering', 'Medical', 'Other'
  ]);

  useEffect(() => {
    loadMarketplaceBooks();
  }, [filters]);

  const loadMarketplaceBooks = async () => {
    try {
      setLoading(true);
      setError('');

      const result = await EnhancedMarketplaceService.browseMarketplace({
        category: filters.category || undefined,
        difficulty: filters.difficulty || undefined,
        search: filters.search || undefined,
        sortBy: filters.sortBy,
        limit: 50
      });

      if (result.error) {
        setError(result.error);
      } else {
        setBooks(result.books);
      }
    } catch (err) {
      setError('Failed to load marketplace books');
      console.error('Marketplace loading error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadBook = async (marketplaceBook: MarketplaceBook) => {
    if (!state.isAuthenticated) {
      alert('Please sign in to download books');
      return;
    }

    try {
      setDownloading(marketplaceBook.id);
      
      // Download book from marketplace
      const downloadResult = await EnhancedMarketplaceService.downloadBook(
        marketplaceBook.book_id
      );

      if (downloadResult.success && downloadResult.downloadData) {
        // Create book metadata directly from marketplace data
        const bookData = {
          id: marketplaceBook.book_id,
          name: marketplaceBook.title,
          description: marketplaceBook.description,
          creatorName: marketplaceBook.author_name,
          university: marketplaceBook.university,
          semester: marketplaceBook.semester,
          subjectCode: marketplaceBook.subject_code,
          chapters: [],
          imported: true,
          importSource: 'backend_marketplace',
          marketplace_id: marketplaceBook.id,
          marketplace_version: marketplaceBook.version,
          downloadedAt: new Date().toISOString(),
          canUpdate: true,
          version: marketplaceBook.version
        };

        // Call parent download handler
        if (onDownloadBook) {
          onDownloadBook(bookData);
        }

        alert(`Successfully downloaded "${marketplaceBook.title}"!`);
      } else {
        throw new Error(downloadResult.error || 'Failed to download book');
      }
    } catch (err) {
      console.error('Download error:', err);
      alert(`Failed to download book: ${err}`);
    } finally {
      setDownloading('');
    }
  };

  const renderBookCard = (book: MarketplaceBook) => (
    <div key={book.id} className="card theme-transition p-4 flex flex-col">
      {/* Book Image/Icon */}
      <div className="aspect-[3/4] mb-3 rounded-xl overflow-hidden bg-gradient-to-br from-blue-100 to-blue-200 flex-shrink-0 flex items-center justify-center">
        <BookOpenIcon className="w-12 h-12 text-blue-600" />
      </div>

      {/* Book Details */}
      <div className="flex-grow">
        <h3 className="font-semibold theme-text mb-1 text-sm line-clamp-2">
          {book.title}
        </h3>
        <p className="text-xs theme-text-secondary mb-1">by {book.author_name}</p>
        
        {book.university && (
          <p className="text-xs theme-text-secondary mb-2">{book.university}</p>
        )}

        <p className="text-xs theme-text-secondary mb-3 line-clamp-2">
          {book.description}
        </p>

        {/* Metadata */}
        <div className="flex flex-wrap gap-1 mb-3">
          {book.difficulty && (
            <span className={`text-xs px-2 py-1 rounded-full ${
              book.difficulty === 'beginner' ? 'bg-green-100 text-green-800' :
              book.difficulty === 'intermediate' ? 'bg-yellow-100 text-yellow-800' :
              'bg-red-100 text-red-800'
            }`}>
              {book.difficulty}
            </span>
          )}
          
          {book.category && (
            <span className="text-xs px-2 py-1 bg-gray-100 text-gray-800 rounded-full">
              {book.category}
            </span>
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between text-xs theme-text-secondary mb-3">
          <div className="flex items-center gap-1">
            <StarIcon className="w-3 h-3" />
            <span>{book.rating.toFixed(1)} ({book.rating_count})</span>
          </div>
          <span>{book.download_count} downloads</span>
        </div>
      </div>

      {/* Download Button */}
      <button
        onClick={() => handleDownloadBook(book)}
        disabled={downloading === book.id}
        className={`w-full py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
          downloading === book.id
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-700 text-white'
        }`}
      >
        {downloading === book.id ? (
          <div className="flex items-center justify-center gap-2">
            <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
            Downloading...
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2">
            <DownloadIcon className="w-4 h-4" />
            Download
          </div>
        )}
      </button>
    </div>
  );

  return (
    <div className="p-6 theme-bg theme-text">
      <div className="mb-6">
        <h2 className="text-2xl font-bold theme-text mb-2">Book Marketplace</h2>
        <p className="theme-text-secondary">
          Discover and download books created by the community
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6 space-y-4">
        {/* Search */}
        <div className="relative">
          <SearchIconSvg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 theme-text-secondary" />
          <input
            type="text"
            placeholder="Search books, authors, topics..."
            value={filters.search}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            className="w-full pl-10 pr-4 py-2 theme-surface theme-text theme-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap gap-4">
          {/* Category Filter */}
          <select
            value={filters.category}
            onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
            className="px-3 py-2 theme-surface theme-text theme-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          {/* Difficulty Filter */}
          <select
            value={filters.difficulty}
            onChange={(e) => setFilters(prev => ({ ...prev, difficulty: e.target.value }))}
            className="px-3 py-2 theme-surface theme-text theme-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Levels</option>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>

          {/* Sort Filter */}
          <select
            value={filters.sortBy}
            onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value as any }))}
            className="px-3 py-2 theme-surface theme-text theme-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="newest">Newest</option>
            <option value="popularity">Most Popular</option>
            <option value="rating">Highest Rated</option>
            <option value="title">Alphabetical</option>
          </select>
        </div>
      </div>

      {/* Content */}
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
            onClick={loadMarketplaceBooks}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 theme-transition"
          >
            Try Again
          </button>
        </div>
      ) : books.length === 0 ? (
        <div className="text-center py-12">
          <BookOpenIcon className="w-16 h-16 theme-text-secondary mx-auto mb-4" />
          <h3 className="text-lg font-semibold theme-text mb-2">No Books Found</h3>
          <p className="theme-text-secondary">
            Try adjusting your search filters or check back later for new books.
          </p>
        </div>
      ) : (
        <>
          <div className="mb-4 theme-text-secondary text-sm">
            Found {books.length} books
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {books.map(renderBookCard)}
          </div>
        </>
      )}
    </div>
  );
};

export default BackendMarketplace;
