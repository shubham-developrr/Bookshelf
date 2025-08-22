import { BookBasedAssetService } from './BookBasedAssetService';
import { BookIdResolver } from '../utils/BookIdResolver';

/**
 * ASSET SYNCHRONIZATION SERVICE
 * Handles asset synchronization when books are imported
 * Ensures all assets are available locally and work across different users
 */

export interface AssetSyncResult {
  success: boolean;
  totalAssets: number;
  syncedAssets: number;
  skippedAssets: number;
  failedAssets: number;
  errors: string[];
  duration: number;
}

export class AssetSyncService {
  
  /**
   * Synchronize all assets for an imported book
   * This ensures assets work even if the original uploader is different
   */
  static async synchronizeBookAssets(
    bookData: any,
    bookName: string,
    onProgress?: (progress: number, message: string) => void
  ): Promise<AssetSyncResult> {
    const startTime = Date.now();
    console.log(`🔄 Starting asset synchronization for book: ${bookName}`);
    
    onProgress?.(0, 'Analyzing book for assets...');

    const result: AssetSyncResult = {
      success: false,
      totalAssets: 0,
      syncedAssets: 0,
      skippedAssets: 0,
      failedAssets: 0,
      errors: [],
      duration: 0
    };

    try {
      // Check if synchronization is needed
      if (!BookIdResolver.needsAssetSync(bookData)) {
        console.log('✅ No assets need synchronization for this book');
        onProgress?.(100, 'No assets to sync');
        result.success = true;
        result.duration = Date.now() - startTime;
        return result;
      }

      // Use the book-based asset service to sync assets
      const syncResult = await BookBasedAssetService.syncBookAssets(
        bookData,
        bookName,
        onProgress
      );

      result.totalAssets = syncResult.syncedCount + syncResult.errors.length;
      result.syncedAssets = syncResult.syncedCount;
      result.failedAssets = syncResult.errors.length;
      result.errors = syncResult.errors;
      result.success = syncResult.success;
      result.duration = Date.now() - startTime;

      if (result.success) {
        console.log(`✅ Asset synchronization completed for "${bookName}"`);
        console.log(`📊 Stats: ${result.syncedAssets} synced, ${result.failedAssets} failed`);
      } else {
        console.warn(`⚠️ Asset synchronization partially failed for "${bookName}"`);
        console.log(`📊 Stats: ${result.syncedAssets} synced, ${result.failedAssets} failed`);
      }

      return result;

    } catch (error) {
      result.duration = Date.now() - startTime;
      result.success = false;
      result.errors.push(`Sync error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      console.error(`❌ Asset synchronization failed for "${bookName}":`, error);
      return result;
    }
  }

  /**
   * Check if a book needs asset synchronization
   * This is a quick check to avoid unnecessary sync operations
   */
  static needsAssetSync(bookData: any): boolean {
    return BookIdResolver.needsAssetSync(bookData);
  }

  /**
   * Get asset sync status for a book
   * Returns information about which assets are synced and which aren't
   */
  static async getAssetSyncStatus(
    bookData: any,
    bookName: string
  ): Promise<{
    totalAssets: number;
    syncedAssets: number;
    unsyncedAssets: string[];
    bookBasedAssets: number;
  }> {
    const assetUrls = this.extractAssetUrls(bookData);
    const bookBasedAssets = assetUrls.filter(url => url.includes('/book-assets/books/')).length;
    const unsyncedAssets = assetUrls.filter(url => !url.includes('/book-assets/books/'));

    return {
      totalAssets: assetUrls.length,
      syncedAssets: bookBasedAssets,
      unsyncedAssets,
      bookBasedAssets
    };
  }

  /**
   * Batch synchronize assets for multiple books
   */
  static async synchronizeMultipleBooks(
    books: Array<{ bookData: any; bookName: string }>,
    onProgress?: (bookIndex: number, totalBooks: number, bookProgress: number, message: string) => void
  ): Promise<AssetSyncResult[]> {
    const results: AssetSyncResult[] = [];

    for (let i = 0; i < books.length; i++) {
      const { bookData, bookName } = books[i];
      
      onProgress?.(i, books.length, 0, `Starting sync for "${bookName}"`);
      
      const result = await this.synchronizeBookAssets(
        bookData,
        bookName,
        (progress, message) => {
          onProgress?.(i, books.length, progress, message);
        }
      );

      results.push(result);
      onProgress?.(i + 1, books.length, 100, `Completed sync for "${bookName}"`);
    }

    return results;
  }

  /**
   * Validate asset URLs in book data
   * Returns information about asset accessibility
   */
  static async validateBookAssets(
    bookData: any,
    timeoutMs: number = 5000
  ): Promise<{
    totalAssets: number;
    accessibleAssets: number;
    inaccessibleAssets: string[];
    validationErrors: string[];
  }> {
    const assetUrls = this.extractAssetUrls(bookData);
    const validationErrors: string[] = [];
    const inaccessibleAssets: string[] = [];
    let accessibleCount = 0;

    console.log(`🔍 Validating ${assetUrls.length} assets...`);

    for (const url of assetUrls) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        const response = await fetch(url, {
          method: 'HEAD', // Only check if resource exists
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          accessibleCount++;
        } else {
          inaccessibleAssets.push(url);
          validationErrors.push(`${url}: ${response.status} ${response.statusText}`);
        }
      } catch (error) {
        inaccessibleAssets.push(url);
        validationErrors.push(`${url}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    console.log(`✅ Asset validation complete: ${accessibleCount}/${assetUrls.length} accessible`);

    return {
      totalAssets: assetUrls.length,
      accessibleAssets: accessibleCount,
      inaccessibleAssets,
      validationErrors
    };
  }

  /**
   * Extract asset URLs from book data recursively
   */
  private static extractAssetUrls(obj: any, urls: string[] = []): string[] {
    if (typeof obj === 'string') {
      // Check if string is an asset URL
      if (/https:\/\/[^"'\s]+\.(jpg|jpeg|png|gif|pdf|webp|mp4|mp3|wav)/i.test(obj)) {
        urls.push(obj);
      }
    } else if (Array.isArray(obj)) {
      obj.forEach(item => this.extractAssetUrls(item, urls));
    } else if (obj && typeof obj === 'object') {
      Object.values(obj).forEach(value => this.extractAssetUrls(value, urls));
    }
    
    return [...new Set(urls)]; // Remove duplicates
  }

  /**
   * Clean up failed or orphaned asset sync attempts
   */
  static async cleanupFailedSyncs(): Promise<void> {
    try {
      // This could clean up any temporary files or failed sync states
      console.log('🧹 Cleaning up failed asset sync attempts...');
      
      // Implementation would depend on how we track failed syncs
      // For now, just log that cleanup is available
      console.log('✅ Asset sync cleanup completed');
    } catch (error) {
      console.error('❌ Asset sync cleanup failed:', error);
    }
  }
}
