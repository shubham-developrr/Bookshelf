import { useState, useEffect, useCallback } from 'react';
import backgroundUploadManager, { BackgroundUpload, BackgroundUploadState } from '../services/BackgroundUploadManager';

/**
 * Hook for using background upload functionality
 * Allows uploads to continue even when users navigate away
 */

export interface UseBackgroundUploadOptions {
  bookId?: string;
  bookName?: string; // Add book name for book-based authentication
  chapterId?: string;
  tabId?: string;
  componentType?: 'mindmap' | 'flashcard' | 'note' | 'general';
  onUploadComplete?: (upload: BackgroundUpload) => void;
  onUploadError?: (upload: BackgroundUpload) => void;
}

export interface UseBackgroundUploadReturn {
  // Upload functions
  startBackgroundUpload: (file: File, label: string) => string;
  
  // Upload state
  uploads: BackgroundUpload[];
  activeUploads: number;
  completedUploads: number;
  failedUploads: number;
  
  // Upload management
  cancelUpload: (id: string) => boolean;
  retryUpload: (id: string) => boolean;
  clearCompleted: () => void;
  
  // Upload queries
  getUpload: (id: string) => BackgroundUpload | undefined;
  getUploadsForCurrentContext: () => BackgroundUpload[];
  
  // Overall state
  hasActiveUploads: boolean;
  hasFailedUploads: boolean;
  totalProgress: number; // Average progress of all active uploads
}

export const useBackgroundUpload = (options: UseBackgroundUploadOptions = {}): UseBackgroundUploadReturn => {
  const [state, setState] = useState<BackgroundUploadState>(() => backgroundUploadManager.getState());

  // Subscribe to upload manager updates
  useEffect(() => {
    const unsubscribe = backgroundUploadManager.subscribe((newState) => {
      setState(newState);
      
      // Handle completion callbacks
      newState.uploads.forEach(upload => {
        if (upload.status === 'completed' && options.onUploadComplete) {
          // Check if this upload matches our context
          if (upload.context.chapterId === options.chapterId && 
              upload.context.tabId === options.tabId) {
            options.onUploadComplete(upload);
          }
        } else if (upload.status === 'failed' && options.onUploadError) {
          // Check if this upload matches our context
          if (upload.context.chapterId === options.chapterId && 
              upload.context.tabId === options.tabId) {
            options.onUploadError(upload);
          }
        }
      });
    });

    return unsubscribe;
  }, [options.chapterId, options.tabId, options.onUploadComplete, options.onUploadError]);

  // Start a background upload with book-based authentication
  const startBackgroundUpload = useCallback((file: File, label: string): string => {
    const assetType = file.type.startsWith('image/') ? 'image' :
                     file.type === 'application/pdf' ? 'pdf' :
                     file.type.startsWith('video/') ? 'video' :
                     file.type.startsWith('audio/') ? 'audio' : 'document';

    return backgroundUploadManager.addUpload(
      file,
      {
        bookId: options.bookId,
        chapterId: options.chapterId,
        tabId: options.tabId,
        assetType
      },
      {
        label,
        timestamp: new Date(),
        componentType: options.componentType || 'general'
      },
      options.bookName // Pass book name for book-based authentication
    );
  }, [options.bookId, options.bookName, options.chapterId, options.tabId, options.componentType]);

  // Cancel upload
  const cancelUpload = useCallback((id: string): boolean => {
    return backgroundUploadManager.cancelUpload(id);
  }, []);

  // Retry upload
  const retryUpload = useCallback((id: string): boolean => {
    return backgroundUploadManager.retryUpload(id);
  }, []);

  // Clear completed uploads
  const clearCompleted = useCallback(() => {
    backgroundUploadManager.clearCompleted();
  }, []);

  // Get specific upload
  const getUpload = useCallback((id: string): BackgroundUpload | undefined => {
    return backgroundUploadManager.getUpload(id);
  }, []);

  // Get uploads for current context
  const getUploadsForCurrentContext = useCallback((): BackgroundUpload[] => {
    return backgroundUploadManager.getUploadsForContext(
      options.chapterId || '', 
      options.tabId
    );
  }, [options.chapterId, options.tabId]);

  // Calculate derived state
  const hasActiveUploads = state.activeUploads > 0;
  const hasFailedUploads = state.failedUploads > 0;
  
  const totalProgress = state.uploads
    .filter(u => u.status === 'uploading')
    .reduce((sum, upload, _, arr) => {
      return sum + (upload.progress / (arr.length || 1));
    }, 0);

  return {
    startBackgroundUpload,
    uploads: state.uploads,
    activeUploads: state.activeUploads,
    completedUploads: state.completedUploads,
    failedUploads: state.failedUploads,
    cancelUpload,
    retryUpload,
    clearCompleted,
    getUpload,
    getUploadsForCurrentContext,
    hasActiveUploads,
    hasFailedUploads,
    totalProgress
  };
};
