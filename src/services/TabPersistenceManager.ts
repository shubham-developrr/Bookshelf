import { supabase } from './supabaseClient';

/**
 * TabPersistenceManager - Handles tab state persistence with backend sync
 * Uses localStorage for fast access and Supabase for cross-device sync
 */

interface TabState {
  id: string;
  title: string;
  type: 'text' | 'mcq' | 'qna' | 'notes' | 'mindmap' | 'flashcards' | 'videos';
  content: any;
  isActive: boolean;
  lastModified: string;
  chapterId: string;
  bookId: string;
}

interface ChapterTabsState {
  chapterId: string;
  bookId: string;
  tabs: TabState[];
  activeTabId: string;
  lastAccessed: string;
}

export class TabPersistenceManager {
  private readonly CACHE_PREFIX = 'tabs_cache_';
  private readonly DEBOUNCE_DELAY = 500; // 500ms debounce for saves
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();
  private userId: string | null = null;

  // ==================== INITIALIZATION ====================

  async initialize(userId: string) {
    this.userId = userId;
    await this.syncFromBackend();
  }

  // ==================== LOCAL STORAGE MANAGEMENT ====================

  private getLocalKey(chapterId: string): string {
    return `${this.CACHE_PREFIX}${this.userId}_${chapterId}`;
  }

  getChapterTabs(chapterId: string, bookId: string): ChapterTabsState | null {
    const cached = localStorage.getItem(this.getLocalKey(chapterId));
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (error) {
        console.error('Failed to parse cached tabs:', error);
        localStorage.removeItem(this.getLocalKey(chapterId));
      }
    }
    return null;
  }

  saveChapterTabs(chapterTabsState: ChapterTabsState): void {
    // Save to localStorage immediately for fast access
    localStorage.setItem(
      this.getLocalKey(chapterTabsState.chapterId),
      JSON.stringify({
        ...chapterTabsState,
        lastAccessed: new Date().toISOString()
      })
    );

    // Debounced save to backend
    this.debouncedSaveToBackend(chapterTabsState);
  }

  // ==================== BACKEND SYNCHRONIZATION ====================

  private debouncedSaveToBackend(chapterTabsState: ChapterTabsState): void {
    const key = `${chapterTabsState.bookId}_${chapterTabsState.chapterId}`;
    
    // Clear existing timer
    if (this.debounceTimers.has(key)) {
      clearTimeout(this.debounceTimers.get(key)!);
    }

    // Set new timer
    const timer = setTimeout(() => {
      this.saveToBackend(chapterTabsState);
      this.debounceTimers.delete(key);
    }, this.DEBOUNCE_DELAY);

    this.debounceTimers.set(key, timer);
  }

  private async saveToBackend(chapterTabsState: ChapterTabsState): Promise<void> {
    if (!this.userId) return;

    try {
      const { error } = await supabase
        .from('user_progress')
        .upsert({
          user_id: this.userId,
          book_id: chapterTabsState.bookId,
          chapter_id: chapterTabsState.chapterId,
          progress_percentage: this.calculateProgressFromTabs(chapterTabsState.tabs),
          time_spent: 0, // Will be updated by time tracking
          last_accessed: new Date().toISOString(),
          notes: JSON.stringify({
            tabs: chapterTabsState.tabs,
            activeTabId: chapterTabsState.activeTabId,
            tabsState: true // Flag to identify tab-enabled chapters
          })
        }, { 
          onConflict: 'user_id,book_id,chapter_id' 
        });

      if (error) {
        console.error('Failed to save tabs to backend:', error);
      }
    } catch (error) {
      console.error('Backend save error:', error);
    }
  }

  private async syncFromBackend(): Promise<void> {
    if (!this.userId) return;

    try {
      const { data, error } = await supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', this.userId)
        .not('notes', 'is', null);

      if (error) {
        console.error('Failed to sync from backend:', error);
        return;
      }

      if (data) {
        data.forEach(progress => {
          try {
            if (progress.notes) {
              const notesData = JSON.parse(progress.notes);
              if (notesData.tabsState && notesData.tabs) {
                const chapterTabsState: ChapterTabsState = {
                  chapterId: progress.chapter_id,
                  bookId: progress.book_id,
                  tabs: notesData.tabs,
                  activeTabId: notesData.activeTabId || '',
                  lastAccessed: progress.last_accessed
                };

                // Update localStorage with backend data
                localStorage.setItem(
                  this.getLocalKey(progress.chapter_id),
                  JSON.stringify(chapterTabsState)
                );
              }
            }
          } catch (error) {
            console.error('Failed to parse backend tabs data:', error);
          }
        });
      }
    } catch (error) {
      console.error('Sync from backend error:', error);
    }
  }

  // ==================== TAB MANAGEMENT ====================

  addTab(chapterId: string, bookId: string, tab: Omit<TabState, 'id' | 'lastModified'>): string {
    const tabId = crypto.randomUUID();
    const newTab: TabState = {
      ...tab,
      id: tabId,
      lastModified: new Date().toISOString()
    };

    let chapterTabs = this.getChapterTabs(chapterId, bookId);
    
    if (!chapterTabs) {
      chapterTabs = {
        chapterId,
        bookId,
        tabs: [],
        activeTabId: tabId,
        lastAccessed: new Date().toISOString()
      };
    }

    chapterTabs.tabs.push(newTab);
    chapterTabs.activeTabId = tabId;
    
    this.saveChapterTabs(chapterTabs);
    return tabId;
  }

  updateTab(chapterId: string, bookId: string, tabId: string, updates: Partial<TabState>): void {
    const chapterTabs = this.getChapterTabs(chapterId, bookId);
    if (!chapterTabs) return;

    const tabIndex = chapterTabs.tabs.findIndex(tab => tab.id === tabId);
    if (tabIndex === -1) return;

    chapterTabs.tabs[tabIndex] = {
      ...chapterTabs.tabs[tabIndex],
      ...updates,
      lastModified: new Date().toISOString()
    };

    this.saveChapterTabs(chapterTabs);
  }

  deleteTab(chapterId: string, bookId: string, tabId: string): void {
    const chapterTabs = this.getChapterTabs(chapterId, bookId);
    if (!chapterTabs) return;

    chapterTabs.tabs = chapterTabs.tabs.filter(tab => tab.id !== tabId);
    
    // If deleted tab was active, switch to first available tab
    if (chapterTabs.activeTabId === tabId && chapterTabs.tabs.length > 0) {
      chapterTabs.activeTabId = chapterTabs.tabs[0].id;
    }

    this.saveChapterTabs(chapterTabs);
  }

  setActiveTab(chapterId: string, bookId: string, tabId: string): void {
    const chapterTabs = this.getChapterTabs(chapterId, bookId);
    if (!chapterTabs) return;

    chapterTabs.activeTabId = tabId;
    this.saveChapterTabs(chapterTabs);
  }

  // ==================== UTILITY METHODS ====================

  private calculateProgressFromTabs(tabs: TabState[]): number {
    if (tabs.length === 0) return 0;
    
    const completedTabs = tabs.filter(tab => {
      // Consider a tab completed if it has substantial content
      if (tab.type === 'text' && tab.content && tab.content.length > 100) return true;
      if (tab.type === 'mcq' && tab.content && tab.content.questions?.length > 0) return true;
      if (tab.type === 'notes' && tab.content && tab.content.length > 50) return true;
      if (tab.type === 'flashcards' && tab.content && tab.content.length > 0) return true;
      return false;
    });

    return Math.round((completedTabs.length / tabs.length) * 100);
  }

  // ==================== REAL-TIME SYNC ====================

  subscribeToTabChanges(callback: (chapterId: string, tabsState: ChapterTabsState) => void): () => void {
    if (!this.userId) return () => {};

    const subscription = supabase
      .channel(`tab_changes_${this.userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_progress',
          filter: `user_id=eq.${this.userId}`
        },
        (payload: any) => {
          try {
            if (payload.new?.notes) {
              const notesData = JSON.parse(payload.new.notes);
              if (notesData.tabsState && notesData.tabs) {
                const chapterTabsState: ChapterTabsState = {
                  chapterId: payload.new.chapter_id,
                  bookId: payload.new.book_id,
                  tabs: notesData.tabs,
                  activeTabId: notesData.activeTabId || '',
                  lastAccessed: payload.new.last_accessed
                };

                // Update localStorage
                localStorage.setItem(
                  this.getLocalKey(payload.new.chapter_id),
                  JSON.stringify(chapterTabsState)
                );

                // Notify callback
                callback(payload.new.chapter_id, chapterTabsState);
              }
            }
          } catch (error) {
            console.error('Failed to process tab changes:', error);
          }
        }
      )
      .subscribe();

    return () => subscription.unsubscribe();
  }

  // ==================== CLEANUP ====================

  cleanup(): void {
    this.debounceTimers.forEach(timer => clearTimeout(timer));
    this.debounceTimers.clear();
    this.userId = null;
  }
}

// Create and export singleton instance
export const tabPersistenceManager = new TabPersistenceManager();
