import { supabase } from './supabaseClient';
import BookManager, { BookMetadata } from '../utils/BookManager';

/**
 * Enhanced Marketplace Service with Backend Integration
 */

export interface MarketplaceBook {
  id: string;
  book_id: string; // Global UUID
  title: string;
  description: string;
  author_name: string;
  author_id: string;
  university?: string;
  semester?: string;
  subject_code?: string;
  version: string;
  is_published: boolean;
  is_featured: boolean;
  category: string;
  tags: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  language: string;
  estimated_hours: number;
  download_count: number;
  rating: number;
  rating_count: number;
  file_size?: number;
  file_url?: string;
  preview_url?: string;
  checksum?: string;
  metadata?: any;
  published_at: string;
  created_at: string;
  updated_at: string;
}

export interface BookVersion {
  id: string;
  book_id: string;
  version: string;
  release_notes: string;
  file_url: string;
  file_size?: number;
  checksum?: string;
  is_current: boolean;
  released_at: string;
  created_at: string;
}

export interface UserDownload {
  id: string;
  user_id: string;
  book_id: string;
  marketplace_book_id: string;
  downloaded_version: string;
  current_version: string;
  download_date: string;
  last_update_check: string;
  update_available: boolean;
  is_installed: boolean;
  installation_path?: string;
}

export interface BookReview {
  id: string;
  book_id: string;
  user_id: string;
  rating: number;
  review_text?: string;
  is_verified_download: boolean;
  helpful_count: number;
  created_at: string;
  updated_at: string;
}

export interface PublishBookOptions {
  book_id: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimated_hours: number;
  file_data: any; // Book content data
  release_notes: string;
  preview_data?: any;
}

export interface BookUpdateInfo {
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion: string;
  releaseNotes?: string;
  updateSize?: number;
  isBreakingChange: boolean;
}

export class EnhancedMarketplaceService {
  
  // ==================== BOOK PUBLISHING ====================
  
  /**
   * Publish a book to the marketplace
   */
  static async publishBook(options: PublishBookOptions): Promise<{
    success: boolean;
    marketplaceId?: string;
    error?: string;
  }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      // Get book metadata
      const bookMetadata = BookManager.getBookById(options.book_id);
      if (!bookMetadata) {
        return { success: false, error: 'Book not found' };
      }

      // Prepare book data for publishing
      const marketplaceBookData = {
        book_id: bookMetadata.id,
        title: options.title,
        description: options.description,
        author_name: bookMetadata.creatorName,
        author_id: user.id,
        university: bookMetadata.university,
        semester: bookMetadata.semester,
        subject_code: bookMetadata.subjectCode,
        version: bookMetadata.version,
        category: options.category,
        tags: options.tags,
        difficulty: options.difficulty,
        estimated_hours: options.estimated_hours,
        metadata: {
          chapters: options.file_data.chapters?.length || 0,
          content_size: JSON.stringify(options.file_data).length,
          created_with: 'bookshelf-creator'
        }
      };

      // Insert into marketplace_books table
      const { data: marketplaceBook, error: publishError } = await supabase
        .from('marketplace_books')
        .insert(marketplaceBookData)
        .select()
        .single();

      if (publishError) {
        console.error('Failed to publish book:', publishError);
        return { success: false, error: publishError.message };
      }

      // Create initial version record
      const versionData = {
        book_id: bookMetadata.id,
        version: bookMetadata.version,
        release_notes: options.release_notes,
        file_url: `marketplace/${marketplaceBook.id}/${bookMetadata.version}`,
        is_current: true
      };

      const { error: versionError } = await supabase
        .from('book_versions')
        .insert(versionData);

      if (versionError) {
        console.error('Failed to create version record:', versionError);
      }

      // Update local book metadata
      BookManager.updateBook(options.book_id, {
        isPublished: true,
        marketplaceId: marketplaceBook.id,
        lastSyncAt: new Date().toISOString()
      });

      return { 
        success: true, 
        marketplaceId: marketplaceBook.id 
      };

    } catch (error) {
      console.error('Error publishing book:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Update an existing marketplace book
   */
  static async updateMarketplaceBook(
    marketplaceId: string, 
    updates: Partial<MarketplaceBook>,
    newVersion?: {
      version: string;
      releaseNotes: string;
      fileData: any;
    }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      // Update marketplace book record
      const { error: updateError } = await supabase
        .from('marketplace_books')
        .update(updates)
        .eq('id', marketplaceId)
        .eq('author_id', user.id); // Ensure user owns the book

      if (updateError) {
        return { success: false, error: updateError.message };
      }

      // If new version provided, create version record
      if (newVersion) {
        // Mark previous versions as not current
        await supabase
          .from('book_versions')
          .update({ is_current: false })
          .eq('book_id', updates.book_id);

        // Insert new version
        const { error: versionError } = await supabase
          .from('book_versions')
          .insert({
            book_id: updates.book_id,
            version: newVersion.version,
            release_notes: newVersion.releaseNotes,
            file_url: `marketplace/${marketplaceId}/${newVersion.version}`,
            is_current: true
          });

        if (versionError) {
          console.error('Failed to create new version:', versionError);
        }

        // Mark updates available for users who downloaded this book
        await this.markUpdatesAvailable(updates.book_id!, newVersion.version);
      }

      return { success: true };

    } catch (error) {
      console.error('Error updating marketplace book:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  // ==================== MARKETPLACE BROWSING ====================

  /**
   * Browse marketplace books with filters
   */
  static async browseMarketplace(options: {
    category?: string;
    difficulty?: string;
    tags?: string[];
    search?: string;
    sortBy?: 'popularity' | 'rating' | 'newest' | 'title';
    limit?: number;
    offset?: number;
  } = {}): Promise<{
    books: MarketplaceBook[];
    total: number;
    error?: string;
  }> {
    try {
      let query = supabase
        .from('marketplace_books')
        .select('*', { count: 'exact' })
        .eq('is_published', true);

      // Apply filters
      if (options.category) {
        query = query.eq('category', options.category);
      }

      if (options.difficulty) {
        query = query.eq('difficulty', options.difficulty);
      }

      if (options.tags && options.tags.length > 0) {
        query = query.overlaps('tags', options.tags);
      }

      if (options.search) {
        query = query.or(`title.ilike.%${options.search}%,description.ilike.%${options.search}%,author_name.ilike.%${options.search}%`);
      }

      // Apply sorting
      switch (options.sortBy) {
        case 'popularity':
          query = query.order('download_count', { ascending: false });
          break;
        case 'rating':
          query = query.order('rating', { ascending: false });
          break;
        case 'newest':
          query = query.order('published_at', { ascending: false });
          break;
        case 'title':
          query = query.order('title', { ascending: true });
          break;
        default:
          query = query.order('published_at', { ascending: false });
      }

      // Apply pagination
      if (options.offset) {
        query = query.range(options.offset, (options.offset + (options.limit || 20)) - 1);
      } else if (options.limit) {
        query = query.limit(options.limit);
      }

      const { data: books, count, error } = await query;

      if (error) {
        return { books: [], total: 0, error: error.message };
      }

      return { 
        books: books || [], 
        total: count || 0 
      };

    } catch (error) {
      console.error('Error browsing marketplace:', error);
      return { 
        books: [], 
        total: 0, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Get detailed book information
   */
  static async getBookDetails(bookId: string): Promise<{
    book: MarketplaceBook | null;
    versions: BookVersion[];
    reviews: BookReview[];
    error?: string;
  }> {
    try {
      // Get book details
      const { data: book, error: bookError } = await supabase
        .from('marketplace_books')
        .select('*')
        .eq('book_id', bookId)
        .eq('is_published', true)
        .single();

      if (bookError) {
        return { book: null, versions: [], reviews: [], error: bookError.message };
      }

      // Get versions
      const { data: versions } = await supabase
        .from('book_versions')
        .select('*')
        .eq('book_id', bookId)
        .order('released_at', { ascending: false });

      // Get reviews
      const { data: reviews } = await supabase
        .from('book_reviews')
        .select('*')
        .eq('book_id', bookId)
        .order('created_at', { ascending: false });

      return {
        book,
        versions: versions || [],
        reviews: reviews || []
      };

    } catch (error) {
      console.error('Error getting book details:', error);
      return { 
        book: null, 
        versions: [], 
        reviews: [], 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  // ==================== BOOK DOWNLOADS ====================

  /**
   * Download a book from marketplace
   */
  static async downloadBook(bookId: string): Promise<{
    success: boolean;
    downloadData?: any;
    error?: string;
  }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      // Get book details
      const { book, error: bookError } = await this.getBookDetails(bookId);
      if (bookError || !book) {
        return { success: false, error: bookError || 'Book not found' };
      }

      // Check if user already downloaded this book
      const { data: existingDownload } = await supabase
        .from('user_downloads')
        .select('*')
        .eq('user_id', user.id)
        .eq('book_id', bookId)
        .single();

      // Record the download
      const downloadData = {
        user_id: user.id,
        book_id: bookId,
        marketplace_book_id: book.id,
        downloaded_version: book.version,
        current_version: book.version,
        installation_path: `downloaded_books/${bookId}`
      };

      if (existingDownload) {
        // Update existing download
        await supabase
          .from('user_downloads')
          .update(downloadData)
          .eq('id', existingDownload.id);
      } else {
        // Create new download record
        await supabase
          .from('user_downloads')
          .insert(downloadData);
      }

      // TODO: Implement actual file download logic
      // For now, return the book data structure
      const downloadPayload = {
        metadata: book,
        // chapters: await this.getBookChapters(bookId),
        // content: await this.getBookContent(bookId)
      };

      return { 
        success: true, 
        downloadData: downloadPayload 
      };

    } catch (error) {
      console.error('Error downloading book:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  // ==================== UPDATE MANAGEMENT ====================

  /**
   * Check for updates for user's downloaded books
   */
  static async checkForUpdates(userId: string): Promise<BookUpdateInfo[]> {
    try {
      const { data: downloads } = await supabase
        .from('user_downloads')
        .select(`
          *,
          marketplace_books:marketplace_book_id (
            version,
            title
          )
        `)
        .eq('user_id', userId)
        .eq('is_installed', true);

      if (!downloads) return [];

      const updates: BookUpdateInfo[] = [];

      for (const download of downloads) {
        const currentVersion = download.downloaded_version;
        const latestVersion = download.marketplace_books.version;
        
        if (BookManager.compareVersions(latestVersion, currentVersion) > 0) {
          const [currentMajor] = currentVersion.split('.').map(Number);
          const [latestMajor] = latestVersion.split('.').map(Number);
          
          updates.push({
            hasUpdate: true,
            currentVersion,
            latestVersion,
            isBreakingChange: latestMajor > currentMajor
          });
        }
      }

      return updates;

    } catch (error) {
      console.error('Error checking for updates:', error);
      return [];
    }
  }

  /**
   * Mark updates as available for a book
   */
  private static async markUpdatesAvailable(bookId: string, newVersion: string): Promise<void> {
    try {
      await supabase
        .from('user_downloads')
        .update({ 
          current_version: newVersion,
          update_available: true,
          last_update_check: new Date().toISOString()
        })
        .eq('book_id', bookId)
        .neq('downloaded_version', newVersion);

    } catch (error) {
      console.error('Error marking updates available:', error);
    }
  }

  // ==================== REVIEWS AND RATINGS ====================

  /**
   * Submit a book review
   */
  static async submitReview(
    bookId: string, 
    rating: number, 
    reviewText?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      // Check if user downloaded the book
      const { data: download } = await supabase
        .from('user_downloads')
        .select('id')
        .eq('user_id', user.id)
        .eq('book_id', bookId)
        .single();

      const reviewData = {
        book_id: bookId,
        user_id: user.id,
        rating,
        review_text: reviewText,
        is_verified_download: !!download
      };

      const { error } = await supabase
        .from('book_reviews')
        .upsert(reviewData, { 
          onConflict: 'book_id,user_id' 
        });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };

    } catch (error) {
      console.error('Error submitting review:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  // ==================== ANALYTICS ====================

  /**
   * Track marketplace events
   */
  static async trackEvent(
    eventType: 'view' | 'download' | 'review' | 'rating',
    bookId: string,
    metadata?: any
  ): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      await supabase
        .from('marketplace_analytics')
        .insert({
          book_id: bookId,
          event_type: eventType,
          user_id: user?.id || null,
          metadata
        });

    } catch (error) {
      console.error('Error tracking event:', error);
    }
  }

  // ==================== MY LIBRARY MANAGEMENT ====================

  /**
   * Get user's published books
   */
  static async getUserPublishedBooks(): Promise<{
    success: boolean;
    books?: any[];
    error?: string;
  }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      const { data: books, error } = await supabase
        .from('marketplace_books')
        .select('*')
        .eq('author_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return { success: true, books: books || [] };
    } catch (error) {
      console.error('Error getting user published books:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Update book visibility
   */
  static async updateBookVisibility(bookId: string, isPublished: boolean): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      const { error } = await supabase
        .from('marketplace_books')
        .update({ is_published: isPublished })
        .eq('id', bookId)
        .eq('author_id', user.id);

      if (error) {
        throw error;
      }

      return { success: true };
    } catch (error) {
      console.error('Error updating book visibility:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Delete published book from marketplace
   */
  static async deletePublishedBook(bookId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      // Delete from marketplace_books
      const { error: deleteError } = await supabase
        .from('marketplace_books')
        .delete()
        .eq('id', bookId)
        .eq('author_id', user.id);

      if (deleteError) {
        throw deleteError;
      }

      // Also clean up related data (downloads, analytics)
      await supabase
        .from('user_downloads')
        .delete()
        .eq('marketplace_book_id', bookId);

      await supabase
        .from('marketplace_analytics')
        .delete()
        .eq('book_id', bookId);

      return { success: true };
    } catch (error) {
      console.error('Error deleting published book:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
}

export default EnhancedMarketplaceService;
