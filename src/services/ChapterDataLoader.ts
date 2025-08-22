/**
 * CHAPTER DATA LOADER SERVICE
 * 
 * Handles automatic cloud sync when opening chapters
 * Prioritizes small files (<100KB) for immediate display
 * Loads large files in background
 */

import { supabase } from './supabaseClient';
import { EnhancedSyncService } from './EnhancedSyncService';

interface LoadingProgress {
  phase: 'cloudSync' | 'localStorage' | 'backgroundSync' | 'complete';
  progress: number;
  message: string;
  smallFilesLoaded: boolean;
  backgroundFilesLoading: boolean;
}

interface ChapterDataResult {
  success: boolean;
  error?: string;
  highlightCount: number;
  templateCount: number;
  customTabCount: number;
  examDataCount: number;
  totalSizeKB: number;
}

export class ChapterDataLoader {
  private static instance: ChapterDataLoader;
  private loadingListeners: ((progress: LoadingProgress) => void)[] = [];
  private currentLoadingState: LoadingProgress = {
    phase: 'complete',
    progress: 100,
    message: '',
    smallFilesLoaded: true,
    backgroundFilesLoading: false
  };

  private constructor() {}

  static getInstance(): ChapterDataLoader {
    if (!ChapterDataLoader.instance) {
      ChapterDataLoader.instance = new ChapterDataLoader();
    }
    return ChapterDataLoader.instance;
  }

  /**
   * Subscribe to loading progress updates
   */
  subscribe(listener: (progress: LoadingProgress) => void): () => void {
    this.loadingListeners.push(listener);
    return () => {
      this.loadingListeners = this.loadingListeners.filter(l => l !== listener);
    };
  }

  private notifyListeners(progress: LoadingProgress): void {
    this.currentLoadingState = progress;
    this.loadingListeners.forEach(listener => listener(progress));
  }

  /**
   * Main chapter loading function - called when opening any chapter
   */
  async loadChapterData(bookName: string, chapterName: string): Promise<ChapterDataResult> {
    console.log(`🚀 Starting chapter data loading: ${bookName} → ${chapterName}`);
    
    try {
      // PHASE 1: Check authentication and start cloud sync
      this.notifyListeners({
        phase: 'cloudSync',
        progress: 10,
        message: 'Connecting to cloud...',
        smallFilesLoaded: false,
        backgroundFilesLoading: false
      });

      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        console.log('📦 User not authenticated, loading from local storage only');
        return this.loadFromLocalStorageOnly(bookName, chapterName);
      }

      // PHASE 2: Sync from cloud (prioritize small files)
      this.notifyListeners({
        phase: 'cloudSync',
        progress: 20,
        message: 'Syncing content from cloud...',
        smallFilesLoaded: false,
        backgroundFilesLoading: false
      });

      const syncResult = await this.syncChapterFromCloud(bookName, chapterName, user.id);

      // Apply editor content key transformations to handle any synced or local data
      this.transformAllEditorKeys(bookName, chapterName);

      // PHASE 3: Load small files from localStorage (now populated from cloud)
      this.notifyListeners({
        phase: 'localStorage',
        progress: 60,
        message: 'Loading essential data...',
        smallFilesLoaded: false,
        backgroundFilesLoading: false
      });

      const smallFilesResult = await this.loadSmallFiles(bookName, chapterName);

      // PHASE 4: Mark small files as loaded (UI can now show)
      this.notifyListeners({
        phase: 'localStorage',
        progress: 90,
        message: 'Preparing interface...',
        smallFilesLoaded: true,
        backgroundFilesLoading: true
      });

      // Give UI a moment to render
      await new Promise(resolve => setTimeout(resolve, 200));

      // PHASE 5: Load large files in background
      this.startBackgroundLoading(bookName, chapterName);

      this.notifyListeners({
        phase: 'complete',
        progress: 100,
        message: 'Chapter loaded',
        smallFilesLoaded: true,
        backgroundFilesLoading: true
      });

      return {
        success: true,
        highlightCount: syncResult.highlights,
        templateCount: syncResult.templates,
        customTabCount: syncResult.customTabs,
        examDataCount: syncResult.examData,
        totalSizeKB: smallFilesResult.totalSizeKB
      };

    } catch (error) {
      console.error('❌ Chapter data loading failed:', error);
      
      this.notifyListeners({
        phase: 'complete',
        progress: 100,
        message: 'Loading failed, using cached data',
        smallFilesLoaded: true,
        backgroundFilesLoading: false
      });

      // Fallback to localStorage only
      return this.loadFromLocalStorageOnly(bookName, chapterName);
    }
  }

  /**
   * Sync specific chapter data from cloud
   */
  private async syncChapterFromCloud(bookName: string, chapterName: string, userId: string): Promise<{
    highlights: number;
    templates: number;
    customTabs: number;
    examData: number;
  }> {
    const enhancedSync = EnhancedSyncService.getInstance();
    let highlights = 0, templates = 0, customTabs = 0, examData = 0;

    try {
      // 1. Sync highlights for this specific chapter
      const { data: chapterHighlights } = await supabase
        .from('user_highlights')
        .select('*')
        .eq('user_id', userId)
        .eq('book_id', this.findBookIdByName(bookName) || bookName)
        .eq('chapter_id', chapterName);

      if (chapterHighlights && chapterHighlights.length > 0) {
        const normalizedBookName = bookName.replace(/\s+/g, '_');
        const normalizedChapterName = chapterName.replace(/\s+/g, '_');
        const highlightKey = `highlights_${normalizedBookName}_${normalizedChapterName}`;
        
        const localHighlights = chapterHighlights.map(h => ({
          id: h.id,
          text: h.text,
          color: h.color,
          position: h.position,
          note: h.note,
          timestamp: new Date(h.created_at)
        }));

        localStorage.setItem(highlightKey, JSON.stringify(localHighlights));
        highlights = localHighlights.length;
        console.log(`💡 Synced ${highlights} highlights for ${chapterName}`);
      }

      // 2. Sync all content data from user_books.content_data (templates, custom tabs, subtopics, HTML editors, question papers, etc.)
      const { data: bookData } = await supabase
        .from('user_books')
        .select('content_data')
        .eq('user_id', userId)
        .eq('id', this.findBookIdByName(bookName) || bookName)
        .single();

      if (bookData?.content_data) {
        const contentData = bookData.content_data;
        const normalizedBookName = bookName.replace(/\s+/g, '_');
        const normalizedChapterName = chapterName.replace(/\s+/g, '_');

        // Filter and restore only this chapter's data
        for (const [key, value] of Object.entries(contentData)) {
          if (key.includes(normalizedBookName) && key.includes(normalizedChapterName)) {
            localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
            
            // AUTOMATIC EDITOR CONTENT KEY TRANSFORMATION
            // Fix storage key mismatch between synced data and component expectations
            this.transformEditorContentKeys(key, value, bookName, chapterName);
            
            // Count different types
            if (key.startsWith('customtab_')) {
              customTabs++;
            } else if (key.includes('flashcards') || key.includes('mcq') || key.includes('qa') || 
                      key.includes('notes') || key.includes('mindmaps') || key.includes('videos')) {
              templates++;
            } else if (key.startsWith('questionPapers_')) {
              examData++; // Count question papers
            } else if (key.startsWith('subtopics_') || key.startsWith('html_editors_') || 
                      key.startsWith('rich_text_editors_') || key.startsWith('editor_mode_')) {
              // Don't increment counters for these as they're content data
              console.log(`📄 Content data restored: ${key}`);
            }
          }
        }
        
        console.log(`📊 Content data synced: templates=${templates}, customTabs=${customTabs}, examData=${examData}`);
      }

      // 3. Sync exam evaluations from dedicated table
      const { data: examEvaluations } = await supabase
        .from('exam_evaluations')
        .select('*')
        .eq('user_id', userId)
        .eq('book_id', this.findBookIdByName(bookName) || bookName)
        .eq('chapter_id', chapterName);

      if (examEvaluations && examEvaluations.length > 0) {
        const normalizedBookName = bookName.replace(/\s+/g, '_');
        const normalizedChapterName = chapterName.replace(/\s+/g, '_');
        const evalKey = `evaluationReports_${normalizedBookName}_${normalizedChapterName}`;
        
        const localEvaluations = examEvaluations.map(e => e.evaluation_data);
        localStorage.setItem(evalKey, JSON.stringify(localEvaluations));
        examData += localEvaluations.length;
      }

      console.log(`✅ Cloud sync complete: ${highlights} highlights, ${templates} templates, ${customTabs} custom tabs, ${examData} exam items`);
      
      return { highlights, templates, customTabs, examData };

    } catch (error) {
      console.error('❌ Cloud sync failed:', error);
      return { highlights: 0, templates: 0, customTabs: 0, examData: 0 };
    }
  }

  /**
   * Load small files (<100KB) for immediate display
   */
  private async loadSmallFiles(bookName: string, chapterName: string): Promise<{ count: number; totalSizeKB: number }> {
    const normalizedBookName = bookName.replace(/\s+/g, '_');
    const normalizedChapterName = chapterName.replace(/\s+/g, '_');
    
    let count = 0;
    let totalSize = 0;
    const SIZE_LIMIT = 100 * 1024; // 100KB

    // Get all keys for this chapter
    const allKeys = Object.keys(localStorage);
    const chapterKeys = allKeys.filter(key => 
      key.includes(normalizedBookName) && key.includes(normalizedChapterName)
    );

    for (const key of chapterKeys) {
      const data = localStorage.getItem(key);
      if (data) {
        const size = new Blob([data]).size;
        if (size <= SIZE_LIMIT) {
          count++;
          totalSize += size;
          console.log(`📄 Small file ready: ${key} (${(size/1024).toFixed(1)}KB)`);
        }
      }
    }

    console.log(`✅ ${count} small files ready (${(totalSize/1024).toFixed(1)}KB total)`);
    return { count, totalSizeKB: Math.round(totalSize/1024) };
  }

  /**
   * Start background loading of large files
   */
  private startBackgroundLoading(bookName: string, chapterName: string): void {
    setTimeout(async () => {
      try {
        console.log('🔄 Starting background loading of large files...');
        const normalizedBookName = bookName.replace(/\s+/g, '_');
        const normalizedChapterName = chapterName.replace(/\s+/g, '_');
        
        const allKeys = Object.keys(localStorage);
        const chapterKeys = allKeys.filter(key => 
          key.includes(normalizedBookName) && key.includes(normalizedChapterName)
        );

        const largeFiles = [];
        const SIZE_LIMIT = 100 * 1024; // 100KB

        for (const key of chapterKeys) {
          const data = localStorage.getItem(key);
          if (data) {
            const size = new Blob([data]).size;
            if (size > SIZE_LIMIT) {
              largeFiles.push({ key, size });
            }
          }
        }

        console.log(`📚 Background loading ${largeFiles.length} large files...`);
        for (const file of largeFiles) {
          console.log(`📄 Large file: ${file.key} (${(file.size/1024/1024).toFixed(1)}MB)`);
          // Simulate processing time for large files
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        this.notifyListeners({
          ...this.currentLoadingState,
          backgroundFilesLoading: false,
          message: 'All data loaded'
        });

        console.log('✅ Background loading complete');
        
      } catch (error) {
        console.error('❌ Background loading failed:', error);
        this.notifyListeners({
          ...this.currentLoadingState,
          backgroundFilesLoading: false
        });
      }
    }, 500); // Start background loading after UI renders
  }

  /**
   * Fallback: Load from localStorage only (offline mode)
   */
  private async loadFromLocalStorageOnly(bookName: string, chapterName: string): Promise<ChapterDataResult> {
    console.log('📦 Loading from localStorage only...');
    
    // Apply editor content key transformations to any existing localStorage data
    this.transformAllEditorKeys(bookName, chapterName);
    
    const result = await this.loadSmallFiles(bookName, chapterName);
    
    this.notifyListeners({
      phase: 'complete',
      progress: 100,
      message: 'Loaded from cache',
      smallFilesLoaded: true,
      backgroundFilesLoading: false
    });

    return {
      success: true,
      highlightCount: 0,
      templateCount: 0,
      customTabCount: 0,
      examDataCount: 0,
      totalSizeKB: result.totalSizeKB
    };
  }

  /**
   * Utility: Find book ID by name
   */
  private findBookIdByName(bookName: string): string | null {
    try {
      const booksData = localStorage.getItem('createdBooks');
      if (booksData) {
        const books = JSON.parse(booksData);
        const foundBook = books.find((book: any) => book.name === bookName);
        return foundBook?.id || null;
      }
    } catch (error) {
      console.warn('Failed to find book ID:', error);
    }
    return null;
  }

  /**
   * Get current loading state
   */
  getCurrentLoadingState(): LoadingProgress {
    return this.currentLoadingState;
  }

  /**
   * Force refresh chapter data (manual refresh)
   */
  async forceRefreshChapter(bookName: string, chapterName: string): Promise<ChapterDataResult> {
    // Clear existing data first
    this.clearChapterCache(bookName, chapterName);
    
    // Reload everything
    return this.loadChapterData(bookName, chapterName);
  }

  /**
   * Clear chapter cache
   */
  private clearChapterCache(bookName: string, chapterName: string): void {
    const normalizedBookName = bookName.replace(/\s+/g, '_');
    const normalizedChapterName = chapterName.replace(/\s+/g, '_');
    
    const allKeys = Object.keys(localStorage);
    const chapterKeys = allKeys.filter(key => 
      key.includes(normalizedBookName) && key.includes(normalizedChapterName)
    );

    chapterKeys.forEach(key => localStorage.removeItem(key));
    console.log(`🗑️ Cleared ${chapterKeys.length} cached items for ${bookName}/${chapterName}`);
  }

  /**
   * Scan all localStorage keys for this chapter and apply editor content transformations
   * This ensures offline/local-only loading also gets the transformation benefits
   */
  private transformAllEditorKeys(bookName: string, chapterName: string): void {
    console.log(`🔍 TRANSFORM DEBUG: Starting transformation for ${bookName} → ${chapterName}`);
    
    const normalizedBookName = bookName.replace(/\s+/g, '_');
    const normalizedChapterName = chapterName.replace(/\s+/g, '_');
    
    console.log(`🔍 TRANSFORM DEBUG: Normalized names: book="${normalizedBookName}" chapter="${normalizedChapterName}"`);
    
    // Get all localStorage keys that might need transformation for this chapter
    const allKeys = Object.keys(localStorage);
    const chapterKeys = allKeys.filter(key => 
      key.includes(normalizedBookName) && key.includes(normalizedChapterName) &&
      (key.startsWith('html_editors_') || key.startsWith('rich_text_editors_'))
    );
    
    console.log(`🔍 TRANSFORM DEBUG: Found ${chapterKeys.length} editor keys:`, chapterKeys);
    
    for (const key of chapterKeys) {
      const value = localStorage.getItem(key);
      if (value) {
        console.log(`🔄 TRANSFORM DEBUG: Processing key: ${key}`);
        try {
          const parsedValue = JSON.parse(value);
          this.transformEditorContentKeys(key, parsedValue, bookName, chapterName);
        } catch (e) {
          // If it's not JSON, pass as string
          console.log(`🔄 TRANSFORM DEBUG: Key contains non-JSON value, treating as string`);
          this.transformEditorContentKeys(key, value, bookName, chapterName);
        }
      }
    }
  }

  /**
   * Transforms synced editor content keys to match component expectations
   * Fixes storage key mismatch between cloud sync and UI components
   */
  private transformEditorContentKeys(key: string, value: any, bookName: string, chapterName: string): void {
    try {
      // Handle HTML editor content keys
      if (key.startsWith('html_editors_') && key.includes('_CustomTab')) {
        const tabMatch = key.match(/CustomTab(\d+|[a-zA-Z]+)/);
        if (tabMatch && tabMatch[1]) {
          const tabId = tabMatch[1];
          
          // Extract tab name from existing tab data
          const normalizedBook = bookName.replace(/\s+/g, '_');
          const normalizedChapter = chapterName.replace(/\s+/g, '_');
          
          // Try to find the actual tab name from the tabs cache
          const tabsCacheKey = `tabs_cache_a1c35782-6147-452f-9f00-512b3611131b_${chapterName.replace(/\s+/g, '_')}`;
          const tabsCache = localStorage.getItem(tabsCacheKey);
          let tabName = 'hhhhhhhhhhhhh'; // fallback
          
          if (tabsCache) {
            try {
              const tabsData = JSON.parse(tabsCache);
              const matchingTab = tabsData.tabs?.find((tab: any) => tab.id.includes('CustomTab'));
              if (matchingTab) {
                tabName = matchingTab.title;
              }
            } catch (e) {
              console.warn('Error parsing tabs cache:', e);
            }
          }
          
          // Create the expected content key that HTMLCodeEditor looks for
          const expectedContentKey = `html_editor_content_${normalizedBook}_${normalizedChapter}_${tabName}_1`;
          
          // Create the expected metadata list key that CustomTabWithEditorSwitching looks for
          const metadataListKey = `html_editors_${normalizedBook}_${normalizedChapter}_${tabName}`;
          
          // Extract the HTML content from the synced data
          let htmlContent = '';
          if (typeof value === 'string') {
            htmlContent = value;
          } else if (value && value.content) {
            htmlContent = value.content;
          }
          
          if (htmlContent) {
            // Create the individual content key
            localStorage.setItem(expectedContentKey, htmlContent);
            
            // Create/update the metadata list that components expect
            const editorMetadata = [{
              id: 1,
              title: 'Editor 1',
              createdAt: new Date().toISOString()
            }];
            localStorage.setItem(metadataListKey, JSON.stringify(editorMetadata));
            
            console.log(`🔄 Transformed HTML editor key: ${key} → ${expectedContentKey} + ${metadataListKey}`);
          }
        }
      }
      
      // Handle Rich Text editor content keys
      if (key.startsWith('rich_text_editors_') && (key.includes('_CustomTab') || key.includes('_Notes'))) {
        let editorId = '';
        let tabName = 'hhhhhhhhhhhhh'; // default fallback
        
        const normalizedBook = bookName.replace(/\s+/g, '_');
        const normalizedChapter = chapterName.replace(/\s+/g, '_');
        
        if (key.includes('_CustomTab')) {
          const tabMatch = key.match(/CustomTab(\d+|[a-zA-Z]+)/);
          editorId = tabMatch ? `CustomTab${tabMatch[1]}` : '';
          
          // Try to find the actual tab name from the tabs cache
          const tabsCacheKey = `tabs_cache_a1c35782-6147-452f-9f00-512b3611131b_${chapterName.replace(/\s+/g, '_')}`;
          const tabsCache = localStorage.getItem(tabsCacheKey);
          
          if (tabsCache) {
            try {
              const tabsData = JSON.parse(tabsCache);
              const matchingTab = tabsData.tabs?.find((tab: any) => tab.id.includes('CustomTab'));
              if (matchingTab) {
                tabName = matchingTab.title;
              }
            } catch (e) {
              console.warn('Error parsing tabs cache:', e);
            }
          }
        } else if (key.includes('_Notes')) {
          editorId = 'Notes';
          tabName = 'Notes';
        }
        
        if (editorId) {
          // Create the expected content key for rich text editors
          const expectedContentKey = `rich_text_editor_content_${normalizedBook}_${normalizedChapter}_${tabName}_1`;
          
          // Create the expected metadata list key
          const metadataListKey = `rich_text_editors_${normalizedBook}_${normalizedChapter}_${tabName}`;
          
          // Extract the rich text content from the synced data
          let richTextContent = '';
          if (typeof value === 'string') {
            richTextContent = value;
          } else if (value && value.content) {
            richTextContent = value.content;
          }
          
          if (richTextContent) {
            // Create the individual content key
            localStorage.setItem(expectedContentKey, richTextContent);
            
            // Create/update the metadata list that components expect
            const editorMetadata = [{
              id: 1,
              title: 'Editor 1',
              createdAt: new Date().toISOString()
            }];
            localStorage.setItem(metadataListKey, JSON.stringify(editorMetadata));
            
            console.log(`🔄 Transformed Rich Text editor key: ${key} → ${expectedContentKey} + ${metadataListKey}`);
          }
        }
      }
    } catch (error) {
      console.warn(`⚠️ Failed to transform editor content key: ${key}`, error);
    }
  }
}

export default ChapterDataLoader;
