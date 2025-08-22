import { supabase } from './supabaseClient';
import { BookIdResolver } from '../utils/BookIdResolver';

/**
 * BOOK-BASED SUPABASE ASSET SERVICE
 * Assets are authenticated by Book ID, not User ID
 * This allows assets to be shared when books are exported/imported
 */

export interface BookAssetUploadResult {
  success: boolean;
  url?: string;
  error?: string;
  assetId?: string;
  metadata?: BookAssetMetadata;
  bookId?: string;
}

export interface BookAssetMetadata {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
  bookId: string;
  bookName: string;
  chapterId?: string;
  tabId?: string;
  assetType: 'image' | 'pdf' | 'video' | 'audio' | 'document';
  originalName: string;
  publicUrl: string;
  storageKey: string;
  isPublic: boolean;
  accessType: 'book-based';
}

export class BookBasedAssetService {
  private static readonly BUCKET_NAME = 'book-assets';
  private static readonly MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
  
  /**
   * Upload asset with book-based authentication
   * Assets are stored using Book ID instead of User ID for sharing
   */
  static async uploadBookAsset(
    file: File,
    bookName: string,
    context: {
      chapterId?: string;
      tabId?: string;
      assetType?: 'image' | 'pdf' | 'video' | 'audio' | 'document';
    } = {},
    onProgress?: (progress: number) => void
  ): Promise<BookAssetUploadResult> {
    try {
      console.log('🚀 Starting book-based asset upload...');
      console.log('📄 File details:', {
        name: file.name,
        size: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
        type: file.type,
        bookName
      });

      // Validate file
      const validation = this.validateFile(file);
      if (!validation.valid) {
        console.error('❌ File validation failed:', validation.error);
        return { success: false, error: validation.error };
      }

      onProgress?.(10);

      // Resolve Book ID from book name
      const bookContext = BookIdResolver.resolveBookId(bookName);
      if (!bookContext.isValidBook) {
        console.warn('⚠️ Book context validation warning, proceeding with fallback ID');
      }

      console.log('📖 Book context resolved:', bookContext);
      onProgress?.(20);

      // Generate unique asset ID and file path
      const assetId = this.generateAssetId();
      const fileExtension = this.getFileExtension(file.name);
      const storageKey = BookIdResolver.createPublicAssetPath(
        bookContext.bookId,
        context.chapterId || 'general',
        assetId,
        fileExtension
      );

      onProgress?.(30);
      console.log('📊 Upload progress: 30% - Storage key generated:', storageKey);

      // Upload to Supabase storage with dynamic timeout
      const timeoutMs = this.calculateUploadTimeout(file.size);
      console.log(`📤 Uploading with ${timeoutMs / 1000}s timeout...`);

      const uploadPromise = supabase.storage
        .from(this.BUCKET_NAME)
        .upload(storageKey, file, {
          cacheControl: '3600',
          upsert: false
        });

      const uploadResult = await this.withTimeout(uploadPromise, timeoutMs);
      
      if (uploadResult.error) {
        console.error('❌ Supabase upload failed:', uploadResult.error);
        return { 
          success: false, 
          error: `Upload failed: ${uploadResult.error.message}` 
        };
      }

      onProgress?.(80);
      console.log('✅ File uploaded to storage successfully');

      // Get public URL (book-based assets are public by default)
      const { data: publicUrlData } = supabase.storage
        .from(this.BUCKET_NAME)
        .getPublicUrl(storageKey);

      onProgress?.(90);
      console.log('📊 Upload progress: 90% - Public URL generated:', publicUrlData.publicUrl);

      // Create book-based metadata
      const metadata = BookIdResolver.createBookAssetMetadata(
        bookContext,
        context.chapterId || 'general',
        file,
        assetId,
        publicUrlData.publicUrl,
        storageKey
      );

      // Save metadata to database
      await this.saveBookAssetMetadata(metadata);

      onProgress?.(100);

      console.log(`✅ Book asset uploaded successfully: ${file.name} -> ${publicUrlData.publicUrl}`);
      console.log(`📖 Associated with Book ID: ${bookContext.bookId}`);
      
      return {
        success: true,
        url: publicUrlData.publicUrl,
        assetId,
        metadata: metadata as BookAssetMetadata,
        bookId: bookContext.bookId
      };

    } catch (error) {
      console.error('Book asset upload error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown upload error'
      };
    }
  }

  /**
   * Sync assets for imported book
   * Downloads and re-uploads assets to ensure availability
   */
  static async syncBookAssets(
    bookData: any,
    bookName: string,
    onProgress?: (progress: number, message: string) => void
  ): Promise<{ success: boolean; syncedCount: number; errors: string[] }> {
    console.log('🔄 Starting asset synchronization for book:', bookName);
    
    if (!BookIdResolver.needsAssetSync(bookData)) {
      console.log('✅ No assets need synchronization');
      return { success: true, syncedCount: 0, errors: [] };
    }

    const errors: string[] = [];
    let syncedCount = 0;

    try {
      // Extract all asset URLs from book data
      const assetUrls = this.extractAssetUrls(bookData);
      console.log(`🎯 Found ${assetUrls.length} assets to sync`);

      for (let i = 0; i < assetUrls.length; i++) {
        const assetUrl = assetUrls[i];
        onProgress?.(
          Math.round((i / assetUrls.length) * 100),
          `Syncing asset ${i + 1} of ${assetUrls.length}...`
        );

        try {
          const syncResult = await this.syncSingleAsset(assetUrl, bookName);
          if (syncResult.success) {
            syncedCount++;
            // Update the book data with new URL
            this.updateAssetUrlInBookData(bookData, assetUrl, syncResult.newUrl!);
          } else {
            errors.push(`Failed to sync ${assetUrl}: ${syncResult.error}`);
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          errors.push(`Error syncing ${assetUrl}: ${errorMessage}`);
        }
      }

      onProgress?.(100, `Synced ${syncedCount} assets`);

      return {
        success: errors.length === 0,
        syncedCount,
        errors
      };

    } catch (error) {
      console.error('Asset sync error:', error);
      return {
        success: false,
        syncedCount,
        errors: [`Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }

  /**
   * Download asset from URL and re-upload to book-based storage
   */
  private static async syncSingleAsset(
    assetUrl: string,
    bookName: string
  ): Promise<{ success: boolean; newUrl?: string; error?: string }> {
    try {
      // Skip if already a book-based asset
      if (assetUrl.includes('/book-assets/books/')) {
        console.log('⏭️ Asset already book-based, skipping:', assetUrl);
        return { success: true, newUrl: assetUrl };
      }

      // Download the asset
      const response = await fetch(assetUrl);
      if (!response.ok) {
        throw new Error(`Failed to download asset: ${response.status} ${response.statusText}`);
      }

      const blob = await response.blob();
      const filename = this.extractFilenameFromUrl(assetUrl);
      const file = new File([blob], filename, { type: blob.type });

      // Upload using book-based system
      const uploadResult = await this.uploadBookAsset(file, bookName, {
        chapterId: 'synced',
        assetType: this.detectAssetTypeFromBlob(blob)
      });

      if (uploadResult.success) {
        console.log(`✅ Asset synced: ${assetUrl} -> ${uploadResult.url}`);
        return { success: true, newUrl: uploadResult.url };
      } else {
        return { success: false, error: uploadResult.error };
      }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown sync error'
      };
    }
  }

  /**
   * Extract asset URLs from book data recursively
   */
  private static extractAssetUrls(obj: any, urls: string[] = []): string[] {
    if (typeof obj === 'string') {
      // Check if string is an asset URL
      if (/https:\/\/[^"'\s]+\.(jpg|jpeg|png|gif|pdf|webp)/i.test(obj)) {
        urls.push(obj);
      }
    } else if (Array.isArray(obj)) {
      obj.forEach(item => this.extractAssetUrls(item, urls));
    } else if (obj && typeof obj === 'object') {
      Object.values(obj).forEach(value => this.extractAssetUrls(value, urls));
    }
    
    return urls;
  }

  /**
   * Update asset URL in book data
   */
  private static updateAssetUrlInBookData(obj: any, oldUrl: string, newUrl: string): void {
    if (typeof obj === 'object' && obj !== null) {
      if (Array.isArray(obj)) {
        obj.forEach(item => this.updateAssetUrlInBookData(item, oldUrl, newUrl));
      } else {
        Object.keys(obj).forEach(key => {
          if (obj[key] === oldUrl) {
            obj[key] = newUrl;
          } else if (typeof obj[key] === 'object') {
            this.updateAssetUrlInBookData(obj[key], oldUrl, newUrl);
          }
        });
      }
    }
  }

  /**
   * Save book asset metadata to database
   */
  private static async saveBookAssetMetadata(metadata: BookAssetMetadata): Promise<void> {
    try {
      const { error } = await supabase
        .from('book_assets')
        .insert([metadata]);

      if (error) {
        console.warn('Failed to save book asset metadata:', error);
        // Don't throw error, metadata saving is optional
      } else {
        console.log('✅ Book asset metadata saved');
      }
    } catch (error) {
      console.warn('Error saving book asset metadata:', error);
    }
  }

  // Helper methods (similar to original but adapted for book-based system)
  
  private static validateFile(file: File): { valid: boolean; error?: string } {
    if (!file) return { valid: false, error: 'No file provided' };
    if (file.size > this.MAX_FILE_SIZE) {
      return { valid: false, error: `File size exceeds ${this.MAX_FILE_SIZE / 1024 / 1024}MB limit` };
    }

    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf',
      'video/mp4', 'video/webm',
      'audio/mp3', 'audio/wav', 'audio/ogg'
    ];

    if (!allowedTypes.includes(file.type)) {
      return { valid: false, error: 'Unsupported file type' };
    }

    return { valid: true };
  }

  private static generateAssetId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private static getFileExtension(filename: string): string {
    return filename.split('.').pop()?.toLowerCase() || '';
  }

  private static extractFilenameFromUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      return pathname.split('/').pop() || 'asset.bin';
    } catch {
      return 'asset.bin';
    }
  }

  private static detectAssetTypeFromBlob(blob: Blob): 'image' | 'pdf' | 'video' | 'audio' | 'document' {
    if (blob.type.startsWith('image/')) return 'image';
    if (blob.type === 'application/pdf') return 'pdf';
    if (blob.type.startsWith('video/')) return 'video';
    if (blob.type.startsWith('audio/')) return 'audio';
    return 'document';
  }

  private static calculateUploadTimeout(fileSize: number): number {
    // Base timeout of 90 seconds, +30s per 10MB
    const baseMb = 10 * 1024 * 1024; // 10MB
    const extraTime = Math.ceil((fileSize - baseMb) / baseMb) * 30000; // 30s per extra 10MB
    return Math.max(90000, 90000 + extraTime); // minimum 90s
  }

  private static async withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Upload timeout after ${timeoutMs / 1000}s`)), timeoutMs)
      )
    ]);
  }

  /**
   * Update asset URLs in book data to use book-based paths
   * This converts user-based URLs to book-based URLs for sharing
   */
  static updateAssetUrlsInData(data: any, bookName: string): any {
    const bookContext = BookIdResolver.resolveBookId(bookName);
    if (!bookContext) {
      console.warn(`⚠️ Could not resolve book ID for "${bookName}"`);
      return data;
    }

    return this.replaceAssetUrls(data, bookContext.bookId);
  }

  /**
   * Replace asset URLs in data recursively
   */
  private static replaceAssetUrls(obj: any, bookId: string): any {
    if (typeof obj === 'string') {
      // Check if this is an asset URL that needs to be updated
      const assetUrlMatch = obj.match(/https:\/\/[^"'\s]+\/book-assets\/([^"'\s]+)/);
      if (assetUrlMatch) {
        // Convert to book-based path
        const assetPath = assetUrlMatch[1];
        if (!assetPath.startsWith(`books/${bookId}/`)) {
          const fileName = assetPath.split('/').pop();
          const newPath = `books/${bookId}/assets/${fileName}`;
          return obj.replace(assetUrlMatch[1], newPath);
        }
      }
      return obj;
    } else if (Array.isArray(obj)) {
      return obj.map(item => this.replaceAssetUrls(item, bookId));
    } else if (obj && typeof obj === 'object') {
      const result: any = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = this.replaceAssetUrls(value, bookId);
      }
      return result;
    }
    
    return obj;
  }
}
