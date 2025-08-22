import SupabaseAssetService, { AssetUploadResult } from '../services/SupabaseAssetService';
import { BookBasedAssetService, BookAssetUploadResult } from '../services/BookBasedAssetService';
import { BookIdResolver } from '../utils/BookIdResolver';

/**
 * BACKGROUND UPLOAD MANAGER
 * Handles uploads in the background even when users navigate away from tabs
 * Persists upload state and provides recovery mechanisms
 */

export interface BackgroundUpload {
  id: string;
  file: File;
  fileName: string;
  fileSize: number;
  bookName?: string; // Add book name for book-based authentication
  context: {
    bookId?: string;
    chapterId?: string;
    tabId?: string;
    assetType?: 'image' | 'pdf' | 'video' | 'audio' | 'document';
  };
  metadata: {
    label: string;
    timestamp: Date;
    componentType: 'mindmap' | 'flashcard' | 'note' | 'general';
  };
  status: 'pending' | 'uploading' | 'completed' | 'failed' | 'paused';
  progress: number;
  error?: string;
  result?: AssetUploadResult | BookAssetUploadResult; // Support both upload result types
  retryCount: number;
}

export interface BackgroundUploadState {
  uploads: BackgroundUpload[];
  activeUploads: number;
  completedUploads: number;
  failedUploads: number;
}

class BackgroundUploadManager {
  private uploads: Map<string, BackgroundUpload> = new Map();
  private activeUploadPromises: Map<string, Promise<void>> = new Map();
  private maxConcurrentUploads = 3;
  private listeners: ((state: BackgroundUploadState) => void)[] = [];
  private isProcessing = false;

  constructor() {
    this.loadFromStorage();
    this.startProcessingLoop();
  }

  /**
   * Add a new upload to the background queue with book-based authentication
   */
  addUpload(
    file: File,
    context: BackgroundUpload['context'],
    metadata: BackgroundUpload['metadata'],
    bookName?: string
  ): string {
    const id = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const upload: BackgroundUpload = {
      id,
      file,
      fileName: file.name,
      fileSize: file.size,
      bookName, // Store book name for book-based authentication
      context,
      metadata,
      status: 'pending',
      progress: 0,
      retryCount: 0
    };

    this.uploads.set(id, upload);
    this.saveToStorage();
    this.notifyListeners();
    
    console.log(`📤 Added book-based background upload: ${file.name} (ID: ${id}, Book: ${bookName})`);
    
    // Start processing if not already running
    if (!this.isProcessing) {
      this.processUploads();
    }
    
    return id;
  }

  /**
   * Get upload status by ID
   */
  getUpload(id: string): BackgroundUpload | undefined {
    return this.uploads.get(id);
  }

  /**
   * Get all uploads for a specific context
   */
  getUploadsForContext(chapterId: string, tabId?: string): BackgroundUpload[] {
    return Array.from(this.uploads.values()).filter(upload => 
      upload.context.chapterId === chapterId && 
      upload.context.tabId === tabId
    );
  }

  /**
   * Cancel an upload
   */
  cancelUpload(id: string): boolean {
    const upload = this.uploads.get(id);
    if (upload && upload.status !== 'completed') {
      upload.status = 'paused';
      this.uploads.set(id, upload);
      this.saveToStorage();
      this.notifyListeners();
      console.log(`⏸️ Cancelled upload: ${upload.fileName}`);
      return true;
    }
    return false;
  }

  /**
   * Retry a failed upload
   */
  retryUpload(id: string): boolean {
    const upload = this.uploads.get(id);
    if (upload && (upload.status === 'failed' || upload.status === 'paused')) {
      upload.status = 'pending';
      upload.progress = 0;
      upload.error = undefined;
      upload.retryCount++;
      this.uploads.set(id, upload);
      this.saveToStorage();
      this.notifyListeners();
      console.log(`🔄 Retrying upload: ${upload.fileName} (attempt ${upload.retryCount})`);
      this.processUploads();
      return true;
    }
    return false;
  }

  /**
   * Remove completed or failed uploads
   */
  clearCompleted(): void {
    const toRemove: string[] = [];
    this.uploads.forEach((upload, id) => {
      if (upload.status === 'completed' || upload.status === 'failed') {
        toRemove.push(id);
      }
    });
    
    toRemove.forEach(id => this.uploads.delete(id));
    this.saveToStorage();
    this.notifyListeners();
    console.log(`🧹 Cleared ${toRemove.length} completed/failed uploads`);
  }

  /**
   * Get current state summary
   */
  getState(): BackgroundUploadState {
    const uploads = Array.from(this.uploads.values());
    return {
      uploads,
      activeUploads: uploads.filter(u => u.status === 'uploading').length,
      completedUploads: uploads.filter(u => u.status === 'completed').length,
      failedUploads: uploads.filter(u => u.status === 'failed').length
    };
  }

  /**
   * Subscribe to state changes
   */
  subscribe(listener: (state: BackgroundUploadState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Process uploads in background
   */
  private async processUploads(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    while (true) {
      const pendingUploads = Array.from(this.uploads.values())
        .filter(upload => upload.status === 'pending');
      
      const activeCount = this.activeUploadPromises.size;
      
      if (pendingUploads.length === 0 || activeCount >= this.maxConcurrentUploads) {
        // No pending uploads or max concurrent reached, wait a bit
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // If no active uploads and no pending, stop processing
        if (activeCount === 0 && pendingUploads.length === 0) {
          break;
        }
        continue;
      }

      // Start next upload
      const upload = pendingUploads[0];
      this.startUpload(upload);
    }

    this.isProcessing = false;
  }

  /**
   * Start individual upload
   */
  private startUpload(upload: BackgroundUpload): void {
    upload.status = 'uploading';
    this.uploads.set(upload.id, upload);
    this.saveToStorage();
    this.notifyListeners();

    const uploadPromise = this.performUpload(upload)
      .finally(() => {
        this.activeUploadPromises.delete(upload.id);
      });

    this.activeUploadPromises.set(upload.id, uploadPromise);
  }

  /**
   * Perform the actual upload using book-based authentication
   */
  private async performUpload(upload: BackgroundUpload): Promise<void> {
    try {
      console.log(`🚀 Starting book-based background upload: ${upload.fileName}`);
      console.log(`📖 Book: ${upload.bookName || 'Unknown'}`);
      
      let result: AssetUploadResult | BookAssetUploadResult;

      // Use book-based authentication if book name is available
      if (upload.bookName) {
        console.log('📖 Using book-based asset service...');
        result = await BookBasedAssetService.uploadBookAsset(
          upload.file,
          upload.bookName,
          {
            chapterId: upload.context.chapterId,
            tabId: upload.context.tabId,
            assetType: upload.context.assetType
          },
          (progress) => {
            upload.progress = progress;
            this.uploads.set(upload.id, upload);
            this.notifyListeners(); // Real-time progress updates
          }
        );
      } else {
        console.log('👤 Falling back to user-based asset service...');
        result = await SupabaseAssetService.uploadAsset(
          upload.file,
          upload.context,
          (progress) => {
            upload.progress = progress;
            this.uploads.set(upload.id, upload);
            this.notifyListeners(); // Real-time progress updates
          }
        );
      }

      upload.result = result;
      
      if (result.success) {
        upload.status = 'completed';
        upload.progress = 100;
        const authType = upload.bookName ? 'book-based' : 'user-based';
        console.log(`✅ ${authType} background upload completed: ${upload.fileName} -> ${result.url}`);
      } else {
        upload.status = 'failed';
        upload.error = result.error;
        console.error(`❌ Background upload failed: ${upload.fileName} - ${result.error}`);
      }

    } catch (error) {
      upload.status = 'failed';
      upload.error = error instanceof Error ? error.message : 'Unknown upload error';
      console.error(`❌ Background upload exception: ${upload.fileName}`, error);
    }

    this.uploads.set(upload.id, upload);
    this.saveToStorage();
    this.notifyListeners();
  }

  /**
   * Notify all listeners of state changes
   */
  private notifyListeners(): void {
    const state = this.getState();
    this.listeners.forEach(listener => {
      try {
        listener(state);
      } catch (error) {
        console.error('Error in background upload listener:', error);
      }
    });
  }

  /**
   * Save uploads to localStorage for persistence
   */
  private saveToStorage(): void {
    try {
      // Convert Map to array and serialize (excluding File objects)
      const uploadsData = Array.from(this.uploads.values()).map(upload => ({
        ...upload,
        file: {
          name: upload.file.name,
          size: upload.file.size,
          type: upload.file.type,
          lastModified: upload.file.lastModified
        }
      }));
      
      localStorage.setItem('backgroundUploads', JSON.stringify(uploadsData));
    } catch (error) {
      console.error('Failed to save background uploads to storage:', error);
    }
  }

  /**
   * Load uploads from localStorage
   */
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem('backgroundUploads');
      if (stored) {
        const uploadsData = JSON.parse(stored);
        
        // Only restore completed uploads and failed uploads for retry
        uploadsData.forEach((uploadData: any) => {
          if (uploadData.status === 'completed' || uploadData.status === 'failed') {
            // Create a placeholder File object for completed/failed uploads
            const file = new File([''], uploadData.file.name, {
              type: uploadData.file.type,
              lastModified: uploadData.file.lastModified
            });
            
            const upload: BackgroundUpload = {
              ...uploadData,
              file,
              timestamp: new Date(uploadData.timestamp)
            };
            
            this.uploads.set(upload.id, upload);
          }
        });
        
        console.log(`📂 Restored ${this.uploads.size} background uploads from storage`);
      }
    } catch (error) {
      console.error('Failed to load background uploads from storage:', error);
    }
  }

  /**
   * Start processing loop with periodic checks
   */
  private startProcessingLoop(): void {
    // Check for new uploads every 5 seconds
    setInterval(() => {
      if (!this.isProcessing) {
        const pendingCount = Array.from(this.uploads.values())
          .filter(upload => upload.status === 'pending').length;
          
        if (pendingCount > 0) {
          console.log(`⏰ Background upload check: ${pendingCount} pending uploads`);
          this.processUploads();
        }
      }
    }, 5000);
  }
}

// Export singleton instance
export const backgroundUploadManager = new BackgroundUploadManager();
export default backgroundUploadManager;
