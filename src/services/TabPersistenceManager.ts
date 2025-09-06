import { supabase } from './supabaseClient';

/**
 * @interface TabState
 * @description Defines the structure for a single dynamic tab within a chapter.
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

/**
 * @interface ChapterTabsState
 * @description Defines the complete state for all tabs within a single chapter.
 */
interface ChapterTabsState {
  chapterId: string;
  bookId: string;
  tabs: TabState[];
  activeTabId: string;
  lastAccessed: string;
}

/**
 * @class TabPersistenceManager
 * @description A singleton class to manage the state of dynamic tabs within a chapter,
 * providing persistence through localStorage and synchronization with a backend (Supabase).
 */
export class TabPersistenceManager {
  private readonly CACHE_PREFIX = 'tabs_cache_';
  private readonly DEBOUNCE_DELAY = 500; // 500ms debounce for saves
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();
  private userId: string | null = null;

  // ==================== INITIALIZATION ====================

  /**
   * @description Initializes the manager for a specific user and performs an initial sync from the backend.
   * @param {string} userId - The ID of the current user.
   */
  async initialize(userId: string) {
    this.userId = userId;
    await this.syncFromBackend();
  }

  // ==================== LOCAL STORAGE MANAGEMENT ====================

  /**
   * @description Generates the localStorage key for a given chapter.
   * @private
   * @param {string} chapterId - The ID of the chapter.
   * @returns {string} The localStorage key.
   */
  private getLocalKey(chapterId: string): string {
    return `${this.CACHE_PREFIX}${this.userId}_${chapterId}`;
  }

  /**
   * @description Retrieves the tab state for a chapter from localStorage.
   * @param {string} chapterId - The ID of the chapter.
   * @param {string} bookId - The ID of the book.
   * @returns {ChapterTabsState | null} The chapter's tab state, or null if not found.
   */
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

  /**
   * @description Saves the tab state for a chapter to localStorage and triggers a debounced save to the backend.
   * @param {ChapterTabsState} chapterTabsState - The tab state to save.
   */
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

  /**
   * @description Debounces the save operation to the backend to avoid excessive API calls.
   * @private
   * @param {ChapterTabsState} chapterTabsState - The tab state to save.
   */
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

  /**
   * @description Saves the tab state to the backend (Supabase) by upserting it into the user_progress table.
   * @private
   * @param {ChapterTabsState} chapterTabsState - The tab state to save.
   */
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

  /**
   * @description Fetches all tab states for the user from the backend and updates localStorage.
   * @private
   */
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

  /**
   * @description Adds a new tab to a chapter's tab state.
   * @param {string} chapterId - The ID of the chapter.
   * @param {string} bookId - The ID of the book.
   * @param {Omit<TabState, 'id' | 'lastModified'>} tab - The new tab's data.
   * @returns {string} The ID of the newly created tab.
   */
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

  /**
   * @description Updates an existing tab within a chapter's tab state.
   * @param {string} chapterId - The ID of the chapter.
   * @param {string} bookId - The ID of the book.
   * @param {string} tabId - The ID of the tab to update.
   * @param {Partial<TabState>} updates - The properties of the tab to update.
   */
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

  /**
   * @description Deletes a tab from a chapter's tab state.
   * @param {string} chapterId - The ID of the chapter.
   * @param {string} bookId - The ID of the book.
   * @param {string} tabId - The ID of the tab to delete.
   */
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

  /**
   * @description Sets the active tab for a given chapter.
   * @param {string} chapterId - The ID of the chapter.
   * @param {string} bookId - The ID of the book.
   * @param {string} tabId - The ID of the tab to set as active.
   */
  setActiveTab(chapterId: string, bookId: string, tabId: string): void {
    const chapterTabs = this.getChapterTabs(chapterId, bookId);
    if (!chapterTabs) return;

    chapterTabs.activeTabId = tabId;
    this.saveChapterTabs(chapterTabs);
  }

  // ==================== UTILITY METHODS ====================

  /**
   * @description Calculates a chapter's completion percentage based on the content of its tabs.
   * @private
   * @param {TabState[]} tabs - The array of tabs for the chapter.
   * @returns {number} The calculated progress percentage.
   */
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

  /**
   * @description Sets up a real-time subscription to receive tab state changes from other devices.
   * @param {(chapterId: string, tabsState: ChapterTabsState) => void} callback - The function to call when changes are received.
   * @returns {() => void} A function to unsubscribe.
   */
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

  /**
   * @description Clears all active debounce timers and resets the user ID. Should be called on logout.
   */
  cleanup(): void {
    this.debounceTimers.forEach(timer => clearTimeout(timer));
    this.debounceTimers.clear();
    this.userId = null;
  }
}

/**
 * @const tabPersistenceManager
 * @description The exported singleton instance of the TabPersistenceManager class.
 */
export const tabPersistenceManager = new TabPersistenceManager();
