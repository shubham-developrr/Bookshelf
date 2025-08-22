/**
 * UNIFIED BOOK SERVICE
 * 
 * Solves the core problem: ALL books should work the same way
 * - When you create a book, it syncs to cloud immediately
 * - When you edit chapters/content, it syncs immediately  
 * - When you access from any device, you get the same data
 * - No difference between "local" and "backend" books
 */

import { supabase } from './supabaseClient';
import { v4 as uuidv4 } from 'uuid';

// Lazy import to avoid circular dependency
let EnhancedSyncService: any;

export interface Book {
  id: string;
  name: string;
  description?: string;
  image?: string;
  creatorName: string;
  university: string;
  semester: string;
  subjectCode: string;
  createdAt: string;
  updatedAt: string;
  version?: string;
  isPublished?: boolean;
}

export interface Chapter {
  id: string;
  bookId: string;
  number: number;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface ContentData {
  [key: string]: any;
}

export class UnifiedBookService {
  private static instance: UnifiedBookService;
  private enhancedSync: any = null;

  private constructor() {
    // Don't initialize EnhancedSyncService in constructor to avoid circular dependency
  }

  private async getEnhancedSync(): Promise<any> {
    if (!this.enhancedSync) {
      if (!EnhancedSyncService) {
        const module = await import('./EnhancedSyncService');
        EnhancedSyncService = module.default;
      }
      this.enhancedSync = EnhancedSyncService.getInstance();
    }
    return this.enhancedSync;
  }

  static getInstance(): UnifiedBookService {
    if (!UnifiedBookService.instance) {
      UnifiedBookService.instance = new UnifiedBookService();
    }
    return UnifiedBookService.instance;
  }

  /**
   * Create a new book - immediately syncs to cloud
   */
  async createBook(bookData: {
    name: string;
    description?: string;
    image?: string;
    creatorName: string;
    university: string;
    semester: string;
    subjectCode: string;
  }): Promise<{ success: boolean; book?: Book; error?: string }> {
    try {
      console.log(`📚 Creating unified book: ${bookData.name}`);

      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        return { success: false, error: 'User not authenticated' };
      }

      const now = new Date().toISOString();
      const book: Book = {
        id: uuidv4(),
        name: bookData.name,
        description: bookData.description,
        image: bookData.image,
        creatorName: bookData.creatorName,
        university: bookData.university,
        semester: bookData.semester,
        subjectCode: bookData.subjectCode,
        createdAt: now,
        updatedAt: now,
        version: '1.0.0',
        isPublished: false
      };

      // 1. Save to localStorage for immediate access
      await this.saveBookToLocalStorage(book);

      // 2. Sync to cloud immediately
      const syncResult = await this.syncBookToCloud(book, [], {});
      
      if (!syncResult.success) {
        console.error('Failed to sync book to cloud:', syncResult.error);
        // Don't fail completely, book is saved locally
      }

      console.log(`✅ Book created and synced: ${book.name}`);
      return { success: true, book };

    } catch (error) {
      console.error('Failed to create book:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Add chapter to book - immediately syncs to cloud
   */
  async addChapter(bookId: string, chapterData: {
    number: number;
    name: string;
  }): Promise<{ success: boolean; chapter?: Chapter; error?: string }> {
    try {
      console.log(`📄 Adding chapter to book: ${bookId}`);

      const now = new Date().toISOString();
      const chapter: Chapter = {
        id: `chapter_${Date.now()}`,
        bookId: bookId,
        number: chapterData.number,
        name: chapterData.name,
        createdAt: now,
        updatedAt: now
      };

      // 1. Update chapters in localStorage
      const chapters = await this.getChaptersFromLocalStorage(bookId);
      chapters.push(chapter);
      await this.saveChaptersToLocalStorage(bookId, chapters);

      // 2. Update book timestamp
      await this.updateBookTimestamp(bookId);

      // 3. Sync to cloud immediately
      const book = await this.getBookFromLocalStorage(bookId);
      if (book) {
        const allContent = await this.collectAllContentData(book.name, bookId);
        const syncResult = await this.syncBookToCloud(book, chapters, allContent);
        
        if (!syncResult.success) {
          console.error('Failed to sync chapter to cloud:', syncResult.error);
        }
      }

      console.log(`✅ Chapter added and synced: ${chapter.name}`);
      return { success: true, chapter };

    } catch (error) {
      console.error('Failed to add chapter:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Save any content (flashcards, MCQ, notes, etc.) - immediately syncs to cloud
   */
  async saveContent(bookId: string, bookName: string, chapterName: string, contentType: string, content: any): Promise<{ success: boolean; error?: string }> {
    try {
      console.log(`💾 Saving ${contentType} content for ${bookName} - ${chapterName}`);

      // 1. Save to localStorage with proper key structure
      const storageKey = this.generateStorageKey(contentType, bookName, chapterName);
      localStorage.setItem(storageKey, JSON.stringify(content));

      // 2. Update book timestamp
      await this.updateBookTimestamp(bookId);

      // 3. Sync to cloud immediately (including highlights, custom tabs, exam mode)
      const book = await this.getBookFromLocalStorage(bookId);
      if (book) {
        const chapters = await this.getChaptersFromLocalStorage(bookId);
        const allContent = await this.collectAllContentData(book.name, bookId);
        const syncResult = await this.syncBookToCloud(book, chapters, allContent);
        
        if (!syncResult.success) {
          console.error('Failed to sync content to cloud:', syncResult.error);
        } else {
          // Also trigger enhanced sync for comprehensive data sync
          this.getEnhancedSync().then(enhancedSync => {
            enhancedSync.syncAllUserDataToCloud().then((result: any) => {
              if (!result.success) {
                console.warn('Enhanced sync encountered issues:', result.errors);
              }
            });
          });
        }
      }

      console.log(`✅ Content saved and synced: ${contentType}`);
      return { success: true };

    } catch (error) {
      console.error('Failed to save content:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Load all user books from cloud first, then merge with local
   */
  async getAllBooks(): Promise<{ success: boolean; books: Book[]; error?: string }> {
    try {
      console.log('📚 Loading all user books...');

      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        // Fallback to local books only
        const localBooks = await this.getLocalBooks();
        return { success: true, books: localBooks };
      }

      // 1. Load from cloud first
      const { data: cloudBooks, error: cloudError } = await supabase
        .from('user_books')
        .select('book_data, updated_at')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      let books: Book[] = [];

      if (!cloudError && cloudBooks) {
        // Parse cloud books
        books = cloudBooks.map(record => ({
          ...record.book_data,
          updatedAt: record.updated_at
        }));

        // Save to localStorage for offline access
        localStorage.setItem('createdBooks', JSON.stringify(books));
      }

      // 2. If no cloud books or error, use local books
      if (books.length === 0) {
        books = await this.getLocalBooks();
      }

      console.log(`✅ Loaded ${books.length} books`);
      return { success: true, books };

    } catch (error) {
      console.error('Failed to get books:', error);
      const localBooks = await this.getLocalBooks();
      return { success: false, books: localBooks, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Load complete book data including chapters and content
   */
  async getCompleteBookData(bookId: string): Promise<{ 
    success: boolean; 
    book?: Book; 
    chapters: Chapter[]; 
    content: ContentData;
    error?: string;
  }> {
    try {
      console.log(`📖 Loading complete data for book: ${bookId}`);

      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        // Fallback to local data
        const book = await this.getBookFromLocalStorage(bookId);
        const chapters = await this.getChaptersFromLocalStorage(bookId);
        const content = book ? await this.collectAllContentData(book.name, bookId) : {};
        return { success: true, book, chapters, content };
      }

      // 1. Try loading from cloud first
      const { data: cloudData, error: cloudError } = await supabase
        .from('user_books')
        .select('*')
        .eq('id', bookId)
        .eq('user_id', user.id)
        .single();

      if (!cloudError && cloudData) {
        // Load from cloud and update local storage
        const book: Book = cloudData.book_data;
        const chapters: Chapter[] = cloudData.chapters_data || [];
        const content: ContentData = cloudData.content_data || {};

        // Update local storage with cloud data
        await this.saveBookToLocalStorage(book);
        await this.saveChaptersToLocalStorage(bookId, chapters);
        await this.saveAllContentToLocalStorage(book.name, bookId, content);

        console.log(`✅ Loaded complete book data from cloud: ${book.name}`);
        return { success: true, book, chapters, content };
      }

      // 2. Fallback to local data
      const book = await this.getBookFromLocalStorage(bookId);
      const chapters = await this.getChaptersFromLocalStorage(bookId);
      const content = book ? await this.collectAllContentData(book.name, bookId) : {};

      console.log(`✅ Loaded complete book data from local: ${book?.name || 'Unknown'}`);
      return { success: true, book, chapters, content };

    } catch (error) {
      console.error('Failed to get complete book data:', error);
      return { success: false, chapters: [], content: {}, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // ==================== PRIVATE HELPER METHODS ====================

  private async saveBookToLocalStorage(book: Book): Promise<void> {
    const books = await this.getLocalBooks();
    const existingIndex = books.findIndex(b => b.id === book.id);
    
    if (existingIndex >= 0) {
      books[existingIndex] = book;
    } else {
      books.push(book);
    }
    
    localStorage.setItem('createdBooks', JSON.stringify(books));
  }

  private async getBookFromLocalStorage(bookId: string): Promise<Book | null> {
    const books = await this.getLocalBooks();
    return books.find(b => b.id === bookId) || null;
  }

  private async getLocalBooks(): Promise<Book[]> {
    try {
      const stored = localStorage.getItem('createdBooks');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to parse local books:', error);
      return [];
    }
  }

  private async saveChaptersToLocalStorage(bookId: string, chapters: Chapter[]): Promise<void> {
    localStorage.setItem(`chapters_${bookId}`, JSON.stringify(chapters));
  }

  private async getChaptersFromLocalStorage(bookId: string): Promise<Chapter[]> {
    try {
      const stored = localStorage.getItem(`chapters_${bookId}`);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to parse chapters:', error);
      return [];
    }
  }

  private async updateBookTimestamp(bookId: string): Promise<void> {
    const book = await this.getBookFromLocalStorage(bookId);
    if (book) {
      book.updatedAt = new Date().toISOString();
      await this.saveBookToLocalStorage(book);
    }
  }

  private generateStorageKey(contentType: string, bookName: string, chapterName: string): string {
    const normalizedBook = bookName.replace(/\s+/g, '_');
    const normalizedChapter = chapterName.replace(/\s+/g, '_');
    return `${contentType}_${normalizedBook}_${normalizedChapter}`;
  }

  private async collectAllContentData(bookName: string, bookId: string): Promise<ContentData> {
    const data: ContentData = {};
    const normalizedBookName = bookName.replace(/\s+/g, '_');

    // Scan localStorage for all book-related content
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && this.isBookRelatedKey(key, bookId, normalizedBookName)) {
        const value = localStorage.getItem(key);
        if (value && value !== 'null') {
          try {
            data[key] = JSON.parse(value);
          } catch {
            data[key] = value; // Store as string if not JSON
          }
        }
      }
    }

    return data;
  }

  private async saveAllContentToLocalStorage(bookName: string, bookId: string, content: ContentData): Promise<void> {
    for (const [key, value] of Object.entries(content)) {
      try {
        localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
      } catch (error) {
        console.warn(`Failed to save content key ${key}:`, error);
      }
    }
  }

  private isBookRelatedKey(key: string, bookId: string, normalizedBookName: string): boolean {
    return (
      key.includes(`_${bookId}_`) ||
      key.startsWith(`chapters_${bookId}`) ||
      key.includes(`_${normalizedBookName}_`) ||
      key.startsWith(`flashcards_${normalizedBookName}`) ||
      key.startsWith(`mcq_${normalizedBookName}`) ||
      key.startsWith(`qa_${normalizedBookName}`) ||
      key.startsWith(`notes_${normalizedBookName}`) ||
      key.startsWith(`mindmaps_${normalizedBookName}`) ||
      key.startsWith(`videos_${normalizedBookName}`) ||
      key.startsWith(`questionPapers_${normalizedBookName}`) ||   // EXAM MODE: Question papers
      key.startsWith(`evaluationReports_${normalizedBookName}`) || // EXAM MODE: Evaluation reports
      key.startsWith(`subtopics_${bookId}_`) ||  // READ TAB: Subtopics content
      key.startsWith(`html_editors_${normalizedBookName}_`) ||  // CUSTOM TABS: HTML editors content
      key.startsWith(`rich_text_editors_${normalizedBookName}_`) ||  // CUSTOM TABS: Rich text editors content
      // FIXED: Better highlights matching - highlights_BookName_ChapterName pattern
      (key.startsWith('highlights_') && key.includes(`_${normalizedBookName}_`)) ||
      // FIXED: Better custom tab matching - customtab_TabName_BookName_ChapterName pattern
      (key.includes('customtab_') && key.includes(`_${normalizedBookName}_`)) ||
      // ADDITIONAL: Tab-isolated template data (with tabId suffix)
      key.includes(`_${normalizedBookName}_`) && key.includes('_tab_') ||
      // ADDITIONAL: Exam mode with different patterns
      (key.includes('exam_') && key.includes(`_${normalizedBookName}_`)) ||
      (key.includes('evaluation_') && key.includes(`_${normalizedBookName}_`)) ||
      // ADDITIONAL: User progress and settings
      (key.includes('progress_') && key.includes(`_${normalizedBookName}_`)) ||
      (key.includes('settings_') && key.includes(`_${normalizedBookName}_`))
    );
  }

  private async syncBookToCloud(book: Book, chapters: Chapter[], content: ContentData): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        return { success: false, error: 'User not authenticated' };
      }

      const { error: syncError } = await supabase
        .from('user_books')
        .upsert({
          id: book.id,
          user_id: user.id,
          book_data: book,
          chapters_data: chapters,
          content_data: content,
          updated_at: book.updatedAt,
          last_synced: new Date().toISOString()
        });

      if (syncError) {
        return { success: false, error: syncError.message };
      }

      console.log(`☁️ Book synced to cloud: ${book.name}`);
      return { success: true };

    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Delete book - removes from both local and cloud
   */
  async deleteBook(bookId: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log(`🗑️ Deleting book: ${bookId}`);

      // 1. Delete from cloud first
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (user && !authError) {
        const { error: deleteError } = await supabase
          .from('user_books')
          .delete()
          .eq('id', bookId)
          .eq('user_id', user.id);

        if (deleteError) {
          console.warn('Failed to delete from cloud:', deleteError);
        }
      }

      // 2. Delete from localStorage
      const books = await this.getLocalBooks();
      const filteredBooks = books.filter(b => b.id !== bookId);
      localStorage.setItem('createdBooks', JSON.stringify(filteredBooks));

      // 3. Clean up all related data
      this.cleanupBookData(bookId);

      console.log(`✅ Book deleted: ${bookId}`);
      return { success: true };

    } catch (error) {
      console.error('Failed to delete book:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  private cleanupBookData(bookId: string): void {
    const keysToRemove: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (
        key.includes(`_${bookId}_`) ||
        key.startsWith(`chapters_${bookId}`) ||
        key.includes(bookId)
      )) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
    console.log(`🧹 Cleaned up ${keysToRemove.length} data entries for book ${bookId}`);
  }

  /**
   * Force sync all local changes to cloud
   */
  async forceSyncAllToCloud(): Promise<{ success: boolean; synced: number; errors: string[] }> {
    try {
      console.log('🔄 Force syncing all books to cloud...');

      const books = await this.getLocalBooks();
      const errors: string[] = [];
      let synced = 0;

      for (const book of books) {
        try {
          const chapters = await this.getChaptersFromLocalStorage(book.id);
          const content = await this.collectAllContentData(book.name, book.id);
          
          const syncResult = await this.syncBookToCloud(book, chapters, content);
          if (syncResult.success) {
            synced++;
          } else {
            errors.push(`${book.name}: ${syncResult.error}`);
          }
        } catch (error) {
          errors.push(`${book.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // ENHANCED: Also sync highlights, custom tabs, and exam mode data
      console.log('🔄 Running enhanced sync for comprehensive data...');
      const enhancedSync = await this.getEnhancedSync();
      const enhancedResult = await enhancedSync.syncAllUserDataToCloud();
      if (!enhancedResult.success) {
        errors.push(...enhancedResult.errors.map(err => `Enhanced sync: ${err}`));
      }

      console.log(`✅ Force sync completed: ${synced}/${books.length} books synced, ${enhancedResult.highlights} highlights, ${enhancedResult.customTabs} custom tabs, ${enhancedResult.examMode} exam mode entries`);
      return { success: errors.length === 0, synced, errors };

    } catch (error) {
      console.error('Force sync failed:', error);
      return { success: false, synced: 0, errors: [error instanceof Error ? error.message : 'Unknown error'] };
    }
  }

  /**
   * Complete bidirectional sync - sync to cloud and from cloud
   */
  async completeBidirectionalSync(): Promise<{ success: boolean; details: any; errors: string[] }> {
    console.log('🔄 Running complete bidirectional sync...');

    try {
      // 1. Sync all local data to cloud
      const toCloudResult = await this.forceSyncAllToCloud();

      // 2. Sync all cloud data to local
      const enhancedSync = await this.getEnhancedSync();
      const fromCloudResult = await enhancedSync.syncFromCloudToLocal();

      // 3. Reload books to get latest data
      const booksResult = await this.getAllBooks();

      const allErrors = [
        ...toCloudResult.errors,
        ...(fromCloudResult.error ? [fromCloudResult.error] : [])
      ];

      const success = toCloudResult.success && fromCloudResult.success && booksResult.success;

      console.log(`✅ Complete bidirectional sync ${success ? 'completed' : 'completed with errors'}`);

      return {
        success,
        details: {
          toCloud: toCloudResult,
          fromCloud: fromCloudResult,
          books: booksResult.books.length
        },
        errors: allErrors
      };

    } catch (error) {
      console.error('💥 Complete bidirectional sync failed:', error);
      return {
        success: false,
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }
}

export default UnifiedBookService;
