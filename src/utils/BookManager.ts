import { v4 as uuidv4 } from 'uuid';

/**
 * @interface BookMetadata
 * @description Defines the structure for a book's metadata, including versioning and marketplace info.
 * @property {string} id - UUID - globally unique identifier for the book.
 * @property {string} name - The name of the book.
 * @property {string} [description] - A short description of the book.
 * @property {string} [image] - URL or data URI for the book's cover image.
 * @property {string} creatorName - The name of the book's creator.
 * @property {string} university - The university associated with the book.
 * @property {string} semester - The semester associated with the book.
 * @property {string} subjectCode - The subject code for the book's course.
 * @property {string} version - Semantic versioning string (e.g., "1.0.0").
 * @property {string} [originalId] - For marketplace books, a reference to the original marketplace book ID.
 * @property {boolean} isPublished - Whether the book is published to the marketplace.
 * @property {string} [marketplaceId] - The ID of the book in the marketplace if published.
 * @property {string} createdAt - ISO string of the creation date.
 * @property {string} updatedAt - ISO string of the last update date.
 * @property {string} [lastSyncAt] - ISO string of the last sync with a backend.
 * @property {number} [downloadCount] - For marketplace books, the number of times it has been downloaded.
 * @property {number} [rating] - For marketplace books, the average user rating.
 * @property {string[]} [tags] - An array of tags for categorization.
 * @property {number} [estimatedHours] - Estimated hours to complete the book.
 * @property {'beginner' | 'intermediate' | 'advanced'} [difficulty] - The difficulty level of the book.
 * @property {string} language - The language of the book content.
 * @property {boolean} [updateAvailable] - Whether a newer version is available in the marketplace.
 * @property {string} [latestVersion] - The latest version available in the marketplace.
 */
export interface BookMetadata {
  id: string;
  name: string;
  description?: string;
  image?: string;
  creatorName: string;
  university: string;
  semester: string;
  subjectCode: string;
  version: string;
  originalId?: string;
  isPublished: boolean;
  marketplaceId?: string;
  createdAt: string;
  updatedAt: string;
  lastSyncAt?: string;
  downloadCount?: number;
  rating?: number;
  tags?: string[];
  estimatedHours?: number;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  language: string;
  updateAvailable?: boolean;
  latestVersion?: string;
}

/**
 * @interface BookVersion
 * @description Represents a specific version of a book, typically for release history.
 * @param {string} version - The semantic version number.
 * @param {string} releaseNotes - Notes describing the changes in this version.
 * @param {string} releasedAt - ISO string of the release date.
 * @param {string} [downloadUrl] - URL to download this specific version.
 * @param {number} [size] - The size of the book version file in bytes.
 * @param {string} [checksum] - A checksum (e.g., SHA-256) for integrity verification.
 */
export interface BookVersion {
  version: string;
  releaseNotes: string;
  releasedAt: string;
  downloadUrl?: string;
  size?: number;
  checksum?: string;
}

/**
 * @interface BookUpdateInfo
 * @description Contains information about an available update for a book.
 * @param {boolean} hasUpdate - Indicates if an update is available.
 * @param {string} currentVersion - The user's current version of the book.
 * @param {string} latestVersion - The latest version available.
 * @param {string} [releaseNotes] - The release notes for the latest version.
 * @param {number} [updateSize] - The size of the update in bytes.
 * @param {boolean} isBreakingChange - Indicates if the update is a major version bump (breaking change).
 */
export interface BookUpdateInfo {
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion: string;
  releaseNotes?: string;
  updateSize?: number;
  isBreakingChange: boolean;
}

/**
 * @class BookManager
 * @description Provides a suite of static methods for managing user-created books,
 * including CRUD operations, version control, and marketplace interactions,
 * all using localStorage as the primary data store.
 */
export class BookManager {
  private static readonly STORAGE_KEY = 'createdBooks';
  private static readonly VERSIONS_KEY = 'bookVersions';
  
  /**
   * @description Generate a new UUID (v4) for a book.
   * @returns {string} A new unique identifier.
   */
  static generateBookId(): string {
    return uuidv4();
  }

  /**
   * @description Create an initial semantic version string.
   * @returns {string} The initial version "1.0.0".
   */
  static generateInitialVersion(): string {
    return '1.0.0';
  }

  /**
   * @description Increments a semantic version string.
   * @param {string} currentVersion - The current version (e.g., "1.2.3").
   * @param {'major' | 'minor' | 'patch'} type - The type of version increment.
   * @returns {string} The new, incremented version string.
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
   * @description Compares two semantic version strings.
   * @param {string} version1 - The first version string.
   * @param {string} version2 - The second version string.
   * @returns {number} 1 if version1 > version2, -1 if version1 < version2, 0 if equal.
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
   * @description Creates a new book metadata object and saves it to localStorage.
   * @param {object} bookData - The initial data for the new book.
   * @returns {BookMetadata} The newly created book metadata object.
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
   * @description Saves a book to localStorage, handling potential quota errors by
   * attempting to clean up old data or save a minimal version of the book.
   * @param {BookMetadata} book - The book metadata to save.
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
          const minimalBook: Partial<BookMetadata> = {
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
            books[existingIndex] = minimalBook as BookMetadata;
          } else {
            books.push(minimalBook as BookMetadata);
          }
          
          localStorage.setItem(this.STORAGE_KEY, JSON.stringify(books));
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
   * @description Attempts to free up localStorage space by removing data
   * associated with old or temporary keys.
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
   * @description Retrieves all books from localStorage.
   * @returns {BookMetadata[]} An array of book metadata objects.
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
   * @description Retrieves a single book by its ID from localStorage.
   * @param {string} id - The ID of the book to retrieve.
   * @returns {BookMetadata | null} The book metadata object, or null if not found.
   */
  static getBookById(id: string): BookMetadata | null {
    const books = this.getAllBooks();
    return books.find(book => book.id === id) || null;
  }

  /**
   * @description Updates a book's metadata in localStorage.
   * @param {string} id - The ID of the book to update.
   * @param {Partial<BookMetadata>} updates - An object with the properties to update.
   * @returns {BookMetadata | null} The updated book metadata object, or null if not found.
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
   * @description Deletes a book and its associated data from localStorage.
   * @param {string} id - The ID of the book to delete.
   * @returns {boolean} True if the book was deleted, false otherwise.
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
   * @description Removes all data associated with a specific book ID from localStorage.
   * @param {string} bookId - The ID of the book whose data should be cleaned up.
   */
  static cleanupBookData(bookId: string): void {
    const keysToRemove: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (
        key.includes(`_${bookId}_`) ||
        key.startsWith(`chapters_${bookId}`) ||
        key.startsWith(`subtopics_${bookId}`) ||
        key.includes(bookId)
      )) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
  }

  /**
   * @description Simulates publishing a book to a marketplace.
   * @param {string} bookId - The ID of the book to publish.
   * @param {string} releaseNotes - Notes for this release.
   * @returns {Promise<{success: boolean; marketplaceId?: string; error?: string}>} A promise that resolves with the result.
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
   * @description Simulates checking for book updates from a marketplace.
   * @param {string} bookId - The ID of the book to check.
   * @returns {Promise<BookUpdateInfo>} A promise that resolves with the update information.
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
   * @description Migrates legacy book data in localStorage to the new format.
   * Tracks migration status to prevent re-running.
   * @returns {number} The number of books that were migrated.
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
        if (book.isPublished === undefined) {
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
   * @description Gathers all data for a book to prepare it for export.
   * @param {string} bookId - The ID of the book to export.
   * @returns {Promise<{success: boolean; exportData?: any; error?: string}>} A promise resolving with the exported data or an error.
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
   * @description Resets the migration flag in localStorage. For development/debugging purposes.
   */
  static resetMigrationFlag(): void {
    localStorage.removeItem('booksMigrated');
  }

  /**
   * @description Clears all book-related data from localStorage. Use with caution.
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
}

// Export for convenience
export { BookManager as default };
