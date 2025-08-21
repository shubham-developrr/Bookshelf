import { supabase } from './supabaseClient';
import type { UserProgress, UserHighlight } from '../contexts/UserContext';

/**
 * RealtimeManager - Handles real-time subscriptions for user data
 * Provides centralized subscription management and automatic cleanup
 */
export class RealtimeManager {
  private subscriptions: { [key: string]: any } = {};
  private currentUserId: string | null = null;

  // ==================== SUBSCRIPTION MANAGEMENT ====================

  /**
   * Initialize real-time subscriptions for a user
   */
  async initializeForUser(userId: string) {
    this.currentUserId = userId;
    this.cleanup(); // Clean up existing subscriptions
    
    // Subscribe to user's data changes
    this.subscribeToUserProgress();
    this.subscribeToUserHighlights();
  }

  /**
   * Clean up all subscriptions
   */
  cleanup() {
    Object.values(this.subscriptions).forEach(subscription => {
      subscription.unsubscribe();
    });
    this.subscriptions = {};
  }

  /**
   * Check if user is connected to real-time
   */
  isConnected(): boolean {
    return Object.keys(this.subscriptions).length > 0;
  }

  // ==================== PROGRESS SUBSCRIPTIONS ====================

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
   * Subscribe to progress updates
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
   * Subscribe to progress deletions
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
   * Subscribe to highlight updates
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
   * Subscribe to highlight deletions
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

  private notifyProgressUpdate(progress: UserProgress, event: string) {
    this.progressCallbacks.forEach(callback => {
      try {
        callback(progress, event);
      } catch (error) {
        console.error('Error in progress callback:', error);
      }
    });
  }

  private notifyProgressDelete(bookId: string, chapterId: string) {
    this.progressDeleteCallbacks.forEach(callback => {
      try {
        callback(bookId, chapterId);
      } catch (error) {
        console.error('Error in progress delete callback:', error);
      }
    });
  }

  private notifyHighlightUpdate(highlight: UserHighlight, event: string) {
    this.highlightCallbacks.forEach(callback => {
      try {
        callback(highlight, event);
      } catch (error) {
        console.error('Error in highlight callback:', error);
      }
    });
  }

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
   * Subscribe to real-time connection status changes
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
   * Force reconnection to real-time services
   */
  async reconnect() {
    if (this.currentUserId) {
      this.cleanup();
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
      this.initializeForUser(this.currentUserId);
    }
  }
}

// Create and export singleton instance
export const realtimeManager = new RealtimeManager();
