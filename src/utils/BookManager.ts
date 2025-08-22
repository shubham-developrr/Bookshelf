import { v4 as uuidv4 } from 'uuid';
import SupabaseBookService from '../services/SupabaseBookService';

/**
 * Enhanced Book Management System with UUID, Version Control, and Backend Sync
 */

export interface BookMetadata {
  id: string; // UUID - globally unique
  name: string;
  description?: string;
  image?: string;
  creatorName: string;
  university: string;
  semester: string;
  subjectCode: string;
  version: string; // Semantic versioning (major.minor.patch)
  originalId?: string; // For marketplace books - reference to marketplace book ID
  isPublished: boolean; // Whether book is published to marketplace
  marketplaceId?: string; // ID in marketplace if published
  createdAt: string;
  updatedAt: string;
  lastSyncAt?: string; // Last sync with backend
  downloadCount?: number; // For marketplace books
  rating?: number; // For marketplace books
  tags?: string[];
  estimatedHours?: number;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  language: string;
  updateAvailable?: boolean; // Whether newer version is available
  latestVersion?: string; // Latest version available in marketplace
}

export interface BookVersion {
  version: string;
  releaseNotes: string;
  releasedAt: string;
  downloadUrl?: string;
  size?: number; // in bytes
  checksum?: string; // For integrity verification
}

export interface BookUpdateInfo {
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion: string;
  releaseNotes?: string;
  updateSize?: number;
  isBreakingChange: boolean; // major version bump
}

export class BookManager {
  private static readonly STORAGE_KEY = 'createdBooks';
  private static readonly VERSIONS_KEY = 'bookVersions';
  
  /**
   * Generate a new UUID for a book
   */
  static generateBookId(): string {
    return uuidv4();
  }

  /**
   * Create initial semantic version
   */
  static generateInitialVersion(): string {
    return '1.0.0';
  }

  /**
   * Increment version number
   */
  static incrementVersion(currentVersion: string, type: 'major' | 'minor' | 'patch'): string {
    const [major, minor, patch] = currentVersion.split('.').map(Number);
    
    switch (type) {
      case 'major':
        return `${major + 1}.0.0`;
      case 'minor':
        return `${major}.${minor + 1}.0`;
      case 'patch':
        return `${major}.${minor}.${patch + 1}`;
      default:
        return currentVersion;
    }
  }

  /**
   * Compare version numbers
   */
  static compareVersions(version1: string, version2: string): number {
    const v1Parts = version1.split('.').map(Number);
    const v2Parts = version2.split('.').map(Number);
    
    for (let i = 0; i < 3; i++) {
      if (v1Parts[i] > v2Parts[i]) return 1;
      if (v1Parts[i] < v2Parts[i]) return -1;
    }
    return 0;
  }

  /**
   * Create a new book with proper metadata
   */
  static createBook(bookData: {
    name: string;
    description?: string;
    image?: string;
    creatorName: string;
    university: string;
    semester: string;
    subjectCode: string;
    tags?: string[];
    estimatedHours?: number;
    difficulty?: 'beginner' | 'intermediate' | 'advanced';
  }): BookMetadata {
    const now = new Date().toISOString();
    
    const bookMetadata: BookMetadata = {
      id: this.generateBookId(),
      name: bookData.name,
      description: bookData.description,
      image: bookData.image,
      creatorName: bookData.creatorName,
      university: bookData.university,
      semester: bookData.semester,
      subjectCode: bookData.subjectCode,
      version: this.generateInitialVersion(),
      isPublished: false,
      createdAt: now,
      updatedAt: now,
      tags: bookData.tags || [],
      estimatedHours: bookData.estimatedHours || 10,
      difficulty: bookData.difficulty || 'intermediate',
      language: 'en'
    };

    // Save to localStorage
    this.saveBook(bookMetadata);
    
    return bookMetadata;
  }

  /**
   * Save book to localStorage with quota error handling and backend sync
   */
  static saveBook(book: BookMetadata): void {
    try {
      const books = this.getAllBooks();
      const existingIndex = books.findIndex(b => b.id === book.id);
      
      if (existingIndex >= 0) {
        books[existingIndex] = { ...book, updatedAt: new Date().toISOString() };
      } else {
        books.push(book);
      }
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(books));
      
      // Queue for backend sync
      this.queueBackendSync(book);
      
    } catch (error) {
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        console.error('LocalStorage quota exceeded. Cannot save book:', book.name);
        // Try to free up space by removing some data
        this.cleanupOldData();
        // Try saving again with reduced data
        try {
          const books = this.getAllBooks();
          const existingIndex = books.findIndex(b => b.id === book.id);
          
          // Create a minimal version of the book for storage
          const minimalBook = {
            id: book.id,
            name: book.name,
            creatorName: book.creatorName,
            university: book.university,
            semester: book.semester,
            subjectCode: book.subjectCode,
            version: book.version,
            isPublished: book.isPublished,
            createdAt: book.createdAt,
            updatedAt: new Date().toISOString(),
            language: book.language || 'en'
          };
          
          if (existingIndex >= 0) {
            books[existingIndex] = minimalBook;
          } else {
            books.push(minimalBook);
          }
          
          localStorage.setItem(this.STORAGE_KEY, JSON.stringify(books));
          
          // Still try to sync to backend even with minimal data
          this.queueBackendSync(book);
          
        } catch (retryError) {
          console.error('Failed to save even minimal book data:', retryError);
          alert('Storage quota exceeded. Please clear some data or use a different browser.');
        }
      } else {
        console.error('Failed to save book:', error);
      }
    }
  }

  /**
   * Clean up old data to free storage space
   */
  static cleanupOldData(): void {
    try {
      // Remove old chapter data that might be taking up space
      const keys = Object.keys(localStorage);
      const oldKeys = keys.filter(key => 
        key.startsWith('chapters_') || 
        key.startsWith('highlights_') ||
        key.startsWith('bookmarks_') ||
        key.includes('old_') ||
        key.includes('backup_')
      );
      
      oldKeys.forEach(key => {
        try {
          localStorage.removeItem(key);
        } catch (e) {
          // Ignore errors during cleanup
        }
      });
    } catch (error) {
      console.error('Failed to cleanup old data:', error);
    }
  }

  /**
   * Get all books from localStorage
   */
  static getAllBooks(): BookMetadata[] {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (!stored) return [];
    
    try {
      return JSON.parse(stored);
    } catch (error) {
      console.error('Failed to parse books from localStorage:', error);
      return [];
    }
  }

  /**
   * Get book by ID
   */
  static getBookById(id: string): BookMetadata | null {
    const books = this.getAllBooks();
    return books.find(book => book.id === id) || null;
  }

  /**
   * Update book metadata
   */
  static updateBook(id: string, updates: Partial<BookMetadata>): BookMetadata | null {
    const book = this.getBookById(id);
    if (!book) return null;
    
    const updatedBook = {
      ...book,
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    this.saveBook(updatedBook);
    return updatedBook;
  }

  /**
   * Delete book
   */
  static deleteBook(id: string): boolean {
    const books = this.getAllBooks();
    const filteredBooks = books.filter(book => book.id !== id);
    
    if (filteredBooks.length < books.length) {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filteredBooks));
      
      // Also clean up chapter data
      this.cleanupBookData(id);
      return true;
    }
    
    return false;
  }

  /**
   * Clean up all data associated with a book including tab isolation data
   */
  static cleanupBookData(bookId: string): void {
    const keysToRemove: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (
        key.includes(`_${bookId}_`) ||
        key.startsWith(`chapters_${bookId}`) ||
        key.startsWith(`subtopics_${bookId}`) ||
        key.includes(bookId) ||
        // Tab isolation patterns: ${templateType}_${book}_${chapter}_${tabId}
        this.isTabIsolationKey(key, bookId)
      )) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
  }

  /**
   * Check if key matches tab isolation pattern for a specific book
   */
  private static isTabIsolationKey(storageKey: string, bookId: string): boolean {
    const templateTypes = ['FLASHCARD', 'MCQ', 'QA', 'NOTES', 'MINDMAP', 'VIDEOS'];
    const customTabPattern = /^customtab_.*_.*_.*$/;
    
    // Check standard template patterns: ${templateType}_${book}_${chapter}_${tabId}
    const hasTemplatePattern = templateTypes.some(templateType => 
      storageKey.startsWith(`${templateType}_`) && storageKey.includes(`_${bookId}_`)
    );
    
    // Check custom tab patterns: customtab_${tabName}_${book}_${chapter}
    const hasCustomTabPattern = customTabPattern.test(storageKey) && storageKey.includes(`_${bookId}_`);
    
    return hasTemplatePattern || hasCustomTabPattern;
  }

  /**
   * Auto-save book data with debouncing pattern (TestSprite Pattern Detection)
   */
  private static autoSaveCallbacks: Map<string, ReturnType<typeof setTimeout>> = new Map();
  
  static autoSaveBook(book: BookMetadata, delay: number = 1000): void {
    const saveKey = `book_${book.id}`;
    
    // Cancel existing auto-save callback
    const existingTimeout = this.autoSaveCallbacks.get(saveKey);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }
    
    // Setup new auto-save with debouncing (1-second delay as per copilot instructions)
    const timeoutId = setTimeout(() => {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.getAllBooks().map(b => 
        b.id === book.id ? { ...book, updatedAt: new Date().toISOString() } : b
      )));
      console.log(`Auto-saved book: ${book.name}`);
      this.autoSaveCallbacks.delete(saveKey);
    }, delay);
    
    this.autoSaveCallbacks.set(saveKey, timeoutId);
  }

  /**
   * Tab isolation storage key generator (TestSprite Pattern Detection)
   * Pattern: ${templateType}_${bookName}_${chapterKey}_${tabId}
   */
  static generateTabIsolatedStorageKey(
    templateType: string,
    bookName: string,
    chapterKey: string,
    tabId?: string
  ): string {
    const baseKey = `${templateType}_${bookName.replace(/\s+/g, '_')}_${chapterKey.replace(/\s+/g, '_')}`;
    return tabId ? `${baseKey}_${tabId}` : baseKey;
  }

  /**
   * Priority fallback pattern for tab-isolated data (TestSprite Pattern Detection)
   * Priority: tab-specific → base → default
   */
  static getTabIsolatedData<T>(
    templateType: string,
    bookName: string,
    chapterKey: string,
    tabId?: string,
    defaultValue: T[] = []
  ): T[] {
    const baseKey = this.generateTabIsolatedStorageKey(templateType, bookName, chapterKey);
    const tabKey = tabId ? `${baseKey}_${tabId}` : null;
    
    // Priority: tab-specific → base → default
    if (tabKey && localStorage.getItem(tabKey)) {
      try {
        return JSON.parse(localStorage.getItem(tabKey)!) || defaultValue;
      } catch {
        return defaultValue;
      }
    }
    
    if (localStorage.getItem(baseKey)) {
      try {
        return JSON.parse(localStorage.getItem(baseKey)!) || defaultValue;
      } catch {
        return defaultValue;
      }
    }
    
    return defaultValue;
  }

  /**
   * Save tab-isolated data with auto-save pattern (TestSprite Pattern Detection)
   */
  static saveTabIsolatedData<T>(
    templateType: string,
    bookName: string,
    chapterKey: string,
    data: T[],
    tabId?: string
  ): void {
    const storageKey = this.generateTabIsolatedStorageKey(templateType, bookName, chapterKey, tabId);
    
    // Auto-save with debouncing pattern
    setTimeout(() => {
      try {
        localStorage.setItem(storageKey, JSON.stringify(data));
        console.log(`Auto-saved ${templateType} data for ${bookName} - ${chapterKey}${tabId ? ` (Tab: ${tabId})` : ''}`);
      } catch (error) {
        console.error(`Failed to save ${templateType} data:`, error);
      }
    }, 1000);
  }

  /**
   * Publish book to marketplace
   */
  static async publishToMarketplace(bookId: string, releaseNotes: string): Promise<{
    success: boolean;
    marketplaceId?: string;
    error?: string;
  }> {
    // TODO: Implement actual marketplace publishing
    // This would call the backend marketplace API
    
    const book = this.getBookById(bookId);
    if (!book) {
      return { success: false, error: 'Book not found' };
    }

    // For now, simulate marketplace publishing
    const marketplaceId = `marketplace_${uuidv4()}`;
    
    this.updateBook(bookId, {
      isPublished: true,
      marketplaceId,
      lastSyncAt: new Date().toISOString()
    });

    return { success: true, marketplaceId };
  }

  /**
   * Check for book updates
   */
  static async checkForUpdates(bookId: string): Promise<BookUpdateInfo> {
    // TODO: Implement actual update checking via backend API
    // This would query the marketplace for newer versions
    
    const book = this.getBookById(bookId);
    if (!book || !book.marketplaceId) {
      return {
        hasUpdate: false,
        currentVersion: book?.version || '1.0.0',
        latestVersion: book?.version || '1.0.0',
        isBreakingChange: false
      };
    }

    // Simulate checking for updates
    return {
      hasUpdate: false,
      currentVersion: book.version,
      latestVersion: book.version,
      isBreakingChange: false
    };
  }

  /**
   * Migrate legacy books to new format (with migration tracking)
   */
  static migrateLegacyBooks(): number {
    // Check if migration has already been completed
    const migrationFlag = localStorage.getItem('booksMigrated');
    if (migrationFlag === 'true') {
      return 0; // Migration already completed
    }

    try {
      const books = this.getAllBooks();
      let migratedCount = 0;
      const updatedBooks: BookMetadata[] = [];
      
      books.forEach(book => {
        let needsMigration = false;
        const updatedBook = { ...book };
        
        // Check if book ID is not a UUID
        if (!book.id.includes('-') || book.id.startsWith('created-')) {
          updatedBook.id = this.generateBookId();
          needsMigration = true;
        }
        
        // Check if version is missing
        if (!book.version) {
          updatedBook.version = this.generateInitialVersion();
          needsMigration = true;
        }
        
        // Add missing fields
        if (!book.isPublished) {
          updatedBook.isPublished = false;
          needsMigration = true;
        }
        if (!book.language) {
          updatedBook.language = 'en';
          needsMigration = true;
        }
        if (!book.tags) {
          updatedBook.tags = [];
          needsMigration = true;
        }
        if (!book.difficulty) {
          updatedBook.difficulty = 'intermediate';
          needsMigration = true;
        }
        if (!book.estimatedHours) {
          updatedBook.estimatedHours = 10;
          needsMigration = true;
        }
        
        if (needsMigration) {
          updatedBook.updatedAt = new Date().toISOString();
          migratedCount++;
        }
        
        updatedBooks.push(updatedBook);
      });
      
      // Batch save all books at once to avoid multiple localStorage writes
      if (migratedCount > 0) {
        try {
          localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updatedBooks));
          localStorage.setItem('booksMigrated', 'true');
          console.log(`Migrated ${migratedCount} books to new format`);
        } catch (error) {
          console.error('Failed to save migrated books:', error);
          // If migration fails due to quota, mark as completed anyway to prevent loops
          localStorage.setItem('booksMigrated', 'true');
        }
      } else {
        // No migration needed, mark as completed
        localStorage.setItem('booksMigrated', 'true');
      }
      
      return migratedCount;
    } catch (error) {
      console.error('Migration failed:', error);
      // Mark migration as completed to prevent infinite loops
      localStorage.setItem('booksMigrated', 'true');
      return 0;
    }
  }

  /**
   * Export book for marketplace
   */
  static async exportBookForMarketplace(bookId: string): Promise<{
    success: boolean;
    exportData?: any;
    error?: string;
  }> {
    const book = this.getBookById(bookId);
    if (!book) {
      return { success: false, error: 'Book not found' };
    }

    try {
      // Gather all book data
      const chapters = JSON.parse(localStorage.getItem(`chapters_${bookId}`) || '[]');
      const exportData = {
        metadata: book,
        chapters,
        exportedAt: new Date().toISOString(),
        version: book.version
      };

      // TODO: Additional data collection (subtopics, MCQs, etc.)
      
      return { success: true, exportData };
    } catch (error) {
      return { success: false, error: 'Failed to export book data' };
    }
  }

  /**
   * Reset migration flag (for development/debugging)
   */
  static resetMigrationFlag(): void {
    localStorage.removeItem('booksMigrated');
  }

  /**
   * Clear all storage data (nuclear option for quota issues)
   */
  static clearAllData(): void {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('created') || 
            key.startsWith('chapters_') || 
            key.startsWith('highlights_') ||
            key.startsWith('bookmarks_') ||
            key.includes('Books') ||
            key === 'booksMigrated') {
          localStorage.removeItem(key);
        }
      });
      console.log('All book data cleared from localStorage');
    } catch (error) {
      console.error('Failed to clear data:', error);
    }
  }

  // ==================== BACKEND SYNC METHODS ====================

  /**
   * Queue book for backend sync
   */
  private static queueBackendSync(book: BookMetadata): void {
    if (typeof window === 'undefined') return; // Skip during SSR
    
    try {
      SupabaseBookService.queueForSync(book.id);
      
      // Debounced sync - only sync if user is online and authenticated
      setTimeout(() => {
        if (SupabaseBookService.isOnline()) {
          SupabaseBookService.saveBook(book).catch(error => {
            console.warn('Background sync failed:', error);
            // Keep in queue for retry
          });
        }
      }, 2000);
    } catch (error) {
      console.warn('Failed to queue backend sync:', error);
    }
  }

  /**
   * Sync all books to backend
   */
  static async syncAllBooksToBackend(): Promise<{ success: boolean; synced: number; errors: string[] }> {
    try {
      const result = await SupabaseBookService.syncAllBooks();
      console.log(`📚 Synced ${result.synced} books to backend`);
      return result;
    } catch (error) {
      console.error('Failed to sync books to backend:', error);
      return { success: false, synced: 0, errors: [error instanceof Error ? error.message : 'Unknown error'] };
    }
  }

  /**
   * Load books from backend and merge with local
   */
  static async loadBooksFromBackend(): Promise<{ success: boolean; loaded: number; errors: string[] }> {
    try {
      const result = await SupabaseBookService.getUserBooks();
      
      if (!result.success || !result.books) {
        return { success: false, loaded: 0, errors: [result.error || 'Failed to load books'] };
      }

      const localBooks = this.getAllBooks();
      const errors: string[] = [];
      let loaded = 0;

      // Merge remote books with local books
      for (const remoteBook of result.books) {
        const localBook = localBooks.find(b => b.id === remoteBook.id);
        
        if (!localBook) {
          // Book exists only remotely - load it
          const loadResult = await SupabaseBookService.loadBook(remoteBook.id);
          if (loadResult.success) {
            loaded++;
          } else {
            errors.push(`${remoteBook.name}: ${loadResult.error}`);
          }
        } else {
          // Book exists locally and remotely - check for conflicts
          const localTime = new Date(localBook.updatedAt).getTime();
          const remoteTime = new Date(remoteBook.updatedAt).getTime();
          
          if (remoteTime > localTime) {
            // Remote version is newer - load it
            const loadResult = await SupabaseBookService.loadBook(remoteBook.id);
            if (loadResult.success) {
              loaded++;
            } else {
              errors.push(`${remoteBook.name}: ${loadResult.error}`);
            }
          }
        }
      }

      console.log(`📥 Loaded ${loaded} books from backend`);
      return { success: errors.length === 0, loaded, errors };
      
    } catch (error) {
      console.error('Failed to load books from backend:', error);
      return { success: false, loaded: 0, errors: [error instanceof Error ? error.message : 'Unknown error'] };
    }
  }

  /**
   * Enable auto-sync for all books
   */
  static enableAutoSync(): void {
    const books = this.getAllBooks();
    books.forEach(book => {
      SupabaseBookService.enableAutoSync(book.id);
    });
    console.log(`🔄 Enabled auto-sync for ${books.length} books`);
  }

  /**
   * Disable auto-sync for all books
   */
  static disableAutoSync(): void {
    const books = this.getAllBooks();
    books.forEach(book => {
      SupabaseBookService.disableAutoSync(book.id);
    });
    console.log(`⏸️ Disabled auto-sync for ${books.length} books`);
  }

  /**
   * Process sync queue (call when coming online)
   */
  static async processSyncQueue(): Promise<void> {
    try {
      await SupabaseBookService.processSyncQueue();
      console.log('📤 Processed sync queue');
    } catch (error) {
      console.error('Failed to process sync queue:', error);
    }
  }
}

// Export for convenience
export { BookManager as default };
