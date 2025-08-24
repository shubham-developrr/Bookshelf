import { supabase } from './supabaseClient';

/**
 * UserDataStorageService - localStorage-like blob sync using Supabase Storage
 * Provides cross-device synchronization for any JavaScript data structures
 */

export interface UserData {
  [key: string]: any; // Flexible structure like localStorage
}

export interface UserDataBlob {
  data: UserData;
  metadata: {
    lastModified: string;
    version: string;
    deviceId: string;
    checksum?: string;
  };
}

export interface SyncStatus {
  lastSynced: Date | null;
  isSyncing: boolean;
  hasUnsyncedChanges: boolean;
  error: string | null;
}

export class UserDataStorageService {
  private bucketName = 'user-data';
  private data: UserData = {};
  private syncStatus: SyncStatus = {
    lastSynced: null,
    isSyncing: false,
    hasUnsyncedChanges: false,
    error: null
  };
  private userId: string | null = null;
  private debounceTimer: NodeJS.Timeout | null = null;
  private debounceDelay = 2000; // 2 seconds
  private callbacks: Set<(status: SyncStatus) => void> = new Set();

  /**
   * Initialize service for a specific user
   */
  async initialize(userId: string): Promise<void> {
    this.userId = userId;
    this.data = {};
    
    try {
      // Ensure bucket exists (will fail silently if it already exists)
      await this.ensureBucket();
      
      // Load data from cloud and localStorage
      await this.loadFromCloud();
    } catch (error) {
      console.error('Failed to initialize UserDataStorageService:', error);
      // Fallback to localStorage only
      this.loadFromLocalStorage();
    }
  }

  /**
   * Get file path for user data
   */
  private getFilePath(): string {
    if (!this.userId) throw new Error('User ID not set');
    return `user-${this.userId}/app-state.json`;
  }

  /**
   * Get localStorage key for user data
   */
  private getLocalStorageKey(): string {
    if (!this.userId) throw new Error('User ID not set');
    return `userData_${this.userId}`;
  }

  /**
   * Save data with localStorage API compatibility
   */
  async saveData(key: string, value: any): Promise<void> {
    const newData = { ...this.data, [key]: value };
    this.data = newData;
    
    // Save to localStorage immediately for fast access
    this.saveToLocalStorage(newData);
    
    // Mark as having unsynced changes
    this.updateSyncStatus({ hasUnsyncedChanges: true });
    
    // Debounced cloud sync
    this.debouncedCloudSync();
  }

  /**
   * Get data with localStorage API compatibility
   */
  getData(key: string): any {
    return this.data[key];
  }

  /**
   * Get all data
   */
  getAllData(): UserData {
    return { ...this.data };
  }

  /**
   * Remove data
   */
  async removeData(key: string): Promise<void> {
    const newData = { ...this.data };
    delete newData[key];
    this.data = newData;
    
    // Save to localStorage immediately
    this.saveToLocalStorage(newData);
    
    // Mark as having unsynced changes
    this.updateSyncStatus({ hasUnsyncedChanges: true });
    
    // Debounced cloud sync
    this.debouncedCloudSync();
  }

  /**
   * Clear all data
   */
  async clearAllData(): Promise<void> {
    this.data = {};
    this.saveToLocalStorage({});
    this.updateSyncStatus({ hasUnsyncedChanges: true });
    this.debouncedCloudSync();
  }

  /**
   * Get current sync status
   */
  getSyncStatus(): SyncStatus {
    return { ...this.syncStatus };
  }

  /**
   * Subscribe to sync status updates
   */
  onSyncStatusChange(callback: (status: SyncStatus) => void): () => void {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  /**
   * Force immediate cloud sync
   */
  async forceSync(): Promise<void> {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    await this.syncToCloud();
  }

  /**
   * Get data size in bytes
   */
  getDataSize(): number {
    const jsonString = JSON.stringify(this.data);
    return new Blob([jsonString]).size;
  }

  /**
   * Check storage usage and warn if approaching limits
   */
  checkStorageUsage(): { sizeBytes: number; sizeMB: number; warning: boolean } {
    const sizeBytes = this.getDataSize();
    const sizeMB = sizeBytes / (1024 * 1024);
    const warning = sizeMB > 40; // Warn at 80% of 50MB limit
    
    if (warning) {
      console.warn(`Data size: ${sizeMB.toFixed(2)}MB - approaching 50MB limit`);
    }
    
    return { sizeBytes, sizeMB, warning };
  }

  // ==================== PRIVATE METHODS ====================

  /**
   * Ensure the user-data bucket exists
   */
  private async ensureBucket(): Promise<void> {
    try {
      // Try to get bucket info first
      const { data, error } = await supabase.storage.getBucket(this.bucketName);
      
      if (error && error.message.includes('not found')) {
        // Bucket doesn't exist, but we can't create it from the client
        // It should be created via Supabase dashboard or SQL
        console.warn('user-data bucket not found. Please create it via Supabase dashboard.');
        throw new Error('Storage bucket not found. Please contact administrator.');
      } else if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Bucket check failed:', error);
      throw error;
    }
  }

  /**
   * Load data from Supabase Storage
   */
  private async loadFromCloud(): Promise<void> {
    if (!this.userId) return;

    try {
      this.updateSyncStatus({ isSyncing: true, error: null });
      
      const { data: fileData, error } = await supabase.storage
        .from(this.bucketName)
        .download(this.getFilePath());

      if (error) {
        if (error.message.includes('not found')) {
          // No existing data, start with empty object
          this.data = {};
          this.saveToLocalStorage({});
        } else {
          throw error;
        }
      } else {
        const text = await fileData.text();
        const parsed: UserDataBlob = JSON.parse(text);
        
        // Verify data integrity if checksum exists
        if (parsed.metadata.checksum) {
          const currentChecksum = this.generateChecksum(parsed.data);
          if (currentChecksum !== parsed.metadata.checksum) {
            throw new Error('Data integrity check failed');
          }
        }
        
        this.data = parsed.data;
        this.saveToLocalStorage(parsed.data);
        
        this.updateSyncStatus({
          lastSynced: new Date(parsed.metadata.lastModified),
          hasUnsyncedChanges: false
        });
      }
    } catch (error) {
      console.error('Failed to load from cloud:', error);
      this.updateSyncStatus({ 
        error: 'Failed to sync from cloud, using local data' 
      });
      
      // Fallback to localStorage
      this.loadFromLocalStorage();
    } finally {
      this.updateSyncStatus({ isSyncing: false });
    }
  }

  /**
   * Load data from localStorage
   */
  private loadFromLocalStorage(): void {
    try {
      const stored = localStorage.getItem(this.getLocalStorageKey());
      this.data = stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error('Failed to load from localStorage:', error);
      this.data = {};
    }
  }

  /**
   * Save data to localStorage
   */
  private saveToLocalStorage(userData: UserData): void {
    try {
      localStorage.setItem(this.getLocalStorageKey(), JSON.stringify(userData));
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
      // Handle quota exceeded error
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        this.updateSyncStatus({ 
          error: 'localStorage quota exceeded. Cloud sync will continue working.' 
        });
      }
    }
  }

  /**
   * Debounced cloud sync
   */
  private debouncedCloudSync(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(async () => {
      await this.syncToCloud();
      this.debounceTimer = null;
    }, this.debounceDelay);
  }

  /**
   * Sync data to Supabase Storage
   */
  private async syncToCloud(): Promise<void> {
    if (!this.userId || this.syncStatus.isSyncing) return;

    try {
      this.updateSyncStatus({ isSyncing: true, error: null });

      const blob: UserDataBlob = {
        data: this.data,
        metadata: {
          lastModified: new Date().toISOString(),
          version: '1.0.0',
          deviceId: navigator.userAgent,
          checksum: this.generateChecksum(this.data)
        }
      };

      const jsonString = JSON.stringify(blob, null, 2);
      const file = new File([jsonString], 'app-state.json', {
        type: 'application/json'
      });

      const { error } = await supabase.storage
        .from(this.bucketName)
        .upload(this.getFilePath(), file, {
          upsert: true, // Overwrite existing file
          contentType: 'application/json'
        });

      if (error) throw error;

      this.updateSyncStatus({
        lastSynced: new Date(),
        hasUnsyncedChanges: false,
        error: null
      });
    } catch (error) {
      console.error('Failed to sync to cloud:', error);
      this.updateSyncStatus({ 
        error: error instanceof Error ? error.message : 'Failed to sync to cloud'
      });
      throw error;
    } finally {
      this.updateSyncStatus({ isSyncing: false });
    }
  }

  /**
   * Generate checksum for data integrity
   */
  private generateChecksum(data: UserData): string {
    const jsonString = JSON.stringify(data);
    // Simple hash function (for production, consider using a proper crypto hash)
    let hash = 0;
    for (let i = 0; i < jsonString.length; i++) {
      const char = jsonString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  /**
   * Update sync status and notify callbacks
   */
  private updateSyncStatus(updates: Partial<SyncStatus>): void {
    this.syncStatus = { ...this.syncStatus, ...updates };
    this.callbacks.forEach(callback => {
      try {
        callback(this.syncStatus);
      } catch (error) {
        console.error('Error in sync status callback:', error);
      }
    });
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    this.callbacks.clear();
    this.userId = null;
    this.data = {};
  }
}

// Create and export singleton instance
export const userDataStorageService = new UserDataStorageService();