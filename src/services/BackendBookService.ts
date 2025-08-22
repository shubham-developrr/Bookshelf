/**
 * BACKEND BOOK SERVICE - Phase 2 Support
 * 
 * Handles direct communication with Supabase backend
 * Optimized for progressive loading pattern:
 * - Quick metadata queries
 * - On-demand content loading  
 * - Efficient data retrieval
 */

import { supabase } from './supabaseClient';
import { BookTabManager } from '../utils/BookTabManager';

// Types for progressive loading
export interface BookMetadata {
  id: string;
  name: string;
  image?: string; // Changed from coverImage to match BookManager interface
  coverImage?: string; // Keep both for backward compatibility
  authorName: string;
  creatorName?: string;
  university?: string;
  semester?: string;
  subjectCode?: string;
  lastModified: Date;
  chapterCount: number;
  isPublished: boolean;
  publicLink?: string;
  description?: string;
  fileSize?: number;
  tags?: string[];
  version?: string;
  language?: string;
  difficulty?: string;
  estimatedHours?: number;
  chapters?: any[];
  updatedAt?: Date;
  createdAt?: Date;
}

export interface Chapter {
  id: string;
  title: string;
  content: string;
  order: number;
  wordCount?: number;
}

export interface FullBookData {
  metadata: BookMetadata;
  chapters: Chapter[];
  templateData: {
    flashcards: { [chapterKey: string]: any[] };
    mindmaps: { [chapterKey: string]: any[] };
    mcq: { [chapterKey: string]: any[] };
    qa: { [chapterKey: string]: any[] };
    notes: { [chapterKey: string]: any[] };
    videos: { [chapterKey: string]: any[] };
  };
  customTabs: { [chapterKey: string]: { [tabName: string]: string } };
  highlights: { [chapterKey: string]: any[] };
  assets: AssetReference[];
}

export interface AssetReference {
  id: string;
  url: string;
  type: 'image' | 'pdf' | 'video';
  bookId: string;
  chapterId?: string;
  size?: number;
}

export class BackendBookService {
  private static instance: BackendBookService;

  private constructor() {}

  static getInstance(): BackendBookService {
    if (!BackendBookService.instance) {
      BackendBookService.instance = new BackendBookService();
    }
    return BackendBookService.instance;
  }

  /**
   * PHASE 1: Get user book list with metadata only (fast)
   */
  async getUserBooks(userId?: string): Promise<BookMetadata[]> {
    try {
      // Get authenticated user if not provided
      let user;
      if (userId) {
        user = { id: userId };
      } else {
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
        if (authError || !authUser) {
          console.warn('User not authenticated for book list');
          return [];
        }
        user = authUser;
      }

      console.log(`📋 Fetching book metadata for user: ${user.id}`);

      // Fast metadata-only query
      const { data: books, error } = await supabase
        .from('user_books')
        .select(`
          id,
          book_data,
          updated_at,
          last_synced,
          chapters_data
        `)
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error fetching user books:', error);
        throw error;
      }

      // Transform to BookMetadata format
      const bookMetadata: BookMetadata[] = (books || []).map(book => {
        const bookData = book.book_data || {};
        const chaptersData = book.chapters_data || [];
        
        return {
          id: book.id,
          name: bookData.name || 'Untitled Book',
          coverImage: bookData.coverImage,
          authorName: bookData.creatorName || bookData.authorName || 'Unknown Author',
          creatorName: bookData.creatorName,
          university: bookData.university,
          semester: bookData.semester,
          subjectCode: bookData.subjectCode,
          lastModified: new Date(book.updated_at || book.last_synced),
          chapterCount: chaptersData.length,
          isPublished: bookData.isPublished || false,
          publicLink: bookData.publicLink,
          description: bookData.description,
          fileSize: this.estimateBookSize(bookData, chaptersData),
          tags: bookData.tags || [],
          version: bookData.version,
          language: bookData.language,
          difficulty: bookData.difficulty,
          estimatedHours: bookData.estimatedHours,
          chapters: chaptersData,
          updatedAt: new Date(book.updated_at),
          createdAt: bookData.createdAt ? new Date(bookData.createdAt) : new Date(book.updated_at)
        };
      });

      console.log(`✅ Fetched ${bookMetadata.length} book metadata entries`);
      return bookMetadata;

    } catch (error) {
      console.error('Failed to get user books:', error);
      throw error;
    }
  }

  /**
   * PHASE 2: Get complete book data (on-demand)
   */
  async getBookDetails(bookId: string): Promise<FullBookData> {
    try {
      console.log(`📖 Fetching complete book details: ${bookId}`);

      // Get authenticated user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('User not authenticated for book details');
      }

      // Get complete book data
      const { data: bookRecord, error } = await supabase
        .from('user_books')
        .select('*')
        .eq('id', bookId)
        .eq('user_id', user.id)
        .single();

      if (error || !bookRecord) {
        throw new Error(`Book not found: ${bookId}`);
      }

      // Parse and structure the data
      const bookData = bookRecord.book_data || {};
      const chaptersData = bookRecord.chapters_data || [];
      const contentData = bookRecord.content_data || {};

      // Extract template data by type
      const templateData = {
        flashcards: {},
        mindmaps: {},
        mcq: {},
        qa: {},
        notes: {},
        videos: {}
      };

      // Extract custom tabs
      const customTabs: { [chapterKey: string]: { [tabName: string]: string } } = {};

      // Extract highlights
      const highlights: { [chapterKey: string]: any[] } = {};

      // Parse content data back into organized structure
      Object.entries(contentData).forEach(([key, value]) => {
        if (typeof key === 'string') {
          // Handle template data
          if (key.includes('flashcards_')) {
            this.assignToTemplateData(templateData.flashcards, key, value);
          } else if (key.includes('mindmaps_')) {
            this.assignToTemplateData(templateData.mindmaps, key, value);
          } else if (key.includes('mcq_')) {
            this.assignToTemplateData(templateData.mcq, key, value);
          } else if (key.includes('qa_')) {
            this.assignToTemplateData(templateData.qa, key, value);
          } else if (key.includes('notes_')) {
            this.assignToTemplateData(templateData.notes, key, value);
          } else if (key.includes('videos_')) {
            this.assignToTemplateData(templateData.videos, key, value);
          } 
          // Handle custom tabs
          else if (key.includes('customtab_')) {
            this.assignToCustomTabs(customTabs, key, value);
          }
          // Handle highlights
          else if (key.includes('highlights_')) {
            this.assignToHighlights(highlights, key, value);
          }
        }
      });

      // Get asset references (if implemented)
      const assets = await this.getBookAssets(bookId);

      const fullBookData: FullBookData = {
        metadata: {
          id: bookId,
          name: bookData.name || 'Untitled Book',
          coverImage: bookData.coverImage,
          authorName: bookData.authorName || 'Unknown Author',
          lastModified: new Date(bookRecord.updated_at || bookRecord.last_synced),
          chapterCount: chaptersData.length,
          isPublished: bookData.isPublished || false,
          publicLink: bookData.publicLink,
          description: bookData.description,
          fileSize: this.estimateBookSize(bookData, chaptersData),
          tags: bookData.tags || []
        },
        chapters: chaptersData,
        templateData,
        customTabs,
        highlights,
        assets
      };

      console.log(`✅ Loaded complete book data: ${bookId}`);
      return fullBookData;

    } catch (error) {
      console.error(`Failed to get book details for ${bookId}:`, error);
      throw error;
    }
  }

  /**
   * Get book by public link (for sharing)
   */
  async getPublicBook(publicLink: string): Promise<FullBookData | null> {
    try {
      console.log(`🔗 Fetching public book: ${publicLink}`);

      const { data: bookRecord, error } = await supabase
        .from('user_books')
        .select('*')
        .eq('public_link', publicLink)
        .eq('is_published', true)
        .single();

      if (error || !bookRecord) {
        console.log('Public book not found or not published');
        return null;
      }

      // Use same parsing logic as getBookDetails but without auth check
      return await this.parseBookRecord(bookRecord);

    } catch (error) {
      console.error('Failed to get public book:', error);
      return null;
    }
  }

  /**
   * Search books across the platform (for marketplace)
   */
  async searchBooks(query: string, tags?: string[], limit = 20): Promise<BookMetadata[]> {
    try {
      console.log(`🔍 Searching books: "${query}", tags: ${tags?.join(', ')}`);

      let dbQuery = supabase
        .from('user_books')
        .select(`
          id,
          book_data,
          updated_at,
          last_synced,
          chapters_data,
          user_id
        `)
        .eq('is_published', true);

      // Add text search if query provided
      if (query.trim()) {
        dbQuery = dbQuery.or(`book_data->name.ilike.%${query}%,book_data->description.ilike.%${query}%`);
      }

      // Add tag filtering if provided
      if (tags && tags.length > 0) {
        dbQuery = dbQuery.contains('book_data->tags', tags);
      }

      dbQuery = dbQuery.order('updated_at', { ascending: false }).limit(limit);

      const { data: books, error } = await dbQuery;

      if (error) {
        console.error('Error searching books:', error);
        throw error;
      }

      const searchResults: BookMetadata[] = (books || []).map(book => {
        const bookData = book.book_data || {};
        const chaptersData = book.chapters_data || [];
        
        return {
          id: book.id,
          name: bookData.name || 'Untitled Book',
          coverImage: bookData.coverImage,
          authorName: bookData.authorName || 'Unknown Author',
          lastModified: new Date(book.updated_at || book.last_synced),
          chapterCount: chaptersData.length,
          isPublished: true,
          publicLink: bookData.publicLink,
          description: bookData.description,
          fileSize: this.estimateBookSize(bookData, chaptersData),
          tags: bookData.tags || []
        };
      });

      console.log(`✅ Found ${searchResults.length} books matching search`);
      return searchResults;

    } catch (error) {
      console.error('Failed to search books:', error);
      throw error;
    }
  }

  /**
   * Delete book from backend
   */
  async deleteBook(bookId: string): Promise<boolean> {
    try {
      console.log(`🗑️ Deleting backend book: ${bookId}`);

      // Get authenticated user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('User not authenticated for book deletion');
      }

      // Delete the book record
      const { error } = await supabase
        .from('user_books')
        .delete()
        .eq('id', bookId)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error deleting book from backend:', error);
        return false;
      }

      console.log(`✅ Successfully deleted backend book: ${bookId}`);
      return true;

    } catch (error) {
      console.error(`Failed to delete book ${bookId}:`, error);
      return false;
    }
  }

  /**
   * Check if book exists and user has access
   */
  async hasBookAccess(bookId: string, userId?: string): Promise<boolean> {
    try {
      let user;
      if (userId) {
        user = { id: userId };
      } else {
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
        if (authError || !authUser) return false;
        user = authUser;
      }

      const { data, error } = await supabase
        .from('user_books')
        .select('id')
        .eq('id', bookId)
        .eq('user_id', user.id)
        .single();

      return !error && !!data;

    } catch (error) {
      console.error(`Error checking book access for ${bookId}:`, error);
      return false;
    }
  }

  /**
   * Get book update timestamp (for cache validation)
   */
  async getBookLastModified(bookId: string): Promise<Date | null> {
    try {
      const { data, error } = await supabase
        .from('user_books')
        .select('updated_at, last_synced')
        .eq('id', bookId)
        .single();

      if (error || !data) return null;

      return new Date(data.updated_at || data.last_synced);

    } catch (error) {
      console.error(`Error getting book timestamp for ${bookId}:`, error);
      return null;
    }
  }

  // ==================== HELPER METHODS ====================

  private async parseBookRecord(bookRecord: any): Promise<FullBookData> {
    // This extracts the parsing logic from getBookDetails for reuse
    const bookData = bookRecord.book_data || {};
    const chaptersData = bookRecord.chapters_data || [];
    const contentData = bookRecord.content_data || {};

    const templateData = {
      flashcards: {},
      mindmaps: {},
      mcq: {},
      qa: {},
      notes: {},
      videos: {}
    };

    const customTabs: { [chapterKey: string]: { [tabName: string]: string } } = {};
    const highlights: { [chapterKey: string]: any[] } = {};

    // Parse content data
    Object.entries(contentData).forEach(([key, value]) => {
      if (typeof key === 'string') {
        if (key.includes('flashcards_')) {
          this.assignToTemplateData(templateData.flashcards, key, value);
        } else if (key.includes('mindmaps_')) {
          this.assignToTemplateData(templateData.mindmaps, key, value);
        } else if (key.includes('mcq_')) {
          this.assignToTemplateData(templateData.mcq, key, value);
        } else if (key.includes('qa_')) {
          this.assignToTemplateData(templateData.qa, key, value);
        } else if (key.includes('notes_')) {
          this.assignToTemplateData(templateData.notes, key, value);
        } else if (key.includes('videos_')) {
          this.assignToTemplateData(templateData.videos, key, value);
        } else if (key.includes('customtab_')) {
          this.assignToCustomTabs(customTabs, key, value);
        } else if (key.includes('highlights_')) {
          this.assignToHighlights(highlights, key, value);
        }
      }
    });

    const assets = await this.getBookAssets(bookRecord.id);

    return {
      metadata: {
        id: bookRecord.id,
        name: bookData.name || 'Untitled Book',
        coverImage: bookData.coverImage,
        authorName: bookData.authorName || 'Unknown Author',
        lastModified: new Date(bookRecord.updated_at || bookRecord.last_synced),
        chapterCount: chaptersData.length,
        isPublished: bookData.isPublished || false,
        publicLink: bookData.publicLink,
        description: bookData.description,
        fileSize: this.estimateBookSize(bookData, chaptersData),
        tags: bookData.tags || []
      },
      chapters: chaptersData,
      templateData,
      customTabs,
      highlights,
      assets
    };
  }

  private assignToTemplateData(templateObj: any, key: string, value: any): void {
    // Extract chapter key from storage key pattern
    // e.g. "flashcards_BookName_ChapterName" -> "ChapterName"
    const parts = key.split('_');
    if (parts.length >= 3) {
      const chapterKey = parts.slice(2).join('_'); // Join back in case chapter has underscores
      templateObj[chapterKey] = value;
    }
  }

  private assignToCustomTabs(customTabsObj: any, key: string, value: any): void {
    // Extract chapter and tab name from storage key pattern
    // e.g. "customtab_BookName_ChapterName_TabName" -> ChapterName, TabName
    const parts = key.split('_');
    if (parts.length >= 4) {
      const chapterKey = parts[2]; // Simplified for now
      const tabName = parts.slice(3).join('_');
      
      if (!customTabsObj[chapterKey]) {
        customTabsObj[chapterKey] = {};
      }
      customTabsObj[chapterKey][tabName] = value;
    }
  }

  private assignToHighlights(highlightsObj: any, key: string, value: any): void {
    // Extract chapter key from highlights pattern
    // e.g. "highlights_ChapterName" -> "ChapterName"
    const parts = key.split('_');
    if (parts.length >= 2) {
      const chapterKey = parts.slice(1).join('_');
      highlightsObj[chapterKey] = value;
    }
  }

  private estimateBookSize(bookData: any, chaptersData: any[]): number {
    try {
      // Rough estimation based on JSON serialization
      const bookDataSize = JSON.stringify(bookData).length;
      const chaptersSize = JSON.stringify(chaptersData).length;
      return bookDataSize + chaptersSize;
    } catch {
      return 0;
    }
  }

  private async getBookAssets(bookId: string): Promise<AssetReference[]> {
    try {
      // This would query a separate assets table if implemented
      // For now, return empty array
      return [];
    } catch (error) {
      console.error(`Error getting assets for book ${bookId}:`, error);
      return [];
    }
  }

  // ==================== CACHING HELPERS ====================

  /**
   * Get cache key for book metadata list
   */
  static getBookListCacheKey(userId: string): string {
    return `cached_book_list_${userId}`;
  }

  /**
   * Get cache key for book content
   */
  static getBookContentCacheKey(bookId: string): string {
    return `cached_book_content_${bookId}`;
  }

  /**
   * Check if cached data is still valid
   */
  static isCacheValid(cacheKey: string, maxAgeMinutes = 30): boolean {
    try {
      const timestampKey = `${cacheKey}_timestamp`;
      const timestamp = localStorage.getItem(timestampKey);
      
      if (!timestamp) return false;
      
      const cacheAge = Date.now() - parseInt(timestamp);
      const maxAge = maxAgeMinutes * 60 * 1000; // Convert to milliseconds
      
      return cacheAge < maxAge;
    } catch {
      return false;
    }
  }

  /**
   * Set cache timestamp
   */
  static setCacheTimestamp(cacheKey: string): void {
    const timestampKey = `${cacheKey}_timestamp`;
    localStorage.setItem(timestampKey, Date.now().toString());
  }
}

export default BackendBookService;
