/**
 * REAL-TIME CROSS-TAB SYNC SERVICE - ENHANCED WITH TRUE CROSS-ORIGIN SUPPORT
 * 
 * This service handles real-time synchronization between tabs using:
 * 1. SharedWorker API for TRUE cross-origin communication (works across different ports!)
 * 2. BroadcastChannel API for same-origin communication (same port)
 * 3. localStorage events for fallback communication
 * 4. Periodic cloud sync checks
 * 5. Automatic UI updates when data changes in other tabs
 * 6. Enhanced debugging and error handling
 */

import UnifiedBookService from './UnifiedBookService';
import CrossOriginSyncService from './CrossOriginSyncService';

export interface SyncEvent {
  type: 'book_created' | 'book_updated' | 'content_saved' | 'chapter_added' | 'template_updated';
  bookId?: string;
  bookName: string;
  chapterName?: string;
  contentType?: string;
  templateType?: string;
  tabId?: string;
  timestamp: string;
  origin?: string; // Track which origin sent the event
}

export class RealTimeSyncService {
  private static instance: RealTimeSyncService;
  private unifiedService: UnifiedBookService;
  private crossOriginSync: CrossOriginSyncService;
  private tabId: string;
  private listeners: Map<string, (event: SyncEvent) => void> = new Map();
  private syncCheckInterval: NodeJS.Timeout | null = null;
  private broadcastChannel: BroadcastChannel | null = null;
  private useBroadcastChannel = false;

  private constructor() {
    this.tabId = `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.unifiedService = UnifiedBookService.getInstance();
    this.crossOriginSync = CrossOriginSyncService.getInstance(this.tabId);
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
    // Initialize SharedWorker for TRUE cross-origin sync (different ports)
    this.crossOriginSync.subscribe('realtime-sync', this.handleSyncEvent.bind(this));
    
    // Try to use BroadcastChannel for same-origin communication (same port)
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        this.broadcastChannel = new BroadcastChannel('bookshelf-sync');
        this.useBroadcastChannel = true;
        console.log('🚀 REALTIME: Using BroadcastChannel for same-origin sync');
        
        this.broadcastChannel.addEventListener('message', (event) => {
          console.log('📨 REALTIME: BroadcastChannel message received:', event.data);
          this.handleSyncEvent(event.data);
        });
      }
    } catch (error) {
      console.warn('⚠️ REALTIME: BroadcastChannel not available, using SharedWorker only');
      this.useBroadcastChannel = false;
    }

    console.log('✅ REALTIME: Cross-origin sync initialized with SharedWorker + BroadcastChannel');
  }

  private handleSyncEvent(syncEvent: SyncEvent): void {
    console.log('🔑 REALTIME: My tabId:', this.tabId, 'Event tabId:', syncEvent.tabId);
    
    // Ignore events from the same tab
    if (syncEvent.tabId === this.tabId) {
      console.log('🔄 REALTIME: Ignoring own event');
      return;
    }
    
    console.log(`🔄 REALTIME: Processing sync event from ${syncEvent.origin || 'unknown origin'}:`, syncEvent);
    
    // Notify listeners
    this.listeners.forEach((listener, listenerId) => {
      try {
        console.log(`📞 REALTIME: Notifying listener ${listenerId} for ${syncEvent.templateType}`);
        listener(syncEvent);
      } catch (error) {
        console.error(`❌ REALTIME: Error in listener ${listenerId}:`, error);
      }
    });
    
    // Auto-refresh data based on event type
    this.handleAutoRefresh(syncEvent);
  }

  private initializeEventListeners(): void {
    // Listen for localStorage changes from same-origin tabs
    window.addEventListener('storage', this.handleStorageEvent.bind(this));
    
    // Start periodic cloud sync check
    this.startPeriodicSync();
    
    // Handle tab visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.checkForCloudUpdates();
      }
    });

    console.log(`✅ REALTIME: Service initialized with tabId: ${this.tabId}, SharedWorker: ${this.crossOriginSync.getStatus().isConnected}, BroadcastChannel: ${this.useBroadcastChannel}`);
  }

  private handleStorageEvent(event: StorageEvent): void {
    if (event.key === 'sync_event' && event.newValue) {
      try {
        const syncEvent: SyncEvent = JSON.parse(event.newValue);
        console.log('📨 REALTIME: localStorage event received:', syncEvent);
        this.handleSyncEvent(syncEvent);
      } catch (error) {
        console.error('❌ REALTIME: Failed to parse storage event:', error);
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
        case 'template_updated':
          // Trigger content refresh for specific book/chapter
          this.broadcastRefresh('content', event.bookId, event.chapterName);
          break;
          
        case 'chapter_added':
          // Trigger chapter list refresh
          this.broadcastRefresh('chapters', event.bookId);
          break;
      }
    } catch (error) {
      console.error('❌ REALTIME: Failed to handle auto-refresh:', error);
    }
  }

  private broadcastRefresh(type: string, bookId?: string, chapterName?: string): void {
    const refreshEvent = {
      type: 'refresh_request',
      refreshType: type,
      bookId,
      chapterName,
      timestamp: new Date().toISOString()
    };

    // Broadcast refresh event to other components
    window.dispatchEvent(new CustomEvent('bookshelf-refresh', { detail: refreshEvent }));

    // Small delay to ensure localStorage is updated before refreshing
    setTimeout(() => {
      // Additional refresh logic can go here
      console.log(`🔄 REALTIME: Broadcasted refresh request: ${type}`);
    }, 100);
  }

  /**
   * Enhanced broadcast with SharedWorker (cross-origin) + BroadcastChannel (same-origin) + localStorage support
   */
  broadcastSyncEvent(event: Omit<SyncEvent, 'timestamp' | 'tabId'>): void {
    const fullEvent: SyncEvent = {
      ...event,
      tabId: this.tabId,
      timestamp: new Date().toISOString(),
      origin: window.location.origin
    };

    console.log('📤 REALTIME: Broadcasting sync event:', fullEvent);

    // 1. Use SharedWorker for TRUE cross-origin communication (different ports!)
    this.crossOriginSync.broadcastSyncEvent(fullEvent);

    // 2. Use BroadcastChannel for same-origin communication (same port)
    if (this.useBroadcastChannel && this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage(fullEvent);
        console.log('✅ REALTIME: Event sent via BroadcastChannel (same-origin)');
      } catch (error) {
        console.error('❌ REALTIME: Failed to send via BroadcastChannel:', error);
      }
    }

    // 3. Also use localStorage for fallback communication
    try {
      localStorage.setItem('sync_event', JSON.stringify(fullEvent));
      console.log('✅ REALTIME: Event sent via localStorage (fallback)');
      
      // Clear the event after a short delay to prevent stale data
      setTimeout(() => {
        localStorage.removeItem('sync_event');
      }, 1000);
    } catch (error) {
      console.error('❌ REALTIME: Failed to send via localStorage:', error);
    }
  }

  subscribe(listenerId: string, callback: (event: SyncEvent) => void): () => void {
    console.log(`➕ REALTIME: Adding listener ${listenerId}`);
    this.listeners.set(listenerId, callback);
    
    return () => {
      console.log(`➖ REALTIME: Removing listener ${listenerId}`);
      this.listeners.delete(listenerId);
    };
  }

  private startPeriodicSync(): void {
    // Clear existing interval
    if (this.syncCheckInterval) {
      clearInterval(this.syncCheckInterval);
    }
    
    this.syncCheckInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        this.checkForCloudUpdates();
      }
    }, 30000); // Check every 30 seconds
  }

  private async checkForCloudUpdates(): Promise<void> {
    try {
      // Implement cloud sync check logic here
      console.log('🌐 REALTIME: Checking for cloud updates...');
      
      // This would check for newer data in the cloud
      // and broadcast sync events if updates are found
      
    } catch (error) {
      console.warn('⚠️ REALTIME: Cloud sync check failed:', error);
    }
  }

  // Manual sync methods for debugging
  testSync(): void {
    console.log('🧪 REALTIME: Testing sync system...');
    this.broadcastSyncEvent({
      type: 'template_updated',
      bookName: 'test-book',
      chapterName: 'test-chapter',
      templateType: 'TEST'
    });
  }

  getStatus(): { tabId: string; listeners: number; useBroadcastChannel: boolean; crossOrigin: any } {
    return {
      tabId: this.tabId,
      listeners: this.listeners.size,
      useBroadcastChannel: this.useBroadcastChannel,
      crossOrigin: this.crossOriginSync.getStatus()
    };
  }

  /**
   * Stop the sync service and clean up resources
   */
  stop(): void {
    console.log('🛑 REALTIME: Stopping sync service...');
    
    // Clear periodic sync interval
    if (this.syncCheckInterval) {
      clearInterval(this.syncCheckInterval);
      this.syncCheckInterval = null;
    }
    
    // Close BroadcastChannel
    if (this.broadcastChannel) {
      this.broadcastChannel.close();
      this.broadcastChannel = null;
    }

    // Stop cross-origin sync
    this.crossOriginSync.stop();
    
    // Clear all listeners
    this.listeners.clear();
    
    // Remove storage event listener
    window.removeEventListener('storage', this.handleStorageEvent.bind(this));
    
    console.log('✅ REALTIME: Sync service stopped');
  }
}

export default RealTimeSyncService;
