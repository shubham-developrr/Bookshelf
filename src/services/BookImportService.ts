import { AssetSyncService } from './AssetSyncService';
import { BookBasedAssetService } from './BookBasedAssetService';
import { BookIdResolver } from '../utils/BookIdResolver';

/**
 * BOOK IMPORT SERVICE WITH ASSET SYNCHRONIZATION
 * Handles complete book import process including asset sync for cross-user compatibility
 */

export interface BookImportResult {
  success: boolean;
  bookName: string;
  bookId?: string;
  assetsProcessed: number;
  assetsSynced: number;
  assetsSkipped: number;
  assetsFailed: number;
  errors: string[];
  warnings: string[];
  importDuration: number;
  assetSyncDuration: number;
}

export class BookImportService {

  /**
   * Import a book with automatic asset synchronization
   * This ensures all assets work even if imported from a different user
   */
  static async importBookWithAssetSync(
    bookData: any,
    options: {
      syncAssets?: boolean;
      syncTimeout?: number;
      onProgress?: (stage: string, progress: number, message: string) => void;
    } = {}
  ): Promise<BookImportResult> {
    const {
      syncAssets = true,
      syncTimeout = 300000, // 5 minutes
      onProgress
    } = options;

    const startTime = Date.now();
    console.log('📥 Starting book import with asset synchronization...');

    const result: BookImportResult = {
      success: false,
      bookName: bookData?.metadata?.name || 'Unknown Book',
      assetsProcessed: 0,
      assetsSynced: 0,
      assetsSkipped: 0,
      assetsFailed: 0,
      errors: [],
      warnings: [],
      importDuration: 0,
      assetSyncDuration: 0
    };

    try {
      // Stage 1: Validate and prepare book data
      onProgress?.('validation', 10, 'Validating book data...');
      const validationResult = await this.validateBookData(bookData);
      if (!validationResult.isValid) {
        result.errors.push(...validationResult.errors);
        return result;
      }

      // Stage 2: Import book to localStorage
      onProgress?.('import', 30, 'Importing book data...');
      const importResult = await this.importBookData(bookData);
      if (!importResult.success) {
        result.errors.push(...importResult.errors);
        return result;
      }

      result.bookId = importResult.bookId;
      result.bookName = importResult.bookName;

      // Stage 3: Asset synchronization (if enabled)
      if (syncAssets && AssetSyncService.needsAssetSync(bookData)) {
        onProgress?.('assets', 50, 'Starting asset synchronization...');
        
        const assetSyncStart = Date.now();
        try {
          const syncResult = await this.performAssetSyncWithTimeout(
            bookData,
            result.bookName,
            syncTimeout,
            (progress, message) => {
              onProgress?.('assets', 50 + (progress * 0.4), message);
            }
          );

          result.assetsProcessed = syncResult.totalAssets;
          result.assetsSynced = syncResult.syncedAssets;
          result.assetsSkipped = syncResult.skippedAssets;
          result.assetsFailed = syncResult.failedAssets;
          result.assetSyncDuration = Date.now() - assetSyncStart;

          if (syncResult.errors.length > 0) {
            result.warnings.push(...syncResult.errors);
          }

          if (!syncResult.success && syncResult.failedAssets > 0) {
            result.warnings.push(`Some assets failed to sync (${syncResult.failedAssets}/${syncResult.totalAssets})`);
          }

        } catch (syncError) {
          const errorMsg = syncError instanceof Error ? syncError.message : 'Asset sync failed';
          result.warnings.push(`Asset synchronization failed: ${errorMsg}`);
          result.assetSyncDuration = Date.now() - assetSyncStart;
        }
      } else {
        console.log('⏭️ Asset synchronization skipped');
        onProgress?.('assets', 90, 'Asset sync skipped - no assets need syncing');
      }

      // Stage 4: Finalization
      onProgress?.('finalization', 95, 'Finalizing import...');
      await this.finalizeImport(result.bookName, result.bookId!);

      result.importDuration = Date.now() - startTime;
      result.success = true;

      console.log(`✅ Book import completed successfully in ${result.importDuration}ms`);
      console.log(`📊 Assets: ${result.assetsSynced} synced, ${result.assetsSkipped} skipped, ${result.assetsFailed} failed`);

      onProgress?.('complete', 100, 'Import completed successfully!');
      return result;

    } catch (error) {
      result.importDuration = Date.now() - startTime;
      result.errors.push(error instanceof Error ? error.message : 'Unknown import error');
      
      console.error('❌ Book import failed:', error);
      onProgress?.('error', 0, 'Import failed');
      return result;
    }
  }

  /**
   * Validate book data structure and content
   */
  private static async validateBookData(bookData: any): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check basic structure
    if (!bookData || typeof bookData !== 'object') {
      errors.push('Invalid book data: not an object');
      return { isValid: false, errors, warnings };
    }

    // Check metadata
    if (!bookData.metadata) {
      errors.push('Book data missing metadata');
    } else {
      if (!bookData.metadata.name || typeof bookData.metadata.name !== 'string') {
        errors.push('Book metadata missing valid name');
      }
      if (!bookData.metadata.id) {
        warnings.push('Book metadata missing ID - will generate new ID');
      }
    }

    // Check content structure
    if (!bookData.content) {
      warnings.push('Book data missing content structure');
    }

    // Check for assets that might need syncing
    const assetCount = this.countAssetsInBookData(bookData);
    if (assetCount > 0) {
      console.log(`📊 Found ${assetCount} assets in book data`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Import book data to localStorage with proper structure
   */
  private static async importBookData(bookData: any): Promise<{
    success: boolean;
    bookName: string;
    bookId: string;
    errors: string[];
  }> {
    const errors: string[] = [];
    
    try {
      const bookName = bookData.metadata?.name || `Imported Book ${Date.now()}`;
      let bookId = bookData.metadata?.id;

      // Generate new ID if missing
      if (!bookId) {
        bookId = BookIdResolver.generateDeterministicBookId(bookName);
        console.log(`📝 Generated new book ID: ${bookId}`);
      }

      // Import to localStorage using the established pattern
      const books = JSON.parse(localStorage.getItem('createdBooks') || '[]');
      
      // Check for existing book
      const existingIndex = books.findIndex((b: any) => 
        b.id === bookId || b.name === bookName
      );

      const bookEntry = {
        id: bookId,
        name: bookName,
        description: bookData.metadata?.description || '',
        category: bookData.metadata?.category || 'Imported',
        createdAt: bookData.metadata?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        imported: true,
        importedAt: new Date().toISOString()
      };

      if (existingIndex >= 0) {
        books[existingIndex] = bookEntry;
        console.log(`📝 Updated existing book: ${bookName}`);
      } else {
        books.push(bookEntry);
        console.log(`📝 Added new book: ${bookName}`);
      }

      localStorage.setItem('createdBooks', JSON.stringify(books));

      // Import chapters if available
      if (bookData.content?.chapters) {
        const chapters = Object.values(bookData.content.chapters);
        localStorage.setItem(`chapters_${bookId}`, JSON.stringify(chapters));
        console.log(`📝 Imported ${chapters.length} chapters`);
      }

      // Import template data (flashcards, notes, etc.)
      await this.importTemplateData(bookData, bookName, bookId);

      return {
        success: true,
        bookName,
        bookId,
        errors
      };

    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'Unknown import error');
      return {
        success: false,
        bookName: bookData.metadata?.name || 'Unknown',
        bookId: '',
        errors
      };
    }
  }

  /**
   * Import template data (flashcards, notes, MCQs, etc.)
   */
  private static async importTemplateData(
    bookData: any, 
    bookName: string, 
    bookId: string
  ): Promise<void> {
    const templateTypes = ['flashcards', 'mcq', 'qa', 'notes', 'mindmaps', 'videos'];
    let importedTemplates = 0;

    for (const templateType of templateTypes) {
      if (bookData.content?.templates?.[templateType]) {
        const templateData = bookData.content.templates[templateType];
        
        // Import for each chapter
        Object.entries(templateData).forEach(([chapterKey, data]) => {
          const storageKey = `${templateType}_${bookName}_${chapterKey}`;
          localStorage.setItem(storageKey, JSON.stringify(data));
          importedTemplates++;
        });
      }
    }

    if (importedTemplates > 0) {
      console.log(`📝 Imported ${importedTemplates} template datasets`);
    }
  }

  /**
   * Perform asset sync with timeout protection
   */
  private static async performAssetSyncWithTimeout(
    bookData: any,
    bookName: string,
    timeoutMs: number,
    onProgress?: (progress: number, message: string) => void
  ): Promise<any> {
    const syncPromise = AssetSyncService.synchronizeBookAssets(
      bookData,
      bookName,
      onProgress
    );

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Asset sync timeout after ${timeoutMs / 1000} seconds`));
      }, timeoutMs);
    });

    return Promise.race([syncPromise, timeoutPromise]);
  }

  /**
   * Finalize the import process
   */
  private static async finalizeImport(bookName: string, bookId: string): Promise<void> {
    try {
      // Update any final metadata or references
      console.log(`🎯 Finalizing import for "${bookName}" (${bookId})`);
      
      // Could add any final validation or cleanup here
      
      console.log(`✅ Import finalized successfully`);
    } catch (error) {
      console.warn('⚠️ Import finalization warning:', error);
      // Don't throw error for finalization issues
    }
  }

  /**
   * Count assets in book data for progress reporting
   */
  private static countAssetsInBookData(obj: any, count = 0): number {
    if (typeof obj === 'string') {
      // Check if string is an asset URL
      if (/https:\/\/[^"'\s]+\.(jpg|jpeg|png|gif|pdf|webp|mp4|mp3|wav)/i.test(obj)) {
        return count + 1;
      }
    } else if (Array.isArray(obj)) {
      return obj.reduce((acc, item) => acc + this.countAssetsInBookData(item, 0), count);
    } else if (obj && typeof obj === 'object') {
      return Object.values(obj).reduce((acc: number, value) => {
        return acc + this.countAssetsInBookData(value, 0);
      }, count);
    }
    
    return count;
  }

  /**
   * Check if a book has been imported (has import metadata)
   */
  static isImportedBook(bookName: string): boolean {
    try {
      const books = JSON.parse(localStorage.getItem('createdBooks') || '[]');
      const book = books.find((b: any) => b.name === bookName);
      return book?.imported === true;
    } catch {
      return false;
    }
  }

  /**
   * Get import information for a book
   */
  static getImportInfo(bookName: string): {
    isImported: boolean;
    importedAt?: string;
    originalId?: string;
  } {
    try {
      const books = JSON.parse(localStorage.getItem('createdBooks') || '[]');
      const book = books.find((b: any) => b.name === bookName);
      
      return {
        isImported: book?.imported === true,
        importedAt: book?.importedAt,
        originalId: book?.originalId
      };
    } catch {
      return { isImported: false };
    }
  }
}
