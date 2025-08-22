import { useEffect, useCallback, useRef } from 'react';
import BookSyncService from '../services/BookSyncService';
import { useSyncStatus } from '../components/SyncStatusUI';

/**
 * AUTO-SYNC HOOK
 * Automatically syncs data when localStorage changes
 * Use this in all template components (FlashCard, MCQ, etc.)
 */

interface UseAutoSyncOptions {
  bookId?: string;
  bookName?: string;
  debounceMs?: number;
  syncOnSave?: boolean;
  syncOnMount?: boolean;
}

export const useAutoSync = (options: UseAutoSyncOptions = {}) => {
  const {
    bookId,
    bookName,
    debounceMs = 2000, // Wait 2 seconds after last change before syncing
    syncOnSave = true,
    syncOnMount = true
  } = options;

  const { isOnline, isSyncing } = useSyncStatus();
  const syncTimeoutRef = useRef<NodeJS.Timeout>();
  const lastSyncDataRef = useRef<string>('');

  /**
   * Trigger automatic sync for the current book
   */
  const triggerAutoSync = useCallback(async () => {
    if (!bookId || !isOnline || isSyncing) {
      return;
    }

    try {
      console.log(`🔄 Auto-syncing book: ${bookName || bookId}`);
      const result = await BookSyncService.forceSyncBook(bookId);
      
      if (result.success) {
        console.log(`✅ Auto-sync successful: ${bookName || bookId}`);
      } else {
        console.warn(`⚠️ Auto-sync had issues: ${result.errors.join(', ')}`);
      }
    } catch (error) {
      console.error('❌ Auto-sync failed:', error);
    }
  }, [bookId, bookName, isOnline, isSyncing]);

  /**
   * Debounced sync - waits for user to stop making changes
   */
  const debouncedSync = useCallback(() => {
    if (!syncOnSave || !bookId) return;

    // Clear existing timeout
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }

    // Set new timeout
    syncTimeoutRef.current = setTimeout(() => {
      triggerAutoSync();
    }, debounceMs);
  }, [triggerAutoSync, syncOnSave, bookId, debounceMs]);

  /**
   * Check if book data has changed and trigger sync if needed
   */
  const checkAndSync = useCallback(() => {
    if (!bookId || !bookName) return;

    // Get current book data signature
    const books = JSON.parse(localStorage.getItem('createdBooks') || '[]');
    const book = books.find((b: any) => b.id === bookId);
    const chapters = localStorage.getItem(`chapters_${bookId}`) || '';
    
    // Create a signature of all book-related data
    const bookSignature = JSON.stringify({
      book,
      chapters,
      timestamp: Date.now()
    });

    // Check if data has changed
    if (bookSignature !== lastSyncDataRef.current) {
      lastSyncDataRef.current = bookSignature;
      debouncedSync();
    }
  }, [bookId, bookName, debouncedSync]);

  /**
   * Manual sync function for components to call
   */
  const manualSync = useCallback(async () => {
    if (!bookId) return false;
    
    try {
      const result = await BookSyncService.forceSyncBook(bookId);
      return result.success;
    } catch (error) {
      console.error('Manual sync failed:', error);
      return false;
    }
  }, [bookId]);

  /**
   * Save data to localStorage and trigger sync
   */
  const saveAndSync = useCallback(<T>(key: string, data: T) => {
    // Save to localStorage
    localStorage.setItem(key, JSON.stringify(data));
    
    // Trigger sync check
    checkAndSync();
  }, [checkAndSync]);

  // Setup periodic sync check
  useEffect(() => {
    if (!syncOnMount || !bookId) return;

    const interval = setInterval(checkAndSync, 5000); // Check every 5 seconds

    return () => clearInterval(interval);
  }, [checkAndSync, syncOnMount, bookId]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, []);

  return {
    saveAndSync,
    manualSync,
    triggerAutoSync,
    isOnline,
    isSyncing
  };
};

/**
 * TEMPLATE SAVE HOOK
 * Specialized hook for template components (FlashCard, MCQ, etc.)
 */
interface UseTemplateSaveOptions {
  templateType: 'FLASHCARD' | 'MCQ' | 'QA' | 'NOTES' | 'MINDMAP' | 'VIDEOS';
  bookName: string;
  chapterKey: string;
  tabId?: string;
  autoSave?: boolean;
  autoSaveDelay?: number;
}

export const useTemplateSave = <T>(options: UseTemplateSaveOptions) => {
  const {
    templateType,
    bookName,
    chapterKey,
    tabId,
    autoSave = true,
    autoSaveDelay = 1000
  } = options;

  // Get book ID from localStorage
  const books = JSON.parse(localStorage.getItem('createdBooks') || '[]');
  const book = books.find((b: any) => b.name === bookName);
  const bookId = book?.id;

  const { saveAndSync, manualSync, isOnline, isSyncing } = useAutoSync({
    bookId,
    bookName,
    debounceMs: autoSaveDelay,
    syncOnSave: autoSave
  });

  const saveTimeoutRef = useRef<NodeJS.Timeout>();

  /**
   * Get the storage key for this template
   */
  const getStorageKey = useCallback(() => {
    const keyMap: { [key: string]: string } = {
      'FLASHCARD': `flashcards_${bookName}_${chapterKey}`,
      'MCQ': `mcq_${bookName}_${chapterKey}`,
      'QA': `qa_${bookName}_${chapterKey}`,
      'NOTES': `notes_${bookName}_${chapterKey}`,
      'MINDMAP': `mindmaps_${bookName}_${chapterKey}`,
      'VIDEOS': `videos_${bookName}_${chapterKey}`
    };
    
    const baseKey = keyMap[templateType];
    return tabId ? `${baseKey}_${tabId}` : baseKey;
  }, [templateType, bookName, chapterKey, tabId]);

  /**
   * Save template data immediately
   */
  const saveNow = useCallback((data: T) => {
    const storageKey = getStorageKey();
    saveAndSync(storageKey, data);
    console.log(`💾 Saved ${templateType} data:`, storageKey);
  }, [getStorageKey, saveAndSync, templateType]);

  /**
   * Save template data with auto-save delay
   */
  const saveWithDelay = useCallback((data: T) => {
    if (!autoSave) return;

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Set new timeout
    saveTimeoutRef.current = setTimeout(() => {
      saveNow(data);
    }, autoSaveDelay);
  }, [saveNow, autoSave, autoSaveDelay]);

  /**
   * Load template data from storage
   */
  const loadData = useCallback((): T | null => {
    const storageKey = getStorageKey();
    const saved = localStorage.getItem(storageKey);
    
    if (saved && saved !== 'null') {
      try {
        return JSON.parse(saved) as T;
      } catch (error) {
        console.error(`Failed to parse ${templateType} data:`, error);
      }
    }
    
    return null;
  }, [getStorageKey, templateType]);

  /**
   * Check if data exists in storage
   */
  const hasData = useCallback((): boolean => {
    const data = loadData();
    return data !== null && (Array.isArray(data) ? data.length > 0 : Object.keys(data as any).length > 0);
  }, [loadData]);

  /**
   * Clear all data
   */
  const clearData = useCallback(() => {
    const storageKey = getStorageKey();
    localStorage.removeItem(storageKey);
    
    // Trigger sync to update backend
    if (bookId) {
      setTimeout(() => {
        BookSyncService.forceSyncBook(bookId);
      }, 100);
    }
  }, [getStorageKey, bookId]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return {
    saveNow,
    saveWithDelay,
    loadData,
    hasData,
    clearData,
    manualSync,
    storageKey: getStorageKey(),
    isOnline,
    isSyncing,
    autoSave
  };
};

export default useAutoSync;
