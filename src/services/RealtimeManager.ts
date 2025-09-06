import { supabase } from './supabaseClient';
import type { UserProgress, UserHighlight } from '../contexts/UserContext';

/**
 * @class RealtimeManager
 * @description A singleton class to manage real-time subscriptions for user data (progress and highlights)
 * using Supabase, and provide a centralized way to handle incoming real-time events.
 */
class RealtimeManagerSingleton {
  private subscriptions: { [key: string]: any } = {};
  private currentUserId: string | null = null;

  // ==================== SUBSCRIPTION MANAGEMENT ====================

  /**
   * @description Initializes all necessary real-time subscriptions for a specific user.
   * Cleans up any existing subscriptions before creating new ones.
   * @param {string} userId - The ID of the user to subscribe for.
   */
  async initializeForUser(userId: string) {
    this.currentUserId = userId;
    this.cleanup(); // Clean up existing subscriptions
    
    // Subscribe to user's data changes
    this.subscribeToUserProgress();
    this.subscribeToUserHighlights();
  }

  /**
   * @description Unsubscribes from all active real-time channels.
   * Typically used on logout or re-initialization.
   */
  cleanup() {
    Object.values(this.subscriptions).forEach(subscription => {
      subscription.unsubscribe();
    });
    this.subscriptions = {};
  }

  /**
   * @description Checks if there are any active subscriptions.
   * @returns {boolean} True if connected, false otherwise.
   */
  isConnected(): boolean {
    return Object.keys(this.subscriptions).length > 0;
  }

  // ==================== PROGRESS SUBSCRIPTIONS ====================

  /**
   * @description Sets up the Supabase channel subscription for user progress changes.
   * @private
   */
  private subscribeToUserProgress() {
    if (!this.currentUserId) return;

    const subscription = supabase
      .channel(`user_progress_${this.currentUserId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_progress',
          filter: `user_id=eq.${this.currentUserId}`
        },
        (payload: any) => {
          this.handleProgressChange(payload);
        }
      )
      .subscribe();

    this.subscriptions.progress = subscription;
  }

  /**
   * @description Processes incoming payloads from the user_progress channel and calls notification methods.
   * @private
   * @param {any} payload - The payload from the Supabase real-time event.
   */
  private handleProgressChange(payload: any) {
    const { eventType, new: newData, old: oldData } = payload;
    
    switch (eventType) {
      case 'INSERT':
      case 'UPDATE':
        if (newData) {
          const progress: UserProgress = {
            bookId: newData.book_id,
            chapterId: newData.chapter_id,
            progressPercentage: newData.progress_percentage,
            timeSpent: newData.time_spent,
            lastAccessed: newData.last_accessed,
            completedAt: newData.completed_at,
            notes: newData.notes
          };
          this.notifyProgressUpdate(progress, eventType);
        }
        break;
      case 'DELETE':
        if (oldData) {
          this.notifyProgressDelete(oldData.book_id, oldData.chapter_id);
        }
        break;
    }
  }

  // ==================== HIGHLIGHTS SUBSCRIPTIONS ====================

  /**
   * @description Sets up the Supabase channel subscription for user highlight changes.
   * @private
   */
  private subscribeToUserHighlights() {
    if (!this.currentUserId) return;

    const subscription = supabase
      .channel(`user_highlights_${this.currentUserId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_highlights',
          filter: `user_id=eq.${this.currentUserId}`
        },
        (payload: any) => {
          this.handleHighlightChange(payload);
        }
      )
      .subscribe();

    this.subscriptions.highlights = subscription;
  }

  /**
   * @description Processes incoming payloads from the user_highlights channel and calls notification methods.
   * @private
   * @param {any} payload - The payload from the Supabase real-time event.
   */
  private handleHighlightChange(payload: any) {
    const { eventType, new: newData, old: oldData } = payload;
    
    switch (eventType) {
      case 'INSERT':
      case 'UPDATE':
        if (newData) {
          const highlight: UserHighlight = {
            id: newData.id,
            bookId: newData.book_id,
            chapterId: newData.chapter_id,
            text: newData.text,
            color: newData.color,
            position: newData.position,
            note: newData.note,
            createdAt: newData.created_at,
            updatedAt: newData.updated_at
          };
          this.notifyHighlightUpdate(highlight, eventType);
        }
        break;
      case 'DELETE':
        if (oldData) {
          this.notifyHighlightDelete(oldData.id);
        }
        break;
    }
  }

  // ==================== NOTIFICATION SYSTEM ====================

  private progressCallbacks: ((progress: UserProgress, event: string) => void)[] = [];
  private progressDeleteCallbacks: ((bookId: string, chapterId: string) => void)[] = [];
  private highlightCallbacks: ((highlight: UserHighlight, event: string) => void)[] = [];
  private highlightDeleteCallbacks: ((highlightId: string) => void)[] = [];

  /**
   * @description Allows other parts of the application to subscribe to real-time progress updates.
   * @param {(progress: UserProgress, event: string) => void} callback - The function to call on update.
   * @returns {() => void} A function to unsubscribe.
   */
  onProgressUpdate(callback: (progress: UserProgress, event: string) => void) {
    this.progressCallbacks.push(callback);
    return () => {
      const index = this.progressCallbacks.indexOf(callback);
      if (index > -1) {
        this.progressCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * @description Allows other parts of the application to subscribe to real-time progress deletions.
   * @param {(bookId: string, chapterId: string) => void} callback - The function to call on delete.
   * @returns {() => void} A function to unsubscribe.
   */
  onProgressDelete(callback: (bookId: string, chapterId: string) => void) {
    this.progressDeleteCallbacks.push(callback);
    return () => {
      const index = this.progressDeleteCallbacks.indexOf(callback);
      if (index > -1) {
        this.progressDeleteCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * @description Allows other parts of the application to subscribe to real-time highlight updates.
   * @param {(highlight: UserHighlight, event: string) => void} callback - The function to call on update.
   * @returns {() => void} A function to unsubscribe.
   */
  onHighlightUpdate(callback: (highlight: UserHighlight, event: string) => void) {
    this.highlightCallbacks.push(callback);
    return () => {
      const index = this.highlightCallbacks.indexOf(callback);
      if (index > -1) {
        this.highlightCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * @description Allows other parts of the application to subscribe to real-time highlight deletions.
   * @param {(highlightId: string) => void} callback - The function to call on delete.
   * @returns {() => void} A function to unsubscribe.
   */
  onHighlightDelete(callback: (highlightId: string) => void) {
    this.highlightDeleteCallbacks.push(callback);
    return () => {
      const index = this.highlightDeleteCallbacks.indexOf(callback);
      if (index > -1) {
        this.highlightDeleteCallbacks.splice(index, 1);
      }
    };
  }

  // ==================== INTERNAL NOTIFICATION METHODS ====================

  /**
   * @description Invokes all registered progress update callbacks.
   * @private
   */
  private notifyProgressUpdate(progress: UserProgress, event: string) {
    this.progressCallbacks.forEach(callback => {
      try {
        callback(progress, event);
      } catch (error) {
        console.error('Error in progress callback:', error);
      }
    });
  }

  /**
   * @description Invokes all registered progress delete callbacks.
   * @private
   */
  private notifyProgressDelete(bookId: string, chapterId: string) {
    this.progressDeleteCallbacks.forEach(callback => {
      try {
        callback(bookId, chapterId);
      } catch (error) {
        console.error('Error in progress delete callback:', error);
      }
    });
  }

  /**
   * @description Invokes all registered highlight update callbacks.
   * @private
   */
  private notifyHighlightUpdate(highlight: UserHighlight, event: string) {
    this.highlightCallbacks.forEach(callback => {
      try {
        callback(highlight, event);
      } catch (error) {
        console.error('Error in highlight callback:', error);
      }
    });
  }

  /**
   * @description Invokes all registered highlight delete callbacks.
   * @private
   */
  private notifyHighlightDelete(highlightId: string) {
    this.highlightDeleteCallbacks.forEach(callback => {
      try {
        callback(highlightId);
      } catch (error) {
        console.error('Error in highlight delete callback:', error);
      }
    });
  }

  // ==================== CONNECTION STATUS ====================

  /**
   * @description Subscribes to real-time connection status changes.
   * @param {(status: 'SUBSCRIBED' | 'TIMED_OUT' | 'CLOSED' | 'CHANNEL_ERROR') => void} callback - The function to call on status change.
   * @returns {() => void} A function to unsubscribe.
   */
  onConnectionStatus(callback: (status: 'SUBSCRIBED' | 'TIMED_OUT' | 'CLOSED' | 'CHANNEL_ERROR') => void) {
    const subscription = supabase
      .channel('connection_status')
      .subscribe((status) => {
        callback(status);
      });

    return () => subscription.unsubscribe();
  }

  /**
   * @description Forces a reconnection to the real-time services by cleaning up and re-initializing subscriptions.
   */
  async reconnect() {
    if (this.currentUserId) {
      this.cleanup();
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
      this.initializeForUser(this.currentUserId);
    }
  }
}

/**
 * @const realtimeManager
 * @description The exported singleton instance of the RealtimeManager class.
 */
export const realtimeManager = new RealtimeManagerSingleton();
