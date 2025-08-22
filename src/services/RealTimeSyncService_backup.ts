/**
 * REAL-TIME CROSS-TAB SYNC SERVICE
 * 
 * This service handles real-time synchronization between tabs using:
 * 1. localStorage events for immediate tab communication
 * 2. Periodic cloud sync checks
 * 3. Automatic UI updates when data changes in other tabs
 */

import UnifiedBookService from './UnifiedBookService';

export interface SyncEvent {
  type: 'book_created' | 'book_updated' | 'content_saved' | 'chapter_added' | 'template_updated';
  bookId?: string;
  bookName: string;
  chapterName?: string;
  contentType?: string;
  templateType?: string;
  tabId?: string;
  timestamp: string;
}

export class RealTimeSyncService {
  private static instance: RealTimeSyncService;
  private unifiedService: UnifiedBookService;
  private tabId: string;
  private listeners: Map<string, (event: SyncEvent) => void> = new Map();
  private syncCheckInterval: NodeJS.Timeout | null = null;
  private broadcastChannel: BroadcastChannel | null = null;
  private useBroadcastChannel = false;

  private constructor() {
    this.unifiedService = UnifiedBookService.getInstance();
    this.tabId = `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.initializeCrossOriginSync();
    this.initializeEventListeners();
  }

  static getInstance(): RealTimeSyncService {
    if (!RealTimeSyncService.instance) {
      RealTimeSyncService.instance = new RealTimeSyncService();
    }
    return RealTimeSyncService.instance;
  }

  private initializeCrossOriginSync(): void {
    // Try to use BroadcastChannel for cross-origin communication
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        this.broadcastChannel = new BroadcastChannel('bookshelf-sync');
        this.useBroadcastChannel = true;
        console.log('🔄 REALTIME: Using BroadcastChannel for cross-origin sync');
        
        this.broadcastChannel.addEventListener('message', (event) => {
          console.log('📨 REALTIME: BroadcastChannel message received:', event.data);
          this.handleSyncEvent(event.data);
        });
      }
    } catch (error) {
      console.warn('⚠️ REALTIME: BroadcastChannel not available, using localStorage only');
      this.useBroadcastChannel = false;
    }
  }

  private handleSyncEvent(syncEvent: SyncEvent): void {
    // Ignore events from the same tab
    if (syncEvent.tabId === this.tabId) {
      console.log('🔄 REALTIME: Ignoring own event');
      return;
    }
    
    console.log(`🔄 REALTIME: Processing sync event:`, syncEvent);
    
    // Notify listeners
    this.listeners.forEach((listener, listenerId) => {
      try {
        console.log(`📞 REALTIME: Notifying listener ${listenerId}`);
        listener(syncEvent);
      } catch (error) {
        console.error(`❌ REALTIME: Error in listener ${listenerId}:`, error);
      }
    });
    
    // Auto-refresh data based on event type
    this.handleAutoRefresh(syncEvent);
  }

  private initializeEventListeners(): void {
    // Listen for localStorage changes from other tabs
    window.addEventListener('storage', this.handleStorageEvent.bind(this));
    
    // Start periodic cloud sync check
    this.startPeriodicSync();
    
    // Handle tab visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.checkForCloudUpdates();
      }
    });

    console.log(`🔄 REALTIME: Initialized sync service for tab ${this.tabId}`);
  }

  private handleStorageEvent(event: StorageEvent): void {
    if (event.key === 'sync_event' && event.newValue) {
      try {
        const syncEvent: SyncEvent = JSON.parse(event.newValue);
        console.log('� REALTIME: localStorage event received:', syncEvent);
        this.handleSyncEvent(syncEvent);
      } catch (error) {
        console.error('❌ REALTIME: Failed to parse storage event:', error);
      }
    }
  }
        
      } catch (error) {
        console.error('REALTIME: Failed to parse sync event:', error);
      }
    }
  }

  private async handleAutoRefresh(event: SyncEvent): Promise<void> {
    try {
      switch (event.type) {
        case 'book_created':
        case 'book_updated':
          // Trigger book list refresh
          this.broadcastRefresh('book_list');
          break;
          
        case 'content_saved':
          // Trigger content refresh for specific book/chapter
          this.broadcastRefresh('content', event.bookId, event.chapterName);
          break;
          
        case 'chapter_added':
          // Trigger chapter list refresh
          this.broadcastRefresh('chapters', event.bookId);
          break;
      }
    } catch (error) {
      console.error('REALTIME: Failed to handle auto-refresh:', error);
    }
  }

  private broadcastRefresh(type: string, bookId?: string, chapterName?: string): void {
    const refreshEvent = {
      type: 'refresh_request',
      refreshType: type,
      bookId,
      chapterName,
      timestamp: new Date().toISOString(),
      tabId: this.tabId
    };
    
    localStorage.setItem('refresh_request', JSON.stringify(refreshEvent));
    
    // Clear the event after a short delay
    setTimeout(() => {
      localStorage.removeItem('refresh_request');
    }, 1000);
  }

  /**
   * Broadcast sync event to other tabs
   */
  broadcastSyncEvent(event: Omit<SyncEvent, 'timestamp' | 'tabId'>): void {
    const syncEvent: SyncEvent = {
      ...event,
      timestamp: new Date().toISOString(),
      tabId: this.tabId
    };
    
    console.log(`📡 REALTIME: Broadcasting sync event:`, syncEvent);
    
    // Store event in localStorage to trigger storage event in other tabs
    localStorage.setItem('sync_event', JSON.stringify(syncEvent));
    
    // Clear the event after a short delay
    setTimeout(() => {
      localStorage.removeItem('sync_event');
    }, 100);
  }

  /**
   * Subscribe to sync events
   */
  subscribe(listenerId: string, callback: (event: SyncEvent) => void): () => void {
    this.listeners.set(listenerId, callback);
    
    return () => {
      this.listeners.delete(listenerId);
    };
  }

  /**
   * Start periodic cloud sync
   */
  private startPeriodicSync(): void {
    // Sync every 30 seconds when tab is active
    this.syncCheckInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        this.checkForCloudUpdates();
      }
    }, 30000);
  }

  /**
   * Check for cloud updates
   */
  private async checkForCloudUpdates(): Promise<void> {
    try {
      console.log('☁️ REALTIME: Checking for cloud updates...');
      
      // This would check if cloud data is newer than local data
      // and trigger updates if needed
      
      // For now, we'll do a simple sync check
      const result = await this.unifiedService.getAllBooks();
      
      if (result.success && result.books.length > 0) {
        // Compare with local books and update if needed
        this.updateLocalFromCloud(result.books);
      }
      
    } catch (error) {
      console.warn('REALTIME: Failed to check cloud updates:', error);
    }
  }

  /**
   * Update local storage from cloud data
   */
  private updateLocalFromCloud(cloudBooks: any[]): void {
    try {
      const localBooks = JSON.parse(localStorage.getItem('createdBooks') || '[]');
      let hasUpdates = false;
      
      cloudBooks.forEach(cloudBook => {
        const localBook = localBooks.find((b: any) => b.id === cloudBook.id);
        
        if (!localBook) {
          // New book from cloud
          localBooks.push(cloudBook);
          hasUpdates = true;
          
          this.broadcastSyncEvent({
            type: 'book_created',
            bookId: cloudBook.id,
            bookName: cloudBook.name
          });
        } else {
          // Check if cloud version is newer
          const cloudTime = new Date(cloudBook.updatedAt).getTime();
          const localTime = new Date(localBook.updatedAt).getTime();
          
          if (cloudTime > localTime) {
            // Update local book
            Object.assign(localBook, cloudBook);
            hasUpdates = true;
            
            this.broadcastSyncEvent({
              type: 'book_updated',
              bookId: cloudBook.id,
              bookName: cloudBook.name
            });
          }
        }
      });
      
      if (hasUpdates) {
        localStorage.setItem('createdBooks', JSON.stringify(localBooks));
        console.log('✅ REALTIME: Updated local books from cloud');
      }
      
    } catch (error) {
      console.error('REALTIME: Failed to update local from cloud:', error);
    }
  }

  /**
   * Stop sync service
   */
  stop(): void {
    if (this.syncCheckInterval) {
      clearInterval(this.syncCheckInterval);
      this.syncCheckInterval = null;
    }
    
    window.removeEventListener('storage', this.handleStorageEvent.bind(this));
    this.listeners.clear();
    
    console.log(`🔄 REALTIME: Stopped sync service for tab ${this.tabId}`);
  }

  /**
   * Manually trigger sync for a specific book
   */
  async syncBook(bookId: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log(`🔄 REALTIME: Manually syncing book ${bookId}`);
      
      const result = await this.unifiedService.getCompleteBookData(bookId);
      
      if (result.success && result.book) {
        this.broadcastSyncEvent({
          type: 'book_updated',
          bookId: result.book.id,
          bookName: result.book.name
        });
        
        return { success: true };
      }
      
      return { success: false, error: result.error };
      
    } catch (error) {
      console.error('REALTIME: Manual sync failed:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Force sync all content to cloud
   */
  async forceSyncAll(): Promise<{ success: boolean; synced: number; errors: string[] }> {
    try {
      console.log('🔄 REALTIME: Force syncing all content...');
      
      const result = await this.unifiedService.forceSyncAllToCloud();
      
      if (result.success && result.synced > 0) {
        this.broadcastSyncEvent({
          type: 'book_updated',
          bookId: 'all',
          bookName: 'Multiple Books'
        });
      }
      
      return result;
      
    } catch (error) {
      console.error('REALTIME: Force sync failed:', error);
      return { success: false, synced: 0, errors: [error instanceof Error ? error.message : 'Unknown error'] };
    }
  }
}

export default RealTimeSyncService;
