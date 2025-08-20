import { BookModule } from '../types/bookModule';

export class BookModuleLoader {
  private loadedBooks: Map<string, BookModule> = new Map();
  private storageKey = 'importedBookModules';

  constructor() {
    this.loadFromLocalStorage();
  }

  /**
   * Load books from localStorage on initialization
   */
  private loadFromLocalStorage(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const booksArray: BookModule[] = JSON.parse(stored);
        booksArray.forEach(book => {
          this.loadedBooks.set(book.id, book);
        });
        console.log(`Loaded ${booksArray.length} books from localStorage`);
      }
    } catch (error) {
      console.error('Error loading books from localStorage:', error);
    }
  }

  /**
   * Save current books to localStorage
   */
  private saveToLocalStorage(): void {
    try {
      const booksArray = Array.from(this.loadedBooks.values());
      localStorage.setItem(this.storageKey, JSON.stringify(booksArray));
      console.log(`Saved ${booksArray.length} books to localStorage`);
    } catch (error) {
      console.error('Error saving books to localStorage:', error);
    }
  }

  /**
   * Load a book module from various sources
   */
  async loadBookModule(source: string | File | BookModule): Promise<BookModule> {
    if (typeof source === 'object' && 'id' in source) {
      // Already a BookModule object
      return this.validateAndCache(source);
    } else if (source instanceof File) {
      // Load from uploaded file
      return this.loadFromFile(source);
    } else {
      // Load from URL or local path
      return this.loadFromUrl(source);
    }
  }

  /**
   * Load book module from URL or local JSON file
   */
  private async loadFromUrl(url: string): Promise<BookModule> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to load book module: ${response.statusText}`);
      }
      const bookData = await response.json();
      return this.validateAndCache(bookData);
    } catch (error) {
      console.error('Error loading book module from URL:', error);
      throw error;
    }
  }

  /**
   * Load book module from uploaded file
   */
  private async loadFromFile(file: File): Promise<BookModule> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const bookData = JSON.parse(e.target?.result as string);
          resolve(this.validateAndCache(bookData));
        } catch (error) {
          reject(new Error('Invalid JSON format in book module file'));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read book module file'));
      reader.readAsText(file);
    });
  }

  /**
   * Validate book module structure and cache it
   */
  private validateAndCache(bookData: any): BookModule {
    if (!this.isValidBookModule(bookData)) {
      throw new Error('Invalid book module format');
    }
    
    this.loadedBooks.set(bookData.id, bookData);
    this.saveToLocalStorage(); // Persist to localStorage
    return bookData;
  }

  /**
   * Validate book module structure
   */
  private isValidBookModule(data: any): data is BookModule {
    return (
      data &&
      typeof data.id === 'string' &&
      typeof data.title === 'string' &&
      typeof data.author === 'string' &&
      typeof data.version === 'string' &&
      Array.isArray(data.subjects) &&
      data.subjects.every((subject: any) => 
        subject.id && subject.title && Array.isArray(subject.units)
      )
    );
  }

  /**
   * Get all loaded book modules
   */
  getLoadedBooks(): BookModule[] {
    return Array.from(this.loadedBooks.values());
  }

  /**
   * Get a specific book module by ID
   */
  getBook(id: string): BookModule | undefined {
    return this.loadedBooks.get(id);
  }

  /**
   * Unload a book module
   */
  unloadBook(id: string): boolean {
    const result = this.loadedBooks.delete(id);
    if (result) {
      this.saveToLocalStorage(); // Update localStorage
    }
    return result;
  }

  /**
   * Convert existing hardcoded book data to new format
   */
  convertLegacyBook(legacyData: any): BookModule {
    // Migration logic for existing books
    return {
      id: legacyData.id || legacyData.title.toLowerCase().replace(/\s+/g, '-'),
      title: legacyData.title,
      author: legacyData.author || 'Unknown',
      version: '1.0.0',
      curriculum: legacyData.curriculum || 'General',
      description: legacyData.description || '',
      subjects: legacyData.subjects || [],
      metadata: {
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
        tags: legacyData.tags || [],
        difficulty: legacyData.difficulty || 'intermediate',
        language: 'en',
        estimatedHours: legacyData.estimatedHours || 10
      }
    };
  }
}

// Singleton instance
export const bookLoader = new BookModuleLoader();
