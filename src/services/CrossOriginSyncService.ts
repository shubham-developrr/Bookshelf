/**
 * TRUE CROSS-ORIGIN SYNC SERVICE
 * 
 * This service provides real cross-origin communication using SharedWorker
 * to enable sync between different localhost ports (5174 ↔ 5177)
 * 
 * SharedWorker creates a shared background thread that can be accessed
 * by multiple tabs/windows from different origins on the same domain.
 */

import { SyncEvent } from './RealTimeSyncService';

export class CrossOriginSyncService {
  private static instance: CrossOriginSyncService;
  private sharedWorker: SharedWorker | null = null;
  private port: MessagePort | null = null;
  private listeners: Map<string, (event: SyncEvent) => void> = new Map();
  private tabId: string;
  private isConnected = false;

  private constructor(tabId?: string) {
    this.tabId = tabId || `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.initializeSharedWorker();
  }

  static getInstance(tabId?: string): CrossOriginSyncService {
    if (!CrossOriginSyncService.instance) {
      CrossOriginSyncService.instance = new CrossOriginSyncService(tabId);
    }
    return CrossOriginSyncService.instance;
  }

  private initializeSharedWorker(): void {
    try {
      // Create SharedWorker for cross-origin communication
      const workerScript = `
        // Shared Worker for cross-origin sync
        const connections = new Map();
        
        self.addEventListener('connect', function(e) {
          const port = e.ports[0];
          const clientId = Date.now() + '_' + Math.random().toString(36).substr(2, 9);
          
          connections.set(clientId, port);
          console.log('🔗 SHARED WORKER: Client connected:', clientId, 'Total:', connections.size);
          
          port.addEventListener('message', function(event) {
            console.log('📨 SHARED WORKER: Received message from', clientId, ':', event.data);
            
            // Broadcast to all other connected ports
            connections.forEach((otherPort, otherClientId) => {
              if (otherClientId !== clientId) {
                try {
                  otherPort.postMessage(event.data);
                  console.log('📤 SHARED WORKER: Forwarded to', otherClientId);
                } catch (error) {
                  console.error('❌ SHARED WORKER: Failed to forward to', otherClientId, error);
                  connections.delete(otherClientId);
                }
              }
            });
          });
          
          port.start();
          
          // Remove connection when closed
          port.addEventListener('close', () => {
            connections.delete(clientId);
            console.log('🔌 SHARED WORKER: Client disconnected:', clientId, 'Remaining:', connections.size);
          });
        });
      `;

      const blob = new Blob([workerScript], { type: 'application/javascript' });
      const workerUrl = URL.createObjectURL(blob);
      
      this.sharedWorker = new SharedWorker(workerUrl);
      this.port = this.sharedWorker.port;
      
      this.port.addEventListener('message', (event) => {
        console.log('📨 CROSS-ORIGIN: Received sync event:', event.data);
        console.log('🔑 CROSS-ORIGIN: My tabId:', this.tabId, 'Event tabId:', event.data?.tabId);
        this.handleSyncEvent(event.data);
      });
      
      this.port.start();
      this.isConnected = true;
      
      console.log('✅ CROSS-ORIGIN: SharedWorker initialized for cross-origin sync');
      
    } catch (error) {
      console.warn('⚠️ CROSS-ORIGIN: SharedWorker not available:', error);
      this.isConnected = false;
    }
  }

  private handleSyncEvent(syncEvent: SyncEvent): void {
    // Ignore events from the same tab
    if (syncEvent.tabId === this.tabId) {
      console.log('🔄 CROSS-ORIGIN: Ignoring own event');
      return;
    }
    
    console.log(`🔄 CROSS-ORIGIN: Processing sync event from ${syncEvent.origin || 'unknown origin'}:`, syncEvent);
    
    // Notify listeners
    this.listeners.forEach((listener, listenerId) => {
      try {
        console.log(`📞 CROSS-ORIGIN: Notifying listener ${listenerId}`);
        listener(syncEvent);
      } catch (error) {
        console.error(`❌ CROSS-ORIGIN: Error in listener ${listenerId}:`, error);
      }
    });
  }

  /**
   * Broadcast sync event across origins
   */
  broadcastSyncEvent(event: Omit<SyncEvent, 'timestamp' | 'tabId'>): void {
    if (!this.isConnected || !this.port) {
      console.warn('⚠️ CROSS-ORIGIN: Not connected, cannot broadcast');
      return;
    }

    const fullEvent: SyncEvent = {
      ...event,
      tabId: this.tabId,
      timestamp: new Date().toISOString(),
      origin: window.location.origin
    };

    console.log('📤 CROSS-ORIGIN: Broadcasting sync event:', fullEvent);

    try {
      this.port.postMessage(fullEvent);
      console.log('✅ CROSS-ORIGIN: Event sent via SharedWorker');
    } catch (error) {
      console.error('❌ CROSS-ORIGIN: Failed to send via SharedWorker:', error);
    }
  }

  subscribe(listenerId: string, callback: (event: SyncEvent) => void): () => void {
    console.log(`➕ CROSS-ORIGIN: Adding listener ${listenerId}`);
    this.listeners.set(listenerId, callback);
    
    return () => {
      console.log(`➖ CROSS-ORIGIN: Removing listener ${listenerId}`);
      this.listeners.delete(listenerId);
    };
  }

  getStatus(): { tabId: string; listeners: number; isConnected: boolean; workerAvailable: boolean } {
    return {
      tabId: this.tabId,
      listeners: this.listeners.size,
      isConnected: this.isConnected,
      workerAvailable: typeof SharedWorker !== 'undefined'
    };
  }

  stop(): void {
    console.log('🛑 CROSS-ORIGIN: Stopping sync service...');
    
    if (this.port) {
      this.port.close();
      this.port = null;
    }
    
    this.sharedWorker = null;
    this.listeners.clear();
    this.isConnected = false;
    
    console.log('✅ CROSS-ORIGIN: Sync service stopped');
  }
}

export default CrossOriginSyncService;
