import { BookModule } from '../types/bookModule';

/**
 * @class BookModuleLoader
 * @description A singleton class to load, cache, and manage BookModule objects from various sources,
 * with persistence to localStorage.
 */
export class BookModuleLoader {
  private loadedBooks: Map<string, BookModule> = new Map();
  private storageKey = 'importedBookModules';

  /**
   * @description Initializes the loader by loading any persisted books from localStorage.
   */
  constructor() {
    this.loadFromLocalStorage();
  }

  /**
   * @description Loads and parses book modules from localStorage on initialization.
   * @private
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
   * @description Saves the current state of loaded books to localStorage.
   * @private
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
   * @description The main public method to load a book module from a BookModule object, a File, or a URL.
   * @param {string | File | BookModule} source - The source of the book module.
   * @returns {Promise<BookModule>} A promise that resolves with the loaded book module.
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
   * @description Fetches and parses a book module from a URL.
   * @private
   * @param {string} url - The URL of the book module JSON file.
   * @returns {Promise<BookModule>} A promise that resolves with the loaded book module.
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
   * @description Reads and parses a book module from a user-uploaded file.
   * @private
   * @param {File} file - The file object to load.
   * @returns {Promise<BookModule>} A promise that resolves with the loaded book module.
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
   * @description Validates the structure of a book module object, and if valid,
   * caches it and saves it to localStorage.
   * @private
   * @param {any} bookData - The book data object to validate.
   * @returns {BookModule} The validated book module.
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
   * @description A type guard to check if a given object conforms to the BookModule interface.
   * @private
   * @param {any} data - The object to validate.
   * @returns {data is BookModule} True if the object is a valid BookModule.
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
   * @description Returns an array of all currently loaded book modules.
   * @returns {BookModule[]} An array of book modules.
   */
  getLoadedBooks(): BookModule[] {
    return Array.from(this.loadedBooks.values());
  }

  /**
   * @description Retrieves a specific loaded book module by its ID.
   * @param {string} id - The ID of the book to retrieve.
   * @returns {BookModule | undefined} The book module if found, otherwise undefined.
   */
  getBook(id: string): BookModule | undefined {
    return this.loadedBooks.get(id);
  }

  /**
   * @description Removes a book module from the loader and localStorage.
   * @param {string} id - The ID of the book to unload.
   * @returns {boolean} True if the book was successfully unloaded, false otherwise.
   */
  unloadBook(id: string): boolean {
    const result = this.loadedBooks.delete(id);
    if (result) {
      this.saveToLocalStorage(); // Update localStorage
    }
    return result;
  }

  /**
   * @description A utility method to convert a legacy book object to the new BookModule format.
   * @param {any} legacyData - The legacy book object.
   * @returns {BookModule} The converted book module.
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

/**
 * @const bookLoader
 * @description The exported singleton instance of the BookModuleLoader class.
 */
export const bookLoader = new BookModuleLoader();
