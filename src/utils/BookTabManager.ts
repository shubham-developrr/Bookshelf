/**
 * BOOK-LINKED TAB ID SYSTEM
 * Creates unique tab IDs that are linked to specific books
 * Ensures proper data isolation between books while maintaining consistency within each book
 */

export interface BookTabContext {
  bookId: string;
  bookName: string;
  chapterId: string;
  tabId: string;
  tabType: 'template' | 'custom';
  templateType?: string; // For template tabs: 'flashcards', 'mindmaps', etc.
  customName?: string;   // For custom tabs: user-defined name
}

export class BookTabManager {
  
  /**
   * Generate a deterministic tab ID that's linked to the book
   * This ensures the same book always generates the same tab IDs
   */
  static generateBookLinkedTabId(
    bookName: string, 
    chapterName: string, 
    tabType: 'template' | 'custom',
    identifier: string // template type or custom name
  ): string {
    // Create a deterministic hash from book, chapter, and tab info
    const cleanBookName = bookName.toLowerCase().trim().replace(/[^a-z0-9]/g, '_');
    const cleanChapterName = chapterName.toLowerCase().trim().replace(/[^a-z0-9]/g, '_');
    const cleanIdentifier = identifier.toLowerCase().trim().replace(/[^a-z0-9]/g, '_');
    
    // Generate a short, deterministic ID
    const baseString = `${cleanBookName}_${cleanChapterName}_${tabType}_${cleanIdentifier}`;
    
    // Create a simple hash for shorter IDs
    let hash = 0;
    for (let i = 0; i < baseString.length; i++) {
      const char = baseString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    
    // Return a book-specific tab ID
    const hashStr = Math.abs(hash).toString(36).substring(0, 8);
    return `${tabType}_${cleanIdentifier}_${hashStr}`;
  }

  /**
   * Create storage key with book-linked tab ID
   * Pattern: templateType_bookName_chapterName_bookLinkedTabId
   */
  static createBookLinkedStorageKey(
    templateType: string,
    bookName: string,
    chapterName: string,
    tabContext: BookTabContext
  ): string {
    const cleanBookName = bookName.replace(/\s+/g, '_');
    const cleanChapterName = chapterName.replace(/\s+/g, '_');
    
    return `${templateType}_${cleanBookName}_${cleanChapterName}_${tabContext.tabId}`;
  }

  /**
   * Create tab context for template tabs (flashcards, mindmaps, etc.)
   */
  static createTemplateTabContext(
    bookName: string,
    chapterName: string,
    templateType: string
  ): BookTabContext {
    const tabId = this.generateBookLinkedTabId(bookName, chapterName, 'template', templateType);
    
    return {
      bookId: this.generateBookId(bookName),
      bookName,
      chapterId: this.generateChapterId(chapterName),
      tabId,
      tabType: 'template',
      templateType
    };
  }

  /**
   * Create tab context for custom tabs
   */
  static createCustomTabContext(
    bookName: string,
    chapterName: string,
    customName: string
  ): BookTabContext {
    const tabId = this.generateBookLinkedTabId(bookName, chapterName, 'custom', customName);
    
    return {
      bookId: this.generateBookId(bookName),
      bookName,
      chapterId: this.generateChapterId(chapterName),
      tabId,
      tabType: 'custom',
      customName
    };
  }

  /**
   * Get all tabs for a specific book and chapter
   */
  static getBookChapterTabs(bookName: string, chapterName: string): BookTabContext[] {
    const tabs: BookTabContext[] = [];
    
    // Standard template types
    const templateTypes = ['flashcards', 'mcq', 'qa', 'notes', 'mindmaps', 'videos'];
    
    // Check each template type for existing data
    templateTypes.forEach(templateType => {
      const tabContext = this.createTemplateTabContext(bookName, chapterName, templateType);
      const storageKey = this.createBookLinkedStorageKey(templateType, bookName, chapterName, tabContext);
      
      // Check if this tab has data
      const data = localStorage.getItem(storageKey);
      if (data && data !== 'null' && data !== '[]') {
        try {
          const parsed = JSON.parse(data);
          const hasContent = Array.isArray(parsed) 
            ? parsed.length > 0 
            : (typeof parsed === 'object' && Object.keys(parsed).length > 0);
            
          if (hasContent) {
            tabs.push(tabContext);
          }
        } catch (error) {
          console.warn(`Error parsing data for ${storageKey}:`, error);
        }
      }
    });

    // Check for custom tabs
    const customTabs = this.findCustomTabs(bookName, chapterName);
    tabs.push(...customTabs);

    return tabs;
  }

  /**
   * Find custom tabs for a book/chapter
   */
  private static findCustomTabs(bookName: string, chapterName: string): BookTabContext[] {
    const customTabs: BookTabContext[] = [];
    
    // Look for custom tab storage keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(`customtab_${bookName}_${chapterName}_`)) {
        const customName = key.replace(`customtab_${bookName}_${chapterName}_`, '');
        const content = localStorage.getItem(key);
        
        if (content && content.trim() && content !== 'null') {
          const tabContext = this.createCustomTabContext(bookName, chapterName, customName);
          customTabs.push(tabContext);
        }
      }
    }
    
    return customTabs;
  }

  /**
   * Save data with book-linked tab context
   */
  static saveTabData(
    templateType: string,
    tabContext: BookTabContext,
    data: any
  ): void {
    const storageKey = this.createBookLinkedStorageKey(
      templateType, 
      tabContext.bookName, 
      tabContext.chapterId, 
      tabContext
    );
    
    localStorage.setItem(storageKey, JSON.stringify(data));
    console.log(`💾 Saved ${templateType} data for book-linked tab: ${tabContext.tabId}`);
  }

  /**
   * Load data with book-linked tab context
   */
  static loadTabData(
    templateType: string,
    tabContext: BookTabContext
  ): any {
    const storageKey = this.createBookLinkedStorageKey(
      templateType, 
      tabContext.bookName, 
      tabContext.chapterId, 
      tabContext
    );
    
    const data = localStorage.getItem(storageKey);
    if (data && data !== 'null') {
      try {
        return JSON.parse(data);
      } catch (error) {
        console.warn(`Error parsing ${templateType} data for tab ${tabContext.tabId}:`, error);
        return null;
      }
    }
    
    return null;
  }

  /**
   * Create a new custom tab for a book
   */
  static createNewCustomTab(
    bookName: string,
    chapterName: string,
    customName: string,
    initialContent: string = ''
  ): BookTabContext {
    const tabContext = this.createCustomTabContext(bookName, chapterName, customName);
    
    // Save initial content
    const storageKey = `customtab_${bookName}_${chapterName}_${customName}`;
    localStorage.setItem(storageKey, initialContent);
    
    console.log(`✨ Created new custom tab: ${customName} for ${bookName}/${chapterName}`);
    return tabContext;
  }

  /**
   * Delete a tab and its data
   */
  static deleteTab(
    templateType: string,
    tabContext: BookTabContext
  ): boolean {
    try {
      const storageKey = this.createBookLinkedStorageKey(
        templateType, 
        tabContext.bookName, 
        tabContext.chapterId, 
        tabContext
      );
      
      localStorage.removeItem(storageKey);
      
      // Also remove custom tab content if it's a custom tab
      if (tabContext.tabType === 'custom' && tabContext.customName) {
        const customKey = `customtab_${tabContext.bookName}_${tabContext.chapterId}_${tabContext.customName}`;
        localStorage.removeItem(customKey);
      }
      
      console.log(`🗑️ Deleted tab: ${tabContext.tabId}`);
      return true;
    } catch (error) {
      console.error(`Error deleting tab ${tabContext.tabId}:`, error);
      return false;
    }
  }

  /**
   * Export all tab data for a book (for publishing/sharing)
   */
  static exportBookTabData(bookName: string): {
    [chapterName: string]: {
      [tabId: string]: {
        type: 'template' | 'custom';
        templateType?: string;
        customName?: string;
        data: any;
      }
    }
  } {
    const exportData: any = {};
    
    // Get all chapters for this book
    const chapters = this.getBookChapters(bookName);
    
    chapters.forEach(chapterName => {
      const tabs = this.getBookChapterTabs(bookName, chapterName);
      exportData[chapterName] = {};
      
      tabs.forEach(tabContext => {
        if (tabContext.templateType) {
          // Template tab
          const data = this.loadTabData(tabContext.templateType, tabContext);
          if (data) {
            exportData[chapterName][tabContext.tabId] = {
              type: 'template',
              templateType: tabContext.templateType,
              data
            };
          }
        } else if (tabContext.customName) {
          // Custom tab
          const customKey = `customtab_${bookName}_${chapterName}_${tabContext.customName}`;
          const data = localStorage.getItem(customKey);
          if (data && data !== 'null') {
            exportData[chapterName][tabContext.tabId] = {
              type: 'custom',
              customName: tabContext.customName,
              data
            };
          }
        }
      });
    });
    
    return exportData;
  }

  /**
   * Import tab data for a book (when importing/publishing)
   */
  static importBookTabData(
    bookName: string, 
    tabData: any
  ): { imported: number; errors: string[] } {
    let imported = 0;
    const errors: string[] = [];
    
    try {
      Object.entries(tabData).forEach(([chapterName, chapterTabs]: [string, any]) => {
        Object.entries(chapterTabs).forEach(([tabId, tabInfo]: [string, any]) => {
          try {
            if (tabInfo.type === 'template' && tabInfo.templateType) {
              // Import template tab
              const tabContext = this.createTemplateTabContext(
                bookName, 
                chapterName, 
                tabInfo.templateType
              );
              this.saveTabData(tabInfo.templateType, tabContext, tabInfo.data);
              imported++;
            } else if (tabInfo.type === 'custom' && tabInfo.customName) {
              // Import custom tab
              const customKey = `customtab_${bookName}_${chapterName}_${tabInfo.customName}`;
              localStorage.setItem(customKey, tabInfo.data);
              imported++;
            }
          } catch (error) {
            errors.push(`Error importing tab ${tabId}: ${error}`);
          }
        });
      });
    } catch (error) {
      errors.push(`Error importing book tab data: ${error}`);
    }
    
    return { imported, errors };
  }

  // Helper methods
  private static generateBookId(bookName: string): string {
    return bookName.toLowerCase().replace(/\s+/g, '_');
  }

  private static generateChapterId(chapterName: string): string {
    return chapterName.toLowerCase().replace(/\s+/g, '_');
  }

  private static getBookChapters(bookName: string): string[] {
    // This would typically come from your book management system
    // For now, extract from localStorage keys
    const chapters = new Set<string>();
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.includes(bookName)) {
        // Extract chapter name from various key patterns
        const patterns = [
          /flashcards_[^_]+_([^_]+)/,
          /mcq_[^_]+_([^_]+)/,
          /qa_[^_]+_([^_]+)/,
          /notes_[^_]+_([^_]+)/,
          /mindmaps_[^_]+_([^_]+)/,
          /videos_[^_]+_([^_]+)/
        ];
        
        patterns.forEach(pattern => {
          const match = key.match(pattern);
          if (match && match[1]) {
            chapters.add(match[1]);
          }
        });
      }
    }
    
    return Array.from(chapters);
  }
}
