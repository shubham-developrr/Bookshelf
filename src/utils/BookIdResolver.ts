/**
 * Book ID Resolution Utility
 * Resolves Book ID from book names and creates unique book identifiers
 * for asset authentication that are book-specific rather than user-specific
 */

import { BookManager } from './BookManager';

export interface BookIdContext {
  bookId: string;
  bookName: string;
  isValidBook: boolean;
}

export class BookIdResolver {
  
  /**
   * Extract or generate Book ID from book name
   * This creates a consistent Book ID that can be used for asset authentication
   */
  static resolveBookId(bookName: string): BookIdContext {
    try {
      // Get all books from localStorage
      const books = JSON.parse(localStorage.getItem('createdBooks') || '[]');
      const importedBooks = JSON.parse(localStorage.getItem('importedBooks') || '[]');
      const allBooks = [...books, ...importedBooks];

      // Find book by name (case-insensitive)
      const matchedBook = allBooks.find((book: any) => 
        book.name?.toLowerCase().trim() === bookName.toLowerCase().trim()
      );

      if (matchedBook && matchedBook.id) {
        console.log(`📖 Found Book ID for "${bookName}": ${matchedBook.id}`);
        return {
          bookId: matchedBook.id,
          bookName: bookName,
          isValidBook: true
        };
      }

      // If no existing book found, generate a deterministic ID based on book name
      // This ensures consistency across sessions and users for the same book
      const deterministicId = this.generateDeterministicBookId(bookName);
      
      console.log(`📖 Generated deterministic Book ID for "${bookName}": ${deterministicId}`);
      return {
        bookId: deterministicId,
        bookName: bookName,
        isValidBook: true
      };
      
    } catch (error) {
      console.error('Error resolving Book ID:', error);
      
      // Fallback: generate deterministic ID
      const fallbackId = this.generateDeterministicBookId(bookName);
      return {
        bookId: fallbackId,
        bookName: bookName,
        isValidBook: false
      };
    }
  }

  /**
   * Generate a deterministic Book ID based on book name
   * This ensures the same book name always gets the same ID
   * Perfect for asset sharing across different users/exports
   */
  static generateDeterministicBookId(bookName: string): string {
    // Clean and normalize book name
    const cleanName = bookName.toLowerCase().trim().replace(/[^a-z0-9]/g, '_');
    
    // Generate a consistent hash-like ID
    let hash = 0;
    for (let i = 0; i < cleanName.length; i++) {
      const char = cleanName.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    
    // Convert to positive number and create book ID
    const positiveHash = Math.abs(hash).toString(16);
    return `book_${cleanName.substring(0, 20)}_${positiveHash}`;
  }

  /**
   * Create public asset paths that are book-based, not user-based
   * These paths will work for anyone who has access to the book
   */
  static createPublicAssetPath(bookId: string, chapterId: string, assetId: string, extension: string): string {
    // Public path structure: books/{bookId}/{chapterId}/{assetId}.{extension}
    return `books/${bookId}/${chapterId}/${assetId}.${extension}`;
  }

  /**
   * Create asset metadata for book-based authentication
   */
  static createBookAssetMetadata(
    bookContext: BookIdContext,
    chapterId: string,
    file: File,
    assetId: string,
    publicUrl: string,
    storageKey: string
  ) {
    return {
      id: assetId,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      uploadedAt: new Date().toISOString(),
      bookId: bookContext.bookId,
      bookName: bookContext.bookName,
      chapterId,
      assetType: this.detectAssetType(file.type),
      originalName: file.name,
      publicUrl,
      storageKey,
      isPublic: true, // Book assets are public by default
      accessType: 'book-based' as const // Indicates this is book-based authentication
    };
  }

  /**
   * Detect asset type from MIME type
   */
  private static detectAssetType(mimeType: string): 'image' | 'pdf' | 'video' | 'audio' | 'document' {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType === 'application/pdf') return 'pdf';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    return 'document';
  }

  /**
   * Validate if a book ID is properly formatted
   */
  static isValidBookId(bookId: string): boolean {
    // Check if it's a UUID (new format) or deterministic book ID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const deterministicRegex = /^book_[a-z0-9_]+_[0-9a-f]+$/;
    
    return uuidRegex.test(bookId) || deterministicRegex.test(bookId);
  }

  /**
   * Extract Book ID from asset URL for validation
   */
  static extractBookIdFromAssetUrl(assetUrl: string): string | null {
    try {
      // Expected URL format: .../storage/v1/object/public/book-assets/books/{bookId}/...
      const match = assetUrl.match(/\/books\/([^\/]+)\//);
      return match ? match[1] : null;
    } catch {
      return null;
    }
  }

  /**
   * Check if an imported book needs asset synchronization
   */
  static needsAssetSync(bookData: any): boolean {
    // Check if book has references to external assets that need to be synced
    if (!bookData || typeof bookData !== 'object') return false;

    // Look for asset URLs in the book data
    const stringified = JSON.stringify(bookData);
    const hasAssetUrls = /https:\/\/[^"'\s]+\.(jpg|jpeg|png|gif|pdf|webp)/i.test(stringified);
    
    return hasAssetUrls;
  }
}
