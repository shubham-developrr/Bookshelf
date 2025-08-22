import { supabase } from './supabaseClient';
import { BookMetadata } from '../utils/BookManager';

/**
 * Supabase Book Storage Service
 * Handles backend persistence of user-created books and content
 */

export interface StoredBook {
  id: string;
  user_id: string;
  book_data: BookMetadata;
  chapters_data: any[];
  content_data: Record<string, any>; // All template data
  created_at: string;
  updated_at: string;
  last_synced: string;
}

export interface ChapterContent {
  chapterId: string;
  subtopics: any[];
  templates: Record<string, any>; // FLASHCARD, MCQ, etc.
  customTabs: Record<string, any>;
}

export class SupabaseBookService {
  
  // ==================== BOOK PERSISTENCE ====================

  /**
   * Save complete book data to backend
   */
  static async saveBook(bookMetadata: BookMetadata): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      console.log(`📚 Syncing book to backend: ${bookMetadata.name}`);

      // Gather all book-related data from localStorage
      const bookData = await this.gatherCompleteBookData(bookMetadata);

      // Save to user_books table
      const { data, error } = await supabase
        .from('user_books')
        .upsert({
          id: bookMetadata.id,
          user_id: user.id,
          book_data: bookMetadata,
          chapters_data: bookData.chapters,
          content_data: bookData.content,
          last_synced: new Date().toISOString()
        }, {
          onConflict: 'id,user_id'
        })
        .select()
        .single();

      if (error) {
        console.error('Failed to save book to backend:', error);
        return { success: false, error: error.message };
      }

      console.log(`✅ Book synced successfully: ${bookMetadata.name}`);
      return { success: true };

    } catch (error) {
      console.error('Book sync error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Load book from backend and restore to localStorage
   */
  static async loadBook(bookId: string): Promise<{ success: boolean; book?: BookMetadata; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      console.log(`📥 Loading book from backend: ${bookId}`);

      const { data, error } = await supabase
        .from('user_books')
        .select('*')
        .eq('id', bookId)
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Failed to load book from backend:', error);
        return { success: false, error: error.message };
      }

      if (!data) {
        return { success: false, error: 'Book not found' };
      }

      // Restore book data to localStorage
      await this.restoreBookDataToLocalStorage(data);

      console.log(`✅ Book loaded successfully: ${data.book_data.name}`);
      return { success: true, book: data.book_data };

    } catch (error) {
      console.error('Book load error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Get all user books from backend
   */
  static async getUserBooks(): Promise<{ success: boolean; books?: BookMetadata[]; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      const { data, error } = await supabase
        .from('user_books')
        .select('book_data')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Failed to get user books:', error);
        return { success: false, error: error.message };
      }

      const books = data.map(row => row.book_data);
      return { success: true, books };

    } catch (error) {
      console.error('Get user books error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Delete book from backend
   */
  static async deleteBook(bookId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      const { error } = await supabase
        .from('user_books')
        .delete()
        .eq('id', bookId)
        .eq('user_id', user.id);

      if (error) {
        console.error('Failed to delete book from backend:', error);
        return { success: false, error: error.message };
      }

      return { success: true };

    } catch (error) {
      console.error('Book delete error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  // ==================== AUTO-SYNC SYSTEM ====================

  /**
   * Enable auto-sync for a book (saves automatically on changes)
   */
  static enableAutoSync(bookId: string): void {
    // Set up periodic sync every 30 seconds
    const intervalId = setInterval(async () => {
      const bookMetadata = this.getBookFromLocalStorage(bookId);
      if (bookMetadata) {
        await this.saveBook(bookMetadata);
      }
    }, 30000);

    // Store interval ID for cleanup
    localStorage.setItem(`autoSync_${bookId}`, intervalId.toString());
  }

  /**
   * Disable auto-sync for a book
   */
  static disableAutoSync(bookId: string): void {
    const intervalId = localStorage.getItem(`autoSync_${bookId}`);
    if (intervalId) {
      clearInterval(parseInt(intervalId));
      localStorage.removeItem(`autoSync_${bookId}`);
    }
  }

  /**
   * Sync all books to backend
   */
  static async syncAllBooks(): Promise<{ success: boolean; synced: number; errors: string[] }> {
    const books = this.getAllBooksFromLocalStorage();
    const errors: string[] = [];
    let synced = 0;

    for (const book of books) {
      const result = await this.saveBook(book);
      if (result.success) {
        synced++;
      } else {
        errors.push(`${book.name}: ${result.error}`);
      }
    }

    return { success: errors.length === 0, synced, errors };
  }

  // ==================== DATA GATHERING HELPERS ====================

  /**
   * Gather complete book data from localStorage
   */
  private static async gatherCompleteBookData(bookMetadata: BookMetadata): Promise<{
    chapters: any[];
    content: Record<string, any>;
  }> {
    const content: Record<string, any> = {};
    
    // Get chapters
    const chaptersKey = `chapters_${bookMetadata.id}`;
    const chapters = JSON.parse(localStorage.getItem(chaptersKey) || '[]');

    // Scan all localStorage for book-related content
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && this.isBookRelatedKey(key, bookMetadata.id, bookMetadata.name)) {
        try {
          const value = localStorage.getItem(key);
          if (value) {
            content[key] = JSON.parse(value);
          }
        } catch (error) {
          // If not JSON, store as string
          content[key] = localStorage.getItem(key);
        }
      }
    }

    return { chapters, content };
  }

  /**
   * Check if localStorage key is related to a specific book
   */
  private static isBookRelatedKey(key: string, bookId: string, bookName: string): boolean {
    const normalizedBookName = bookName.replace(/\s+/g, '_');
    
    return (
      key.includes(`_${bookId}_`) ||
      key.startsWith(`chapters_${bookId}`) ||
      key.startsWith(`subtopics_${bookId}_`) ||
      key.includes(`_${normalizedBookName}_`) ||
      key.startsWith(`FLASHCARD_${normalizedBookName}`) ||
      key.startsWith(`MCQ_${normalizedBookName}`) ||
      key.startsWith(`QA_${normalizedBookName}`) ||
      key.startsWith(`NOTES_${normalizedBookName}`) ||
      key.startsWith(`MINDMAP_${normalizedBookName}`) ||
      key.startsWith(`VIDEOS_${normalizedBookName}`) ||
      key.startsWith(`customtab_`) && key.includes(`_${normalizedBookName}_`)
    );
  }

  /**
   * Restore book data from backend to localStorage
   */
  private static async restoreBookDataToLocalStorage(bookData: StoredBook): Promise<void> {
    // Restore chapters
    const chaptersKey = `chapters_${bookData.id}`;
    localStorage.setItem(chaptersKey, JSON.stringify(bookData.chapters_data));

    // Restore all content data
    Object.entries(bookData.content_data).forEach(([key, value]) => {
      try {
        localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
      } catch (error) {
        console.warn(`Failed to restore key ${key}:`, error);
      }
    });

    // Update book metadata in createdBooks
    const books = JSON.parse(localStorage.getItem('createdBooks') || '[]');
    const bookIndex = books.findIndex((b: BookMetadata) => b.id === bookData.id);
    
    if (bookIndex >= 0) {
      books[bookIndex] = bookData.book_data;
    } else {
      books.push(bookData.book_data);
    }
    
    localStorage.setItem('createdBooks', JSON.stringify(books));
  }

  // ==================== LOCALSTORAGE HELPERS ====================

  /**
   * Get book metadata from localStorage
   */
  private static getBookFromLocalStorage(bookId: string): BookMetadata | null {
    const books = JSON.parse(localStorage.getItem('createdBooks') || '[]');
    return books.find((book: BookMetadata) => book.id === bookId) || null;
  }

  /**
   * Get all books from localStorage
   */
  private static getAllBooksFromLocalStorage(): BookMetadata[] {
    return JSON.parse(localStorage.getItem('createdBooks') || '[]');
  }

  // ==================== CONFLICT RESOLUTION ====================

  /**
   * Resolve conflicts between local and remote versions
   */
  static async resolveConflicts(bookId: string, strategy: 'local' | 'remote' | 'merge' = 'merge'): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const localBook = this.getBookFromLocalStorage(bookId);
      const remoteResult = await this.loadBook(bookId);

      if (!localBook || !remoteResult.success || !remoteResult.book) {
        return { success: false, error: 'Unable to find local or remote version' };
      }

      switch (strategy) {
        case 'local':
          // Keep local version, overwrite remote
          return await this.saveBook(localBook);
          
        case 'remote':
          // Keep remote version, overwrite local
          // Remote version is already loaded by loadBook()
          return { success: true };
          
        case 'merge':
          // Merge based on last updated timestamp
          const localTime = new Date(localBook.updatedAt).getTime();
          const remoteTime = new Date(remoteResult.book.updatedAt).getTime();
          
          if (localTime > remoteTime) {
            return await this.saveBook(localBook);
          } else {
            return { success: true };
          }
          
        default:
          return { success: false, error: 'Unknown strategy' };
      }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  // ==================== OFFLINE SUPPORT ====================

  /**
   * Check if device is online
   */
  static isOnline(): boolean {
    return navigator.onLine;
  }

  /**
   * Queue changes for sync when online
   */
  static queueForSync(bookId: string): void {
    const queue = JSON.parse(localStorage.getItem('syncQueue') || '[]');
    if (!queue.includes(bookId)) {
      queue.push(bookId);
      localStorage.setItem('syncQueue', JSON.stringify(queue));
    }
  }

  /**
   * Process sync queue when coming online
   */
  static async processSyncQueue(): Promise<void> {
    if (!this.isOnline()) return;

    const queue = JSON.parse(localStorage.getItem('syncQueue') || '[]');
    const processed: string[] = [];

    for (const bookId of queue) {
      const book = this.getBookFromLocalStorage(bookId);
      if (book) {
        const result = await this.saveBook(book);
        if (result.success) {
          processed.push(bookId);
        }
      } else {
        processed.push(bookId); // Remove invalid IDs
      }
    }

    // Remove processed items from queue
    const remainingQueue = queue.filter((id: string) => !processed.includes(id));
    localStorage.setItem('syncQueue', JSON.stringify(remainingQueue));
  }
}

export default SupabaseBookService;
