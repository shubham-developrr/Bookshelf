import { useState, useCallback } from 'react';
import SupabaseAssetService, { AssetUploadResult, AssetMetadata, AssetLoadingState } from '../services/SupabaseAssetService';
import { BookBasedAssetService, BookAssetUploadResult } from '../services/BookBasedAssetService';

/**
 * React Hook for Asset Management
 * Provides easy-to-use asset upload, management, and migration functionality
 * Supports both user-based and book-based authentication
 */

export interface UseAssetManagerOptions {
  bookId?: string;
  bookName?: string;
  chapterId?: string;
  tabId?: string;
  useBookBasedAuth?: boolean; // New option for book-based authentication
  onUploadComplete?: (result: AssetUploadResult | BookAssetUploadResult) => void;
  onUploadError?: (error: string) => void;
  onMigrationComplete?: (originalUrl: string, newUrl: string) => void;
}

export interface UseAssetManagerReturn {
  // Upload functionality
  uploadAsset: (file: File) => Promise<AssetUploadResult | BookAssetUploadResult>;
  uploadMultipleAssets: (files: File[]) => Promise<(AssetUploadResult | BookAssetUploadResult)[]>;
  
  // Loading states
  isUploading: boolean;
  uploadProgress: number;
  uploadingFileName: string | null;
  
  // Multi-file upload states
  multiUploadProgress: { [fileName: string]: number };
  isMultiUploading: boolean;
  
  // Migration functionality
  migrateLocalAsset: (oldUrl: string) => Promise<string | null>;
  migrateAllBookAssets: () => Promise<{ success: boolean; migrated: number; failed: number }>;
  
  // Asset management
  deleteAsset: (assetId: string) => Promise<boolean>;
  getAssetMetadata: (assetId: string) => Promise<AssetMetadata | null>;
  
  // Error handling
  lastError: string | null;
  clearError: () => void;
  
  // Utility functions
  isCloudUrl: (url: string) => boolean;
  needsMigration: (url: string) => boolean;
}

export const useAssetManager = (options: UseAssetManagerOptions = {}): UseAssetManagerReturn => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadingFileName, setUploadingFileName] = useState<string | null>(null);
  const [multiUploadProgress, setMultiUploadProgress] = useState<{ [fileName: string]: number }>({});
  const [isMultiUploading, setIsMultiUploading] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setLastError(null);
  }, []);

  const uploadAsset = useCallback(async (file: File): Promise<AssetUploadResult | BookAssetUploadResult> => {
    try {
      setIsUploading(true);
      setUploadProgress(0);
      setUploadingFileName(file.name);
      setLastError(null);

      let result: AssetUploadResult | BookAssetUploadResult;

      // Use book-based authentication if requested and bookName is available
      if (options.useBookBasedAuth && options.bookName) {
        console.log(`🔄 Using book-based authentication for upload: ${options.bookName}`);
        result = await BookBasedAssetService.uploadBookAsset(
          file,
          options.bookName,
          {
            chapterId: options.chapterId,
            assetType: file.type.startsWith('image/') ? 'image' :
                      file.type === 'application/pdf' ? 'pdf' :
                      file.type.startsWith('video/') ? 'video' :
                      file.type.startsWith('audio/') ? 'audio' : 'document'
          },
          (progress) => setUploadProgress(progress)
        );
      } else {
        // Fallback to user-based authentication
        console.log(`🔄 Using user-based authentication for upload`);
        result = await SupabaseAssetService.uploadAsset(
          file,
          {
            bookId: options.bookId,
            chapterId: options.chapterId,
            tabId: options.tabId,
            assetType: file.type.startsWith('image/') ? 'image' :
                      file.type === 'application/pdf' ? 'pdf' :
                      file.type.startsWith('video/') ? 'video' :
                      file.type.startsWith('audio/') ? 'audio' : 'document'
          },
          (progress) => setUploadProgress(progress)
        );
      }

      if (result.success) {
        options.onUploadComplete?.(result);
        console.log(`✅ Asset uploaded: ${file.name} -> ${result.url}`);
      } else {
        setLastError(result.error || 'Upload failed');
        options.onUploadError?.(result.error || 'Upload failed');
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown upload error';
      setLastError(errorMessage);
      options.onUploadError?.(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsUploading(false);
      setUploadingFileName(null);
      setUploadProgress(0);
    }
  }, [options]);

  const uploadMultipleAssets = useCallback(async (files: File[]): Promise<AssetUploadResult[]> => {
    try {
      setIsMultiUploading(true);
      setMultiUploadProgress({});
      setLastError(null);

      const results = await SupabaseAssetService.uploadMultipleAssets(
        files,
        {
          bookId: options.bookId,
          chapterId: options.chapterId,
          tabId: options.tabId
        },
        (fileIndex, progress, fileName) => {
          setMultiUploadProgress(prev => ({
            ...prev,
            [fileName]: progress
          }));
        }
      );

      // Count successful uploads
      const successCount = results.filter(r => r.success).length;
      console.log(`✅ Multi-upload completed: ${successCount}/${files.length} successful`);

      return results;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Multi-upload failed';
      setLastError(errorMessage);
      return files.map(() => ({ success: false, error: errorMessage }));
    } finally {
      setIsMultiUploading(false);
      setMultiUploadProgress({});
    }
  }, [options]);

  const migrateLocalAsset = useCallback(async (oldUrl: string): Promise<string | null> => {
    try {
      setLastError(null);
      
      const newUrl = await SupabaseAssetService.migrateLocalAsset(oldUrl, {
        bookId: options.bookId,
        chapterId: options.chapterId,
        tabId: options.tabId
      });

      if (newUrl && newUrl !== oldUrl) {
        options.onMigrationComplete?.(oldUrl, newUrl);
        console.log(`✅ Asset migrated: ${oldUrl.substring(0, 50)}... -> ${newUrl}`);
      }

      return newUrl;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Migration failed';
      setLastError(errorMessage);
      console.error('Asset migration failed:', error);
      return null;
    }
  }, [options]);

  const migrateAllBookAssets = useCallback(async () => {
    if (!options.bookId) {
      setLastError('Book ID required for bulk migration');
      return { success: false, migrated: 0, failed: 0 };
    }

    try {
      setLastError(null);
      console.log('🔄 Starting bulk asset migration...');

      // For demonstration, we'll use book name from localStorage
      // In a real implementation, you might pass this as an option
      const books = JSON.parse(localStorage.getItem('createdBooks') || '[]');
      const book = books.find((b: any) => b.id === options.bookId);
      const bookName = book?.name || 'Unknown Book';

      const result = await SupabaseAssetService.migrateAllBookAssets(options.bookId, bookName);
      
      if (result.success) {
        console.log(`✅ Bulk migration completed: ${result.migrated} assets migrated`);
      } else {
        setLastError(`Migration partially failed: ${result.errors.join(', ')}`);
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Bulk migration failed';
      setLastError(errorMessage);
      return { success: false, migrated: 0, failed: 1 };
    }
  }, [options.bookId]);

  const deleteAsset = useCallback(async (assetId: string): Promise<boolean> => {
    try {
      setLastError(null);
      const result = await SupabaseAssetService.deleteAsset(assetId);
      
      if (!result.success) {
        setLastError(result.error || 'Delete failed');
      }

      return result.success;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Delete failed';
      setLastError(errorMessage);
      return false;
    }
  }, []);

  const getAssetMetadata = useCallback(async (assetId: string): Promise<AssetMetadata | null> => {
    try {
      return await SupabaseAssetService.getAssetMetadata(assetId);
    } catch (error) {
      console.error('Get asset metadata failed:', error);
      return null;
    }
  }, []);

  const isCloudUrl = useCallback((url: string): boolean => {
    return url.includes('supabase.co') || (url.startsWith('https://') && !url.startsWith('blob:'));
  }, []);

  const needsMigration = useCallback((url: string): boolean => {
    return url.startsWith('blob:') || url.startsWith('data:image/') || url.startsWith('data:application/pdf');
  }, []);

  return {
    // Upload functionality
    uploadAsset,
    uploadMultipleAssets,
    
    // Loading states
    isUploading,
    uploadProgress,
    uploadingFileName,
    multiUploadProgress,
    isMultiUploading,
    
    // Migration functionality
    migrateLocalAsset,
    migrateAllBookAssets,
    
    // Asset management
    deleteAsset,
    getAssetMetadata,
    
    // Error handling
    lastError,
    clearError,
    
    // Utility functions
    isCloudUrl,
    needsMigration
  };
};

export default useAssetManager;
