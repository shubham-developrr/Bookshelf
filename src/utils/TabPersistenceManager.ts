/**
 * Tab Persistence Manager for Interactive Study Bookshelf
 * Handles tab isolation storage patterns and auto-save with debouncing
 * 
 * Key Pattern: ${templateType}_${book}_${chapter}_${tabId}
 * Priority: tab-specific → base → default
 */

import { debounce } from 'lodash';

export type TemplateType = 'FLASHCARD' | 'MCQ' | 'QA' | 'NOTES' | 'MINDMAP' | 'VIDEOS';

export interface TabData {
  id: string;
  name: string;
  type: TemplateType;
  data: any;
  lastModified: string;
  autoSaveEnabled: boolean;
}

export interface TabPersistenceConfig {
  autoSaveDelay: number; // milliseconds
  enableCompression: boolean;
  maxHistoryVersions: number;
}

export class TabPersistenceManager {
  private static instance: TabPersistenceManager;
  private autoSaveCallbacks: Map<string, ReturnType<typeof debounce>> = new Map();
  private config: TabPersistenceConfig = {
    autoSaveDelay: 1000, // 1 second debounce as per copilot instructions
    enableCompression: false,
    maxHistoryVersions: 5
  };

  private constructor() {
    // Private constructor for singleton pattern
  }

  static getInstance(): TabPersistenceManager {
    if (!TabPersistenceManager.instance) {
      TabPersistenceManager.instance = new TabPersistenceManager();
    }
    return TabPersistenceManager.instance;
  }

  /**
   * Generate storage key with tab isolation pattern
   * Pattern: ${templateType}_${book}_${chapter}_${tabId}
   */
  private generateStorageKey(
    templateType: TemplateType, 
    bookName: string, 
    chapterName: string, 
    tabId?: string
  ): string {
    const baseKey = `${templateType}_${bookName.replace(/\s+/g, '_')}_${chapterName.replace(/\s+/g, '_')}`;
    return tabId ? `${baseKey}_${tabId}` : baseKey;
  }

  /**
   * Get data with priority fallback: tab-specific → base → default
   * This implements the documented priority pattern from copilot instructions
   */
  getData<T>(
    templateType: TemplateType,
    bookName: string,
    chapterName: string,
    tabId?: string,
    defaultValue: T = null as T
  ): T {
    // Priority 1: Check tab-specific data first
    if (tabId) {
      const tabSpecificKey = this.generateStorageKey(templateType, bookName, chapterName, tabId);
      const tabSpecificData = localStorage.getItem(tabSpecificKey);
      if (tabSpecificData) {
        try {
          return JSON.parse(tabSpecificData);
        } catch (error) {
          console.warn(`Failed to parse tab-specific data for key: ${tabSpecificKey}`, error);
        }
      }
    }

    // Priority 2: Check base data (without tabId)
    const baseKey = this.generateStorageKey(templateType, bookName, chapterName);
    const baseData = localStorage.getItem(baseKey);
    if (baseData) {
      try {
        return JSON.parse(baseData);
      } catch (error) {
        console.warn(`Failed to parse base data for key: ${baseKey}`, error);
      }
    }

    // Priority 3: Return default value
    return defaultValue;
  }

  /**
   * Save data with tab isolation support and auto-save debouncing
   */
  saveData<T>(
    templateType: TemplateType,
    bookName: string,
    chapterName: string,
    data: T,
    tabId?: string,
    autoSave: boolean = true
  ): void {
    const storageKey = this.generateStorageKey(templateType, bookName, chapterName, tabId);
    
    if (autoSave) {
      // Auto-save with debouncing (1-second delay as per copilot instructions)
      this.setupAutoSave(storageKey, data);
    } else {
      // Immediate save
      this.performSave(storageKey, data);
    }
  }

  /**
   * Setup auto-save with debouncing - implements the documented auto-save pattern
   */
  private setupAutoSave<T>(storageKey: string, data: T): void {
    // Cancel existing auto-save callback for this key
    const existingCallback = this.autoSaveCallbacks.get(storageKey);
    if (existingCallback) {
      existingCallback.cancel();
    }

    // Create new debounced callback
    const debouncedSave = debounce(() => {
      this.performSave(storageKey, data);
      console.log(`Auto-saved data for key: ${storageKey}`);
    }, this.config.autoSaveDelay);

    // Store the callback for potential cancellation
    this.autoSaveCallbacks.set(storageKey, debouncedSave);

    // Execute the debounced save
    debouncedSave();
  }

  /**
   * Perform actual save operation with error handling
   */
  private performSave<T>(storageKey: string, data: T): void {
    try {
      const serializedData = JSON.stringify(data);
      localStorage.setItem(storageKey, serializedData);
    } catch (error) {
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        console.error('LocalStorage quota exceeded for key:', storageKey);
        this.handleQuotaExceeded(storageKey, data);
      } else {
        console.error('Failed to save data for key:', storageKey, error);
      }
    }
  }

  /**
   * Handle storage quota exceeded by cleaning up old data
   */
  private handleQuotaExceeded<T>(storageKey: string, data: T): void {
    console.log('Attempting to free up storage space...');
    
    // Remove old tab-specific data
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (
        key.includes('_old_') ||
        key.includes('_backup_') ||
        key.includes('_temp_')
      )) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach(key => {
      try {
        localStorage.removeItem(key);
      } catch (error) {
        // Ignore cleanup errors
      }
    });

    // Retry saving after cleanup
    try {
      localStorage.setItem(storageKey, JSON.stringify(data));
      console.log('Successfully saved after cleanup:', storageKey);
    } catch (retryError) {
      console.error('Failed to save even after cleanup:', storageKey, retryError);
    }
  }

  /**
   * Delete tab-specific or base data
   */
  deleteData(
    templateType: TemplateType,
    bookName: string,
    chapterName: string,
    tabId?: string
  ): boolean {
    const storageKey = this.generateStorageKey(templateType, bookName, chapterName, tabId);
    
    try {
      localStorage.removeItem(storageKey);
      
      // Cancel any pending auto-save for this key
      const callback = this.autoSaveCallbacks.get(storageKey);
      if (callback) {
        callback.cancel();
        this.autoSaveCallbacks.delete(storageKey);
      }
      
      return true;
    } catch (error) {
      console.error('Failed to delete data for key:', storageKey, error);
      return false;
    }
  }

  /**
   * Copy data from base to tab-specific (for tab isolation)
   */
  isolateDataToTab(
    templateType: TemplateType,
    bookName: string,
    chapterName: string,
    tabId: string
  ): boolean {
    const baseData = this.getData(templateType, bookName, chapterName);
    if (baseData !== null) {
      this.saveData(templateType, bookName, chapterName, baseData, tabId, false);
      return true;
    }
    return false;
  }

  /**
   * Get all tab-specific keys for a given base pattern
   */
  getTabKeys(templateType: TemplateType, bookName: string, chapterName: string): string[] {
    const baseKey = this.generateStorageKey(templateType, bookName, chapterName);
    const tabKeys: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(`${baseKey}_`) && key !== baseKey) {
        tabKeys.push(key);
      }
    }
    
    return tabKeys;
  }

  /**
   * Cleanup orphaned tab data
   */
  cleanupOrphanedTabs(validTabIds: string[]): void {
    const keysToRemove: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && this.isTabSpecificKey(key)) {
        const tabId = this.extractTabIdFromKey(key);
        if (tabId && !validTabIds.includes(tabId)) {
          keysToRemove.push(key);
        }
      }
    }
    
    keysToRemove.forEach(key => {
      try {
        localStorage.removeItem(key);
      } catch (error) {
        console.warn('Failed to remove orphaned tab key:', key, error);
      }
    });
    
    console.log(`Cleaned up ${keysToRemove.length} orphaned tab keys`);
  }

  /**
   * Check if a key follows the tab-specific pattern
   */
  private isTabSpecificKey(key: string): boolean {
    // Check if key matches: templateType_book_chapter_tabId pattern
    const parts = key.split('_');
    return parts.length >= 4 && this.isValidTemplateType(parts[0]);
  }

  /**
   * Extract tab ID from storage key
   */
  private extractTabIdFromKey(key: string): string | null {
    const parts = key.split('_');
    if (parts.length >= 4) {
      return parts[parts.length - 1]; // Last part is tabId
    }
    return null;
  }

  /**
   * Validate template type
   */
  private isValidTemplateType(type: string): boolean {
    const validTypes: TemplateType[] = ['FLASHCARD', 'MCQ', 'QA', 'NOTES', 'MINDMAP', 'VIDEOS'];
    return validTypes.includes(type as TemplateType);
  }

  /**
   * Force save all pending auto-saves (useful for page unload)
   */
  flushAllPendingSaves(): void {
    this.autoSaveCallbacks.forEach((callback, key) => {
      callback.flush(); // Execute immediately
      console.log(`Flushed pending save for key: ${key}`);
    });
  }

  /**
   * Get storage usage statistics
   */
  getStorageStats(): {
    totalKeys: number;
    tabSpecificKeys: number;
    baseKeys: number;
    estimatedSize: number;
  } {
    let totalKeys = 0;
    let tabSpecificKeys = 0;
    let baseKeys = 0;
    let estimatedSize = 0;

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const value = localStorage.getItem(key) || '';
        estimatedSize += key.length + value.length;
        totalKeys++;
        
        if (this.isTabSpecificKey(key)) {
          tabSpecificKeys++;
        } else if (this.isValidTemplateType(key.split('_')[0])) {
          baseKeys++;
        }
      }
    }

    return {
      totalKeys,
      tabSpecificKeys,
      baseKeys,
      estimatedSize
    };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<TabPersistenceConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): TabPersistenceConfig {
    return { ...this.config };
  }
}

// Export singleton instance
export const tabPersistenceManager = TabPersistenceManager.getInstance();

// Export for default import
export default TabPersistenceManager;
