import { supabase } from './supabaseClient';

/**
 * SUPABASE ASSET STORAGE SERVICE
 * Handles cloud storage for all asset types (images, PDFs, videos)
 * Replaces blob URLs and base64 with permanent cloud URLs
 */

export interface AssetUploadResult {
  success: boolean;
  url?: string;
  error?: string;
  assetId?: string;
  metadata?: AssetMetadata;
}

export interface AssetMetadata {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
  userId: string;
  bookId?: string;
  chapterId?: string;
  tabId?: string;
  assetType: 'image' | 'pdf' | 'video' | 'audio' | 'document';
  originalName: string;
  publicUrl: string;
  storageKey: string;
}

export interface AssetLoadingState {
  isUploading: boolean;
  progress: number;
  error?: string;
}

export class SupabaseAssetService {
  private static readonly BUCKET_NAME = 'book-assets';
  private static readonly MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
  
  // ==================== ASSET UPLOAD ====================
  
  /**
   * Upload any asset type to Supabase storage
   */
  static async uploadAsset(
    file: File,
    context: {
      bookId?: string;
      chapterId?: string;
      tabId?: string;
      assetType?: 'image' | 'pdf' | 'video' | 'audio' | 'document';
    } = {},
    onProgress?: (progress: number) => void
  ): Promise<AssetUploadResult> {
    try {
      console.log('🚀 Starting asset upload process...');
      console.log('📄 File details:', {
        name: file.name,
        size: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
        type: file.type
      });

      // Validate file
      const validation = this.validateFile(file);
      if (!validation.valid) {
        console.error('❌ File validation failed:', validation.error);
        return { success: false, error: validation.error };
      }

      onProgress?.(10);
      console.log('📊 Upload progress: 10% - Validation complete');

      // Get authenticated user
      console.log('🔐 Checking user authentication...');
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) {
        console.error('❌ Auth error:', userError);
        return { success: false, error: `Authentication error: ${userError.message}` };
      }
      if (!user) {
        console.error('❌ User not authenticated');
        return { success: false, error: 'User not authenticated' };
      }
      
      console.log('✅ User authenticated:', user.id);

      // Generate unique file path
      const assetId = this.generateAssetId();
      const fileExtension = this.getFileExtension(file.name);
      const storageKey = this.buildStorageKey(user.id, assetId, fileExtension, context);

      onProgress?.(20);
      console.log('📊 Upload progress: 20% - Storage key generated:', storageKey);

      // Upload to Supabase storage with timeout
      console.log(`📤 Attempting upload to bucket: ${this.BUCKET_NAME}`);
      console.log(`📤 Storage key: ${storageKey}`);
      console.log(`📤 File info: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
      
      const uploadPromise = supabase.storage
        .from(this.BUCKET_NAME)
        .upload(storageKey, file, {
          cacheControl: '3600',
          upsert: true,
          contentType: file.type
        });

      // Dynamic timeout based on file size: 2 minutes for files >10MB, 90 seconds for smaller files
      const timeoutDuration = file.size > (10 * 1024 * 1024) ? 120000 : 90000; // 2min for >10MB, 90s for smaller
      console.log(`⏰ Upload timeout set to: ${timeoutDuration / 1000}s based on file size`);
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error(`Upload timeout - request took longer than ${timeoutDuration / 1000} seconds`)), timeoutDuration)
      );

      const { data: uploadData, error: uploadError } = await Promise.race([
        uploadPromise,
        timeoutPromise
      ]) as { data: any; error: any };

      if (uploadError) {
        console.error('❌ Upload failed - Raw error:', uploadError);
        console.error('❌ Upload error details:', JSON.stringify(uploadError, null, 2));
        
        // Check for specific error types
        if (uploadError.message.includes('timeout')) {
          console.error('🚨 TIMEOUT ERROR: Upload took too long');
          console.error('🔧 This could be due to slow network or large file size');
        } else if (uploadError.message.includes('Policy')) {
          console.error('🚨 STORAGE POLICY ERROR: Missing or incorrect storage policies!');
          console.error('🔧 Debug info:');
          console.error(`   - Bucket: ${this.BUCKET_NAME}`);
          console.error(`   - Storage key: ${storageKey}`);
          console.error(`   - User ID: ${user.id}`);
        } else if (uploadError.message.includes('fetch')) {
          console.error('🚨 NETWORK ERROR: Cannot reach Supabase storage');
          console.error('🔧 Check your internet connection and Supabase configuration');
        }
        
        return { success: false, error: `Upload failed: ${uploadError.message}` };
      }

      console.log('✅ File uploaded successfully to storage:', uploadData.path);
      
      onProgress?.(80);
      console.log('📊 Upload progress: 80% - File uploaded successfully');

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from(this.BUCKET_NAME)
        .getPublicUrl(storageKey);

      onProgress?.(90);
      console.log('📊 Upload progress: 90% - Public URL generated:', publicUrlData.publicUrl);

      // Create metadata
      const metadata: AssetMetadata = {
        id: assetId,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        uploadedAt: new Date().toISOString(),
        userId: user.id,
        bookId: context.bookId,
        chapterId: context.chapterId,
        tabId: context.tabId,
        assetType: context.assetType || this.detectAssetType(file.type),
        originalName: file.name,
        publicUrl: publicUrlData.publicUrl,
        storageKey
      };

      // Save metadata to database
      await this.saveAssetMetadata(metadata);

      onProgress?.(100);

      console.log(`✅ Asset uploaded successfully: ${file.name} -> ${publicUrlData.publicUrl}`);
      
      return {
        success: true,
        url: publicUrlData.publicUrl,
        assetId,
        metadata
      };

    } catch (error) {
      console.error('Asset upload error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown upload error'
      };
    }
  }

  /**
   * Upload multiple assets at once
   */
  static async uploadMultipleAssets(
    files: File[],
    context: {
      bookId?: string;
      chapterId?: string;
      tabId?: string;
    } = {},
    onProgress?: (fileIndex: number, progress: number, fileName: string) => void
  ): Promise<AssetUploadResult[]> {
    const results: AssetUploadResult[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const result = await this.uploadAsset(
        file,
        { 
          ...context, 
          assetType: this.detectAssetType(file.type) 
        },
        (progress) => onProgress?.(i, progress, file.name)
      );
      results.push(result);
    }
    
    return results;
  }

  // ==================== ASSET RETRIEVAL ====================

  /**
   * Get asset metadata by ID
   */
  static async getAssetMetadata(assetId: string): Promise<AssetMetadata | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('asset_metadata')
        .select('*')
        .eq('id', assetId)
        .eq('user_id', user.id)
        .single();

      if (error || !data) {
        console.warn(`Asset metadata not found: ${assetId}`);
        return null;
      }

      return data as AssetMetadata;
    } catch (error) {
      console.error('Get asset metadata error:', error);
      return null;
    }
  }

  /**
   * Get all assets for a specific context
   */
  static async getAssetsByContext(context: {
    bookId?: string;
    chapterId?: string;
    tabId?: string;
    assetType?: string;
  }): Promise<AssetMetadata[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      let query = supabase
        .from('asset_metadata')
        .select('*')
        .eq('user_id', user.id);

      if (context.bookId) query = query.eq('book_id', context.bookId);
      if (context.chapterId) query = query.eq('chapter_id', context.chapterId);
      if (context.tabId) query = query.eq('tab_id', context.tabId);
      if (context.assetType) query = query.eq('asset_type', context.assetType);

      const { data, error } = await query.order('uploaded_at', { ascending: false });

      if (error) {
        console.error('Get assets by context error:', error);
        return [];
      }

      return (data as AssetMetadata[]) || [];
    } catch (error) {
      console.error('Get assets by context error:', error);
      return [];
    }
  }

  // ==================== ASSET MANAGEMENT ====================

  /**
   * Delete asset from storage and database
   */
  static async deleteAsset(assetId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      // Get metadata first
      const metadata = await this.getAssetMetadata(assetId);
      if (!metadata) {
        return { success: false, error: 'Asset not found' };
      }

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from(this.BUCKET_NAME)
        .remove([metadata.storageKey]);

      if (storageError) {
        console.warn('Storage delete warning:', storageError);
        // Continue with metadata deletion even if storage delete fails
      }

      // Delete metadata from database
      const { error: dbError } = await supabase
        .from('asset_metadata')
        .delete()
        .eq('id', assetId)
        .eq('user_id', user.id);

      if (dbError) {
        console.error('Database delete error:', dbError);
        return { success: false, error: dbError.message };
      }

      console.log(`✅ Asset deleted successfully: ${assetId}`);
      return { success: true };

    } catch (error) {
      console.error('Delete asset error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown delete error'
      };
    }
  }

  /**
   * Replace blob URL or base64 with cloud URL in localStorage
   */
  static async migrateLocalAsset(
    oldAssetUrl: string,
    context: {
      bookId?: string;
      chapterId?: string;
      tabId?: string;
    } = {}
  ): Promise<string | null> {
    try {
      // Skip if already a cloud URL
      if (this.isCloudUrl(oldAssetUrl)) {
        return oldAssetUrl;
      }

      // Convert base64 or blob URL to file
      const file = await this.convertAssetUrlToFile(oldAssetUrl);
      if (!file) {
        console.warn(`Could not convert asset URL to file: ${oldAssetUrl.substring(0, 100)}...`);
        return null;
      }

      // Upload to cloud
      const result = await this.uploadAsset(file, context);
      
      if (result.success && result.url) {
        console.log(`✅ Migrated local asset to cloud: ${file.name}`);
        return result.url;
      } else {
        console.error(`Migration failed: ${result.error}`);
        return null;
      }

    } catch (error) {
      console.error('Asset migration error:', error);
      return null;
    }
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Validate file before upload
   */
  private static validateFile(file: File): { valid: boolean; error?: string } {
    // Size check
    if (file.size > this.MAX_FILE_SIZE) {
      return {
        valid: false,
        error: `File too large. Maximum size is ${this.MAX_FILE_SIZE / 1024 / 1024}MB`
      };
    }

    // Type check
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
      'application/pdf',
      'video/mp4', 'video/webm', 'video/ogg',
      'audio/mpeg', 'audio/wav', 'audio/ogg'
    ];

    if (!allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: `Unsupported file type: ${file.type}`
      };
    }

    return { valid: true };
  }

  /**
   * Generate unique asset ID
   */
  private static generateAssetId(): string {
    return `asset_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * Get file extension from filename
   */
  private static getFileExtension(filename: string): string {
    return filename.split('.').pop()?.toLowerCase() || '';
  }

  /**
   * Build storage key for organized asset storage
   */
  private static buildStorageKey(
    userId: string,
    assetId: string,
    extension: string,
    context: {
      bookId?: string;
      chapterId?: string;
      tabId?: string;
    }
  ): string {
    const pathParts = [userId];
    
    if (context.bookId) pathParts.push(context.bookId);
    if (context.chapterId) pathParts.push(context.chapterId);
    if (context.tabId) pathParts.push(`tab_${context.tabId}`);
    
    return `${pathParts.join('/')}/${assetId}.${extension}`;
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
   * Check if URL is already a cloud URL
   */
  private static isCloudUrl(url: string): boolean {
    return url.includes('supabase.co') || url.startsWith('https://') && !url.startsWith('blob:');
  }

  /**
   * Convert asset URL (base64 or blob) to File object
   */
  private static async convertAssetUrlToFile(assetUrl: string): Promise<File | null> {
    try {
      console.log(`🔄 Converting asset URL: ${assetUrl.substring(0, 100)}...`);
      
      if (assetUrl.startsWith('data:')) {
        // Base64 conversion
        const response = await fetch(assetUrl);
        const blob = await response.blob();
        const fileName = `asset_${Date.now()}.${this.getMimeTypeExtension(blob.type)}`;
        return new File([blob], fileName, { type: blob.type });
        
      } else if (assetUrl.startsWith('blob:')) {
        // Blob URL conversion - these often fail if the original context is gone
        console.log(`⚠️ Attempting to fetch blob URL (may fail if context is lost): ${assetUrl}`);
        
        try {
          const response = await fetch(assetUrl);
          if (!response.ok) {
            console.warn(`❌ Blob URL fetch failed with status ${response.status}: ${assetUrl.substring(0, 100)}...`);
            return null;
          }
          
          const blob = await response.blob();
          const fileName = `asset_${Date.now()}.${this.getMimeTypeExtension(blob.type)}`;
          console.log(`✅ Successfully converted blob URL to file: ${fileName}`);
          return new File([blob], fileName, { type: blob.type });
        } catch (fetchError) {
          console.warn(`❌ Blob URL no longer accessible (context lost): ${assetUrl.substring(0, 100)}...`);
          return null;
        }
        
      } else {
        // Unknown format
        console.warn(`❌ Unknown asset URL format: ${assetUrl.substring(0, 100)}...`);
        return null;
      }
      
    } catch (error) {
      console.error('Convert asset URL to file error:', error);
      return null;
    }
  }

  /**
   * Get file extension from MIME type
   */
  private static getMimeTypeExtension(mimeType: string): string {
    const extensions: { [key: string]: string } = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'image/webp': 'webp',
      'application/pdf': 'pdf',
      'video/mp4': 'mp4',
      'video/webm': 'webm',
      'audio/mpeg': 'mp3',
      'audio/wav': 'wav'
    };
    return extensions[mimeType] || 'bin';
  }

  /**
   * Save asset metadata to database
   */
  private static async saveAssetMetadata(metadata: AssetMetadata): Promise<void> {
    const { error } = await supabase
      .from('asset_metadata')
      .upsert({
        id: metadata.id,
        user_id: metadata.userId,
        file_name: metadata.fileName,
        file_size: metadata.fileSize,
        mime_type: metadata.mimeType,
        uploaded_at: metadata.uploadedAt,
        book_id: metadata.bookId,
        chapter_id: metadata.chapterId,
        tab_id: metadata.tabId,
        asset_type: metadata.assetType,
        original_name: metadata.originalName,
        public_url: metadata.publicUrl,
        storage_key: metadata.storageKey
      });

    if (error) {
      console.error('Save asset metadata error:', error);
      throw error;
    }
  }

  // ==================== MIGRATION HELPERS ====================

  /**
   * Migrate all local assets in localStorage for a specific book
   */
  static async migrateAllBookAssets(bookId: string, bookName: string): Promise<{
    success: boolean;
    migrated: number;
    failed: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let migrated = 0;
    let failed = 0;

    console.log(`🔄 Starting asset migration for book: ${bookName}`);

    try {
      // Get all localStorage keys related to this book
      const bookKeys = this.getBookRelatedKeys(bookId, bookName);
      
      for (const key of bookKeys) {
        const content = localStorage.getItem(key);
        if (!content) continue;

        try {
          const data = JSON.parse(content);
          const migrated_data = await this.migrateDataStructure(data, { bookId });
          
          if (migrated_data !== data) {
            localStorage.setItem(key, JSON.stringify(migrated_data));
            migrated++;
          }
        } catch (parseError) {
          // Handle non-JSON data
          continue;
        }
      }

      console.log(`✅ Asset migration completed: ${migrated} migrated, ${failed} failed`);
      
      return {
        success: errors.length === 0,
        migrated,
        failed,
        errors
      };

    } catch (error) {
      console.error('Book asset migration error:', error);
      return {
        success: false,
        migrated,
        failed,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  /**
   * Recursively migrate data structures containing asset URLs
   */
  private static async migrateDataStructure(
    data: any,
    context: { bookId?: string; chapterId?: string; tabId?: string }
  ): Promise<any> {
    if (typeof data === 'string') {
      // Check if it's an asset URL that needs migration
      if (data.startsWith('blob:') || data.startsWith('data:image/') || data.startsWith('data:application/pdf')) {
        const cloudUrl = await this.migrateLocalAsset(data, context);
        return cloudUrl || data; // Fallback to original if migration fails
      }
      return data;
    }

    if (Array.isArray(data)) {
      return await Promise.all(data.map(item => this.migrateDataStructure(item, context)));
    }

    if (typeof data === 'object' && data !== null) {
      const migratedData: any = {};
      for (const [key, value] of Object.entries(data)) {
        migratedData[key] = await this.migrateDataStructure(value, context);
      }
      return migratedData;
    }

    return data;
  }

  /**
   * Get all localStorage keys related to a specific book
   */
  private static getBookRelatedKeys(bookId: string, bookName: string): string[] {
    const keys: string[] = [];
    const normalizedBookName = bookName.replace(/\s+/g, '_');

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && this.isBookRelatedKey(key, bookId, normalizedBookName)) {
        keys.push(key);
      }
    }

    return keys;
  }

  /**
   * Check if localStorage key is related to a specific book
   */
  private static isBookRelatedKey(key: string, bookId: string, normalizedBookName: string): boolean {
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
      key.includes(`customtab_`) && key.includes(`_${normalizedBookName}_`)
    );
  }

  /**
   * Debug upload issues by testing various aspects
   */
  static async debugUploadIssues(): Promise<void> {
    console.log('🔍 Starting upload debug diagnostics...');
    
    try {
      // 1. Test authentication
      console.log('1️⃣ Testing authentication...');
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) {
        console.error('❌ Auth error:', authError);
        return;
      }
      if (!user) {
        console.error('❌ No authenticated user');
        return;
      }
      console.log('✅ User authenticated:', user.id);

      // 2. Test bucket access
      console.log('2️⃣ Testing bucket access...');
      try {
        const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
        if (bucketError) {
          console.error('❌ Bucket list error:', bucketError);
        } else {
          const bookAssetsBucket = buckets.find(b => b.id === this.BUCKET_NAME);
          if (bookAssetsBucket) {
            console.log('✅ book-assets bucket found:', bookAssetsBucket);
          } else {
            console.error('❌ book-assets bucket not found');
            console.log('Available buckets:', buckets.map(b => b.id));
          }
        }
      } catch (bucketTestError) {
        console.error('❌ Bucket test failed:', bucketTestError);
      }

      // 3. Test small file upload
      console.log('3️⃣ Testing small file upload...');
      try {
        const testContent = 'test upload content';
        const testFile = new File([testContent], 'test.txt', { type: 'text/plain' });
        const testKey = `${user.id}/debug/test_${Date.now()}.txt`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from(this.BUCKET_NAME)
          .upload(testKey, testFile, { upsert: true });
          
        if (uploadError) {
          console.error('❌ Test upload failed:', uploadError);
        } else {
          console.log('✅ Test upload successful:', uploadData.path);
          
          // Clean up test file
          await supabase.storage.from(this.BUCKET_NAME).remove([testKey]);
          console.log('🧹 Test file cleaned up');
        }
      } catch (testUploadError) {
        console.error('❌ Test upload exception:', testUploadError);
      }

      // 4. Test policies
      console.log('4️⃣ Storage policies should allow uploads for user:', user.id);
      console.log('Expected path pattern:', `${user.id}/[chapterId]/[optional_tab]/[filename]`);

      console.log('🏁 Debug diagnostics complete');
      
    } catch (error) {
      console.error('❌ Debug diagnostics failed:', error);
    }
  }
}

export default SupabaseAssetService;
