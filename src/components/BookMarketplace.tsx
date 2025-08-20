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
    fetchMarketplaceBooks();
  }, []);

  useEffect(() => {
    applyFiltersAndSearch();
  }, [books, searchQuery, filters]);

  const fetchMarketplaceBooks = async () => {
    try {
      // This would be an API call to your backend
      const response = await fetch('/api/marketplace');
      const marketplaceBooks = await response.json();
      setBooks(marketplaceBooks);
    } catch (error) {
      console.error('Failed to fetch marketplace books:', error);
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
      await fetch(`/api/marketplace/${book.id}/download`, { method: 'POST' });
      
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
    <div style={{
      backgroundColor: 'var(--color-modal-bg)',
      border: '1px solid var(--color-border)',
      borderRadius: '0.5rem',
      padding: '1.5rem',
      transition: 'box-shadow 0.3s ease',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.boxShadow = '0 10px 25px rgba(0, 0, 0, 0.15)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '1rem'
      }}>
        <div style={{ flex: '1' }}>
          <h3 style={{
            fontSize: '1.25rem',
            fontWeight: 'bold',
            color: 'var(--color-text)',
            marginBottom: '0.5rem'
          }}>{book.title}</h3>
          <p style={{
            color: 'var(--color-text-secondary)',
            fontSize: '0.875rem',
            marginBottom: '0.5rem'
          }}>by {book.authorName}</p>
          <p style={{
            color: 'var(--color-text-secondary)',
            fontSize: '0.875rem',
            display: '-webkit-box',
            WebkitLineClamp: '2',
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden'
          }}>{book.description}</p>
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          marginLeft: '1rem'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem'
          }}>
            <div style={{ 
              width: '1rem',
              height: '1rem',
              color: '#fbbf24'
            }}>
              <StarIcon className="w-4 h-4 fill-yellow-400 text-yellow-400" />
            </div>
            <span style={{
              fontSize: '0.875rem',
              fontWeight: '500'
            }}>{book.rating.toFixed(1)}</span>
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem'
          }}>
            <div style={{ 
              width: '1rem',
              height: '1rem',
              color: 'var(--color-text-secondary)'
            }}>
              <DownloadIcon className="w-4 h-4" />
            </div>
            <span style={{
              fontSize: '0.875rem',
              color: 'var(--color-text-secondary)'
            }}>{book.downloadCount}</span>
          </div>
        </div>
      </div>

      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '0.5rem',
        marginBottom: '1rem'
      }}>
        <span style={{
          padding: '0.25rem 0.5rem',
          backgroundColor: 'var(--color-accent)',
          color: 'var(--color-accent-text)',
          borderRadius: '9999px',
          fontSize: '0.75rem',
          fontWeight: '500'
        }}>
          {book.curriculum}
        </span>
        <span style={{
          padding: '0.25rem 0.5rem',
          borderRadius: '9999px',
          fontSize: '0.75rem',
          fontWeight: '500',
          backgroundColor: book.metadata.difficulty === 'beginner' ? '#dcfce7' :
                           book.metadata.difficulty === 'intermediate' ? '#fef3c7' : '#fee2e2',
          color: book.metadata.difficulty === 'beginner' ? '#166534' :
                 book.metadata.difficulty === 'intermediate' ? '#92400e' : '#991b1b'
        }}>
          {book.metadata.difficulty}
        </span>
        {book.metadata.tags.slice(0, 3).map(tag => (
          <span key={tag} style={{
            padding: '0.25rem 0.5rem',
            backgroundColor: 'var(--color-surface)',
            color: 'var(--color-text-secondary)',
            borderRadius: '9999px',
            fontSize: '0.75rem'
          }}>
            {tag}
          </span>
        ))}
      </div>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '0.875rem',
        color: 'var(--color-text-secondary)',
        marginBottom: '1rem'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem'
          }}>
            <div style={{ 
              width: '1rem',
              height: '1rem'
            }}>
              <CalendarIcon className="w-4 h-4" />
            </div>
            <span>{new Date(book.metadata.created).toLocaleDateString()}</span>
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem'
          }}>
            <div style={{ 
              width: '1rem',
              height: '1rem'
            }}>
              <EyeIcon className="w-4 h-4" />
            </div>
            <span>{book.metadata.estimatedHours}h</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <button
          onClick={() => setSelectedBook(book)}
          className="btn-secondary"
          style={{ flex: '1' }}
        >
          Preview
        </button>
        <button
          onClick={() => handleDownload(book)}
          className="btn-primary"
          style={{
            flex: '1',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem'
          }}
        >
          <div style={{ 
            width: '1rem',
            height: '1rem'
          }}>
            <DownloadIcon className="w-4 h-4" />
          </div>
          <span>Download</span>
        </button>
      </div>
    </div>
  );

  const FilterPanel = () => (
    <div style={{
      backgroundColor: 'var(--color-modal-bg)',
      border: '1px solid var(--color-border)',
      borderRadius: '0.5rem',
      padding: '1.5rem'
    }}>
      <h3 style={{ 
        fontSize: '1.125rem',
        fontWeight: '600',
        color: 'var(--color-text)',
        marginBottom: '1rem'
      }}>Filters</h3>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Curriculum Filter */}
        <div>
          <label style={{ 
            display: 'block',
            fontSize: '0.875rem',
            fontWeight: '500',
            color: 'var(--color-text)',
            marginBottom: '0.5rem'
          }}>Curriculum</label>
          <select
            value={filters.curriculum}
            onChange={(e) => setFilters({ ...filters, curriculum: e.target.value })}
            style={{
              width: '100%',
              padding: '0.5rem',
              backgroundColor: 'var(--color-modal-bg)',
              color: 'var(--color-text)',
              border: '1px solid var(--color-border)',
              borderRadius: '0.5rem',
              outline: 'none'
            }}
          >
            <option value="">All Curriculums</option>
            {curriculums.map(curriculum => (
              <option key={curriculum} value={curriculum}>{curriculum}</option>
            ))}
          </select>
        </div>

        {/* Difficulty Filter */}
        <div>
          <label style={{ 
            display: 'block',
            fontSize: '0.875rem',
            fontWeight: '500',
            color: 'var(--color-text)',
            marginBottom: '0.5rem'
          }}>Difficulty</label>
          <select
            value={filters.difficulty}
            onChange={(e) => setFilters({ ...filters, difficulty: e.target.value as any })}
            style={{
              width: '100%',
              padding: '0.5rem',
              backgroundColor: 'var(--color-modal-bg)',
              color: 'var(--color-text)',
              border: '1px solid var(--color-border)',
              borderRadius: '0.5rem',
              outline: 'none'
            }}
          >
            <option value="">All Levels</option>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </div>

        {/* Rating Filter */}
        <div>
          <label style={{ 
            display: 'block',
            fontSize: '0.875rem',
            fontWeight: '500',
            color: 'var(--color-text)',
            marginBottom: '0.5rem'
          }}>Minimum Rating</label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {[1, 2, 3, 4, 5].map(rating => (
              <button
                key={rating}
                onClick={() => setFilters({ ...filters, rating: filters.rating === rating ? 0 : rating })}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  padding: '0.25rem 0.5rem',
                  borderRadius: '0.25rem',
                  backgroundColor: filters.rating >= rating 
                    ? 'var(--color-accent)' 
                    : 'transparent',
                  color: filters.rating >= rating 
                    ? 'var(--color-accent-text)' 
                    : 'var(--color-text)',
                  border: filters.rating >= rating 
                    ? 'none' 
                    : '1px solid var(--color-border)',
                  cursor: 'pointer',
                  outline: 'none'
                }}
                onMouseEnter={(e) => {
                  if (filters.rating < rating) {
                    e.currentTarget.style.backgroundColor = 'var(--color-accent)';
                    e.currentTarget.style.color = 'var(--color-accent-text)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (filters.rating < rating) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = 'var(--color-text)';
                  }
                }}
              >
                <div style={{ 
                  width: '1rem',
                  height: '1rem',
                  color: 'currentColor'
                }}>
                  <StarIcon className="w-4 h-4 fill-current" />
                </div>
                <span>{rating}+</span>
              </button>
            ))}
          </div>
        </div>

        {/* Sort Options */}
        <div>
          <label style={{ 
            display: 'block',
            fontSize: '0.875rem',
            fontWeight: '500',
            color: 'var(--color-text)',
            marginBottom: '0.5rem'
          }}>Sort By</label>
          <select
            value={filters.sortBy}
            onChange={(e) => setFilters({ ...filters, sortBy: e.target.value as any })}
            style={{
              width: '100%',
              padding: '0.5rem',
              backgroundColor: 'var(--color-modal-bg)',
              color: 'var(--color-text)',
              border: '1px solid var(--color-border)',
              borderRadius: '0.5rem',
              outline: 'none'
            }}
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
          className="btn-secondary"
          style={{ width: '100%' }}
        >
          Clear Filters
        </button>
      </div>
    </div>
  );

  const BookPreviewModal = ({ book }: { book: BookstoreBook }) => (
    <div style={{
      position: 'fixed',
      top: '0',
      left: '0',
      right: '0',
      bottom: '0',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: '50',
      padding: '1rem'
    }}>
      <div style={{
        backgroundColor: 'var(--color-modal-bg)',
        borderRadius: '0.5rem',
        maxWidth: '56rem',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto'
      }}>
        <div style={{ padding: '1.5rem' }}>
          <div style={{ 
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: '1.5rem'
          }}>
            <div>
              <h2 style={{
                fontSize: '1.5rem',
                fontWeight: 'bold',
                color: 'var(--color-text)',
                marginBottom: '0.5rem'
              }}>{book.title}</h2>
              <p style={{ color: 'var(--color-text-secondary)' }}>by {book.authorName}</p>
            </div>
            <button
              onClick={() => setSelectedBook(null)}
              style={{
                color: 'var(--color-text-secondary)',
                fontSize: '1.25rem',
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
                outline: 'none'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--color-text)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--color-text-secondary)';
              }}
            >
              ×
            </button>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr',
            gap: '1.5rem',
            marginBottom: '1.5rem'
          }}>
            <div style={{ 
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '1.5rem'
            }}>
              <div style={{ minWidth: '0' }}>
                <h3 style={{
                  fontSize: '1.125rem',
                  fontWeight: '600',
                  color: 'var(--color-text)',
                  marginBottom: '0.75rem'
                }}>Description</h3>
                <p style={{ 
                  color: 'var(--color-text-secondary)',
                  marginBottom: '1.5rem'
                }}>{book.description}</p>

                <h3 style={{
                  fontSize: '1.125rem',
                  fontWeight: '600',
                  color: 'var(--color-text)',
                  marginBottom: '0.75rem'
                }}>Contents</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {book.subjects.map(subject => (
                    <div key={subject.id} style={{
                      border: '1px solid var(--color-border)',
                      borderRadius: '0.5rem',
                      padding: '0.75rem'
                    }}>
                      <h4 style={{
                        fontWeight: '500',
                        color: 'var(--color-text)'
                      }}>{subject.title}</h4>
                      <p style={{
                        fontSize: '0.875rem',
                        color: 'var(--color-text-secondary)'
                      }}>{subject.units.length} units</p>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{
                  border: '1px solid var(--color-border)',
                  borderRadius: '0.5rem',
                  padding: '1rem'
                }}>
                  <h4 style={{
                    fontWeight: '600',
                    color: 'var(--color-text)',
                    marginBottom: '0.75rem'
                  }}>Details</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--color-text-secondary)' }}>Curriculum:</span>
                      <span style={{ color: 'var(--color-text)' }}>{book.curriculum}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--color-text-secondary)' }}>Difficulty:</span>
                      <span style={{ color: 'var(--color-text)', textTransform: 'capitalize' }}>{book.metadata.difficulty}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--color-text-secondary)' }}>Estimated Time:</span>
                      <span style={{ color: 'var(--color-text)' }}>{book.metadata.estimatedHours}h</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--color-text-secondary)' }}>Rating:</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <div style={{ 
                          width: '1rem',
                          height: '1rem',
                          color: '#fbbf24'
                        }}>
                          <StarIcon className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        </div>
                        <span style={{ color: 'var(--color-text)' }}>{book.rating.toFixed(1)}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--color-text-secondary)' }}>Downloads:</span>
                      <span style={{ color: 'var(--color-text)' }}>{book.downloadCount}</span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <button
                    onClick={() => handleDownload(book)}
                    className="btn-primary"
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem'
                    }}
                  >
                    <div style={{ 
                      width: '1rem',
                      height: '1rem'
                    }}>
                      <DownloadIcon className="w-4 h-4" />
                    </div>
                    <span>Download Book</span>
                  </button>
                  <button
                    onClick={() => setSelectedBook(null)}
                    className="btn-secondary"
                    style={{ width: '100%' }}
                  >
                    Close Preview
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '1.5rem' }}>
        <div style={{ animation: 'pulse 2s infinite' }}>
          <div style={{ 
            height: '2rem',
            backgroundColor: 'var(--color-accent)',
            borderRadius: '0.25rem',
            marginBottom: '1.5rem'
          }}></div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '1.5rem'
          }}>
            <div style={{ 
              height: '16rem',
              backgroundColor: 'var(--color-accent)',
              borderRadius: '0.25rem'
            }}></div>
            <div style={{ 
              height: '16rem',
              backgroundColor: 'var(--color-accent)',
              borderRadius: '0.25rem'
            }}></div>
            <div style={{ 
              height: '16rem',
              backgroundColor: 'var(--color-accent)',
              borderRadius: '0.25rem'
            }}></div>
            <div style={{ 
              height: '16rem',
              backgroundColor: 'var(--color-accent)',
              borderRadius: '0.25rem'
            }}></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '1.5rem' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ 
          fontSize: '1.875rem', 
          fontWeight: 'bold', 
          color: 'var(--color-text)', 
          marginBottom: '1rem' 
        }}>
          Book Marketplace
        </h1>
        <p style={{ color: 'var(--color-text-secondary)' }}>
          Discover and download educational content created by educators worldwide
        </p>
      </div>

      {/* Search and Filters */}
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '1rem', 
        marginBottom: '2rem' 
      }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <div style={{
            position: 'absolute',
            left: '0.75rem',
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--color-text-secondary)',
            width: '1.25rem',
            height: '1.25rem',
            pointerEvents: 'none'
          }}>
            <SearchIconSvg />
          </div>
          <input
            type="text"
            placeholder="Search books, authors, topics..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              paddingLeft: '2.5rem',
              paddingRight: '1rem',
              paddingTop: '0.75rem',
              paddingBottom: '0.75rem',
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: '0.5rem',
              color: 'var(--color-text)',
              fontSize: '1rem'
            }}
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          style={{
            padding: '0.75rem 1.5rem',
            border: '1px solid var(--color-border)',
            borderRadius: '0.5rem',
            backgroundColor: 'var(--color-surface)',
            color: 'var(--color-text)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--color-accent)';
            e.currentTarget.style.color = 'white';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--color-surface)';
            e.currentTarget.style.color = 'var(--color-text)';
          }}
        >
          <div style={{ width: '1.25rem', height: '1.25rem' }}>
            <FilterIcon />
          </div>
          <span>Filters</span>
        </button>
      </div>

      {/* Results Info */}
      <div style={{ marginBottom: '1.5rem' }}>
        <p style={{ color: 'var(--color-text-secondary)' }}>
          Showing {filteredBooks.length} of {books.length} books
        </p>
      </div>

      {/* Main Content */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: showFilters ? '1fr 3fr' : '1fr',
        gap: '1.5rem' 
      }}>
        {/* Filters Sidebar */}
        {showFilters && (
          <div>
            <FilterPanel />
          </div>
        )}

        {/* Books Grid */}
        <div>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
            gap: '1.5rem' 
          }}>
            {filteredBooks.map(book => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>

          {filteredBooks.length === 0 && (
            <div style={{ textAlign: 'center', padding: '3rem 0' }}>
              <p style={{ 
                color: 'var(--color-text-secondary)', 
                fontSize: '1.125rem', 
                marginBottom: '1rem' 
              }}>
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

// Mock data for development
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
