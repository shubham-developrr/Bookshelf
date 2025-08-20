import React, { useState, useEffect } from 'react';
import { BookModule } from '../types/bookModule';
import { 
  DownloadIcon, 
  SearchIconSvg, 
  FilterIcon, 
  StarIcon, 
  EyeIcon, 
  CalendarIcon, 
  UserIcon, 
  TagIcon 
} from './icons';

interface BookstoreProps {
  onDownloadBook: (bookId: string) => void;
}

interface BookstoreBook extends BookModule {
  rating: number;
  downloadCount: number;
  previewUrl?: string;
  authorName: string;
}

interface SearchFilters {
  curriculum: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced' | '';
  tags: string[];
  rating: number;
  sortBy: 'newest' | 'popular' | 'rating' | 'downloads';
}

export function BookBookstore({ onDownloadBook }: BookstoreProps) {
  const [books, setBooks] = useState<BookstoreBook[]>([]);
  const [filteredBooks, setFilteredBooks] = useState<BookstoreBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBook, setSelectedBook] = useState<BookstoreBook | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({
    curriculum: '',
    difficulty: '',
    tags: [],
    rating: 0,
    sortBy: 'newest'
  });

  const curriculums = [
    'Computer Science',
    'Mathematics',
    'Physics',
    'Chemistry',
    'Biology',
    'Engineering',
    'Business',
    'Literature',
    'History',
    'Psychology'
  ];

  useEffect(() => {
    fetchBookstoreBooks();
  }, []);

  useEffect(() => {
    applyFiltersAndSearch();
  }, [books, searchQuery, filters]);

  const fetchBookstoreBooks = async () => {
    try {
      // This would be an API call to your backend
      const response = await fetch('/api/bookstore');
      const bookstoreBooks = await response.json();
      setBooks(bookstoreBooks);
    } catch (error) {
      console.error('Failed to fetch bookstore books:', error);
      // Mock data for development
      setBooks(getMockBookstoreBooks());
    } finally {
      setLoading(false);
    }
  };

  const applyFiltersAndSearch = () => {
    let filtered = [...books];

    // Apply search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(book => 
        book.title.toLowerCase().includes(query) ||
        book.description.toLowerCase().includes(query) ||
        book.authorName.toLowerCase().includes(query) ||
        book.metadata.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Apply filters
    if (filters.curriculum) {
      filtered = filtered.filter(book => book.curriculum === filters.curriculum);
    }

    if (filters.difficulty) {
      filtered = filtered.filter(book => book.metadata.difficulty === filters.difficulty);
    }

    if (filters.rating > 0) {
      filtered = filtered.filter(book => book.rating >= filters.rating);
    }

    if (filters.tags.length > 0) {
      filtered = filtered.filter(book =>
        filters.tags.some(tag => book.metadata.tags.includes(tag))
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (filters.sortBy) {
        case 'newest':
          return new Date(b.metadata.created).getTime() - new Date(a.metadata.created).getTime();
        case 'popular':
          return b.downloadCount - a.downloadCount;
        case 'rating':
          return b.rating - a.rating;
        case 'downloads':
          return b.downloadCount - a.downloadCount;
        default:
          return 0;
      }
    });

    setFilteredBooks(filtered);
  };

  const handleDownload = async (book: BookstoreBook) => {
    try {
      // Track download
      await fetch(`/api/bookstore/${book.id}/download`, { method: 'POST' });
      
      // Update local count
      setBooks(books.map(b => 
        b.id === book.id 
          ? { ...b, downloadCount: b.downloadCount + 1 }
          : b
      ));

      onDownloadBook(book.id);
    } catch (error) {
      console.error('Failed to download book:', error);
    }
  };

  const BookCard = ({ book }: { book: BookstoreBook }) => (
    <div className="theme-surface rounded-lg p-6 transition-shadow shadow-md hover:shadow-xl">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h3 className="text-xl font-bold theme-text mb-2">{book.title}</h3>
          <p className="theme-text-secondary text-sm mb-2">by {book.authorName}</p>
          <p className="theme-text-secondary text-sm line-clamp-2">{book.description}</p>
        </div>
        <div className="flex items-center gap-4 ml-4">
          <div className="flex items-center gap-1">
            <StarIcon className="w-4 h-4 text-yellow-400 fill-yellow-400" />
            <span className="text-sm font-medium theme-text">{book.rating.toFixed(1)}</span>
          </div>
          <div className="flex items-center gap-1">
            <DownloadIcon className="w-4 h-4 theme-text-secondary" />
            <span className="text-sm theme-text-secondary">{book.downloadCount}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <span className="px-2 py-1 theme-accent text-white rounded-full text-xs font-medium">
          {book.curriculum}
        </span>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${{
          'beginner': 'bg-green-100 text-green-800',
          'intermediate': 'bg-yellow-100 text-yellow-800',
          'advanced': 'bg-red-100 text-red-800'
        }[book.metadata.difficulty]}`}>
          {book.metadata.difficulty}
        </span>
        {book.metadata.tags.slice(0, 3).map(tag => (
          <span key={tag} className="px-2 py-1 theme-surface-secondary rounded-full text-xs theme-text-secondary">
            {tag}
          </span>
        ))}
      </div>

      <div className="flex items-center justify-between text-sm theme-text-secondary mb-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <CalendarIcon className="w-4 h-4" />
            <span>{new Date(book.metadata.created).toLocaleDateString()}</span>
          </div>
          <div className="flex items-center gap-1">
            <EyeIcon className="w-4 h-4" />
            <span>{book.metadata.estimatedHours}h</span>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => setSelectedBook(book)}
          className="btn-secondary flex-1"
        >
          Preview
        </button>
        <button
          onClick={() => handleDownload(book)}
          className="btn-primary flex-1 flex items-center justify-center gap-2"
        >
          <DownloadIcon className="w-4 h-4" />
          <span>Download</span>
        </button>
      </div>
    </div>
  );

  const FilterPanel = () => (
    <div className="theme-surface rounded-lg p-6">
      <h3 className="text-lg font-semibold theme-text mb-4">Filters</h3>
      
      <div className="flex flex-col gap-6">
        {/* Curriculum Filter */}
        <div>
          <label className="block text-sm font-medium theme-text mb-2">Curriculum</label>
          <select
            value={filters.curriculum}
            onChange={(e) => setFilters({ ...filters, curriculum: e.target.value })}
            className="w-full p-2 theme-surface border theme-border rounded-lg outline-none"
          >
            <option value="">All Curriculums</option>
            {curriculums.map(curriculum => (
              <option key={curriculum} value={curriculum}>{curriculum}</option>
            ))}
          </select>
        </div>

        {/* Difficulty Filter */}
        <div>
          <label className="block text-sm font-medium theme-text mb-2">Difficulty</label>
          <select
            value={filters.difficulty}
            onChange={(e) => setFilters({ ...filters, difficulty: e.target.value as any })}
            className="w-full p-2 theme-surface border theme-border rounded-lg outline-none"
          >
            <option value="">All Levels</option>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </div>

        {/* Rating Filter */}
        <div>
          <label className="block text-sm font-medium theme-text mb-2">Minimum Rating</label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map(rating => (
              <button
                key={rating}
                onClick={() => setFilters({ ...filters, rating: filters.rating === rating ? 0 : rating })}
                className={`flex items-center gap-1 px-2 py-1 rounded-md transition-colors ${
                  filters.rating >= rating 
                    ? 'theme-accent text-white' 
                    : 'theme-surface-secondary theme-text'
                }`}
              >
                <StarIcon className="w-4 h-4 fill-current" />
                <span>{rating}+</span>
              </button>
            ))}
          </div>
        </div>

        {/* Sort Options */}
        <div>
          <label className="block text-sm font-medium theme-text mb-2">Sort By</label>
          <select
            value={filters.sortBy}
            onChange={(e) => setFilters({ ...filters, sortBy: e.target.value as any })}
            className="w-full p-2 theme-surface border theme-border rounded-lg outline-none"
          >
            <option value="newest">Newest</option>
            <option value="popular">Most Popular</option>
            <option value="rating">Highest Rated</option>
            <option value="downloads">Most Downloaded</option>
          </select>
        </div>

        {/* Clear Filters */}
        <button
          onClick={() => setFilters({
            curriculum: '',
            difficulty: '',
            tags: [],
            rating: 0,
            sortBy: 'newest'
          })}
          className="btn-secondary w-full"
        >
          Clear Filters
        </button>
      </div>
    </div>
  );

  const BookPreviewModal = ({ book }: { book: BookstoreBook }) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="theme-surface rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-2xl font-bold theme-text mb-2">{book.title}</h2>
              <p className="theme-text-secondary">by {book.authorName}</p>
            </div>
            <button
              onClick={() => setSelectedBook(null)}
              className="text-2xl theme-text-secondary hover:theme-text"
            >
              ×
            </button>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div>
              <h3 className="text-lg font-semibold theme-text mb-3">Description</h3>
              <p className="theme-text-secondary mb-6">{book.description}</p>

              <h3 className="text-lg font-semibold theme-text mb-3">Contents</h3>
              <div className="flex flex-col gap-2">
                {book.subjects.map(subject => (
                  <div key={subject.id} className="theme-surface-secondary border theme-border rounded-lg p-3">
                    <h4 className="font-medium theme-text">{subject.title}</h4>
                    <p className="text-sm theme-text-secondary">{subject.units.length} units</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div className="theme-surface-secondary border theme-border rounded-lg p-4">
                <h4 className="font-semibold theme-text mb-3">Details</h4>
                <div className="flex flex-col gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="theme-text-secondary">Curriculum:</span>
                    <span className="theme-text">{book.curriculum}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="theme-text-secondary">Difficulty:</span>
                    <span className="theme-text capitalize">{book.metadata.difficulty}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="theme-text-secondary">Estimated Time:</span>
                    <span className="theme-text">{book.metadata.estimatedHours}h</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="theme-text-secondary">Rating:</span>
                    <div className="flex items-center gap-1">
                      <StarIcon className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                      <span className="theme-text">{book.rating.toFixed(1)}</span>
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="theme-text-secondary">Downloads:</span>
                    <span className="theme-text">{book.downloadCount}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <button
                  onClick={() => handleDownload(book)}
                  className="btn-primary w-full flex items-center justify-center gap-2"
                >
                  <DownloadIcon className="w-4 h-4" />
                  <span>Download Book</span>
                </button>
                <button
                  onClick={() => setSelectedBook(null)}
                  className="btn-secondary w-full"
                >
                  Close Preview
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 theme-accent rounded mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="h-64 theme-accent rounded"></div>
            <div className="h-64 theme-accent rounded"></div>
            <div className="h-64 theme-accent rounded"></div>
            <div className="h-64 theme-accent rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold theme-text mb-2">
          Book Bookstore
        </h1>
        <p className="theme-text-secondary">
          Discover and download educational content created by educators worldwide
        </p>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="flex-1 relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 theme-text-secondary">
            <SearchIconSvg />
          </div>
          <input
            type="text"
            placeholder="Search books, authors, topics..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 theme-surface border theme-border rounded-lg theme-text text-base"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="px-4 py-3 border theme-border rounded-lg theme-surface theme-text flex items-center gap-2 hover:theme-accent hover:text-white transition-colors"
        >
          <FilterIcon />
          <span>Filters</span>
        </button>
      </div>

      {/* Results Info */}
      <div className="mb-6">
        <p className="theme-text-secondary">
          Showing {filteredBooks.length} of {books.length} books
        </p>
      </div>

      {/* Main Content */}
      <div className={`grid gap-6 ${showFilters ? 'grid-cols-1 lg:grid-cols-4' : ''}`}>
        {/* Filters Sidebar */}
        {showFilters && (
          <div className="lg:col-span-1">
            <FilterPanel />
          </div>
        )}

        {/* Books Grid */}
        <div className={showFilters ? 'lg:col-span-3' : ''}>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredBooks.map(book => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>

          {filteredBooks.length === 0 && (
            <div className="text-center py-12">
              <p className="text-lg theme-text-secondary mb-4">
                No books found matching your criteria
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setFilters({
                    curriculum: '',
                    difficulty: '',
                    tags: [],
                    rating: 0,
                    sortBy: 'newest'
                  });
                }}
                className="btn-primary"
              >
                Clear Search and Filters
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Book Preview Modal */}
      {selectedBook && <BookPreviewModal book={selectedBook} />}
    </div>
  );
}
function getMockBookstoreBooks(): BookstoreBook[] {
  return [
    {
      id: 'advanced-algorithms-mit',
      title: 'Advanced Algorithms and Data Structures',
      author: 'MIT Faculty',
      authorName: 'Dr. Sarah Johnson',
      version: '2.1.0',
      curriculum: 'Computer Science',
      description: 'Comprehensive coverage of advanced algorithmic techniques including dynamic programming, graph algorithms, and complexity analysis.',
      rating: 4.8,
      downloadCount: 2547,
      subjects: [
        {
          id: 'dynamic-programming',
          title: 'Dynamic Programming',
          description: 'Advanced DP techniques',
          units: [
            {
              id: 'unit-1',
              title: 'Introduction to DP',
              description: 'Basic concepts',
              chapters: []
            }
          ]
        }
      ],
      metadata: {
        created: '2024-01-15T00:00:00Z',
        updated: '2024-03-20T00:00:00Z',
        tags: ['algorithms', 'computer-science', 'advanced', 'programming'],
        difficulty: 'advanced',
        language: 'en',
        estimatedHours: 40
      }
    },
    {
      id: 'intro-calculus-stanford',
      title: 'Introduction to Calculus',
      author: 'Stanford Mathematics',
      authorName: 'Prof. Michael Chen',
      version: '1.5.0',
      curriculum: 'Mathematics',
      description: 'A comprehensive introduction to differential and integral calculus for beginners.',
      rating: 4.6,
      downloadCount: 3821,
      subjects: [
        {
          id: 'limits',
          title: 'Limits and Continuity',
          description: 'Understanding limits',
          units: [
            {
              id: 'unit-1',
              title: 'Introduction to Limits',
              description: 'Basic limit concepts',
              chapters: []
            }
          ]
        }
      ],
      metadata: {
        created: '2024-02-10T00:00:00Z',
        updated: '2024-04-15T00:00:00Z',
        tags: ['calculus', 'mathematics', 'beginner', 'derivatives'],
        difficulty: 'beginner',
        language: 'en',
        estimatedHours: 25
      }
    }
  ];
}
