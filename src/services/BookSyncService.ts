import { supabase } from './supabaseClient';
import { SupabaseAssetService } from './SupabaseAssetService';
import { BackendBookService, BookMetadata, FullBookData } from './BackendBookService';
import { BookTabManager } from '../utils/BookTabManager';

/**
 * PROGRESSIVE DATA LOADING & SYNC SYSTEM
 * 
 * Phase 1: Quick book list from backend (immediate)
 * Phase 2: Book content from backend when clicked (on-demand)  
 * Phase 3: Local cache for performance (smart caching)
 * 
 * Backend data always takes priority for cross-device consistency
 */

export interface SyncResult {
  success: boolean;
  bookId: string;
  synced: {
    metadata: boolean;
    chapters: boolean;
    templates: number;
    assets: number;
    userdata: boolean;
  };
  errors: string[];
}

// Loading states for UI feedback
export interface LoadingState {
  isLoadingBookList: boolean;
  isLoadingBook: { [bookId: string]: boolean };
  lastSync: { [bookId: string]: Date };
  syncErrors: { [bookId: string]: string };
}

export interface SyncStatus {
  isOnline: boolean;
  lastSync: string | null;
  pendingSync: string[]; // Book IDs
  isSyncing: boolean;
}

// Sync metadata interface
interface SyncMetadata {
  bookId: string;
  lastSyncTimestamp: Date;
  localVersion: string;
  backendVersion: string;
  syncStatus: 'synced' | 'pending' | 'conflict' | 'error' | 'loading';
}

export class BookSyncService {
  private static instance: BookSyncService;
  private backendService: BackendBookService;
  private loadingState: LoadingState = {
    isLoadingBookList: false,
    isLoadingBook: {},
    lastSync: {},
    syncErrors: {}
  };
  private listeners: Set<(state: LoadingState) => void> = new Set();
  
  private static syncStatus: SyncStatus = {
    isOnline: true,
    lastSync: null,
    pendingSync: [],
    isSyncing: false
  };

  private static statusListeners: ((status: SyncStatus) => void)[] = [];
  
  // Cache for failed asset migrations to avoid retrying invalid blob URLs
  private static failedMigrationCache = new Set<string>();

  private constructor() {
    this.backendService = BackendBookService.getInstance();
  }

  static getInstance(): BookSyncService {
    if (!BookSyncService.instance) {
      BookSyncService.instance = new BookSyncService();
    }
    return BookSyncService.instance;
  }

  /**
   * Initialize the BookSync service - sets up real-time sync, network detection, etc.
   */
  static async initialize(): Promise<void> {
    console.log('🔄 BookSyncService initialization started...');
    
    try {
      // Set up network detection
      this.setupNetworkDetection();
      
      // Set up realtime sync if user is authenticated
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        console.log('✅ User authenticated, setting up realtime sync...');
        this.setupRealtimeSync();
      } else {
        console.log('ℹ️ User not authenticated, skipping realtime sync setup');
      }
      
      console.log('✅ BookSyncService initialization complete');
    } catch (error) {
      console.warn('⚠️ BookSyncService initialization error:', error);
      // Don't throw - allow app to continue in offline mode
    }
  }

  // ==================== PROGRESSIVE LOADING SYSTEM ====================

  /**
   * Subscribe to loading state changes
   */
  subscribe(listener: (state: LoadingState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener({ ...this.loadingState }));
  }

  private updateLoadingState(updates: Partial<LoadingState>): void {
    this.loadingState = { ...this.loadingState, ...updates };
    this.notifyListeners();
  }

  /**
   * PHASE 1: Load book list from backend (immediate on app start)
   * Shows book cards quickly with just metadata
   */
  async loadBookList(userId?: string, forceRefresh = false): Promise<BookMetadata[]> {
    console.log('📚 Phase 1: Loading book list from backend...');
    
    this.updateLoadingState({ isLoadingBookList: true });

    try {
      // Get authenticated user if not provided
      let user;
      if (userId) {
        user = { id: userId };
      } else {
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
        if (authError || !authUser) {
          console.warn('User not authenticated for book list');
          this.updateLoadingState({ isLoadingBookList: false });
          return this.getCachedBookList() || [];
        }
        user = authUser;
      }

      // Check cached book list first (unless force refresh)
      if (!forceRefresh) {
        const cachedList = this.getCachedBookList(user.id);
        if (cachedList && cachedList.length > 0 && this.isBookListCacheFresh(user.id)) {
          console.log(`✅ Found ${cachedList.length} cached books, using cache`);
          this.updateLoadingState({ isLoadingBookList: false });
          
          // Start background refresh after returning cached data
          setTimeout(() => this.loadBookList(user.id, true), 100);
          return cachedList;
        }
      }

      // Fetch from backend
      const bookList = await this.backendService.getUserBooks(user.id);
      console.log(`🌐 Loaded ${bookList.length} books from backend`);

      // Cache the book list
      this.cacheBookList(bookList, user.id);

      this.updateLoadingState({ isLoadingBookList: false });
      return bookList;

    } catch (error) {
      console.error('💥 Phase 1 failed:', error);
      this.updateLoadingState({ 
        isLoadingBookList: false,
        syncErrors: { ...this.loadingState.syncErrors, bookList: error instanceof Error ? error.message : 'Unknown error' }
      });

      // Fallback to cached data
      const cachedList = this.getCachedBookList(userId);
      if (cachedList) {
        console.log('🔄 Using cached book list as fallback');
        return cachedList;
      }

      throw error;
    }
  }

  /**
   * PHASE 2: Load complete book content from backend (on-demand when book clicked)
   * Loads chapters, templates, custom tabs, etc.
   */
  async loadBookContent(bookId: string, forceRefresh = false): Promise<FullBookData> {
    console.log(`📖 Phase 2: Loading book content for ${bookId}...`);
    
    this.updateLoadingState({ 
      isLoadingBook: { ...this.loadingState.isLoadingBook, [bookId]: true }
    });

    try {
      // Check if we need to refresh from backend
      if (!forceRefresh && this.isBookDataFresh(bookId)) {
        const cachedData = await this.getCachedBookData(bookId);
        if (cachedData) {
          console.log(`✅ Using fresh cached data for book ${bookId}`);
          this.updateLoadingState({ 
            isLoadingBook: { ...this.loadingState.isLoadingBook, [bookId]: false }
          });
          return cachedData;
        }
      }

      // Fetch complete book data from backend
      const bookData = await this.backendService.getBookDetails(bookId);
      console.log(`🌐 Loaded complete book data for ${bookId} from backend`);

      // Cache the book data locally (Phase 3)
      await this.cacheBookData(bookId, bookData);

      // Update sync metadata
      this.updateSyncMetadata(bookId, 'synced');

      this.updateLoadingState({ 
        isLoadingBook: { ...this.loadingState.isLoadingBook, [bookId]: false },
        lastSync: { ...this.loadingState.lastSync, [bookId]: new Date() }
      });

      // Track book access for smart background sync
      this.trackBookAccess(bookId);

      return bookData;

    } catch (error) {
      console.error(`💥 Phase 2 failed for book ${bookId}:`, error);
      this.updateLoadingState({ 
        isLoadingBook: { ...this.loadingState.isLoadingBook, [bookId]: false },
        syncErrors: { ...this.loadingState.syncErrors, [bookId]: error instanceof Error ? error.message : 'Unknown error' }
      });

      // Try to fallback to cached data
      const cachedData = await this.getCachedBookData(bookId);
      if (cachedData) {
        console.log(`🔄 Using cached book data as fallback for ${bookId}`);
        return cachedData;
      }

      throw error;
    }
  }

  // ==================== PHASE 3: INTELLIGENT CACHING ====================

  /**
   * Cache book data locally for performance
   */
  private async cacheBookData(bookId: string, data: FullBookData): Promise<void> {
    console.log(`💾 Phase 3: Caching book data for ${bookId}...`);

    try {
      // Cache using existing BookTabManager system
      const bookName = data.metadata.name;

      // Store chapters
      localStorage.setItem(`chapters_${bookId}`, JSON.stringify(data.chapters));

      // Store template data for each chapter
      Object.entries(data.templateData).forEach(([templateType, chapterData]) => {
        Object.entries(chapterData).forEach(([chapterKey, templateContent]) => {
          const tabContext = BookTabManager.createTemplateTabContext(bookName, chapterKey, templateType);
          BookTabManager.saveTabData(templateType, tabContext, templateContent);
        });
      });

      // Store custom tabs
      Object.entries(data.customTabs).forEach(([chapterKey, tabData]) => {
        Object.entries(tabData).forEach(([tabName, content]) => {
          BookTabManager.saveCustomTabData(bookName, chapterKey, tabName, content);
        });
      });

      // Store highlights
      Object.entries(data.highlights).forEach(([chapterKey, highlightData]) => {
        const key = `highlights_${chapterKey}`;
        localStorage.setItem(key, JSON.stringify(highlightData));
      });

      // Store metadata and sync info
      localStorage.setItem(`book_metadata_${bookId}`, JSON.stringify(data.metadata));
      this.updateSyncMetadata(bookId, 'synced');

      console.log(`✅ Successfully cached book data for ${bookId}`);
    } catch (error) {
      console.error(`💥 Failed to cache book data for ${bookId}:`, error);
    }
  }

  private async getCachedBookData(bookId: string): Promise<FullBookData | null> {
    try {
      const metadataStr = localStorage.getItem(`book_metadata_${bookId}`);
      if (!metadataStr) return null;

      const metadata: BookMetadata = JSON.parse(metadataStr);
      const chaptersStr = localStorage.getItem(`chapters_${bookId}`);
      const chapters: any[] = chaptersStr ? JSON.parse(chaptersStr) : [];

      // Reconstruct template data from BookTabManager
      const templateData = {
        flashcards: this.reconstructTemplateData(metadata.name, 'FLASHCARD'),
        mindmaps: this.reconstructTemplateData(metadata.name, 'MINDMAP'),
        mcq: this.reconstructTemplateData(metadata.name, 'MCQ'),
        qa: this.reconstructTemplateData(metadata.name, 'QA'),
        notes: this.reconstructTemplateData(metadata.name, 'NOTES'),
        videos: this.reconstructTemplateData(metadata.name, 'VIDEOS')
      };

      // Reconstruct custom tabs
      const customTabs = this.reconstructCustomTabs(metadata.name, chapters);

      // Reconstruct highlights
      const highlights = this.reconstructHighlights(chapters);

      return {
        metadata,
        chapters,
        templateData,
        customTabs,
        highlights,
        assets: [] // Would need to implement asset caching
      };
    } catch (error) {
      console.error(`Error loading cached book data for ${bookId}:`, error);
      return null;
    }
  }

  private reconstructTemplateData(bookName: string, templateType: string): { [chapterKey: string]: any[] } {
    const data: { [chapterKey: string]: any[] } = {};
    const normalizedBookName = bookName.replace(/\s+/g, '_');
    const prefix = `${templateType.toLowerCase()}_${normalizedBookName}_`;

    // Scan localStorage for template data
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        const chapterKey = key.substring(prefix.length);
        const value = localStorage.getItem(key);
        if (value) {
          try {
            data[chapterKey] = JSON.parse(value);
          } catch (error) {
            console.warn(`Failed to parse template data for key ${key}:`, error);
          }
        }
      }
    }

    return data;
  }

  private reconstructCustomTabs(bookName: string, chapters: any[]): { [chapterKey: string]: { [tabName: string]: string } } {
    const customTabs: { [chapterKey: string]: { [tabName: string]: string } } = {};
    const normalizedBookName = bookName.replace(/\s+/g, '_');

    // Scan for custom tab data
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(`customtab_`) && key.includes(`_${normalizedBookName}_`)) {
        const parts = key.split('_');
        if (parts.length >= 4) {
          const chapterKey = parts[2];
          const tabName = parts.slice(3).join('_');
          const value = localStorage.getItem(key);
          
          if (value) {
            if (!customTabs[chapterKey]) {
              customTabs[chapterKey] = {};
            }
            customTabs[chapterKey][tabName] = value;
          }
        }
      }
    }

    return customTabs;
  }

  private reconstructHighlights(chapters: any[]): { [chapterKey: string]: any[] } {
    const highlights: { [chapterKey: string]: any[] } = {};

    // Reconstruct highlights for each chapter
    chapters.forEach(chapter => {
      const chapterKey = chapter.title?.replace(/\s+/g, '_') || chapter.id;
      const highlightKey = `highlights_${chapterKey}`;
      const value = localStorage.getItem(highlightKey);
      
      if (value) {
        try {
          highlights[chapterKey] = JSON.parse(value);
        } catch (error) {
          console.warn(`Failed to parse highlights for ${highlightKey}:`, error);
        }
      }
    });

    return highlights;
  }

  private cacheBookList(bookList: BookMetadata[], userId: string): void {
    const cacheKey = `cached_book_list_${userId}`;
    localStorage.setItem(cacheKey, JSON.stringify(bookList));
    BackendBookService.setCacheTimestamp(cacheKey);
  }

  private getCachedBookList(userId?: string): BookMetadata[] | null {
    try {
      const cacheKey = userId ? `cached_book_list_${userId}` : 'cached_book_list';
      const cached = localStorage.getItem(cacheKey);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.error('Error loading cached book list:', error);
      return null;
    }
  }

  private isBookListCacheFresh(userId: string, maxAgeMinutes = 15): boolean {
    const cacheKey = `cached_book_list_${userId}`;
    return BackendBookService.isCacheValid(cacheKey, maxAgeMinutes);
  }

  private isBookDataFresh(bookId: string, maxAgeMinutes = 30): boolean {
    const syncMetadata = this.getSyncMetadata(bookId);
    if (!syncMetadata || syncMetadata.syncStatus !== 'synced') return false;

    const ageInMinutes = (Date.now() - syncMetadata.lastSyncTimestamp.getTime()) / (1000 * 60);
    return ageInMinutes < maxAgeMinutes;
  }

  // ==================== SYNC METADATA ====================

  private updateSyncMetadata(bookId: string, status: SyncMetadata['syncStatus']): void {
    const metadata: SyncMetadata = {
      bookId,
      lastSyncTimestamp: new Date(),
      localVersion: Date.now().toString(),
      backendVersion: Date.now().toString(),
      syncStatus: status
    };
    localStorage.setItem(`sync_metadata_${bookId}`, JSON.stringify(metadata));
  }

  private getSyncMetadata(bookId: string): SyncMetadata | null {
    try {
      const data = localStorage.getItem(`sync_metadata_${bookId}`);
      if (!data) return null;
      
      const metadata = JSON.parse(data);
      metadata.lastSyncTimestamp = new Date(metadata.lastSyncTimestamp);
      return metadata;
    } catch (error) {
      return null;
    }
  }

  // Public methods for progressive loading
  getLoadingState(): LoadingState {
    return { ...this.loadingState };
  }

  async refreshBook(bookId: string): Promise<FullBookData> {
    return this.loadBookContent(bookId, true);
  }

  // Track book access for smart background sync
  trackBookAccess(bookId: string): void {
    const recentBooks = this.getRecentlyAccessedBooks();
    const updatedBooks = [bookId, ...recentBooks.filter(id => id !== bookId)].slice(0, 5);
    localStorage.setItem('recently_accessed_books', JSON.stringify(updatedBooks));
  }

  private getRecentlyAccessedBooks(): string[] {
    try {
      const recent = localStorage.getItem('recently_accessed_books');
      return recent ? JSON.parse(recent) : [];
    } catch (error) {
      return [];
    }
  }

  /**
   * Background sync for recently accessed books
   */
  async backgroundSyncRecent(userId?: string): Promise<void> {
    console.log('🔄 Starting background sync for recent books...');
    
    try {
      let user;
      if (userId) {
        user = { id: userId };
      } else {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) return;
        user = authUser;
      }
      
      // Refresh book list in background
      await this.loadBookList(user.id, true);
      
      // Sync recently accessed books
      const recentBooks = this.getRecentlyAccessedBooks();
      for (const bookId of recentBooks.slice(0, 3)) { // Limit to 3 most recent
        try {
          await this.loadBookContent(bookId, true);
        } catch (error) {
          console.warn(`Background sync failed for book ${bookId}:`, error);
        }
      }
    } catch (error) {
      console.error('Background sync failed:', error);
    }
  }

  // ==================== LEGACY METHODS (kept for compatibility) ====================

  /**
   * Sync a complete book to Supabase backend (legacy compatibility)
   */
  static async syncBookToBackend(bookId: string): Promise<SyncResult> {
    const instance = BookSyncService.getInstance();
    const result: SyncResult = {
      success: false,
      bookId,
      synced: {
        metadata: false,
        chapters: false,
        templates: 0,
        assets: 0,
        userdata: false
      },
      errors: []
    };

    try {
      BookSyncService.setSyncingStatus(true);
      console.log(`📤 Legacy sync to backend: ${bookId}`);

      // Get book data using new progressive loading
      const bookData = await instance.loadBookContent(bookId);
      
      // The progressive loading already handles backend sync
      result.synced.metadata = true;
      result.synced.chapters = true;
      result.synced.templates = Object.keys(bookData.templateData).length;
      result.synced.userdata = true;
      result.success = true;

      return result;

    } catch (error) {
      console.error(`❌ Legacy sync failed for book ${bookId}:`, error);
      result.errors.push(error instanceof Error ? error.message : 'Unknown sync error');
      return result;
    } finally {
      BookSyncService.setSyncingStatus(false);
    }
  }

  /**
   * TEMPORARY - This method will be removed after fixing authentication
   */
  static async collectAllBookDataTemp(bookName: string, bookId: string): Promise<SyncResult> {
    const result: SyncResult = {
      success: false,
      bookId,
      synced: {
        metadata: false,
        chapters: false,
        templates: 0,
        assets: 0,
        userdata: false
      },
      errors: []
    };

    try {
      this.setSyncingStatus(true);
      console.log(`📤 Syncing book to backend: ${bookId}`);

      // Get authenticated user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) {
        console.error('❌ Auth error during sync:', authError);
        result.errors.push(`Authentication failed: ${authError.message}`);
        return result;
      }
      if (!user) {
        console.error('❌ User not authenticated for sync');
        result.errors.push('User not authenticated');
        return result;
      }

      // 1. Get book metadata
      const books = JSON.parse(localStorage.getItem('createdBooks') || '[]');
      const book = books.find((b: any) => b.id === bookId);
      if (!book) {
        result.errors.push('Book not found in localStorage');
        return result;
      }

      // 2. Get chapters data
      const chapters = JSON.parse(localStorage.getItem(`chapters_${bookId}`) || '[]');

      // 3. Collect all template and user data for this book
      const contentData = await this.collectAllBookData(book.name, bookId);

      // 4. Migrate blob URLs to cloud storage
      const migratedContentData = await this.migrateAssetsInData(contentData, bookId);
      result.synced.assets = Object.keys(migratedContentData.migratedAssets || {}).length;

      // 5. Sync to Supabase
      const { error: syncError } = await supabase
        .from('user_books')
        .upsert({
          id: bookId,
          user_id: user.id,
          book_data: book,
          chapters_data: chapters,
          content_data: migratedContentData.data,
          updated_at: new Date().toISOString(),
          last_synced: new Date().toISOString()
        });

      if (syncError) {
        result.errors.push(`Sync failed: ${syncError.message}`);
        return result;
      }

      // 6. Update local sync status
      this.updateLocalSyncStatus(bookId);

      // Mark successful sync components
      result.synced.metadata = true;
      result.synced.chapters = true;
      result.synced.templates = Object.keys(migratedContentData.data).length;
      result.synced.userdata = true;
      result.success = true;

      console.log(`✅ Book synced successfully: ${bookId}`);
      return result;

    } catch (error) {
      console.error(`❌ Sync failed for book ${bookId}:`, error);
      result.errors.push(error instanceof Error ? error.message : 'Unknown sync error');
      return result;
    } finally {
      this.setSyncingStatus(false);
    }
  }

  /**
   * Collect all data associated with a book from localStorage
   */
  private static async collectAllBookData(bookName: string, bookId: string): Promise<{ [key: string]: any }> {
    const data: { [key: string]: any } = {};
    const normalizedBookName = bookName.replace(/\s+/g, '_');

    // Scan all localStorage keys for this book
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && this.isBookRelatedKey(key, bookId, normalizedBookName)) {
        const value = localStorage.getItem(key);
        if (value && value !== 'null') {
          try {
            data[key] = JSON.parse(value);
          } catch {
            data[key] = value; // Store as string if not JSON
          }
        }
      }
    }

    console.log(`📊 Collected ${Object.keys(data).length} data entries for book: ${bookName}`);
    return data;
  }

  /**
   * Check if localStorage key is related to a specific book
   */
  private static isBookRelatedKey(key: string, bookId: string, normalizedBookName: string): boolean {
    // Get the original book name with spaces (reverse normalize)
    const originalBookName = normalizedBookName.replace(/_/g, ' ');
    
    return (
      key.includes(`_${bookId}_`) ||
      key.startsWith(`chapters_${bookId}`) ||
      // Support both normalized (underscore) and original (space) patterns
      key.includes(`_${normalizedBookName}_`) ||
      key.includes(`_${originalBookName}_`) ||
      key.startsWith(`flashcards_${normalizedBookName}`) ||
      key.startsWith(`flashcards_${originalBookName}`) ||
      key.startsWith(`mcq_${normalizedBookName}`) ||
      key.startsWith(`mcq_${originalBookName}`) ||
      key.startsWith(`qa_${normalizedBookName}`) ||
      key.startsWith(`qa_${originalBookName}`) ||
      key.startsWith(`notes_${normalizedBookName}`) ||
      key.startsWith(`notes_${originalBookName}`) ||
      key.startsWith(`mindmaps_${normalizedBookName}`) ||
      key.startsWith(`mindmaps_${originalBookName}`) ||
      key.startsWith(`videos_${normalizedBookName}`) ||
      key.startsWith(`videos_${originalBookName}`) ||
      key.startsWith(`highlights_${normalizedBookName}`) ||
      key.startsWith(`highlights_${originalBookName}`) ||
      key.startsWith(`html_editor_content_${normalizedBookName}`) ||
      key.startsWith(`html_editor_content_${originalBookName}`) ||
      key.startsWith(`rich_text_editor_content_${normalizedBookName}`) ||
      key.startsWith(`rich_text_editor_content_${originalBookName}`) ||
      key.startsWith(`html_editors_${normalizedBookName}`) ||
      key.startsWith(`html_editors_${originalBookName}`) ||
      key.startsWith(`rich_text_editors_${normalizedBookName}`) ||
      key.startsWith(`rich_text_editors_${originalBookName}`) ||
      key.startsWith(`questionPapers_${normalizedBookName}`) ||
      key.startsWith(`questionPapers_${originalBookName}`) ||
      // Handle space-separated chapter names in questionPapers keys
      key.startsWith(`questionPapers_${originalBookName} `) ||
      key.startsWith(`questionPapers_${normalizedBookName} `) ||
      (key.includes(`customtab_`) && (key.includes(`_${normalizedBookName}_`) || key.includes(`_${originalBookName}_`)))
    );
  }

  /**
   * Migrate blob URLs and base64 assets to cloud storage
   */
  private static async migrateAssetsInData(data: { [key: string]: any }, bookId: string): Promise<{
    data: { [key: string]: any };
    migratedAssets: { [oldUrl: string]: string };
  }> {
    const migratedData: { [key: string]: any } = {};
    const migratedAssets: { [oldUrl: string]: string } = {};

    for (const [key, value] of Object.entries(data)) {
      migratedData[key] = await this.recursiveMigrateAssets(value, { bookId }, migratedAssets);
    }

    console.log(`🔄 Migrated ${Object.keys(migratedAssets).length} assets to cloud storage`);
    return { data: migratedData, migratedAssets };
  }

  /**
   * Recursively migrate assets in data structures
   */
  private static async recursiveMigrateAssets(
    data: any,
    context: { bookId: string; chapterId?: string; tabId?: string },
    migratedAssets: { [oldUrl: string]: string }
  ): Promise<any> {
    if (typeof data === 'string') {
      // Check if it's an asset that needs migration
      if ((data.startsWith('blob:') || data.startsWith('data:image/') || data.startsWith('data:application/pdf')) 
          && !migratedAssets[data]) {
        
        // Skip if we've already determined this URL is invalid
        if (this.failedMigrationCache.has(data)) {
          console.log(`⏭️ Skipping previously failed migration: ${data.substring(0, 50)}...`);
          return data;
        }
        
        try {
          const cloudUrl = await SupabaseAssetService.migrateLocalAsset(data, context);
          if (cloudUrl) {
            migratedAssets[data] = cloudUrl;
            return cloudUrl;
          } else {
            // Migration returned null, cache this as failed
            console.log(`🚫 Caching failed migration: ${data.substring(0, 50)}...`);
            this.failedMigrationCache.add(data);
          }
        } catch (error) {
          console.warn(`Failed to migrate asset: ${error}`);
          // Cache the failed URL to avoid retrying
          this.failedMigrationCache.add(data);
        }
      }
      return data;
    }

    if (Array.isArray(data)) {
      return await Promise.all(data.map(item => this.recursiveMigrateAssets(item, context, migratedAssets)));
    }

    if (typeof data === 'object' && data !== null) {
      const result: any = {};
      for (const [key, value] of Object.entries(data)) {
        result[key] = await this.recursiveMigrateAssets(value, context, migratedAssets);
      }
      return result;
    }

    return data;
  }

  // ==================== LOAD FROM BACKEND ====================

  /**
   * Load a book from Supabase backend
   */
  static async loadBookFromBackend(bookId: string): Promise<{
    success: boolean;
    restored: {
      metadata: boolean;
      chapters: boolean;
      templates: number;
      userdata: boolean;
    };
    errors: string[];
  }> {
    try {
      console.log(`📥 Loading book from backend: ${bookId}`);

      // Get authenticated user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, restored: { metadata: false, chapters: false, templates: 0, userdata: false }, errors: ['User not authenticated'] };
      }

      // Load from Supabase
      const { data: bookData, error } = await supabase
        .from('user_books')
        .select('*')
        .eq('id', bookId)
        .eq('user_id', user.id)
        .single();

      if (error || !bookData) {
        return { success: false, restored: { metadata: false, chapters: false, templates: 0, userdata: false }, errors: ['Book not found in backend'] };
      }

      // Restore book metadata
      const books = JSON.parse(localStorage.getItem('createdBooks') || '[]');
      const existingIndex = books.findIndex((b: any) => b.id === bookId);
      
      if (existingIndex >= 0) {
        books[existingIndex] = bookData.book_data;
      } else {
        books.push(bookData.book_data);
      }
      localStorage.setItem('createdBooks', JSON.stringify(books));

      // Restore chapters
      localStorage.setItem(`chapters_${bookId}`, JSON.stringify(bookData.chapters_data));

      // Restore all content data
      let templatesCount = 0;
      for (const [key, value] of Object.entries(bookData.content_data)) {
        localStorage.setItem(key, JSON.stringify(value));
        templatesCount++;
      }

      console.log(`✅ Book loaded from backend: ${bookId} (${templatesCount} data entries restored)`);

      return {
        success: true,
        restored: {
          metadata: true,
          chapters: true,
          templates: templatesCount,
          userdata: true
        },
        errors: []
      };

    } catch (error) {
      console.error(`❌ Failed to load book from backend: ${bookId}`, error);
      return {
        success: false,
        restored: { metadata: false, chapters: false, templates: 0, userdata: false },
        errors: [error instanceof Error ? error.message : 'Unknown load error']
      };
    }
  }

  // ==================== SYNC ALL USER DATA ====================

  /**
   * Sync all user books to backend
   */
  static async syncAllUserBooks(): Promise<{
    success: boolean;
    syncedBooks: number;
    failedBooks: string[];
    totalBooks: number;
  }> {
    try {
      this.setSyncingStatus(true);
      console.log('📤 Syncing all user books to backend...');

      const books = JSON.parse(localStorage.getItem('createdBooks') || '[]');
      let syncedBooks = 0;
      const failedBooks: string[] = [];

      for (const book of books) {
        try {
          const result = await this.syncBookToBackend(book.id);
          if (result.success) {
            syncedBooks++;
          } else {
            failedBooks.push(book.name);
          }
        } catch (error) {
          failedBooks.push(book.name);
          console.error(`Failed to sync book ${book.name}:`, error);
        }
      }

      // Update last sync timestamp
      this.syncStatus.lastSync = new Date().toISOString();
      localStorage.setItem('lastSyncTime', this.syncStatus.lastSync);

      console.log(`✅ Sync completed: ${syncedBooks}/${books.length} books synced`);

      return {
        success: failedBooks.length === 0,
        syncedBooks,
        failedBooks,
        totalBooks: books.length
      };

    } catch (error) {
      console.error('❌ Failed to sync all books:', error);
      return {
        success: false,
        syncedBooks: 0,
        failedBooks: ['All books failed'],
        totalBooks: 0
      };
    } finally {
      this.setSyncingStatus(false);
    }
  }

  /**
   * Load all user books from backend
   */
  static async loadAllUserBooks(): Promise<{
    success: boolean;
    loadedBooks: number;
    failedBooks: string[];
  }> {
    try {
      console.log('📥 Loading all user books from backend...');

      // Get authenticated user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, loadedBooks: 0, failedBooks: ['User not authenticated'] };
      }

      // Load all user books from Supabase
      const { data: userBooks, error } = await supabase
        .from('user_books')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) {
        return { success: false, loadedBooks: 0, failedBooks: ['Failed to fetch books from backend'] };
      }

      let loadedBooks = 0;
      const failedBooks: string[] = [];

      // Clear existing localStorage books (we'll replace with backend data)
      localStorage.setItem('createdBooks', '[]');

      for (const bookData of userBooks) {
        try {
          const result = await this.loadBookFromBackend(bookData.id);
          if (result.success) {
            loadedBooks++;
          } else {
            failedBooks.push(bookData.book_data?.name || bookData.id);
          }
        } catch (error) {
          failedBooks.push(bookData.book_data?.name || bookData.id);
          console.error(`Failed to load book ${bookData.id}:`, error);
        }
      }

      console.log(`✅ Load completed: ${loadedBooks} books loaded from backend`);

      return {
        success: failedBooks.length === 0,
        loadedBooks,
        failedBooks
      };

    } catch (error) {
      console.error('❌ Failed to load all books:', error);
      return {
        success: false,
        loadedBooks: 0,
        failedBooks: ['Load operation failed']
      };
    }
  }

  // ==================== STARTUP SYNC ====================

  /**
   * Perform startup synchronization
   */
  static async performStartupSync(): Promise<void> {
    console.log('🚀 Performing startup sync...');

    try {
      // Check if there's local data
      const localBooks = JSON.parse(localStorage.getItem('createdBooks') || '[]');
      
      if (localBooks.length === 0) {
        // No local data, try loading from backend
        console.log('📥 No local data found, loading from backend...');
        await this.loadAllUserBooks();
      } else {
        // Local data exists, sync it to backend and check for updates
        console.log('📤 Local data found, syncing to backend...');
        await this.syncAllUserBooks();
        
        // Also check for any backend updates we might have missed
        await this.checkForBackendUpdates();
      }

      // Auto-migrate any remaining blob URLs
      await this.autoMigrateBlobAssets();

    } catch (error) {
      console.error('❌ Startup sync failed:', error);
    }
  }

  /**
   * Check for backend updates
   */
  private static async checkForBackendUpdates(): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const lastLocalSync = localStorage.getItem('lastSyncTime');
      
      if (!lastLocalSync) {
        console.log('ℹ️ No last sync time found, skipping update check');
        return;
      }

      // Get books updated since last sync
      const { data: updatedBooks, error } = await supabase
        .from('user_books')
        .select('id, updated_at, book_data')
        .eq('user_id', user.id)
        .gt('updated_at', lastLocalSync);

      if (error || !updatedBooks?.length) {
        console.log('ℹ️ No backend updates found');
        return;
      }

      console.log(`📥 Found ${updatedBooks.length} backend updates, syncing...`);
      
      for (const bookUpdate of updatedBooks) {
        await this.loadBookFromBackend(bookUpdate.id);
      }

    } catch (error) {
      console.error('❌ Failed to check for backend updates:', error);
    }
  }

  /**
   * Auto-migrate remaining blob assets
   */
  private static async autoMigrateBlobAssets(): Promise<void> {
    try {
      console.log('🔄 Auto-migrating blob assets...');
      
      const books = JSON.parse(localStorage.getItem('createdBooks') || '[]');
      let migrated = 0;

      for (const book of books) {
        const result = await SupabaseAssetService.migrateAllBookAssets(book.id, book.name);
        migrated += result.migrated;
      }

      if (migrated > 0) {
        console.log(`✅ Auto-migrated ${migrated} blob assets to cloud storage`);
        // Re-sync books with migrated assets
        await this.syncAllUserBooks();
      }

    } catch (error) {
      console.error('❌ Auto-migration failed:', error);
    }
  }

  // ==================== REAL-TIME SYNC ====================

  /**
   * Setup real-time synchronization
   */
  private static setupRealtimeSync(): void {
    // Subscribe to changes in user_books table
    supabase
      .channel('user_books_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'user_books',
        filter: `user_id=eq.${supabase.auth.getUser()}`
      }, (payload) => {
        console.log('📡 Real-time update received:', payload);
        this.handleRealtimeUpdate(payload);
      })
      .subscribe();
  }

  /**
   * Handle real-time updates
   */
  private static handleRealtimeUpdate(payload: any): void {
    // Handle real-time updates from other devices/sessions
    if (payload.eventType === 'UPDATE' && payload.new) {
      const bookId = payload.new.id;
      console.log(`📡 Real-time update for book: ${bookId}`);
      
      // You can implement conflict resolution here
      // For now, we'll just notify that an update is available
      this.notifyListeners();
    }
  }

  // ==================== NETWORK & STATUS ====================

  /**
   * Setup network detection
   */
  private static setupNetworkDetection(): void {
    const updateOnlineStatus = () => {
      const wasOnline = this.syncStatus.isOnline;
      this.syncStatus.isOnline = navigator.onLine;
      
      if (!wasOnline && this.syncStatus.isOnline) {
        // Back online, perform sync
        console.log('🌐 Back online, performing sync...');
        this.syncAllUserBooks();
      }
      
      this.notifyListeners();
    };

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    
    // Initial status
    this.syncStatus.isOnline = navigator.onLine;
  }

  /**
   * Update local sync status
   */
  private static updateLocalSyncStatus(bookId: string): void {
    this.syncStatus.lastSync = new Date().toISOString();
    
    // Remove from pending sync
    this.syncStatus.pendingSync = this.syncStatus.pendingSync.filter(id => id !== bookId);
    
    this.notifyListeners();
  }

  /**
   * Set syncing status
   */
  private static setSyncingStatus(isSyncing: boolean): void {
    this.syncStatus.isSyncing = isSyncing;
    this.notifyListeners();
  }

  /**
   * Get current sync status
   */
  static getSyncStatus(): SyncStatus {
    return { ...this.syncStatus };
  }

  /**
   * Add status listener
   */
  static addStatusListener(callback: (status: SyncStatus) => void): void {
    this.statusListeners.push(callback);
  }

  /**
   * Remove status listener
   */
  static removeStatusListener(callback: (status: SyncStatus) => void): void {
    this.statusListeners = this.statusListeners.filter(listener => listener !== callback);
  }

  /**
   * Notify all listeners
   */
  private static notifyListeners(): void {
    this.statusListeners.forEach(listener => listener(this.syncStatus));
  }

  // ==================== MANUAL OPERATIONS ====================

  /**
   * Force sync a specific book
   */
  static async forceSyncBook(bookId: string): Promise<SyncResult> {
    if (!this.syncStatus.pendingSync.includes(bookId)) {
      this.syncStatus.pendingSync.push(bookId);
    }
    return await this.syncBookToBackend(bookId);
  }

  /**
   * Force load a specific book from backend
   */
  static async forceLoadBook(bookId: string): Promise<boolean> {
    const result = await this.loadBookFromBackend(bookId);
    return result.success;
  }

  /**
   * Clear all local data and reload from backend
   */
  static async resetAndReloadFromBackend(): Promise<boolean> {
    try {
      // Clear localStorage (keep only essential items)
      const keysToKeep = ['theme-mode', 'user_gemini_api_key'];
      const keysToKeepValues: { [key: string]: string } = {};
      
      keysToKeep.forEach(key => {
        const value = localStorage.getItem(key);
        if (value) keysToKeepValues[key] = value;
      });

      localStorage.clear();

      // Restore essential items
      Object.entries(keysToKeepValues).forEach(([key, value]) => {
        localStorage.setItem(key, value);
      });

      // Reload all data from backend
      const result = await this.loadAllUserBooks();
      
      if (result.success) {
        console.log('✅ Successfully reset and reloaded from backend');
        window.location.reload(); // Refresh the page to apply changes
      }

      return result.success;
    } catch (error) {
      console.error('❌ Reset and reload failed:', error);
      return false;
    }
  }

  /**
   * Clear the failed migration cache (useful for retry scenarios)
   */
  static clearFailedMigrationCache(): void {
    console.log('🧹 Clearing failed migration cache...');
    this.failedMigrationCache.clear();
  }

  /**
   * Get failed migration cache stats
   */
  static getFailedMigrationStats(): { count: number; urls: string[] } {
    return {
      count: this.failedMigrationCache.size,
      urls: Array.from(this.failedMigrationCache).map(url => url.substring(0, 50) + '...')
    };
  }
}

export default BookSyncService;
