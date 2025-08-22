/**
 * ENHANCED SYNC SERVICE - COMPREHENSIVE CLOUD SYNC
 * 
 * This service addresses the missing sync functionality for:
 * 1. Highlights - sync with user_highlights table
 * 2. Custom tabs - proper sync with content_data
 * 3. Exam mode data - proper sync with content_data
 * 4. Tab-isolated data - ensure all variations are captured
 */

import { supabase } from './supabaseClient';
import UnifiedBookService from './UnifiedBookService';

export interface HighlightSync {
  id?: string;
  bookId: string;
  bookName: string;
  chapterName: string;
  text: string;
  color: 'yellow' | 'green' | 'blue' | 'red';
  position: {
    start: number;
    end: number;
  };
  note?: string;
  localKey: string; // The localStorage key used locally
}

export interface CustomTabSync {
  bookId: string;
  bookName: string;
  chapterName: string;
  tabName: string;
  tabId?: string;
  content: any;
  localKey: string;
}

export interface ExamModeSync {
  bookId: string;
  bookName: string;
  chapterName: string;
  type: 'questionPapers' | 'evaluationReports';
  content: any;
  localKey: string;
}

export class EnhancedSyncService {
  private static instance: EnhancedSyncService;
  private unifiedService: UnifiedBookService | null = null;

  private constructor() {
    // Don't initialize UnifiedBookService in constructor to avoid circular dependency
  }

  private getUnifiedService(): UnifiedBookService {
    if (!this.unifiedService) {
      this.unifiedService = UnifiedBookService.getInstance();
    }
    return this.unifiedService;
  }

  static getInstance(): EnhancedSyncService {
    if (!EnhancedSyncService.instance) {
      EnhancedSyncService.instance = new EnhancedSyncService();
    }
    return EnhancedSyncService.instance;
  }

  /**
   * Comprehensive sync of all user data to cloud
   */
  async syncAllUserDataToCloud(): Promise<{ 
    success: boolean; 
    highlights: number; 
    customTabs: number; 
    examMode: number; 
    errors: string[];
  }> {
    console.log('🔄 Starting comprehensive sync of all user data...');

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, highlights: 0, customTabs: 0, examMode: 0, errors: ['User not authenticated'] };
    }

    const errors: string[] = [];
    let highlightsSynced = 0;
    let customTabsSynced = 0;
    let examModeSynced = 0;

    try {
      // 1. Sync highlights to user_highlights table
      const highlightResult = await this.syncHighlightsToCloud(user.id);
      highlightsSynced = highlightResult.synced;
      errors.push(...highlightResult.errors);

      // 2. Sync custom tabs and exam mode through enhanced book sync
      const booksResult = await this.getUnifiedService().getAllBooks();
      if (booksResult.success) {
        for (const book of booksResult.books) {
          const customTabResult = await this.syncCustomTabsToCloud(book.id, book.name, user.id);
          customTabsSynced += customTabResult.synced;
          errors.push(...customTabResult.errors);

          const examModeResult = await this.syncExamModeToCloud(book.id, book.name, user.id);
          examModeSynced += examModeResult.synced;
          errors.push(...examModeResult.errors);
        }
      }

      console.log(`✅ Comprehensive sync completed: ${highlightsSynced} highlights, ${customTabsSynced} custom tabs, ${examModeSynced} exam mode entries`);
      
      return {
        success: errors.length === 0,
        highlights: highlightsSynced,
        customTabs: customTabsSynced,
        examMode: examModeSynced,
        errors
      };

    } catch (error) {
      console.error('💥 Comprehensive sync failed:', error);
      return { 
        success: false, 
        highlights: 0, 
        customTabs: 0, 
        examMode: 0, 
        errors: [error instanceof Error ? error.message : 'Unknown error'] 
      };
    }
  }

  /**
   * Sync highlights to user_highlights table
   */
  private async syncHighlightsToCloud(userId: string): Promise<{ synced: number; errors: string[] }> {
    console.log('🎨 Syncing highlights to cloud...');

    const highlights = this.extractHighlightsFromLocalStorage();
    const errors: string[] = [];
    let synced = 0;

    for (const highlight of highlights) {
      try {
        // Check if highlight already exists
        const { data: existing } = await supabase
          .from('user_highlights')
          .select('id')
          .eq('user_id', userId)
          .eq('text', highlight.text)
          .eq('book_id', highlight.bookId)
          .eq('chapter_id', highlight.chapterName)
          .single();

        if (!existing) {
          // Insert new highlight
          const { error } = await supabase
            .from('user_highlights')
            .insert({
              user_id: userId,
              book_id: highlight.bookId,
              chapter_id: highlight.chapterName,
              text: highlight.text,
              color: highlight.color,
              position: highlight.position,
              note: highlight.note
            });

          if (error) {
            errors.push(`Highlight sync failed: ${error.message}`);
          } else {
            synced++;
          }
        }
      } catch (error) {
        errors.push(`Highlight processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return { synced, errors };
  }

  /**
   * Sync custom tabs through enhanced content_data
   */
  private async syncCustomTabsToCloud(bookId: string, bookName: string, userId: string): Promise<{ synced: number; errors: string[] }> {
    console.log(`📑 Syncing custom tabs for book: ${bookName}...`);

    const customTabs = this.extractCustomTabsFromLocalStorage(bookName);
    const errors: string[] = [];
    let synced = 0;

    if (customTabs.length === 0) {
      return { synced: 0, errors: [] };
    }

    try {
      // Get current book data
      const { data: existingBook } = await supabase
        .from('user_books')
        .select('content_data')
        .eq('id', bookId)
        .eq('user_id', userId)
        .single();

      const currentContent = existingBook?.content_data || {};

      // Add custom tab data to content_data
      for (const customTab of customTabs) {
        currentContent[customTab.localKey] = customTab.content;
        synced++;
      }

      // Update the book with enhanced content_data
      const { error } = await supabase
        .from('user_books')
        .update({ 
          content_data: currentContent,
          updated_at: new Date().toISOString(),
          last_synced: new Date().toISOString()
        })
        .eq('id', bookId)
        .eq('user_id', userId);

      if (error) {
        errors.push(`Custom tabs sync failed for ${bookName}: ${error.message}`);
        synced = 0;
      }

    } catch (error) {
      errors.push(`Custom tabs processing failed for ${bookName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return { synced, errors };
  }

  /**
   * Sync exam mode data through enhanced content_data
   */
  private async syncExamModeToCloud(bookId: string, bookName: string, userId: string): Promise<{ synced: number; errors: string[] }> {
    console.log(`📝 Syncing exam mode data for book: ${bookName}...`);

    const examModeData = this.extractExamModeFromLocalStorage(bookName);
    const errors: string[] = [];
    let synced = 0;

    if (examModeData.length === 0) {
      return { synced: 0, errors: [] };
    }

    try {
      // Separate question papers and evaluation reports
      const questionPapers = examModeData.filter(item => item.type === 'questionPapers');
      const evaluationReports = examModeData.filter(item => item.type === 'evaluationReports');

      // Sync question papers to user_books.content_data (for general storage)
      if (questionPapers.length > 0) {
        const { data: existingBook } = await supabase
          .from('user_books')
          .select('content_data')
          .eq('id', bookId)
          .eq('user_id', userId)
          .single();

        const currentContent = existingBook?.content_data || {};

        // Add question papers to content_data
        for (const paperData of questionPapers) {
          currentContent[paperData.localKey] = paperData.content;
          synced++;
        }

        // Update the book with enhanced content_data
        const { error } = await supabase
          .from('user_books')
          .update({ 
            content_data: currentContent,
            updated_at: new Date().toISOString(),
            last_synced: new Date().toISOString()
          })
          .eq('id', bookId)
          .eq('user_id', userId);

        if (error) {
          errors.push(`Question papers sync failed for ${bookName}: ${error.message}`);
        }
      }

      // Sync evaluation reports to dedicated exam_evaluations table
      if (evaluationReports.length > 0) {
        for (const reportData of evaluationReports) {
          const evaluations = Array.isArray(reportData.content) ? reportData.content : [reportData.content];
          
          for (const evaluation of evaluations) {
            if (evaluation && evaluation.id) {
              // Check if evaluation already exists
              const { data: existing } = await supabase
                .from('exam_evaluations')
                .select('id')
                .eq('user_id', userId)
                .eq('id', evaluation.id)
                .single();

              if (!existing) {
                // Insert new evaluation
                const { error } = await supabase
                  .from('exam_evaluations')
                  .insert({
                    id: evaluation.id,
                    user_id: userId,
                    book_id: bookId,
                    chapter_id: reportData.chapterName,
                    paper_title: evaluation.paperTitle || 'Unknown',
                    evaluation_data: evaluation,
                    status: evaluation.status || 'completed',
                    total_marks: evaluation.totalMarks || 0,
                    obtained_marks: evaluation.obtainedMarks || 0,
                    percentage: evaluation.percentage || 0,
                    submitted_at: evaluation.submittedAt ? new Date(evaluation.submittedAt) : new Date()
                  });

                if (error) {
                  errors.push(`Evaluation sync failed for ${evaluation.paperTitle}: ${error.message}`);
                } else {
                  synced++;
                }
              }
            }
          }
        }
      }

    } catch (error) {
      errors.push(`Exam mode processing failed for ${bookName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return { synced, errors };
  }

  /**
   * Extract highlights from localStorage
   */
  private extractHighlightsFromLocalStorage(): HighlightSync[] {
    const highlights: HighlightSync[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('highlights_')) {
        const value = localStorage.getItem(key);
        if (value && value !== 'null') {
          try {
            const highlightData = JSON.parse(value);
            
            // Parse book and chapter from key: highlights_BookName_ChapterName
            const parts = key.replace('highlights_', '').split('_');
            if (parts.length >= 2) {
              const bookName = parts.slice(0, -1).join('_');
              const chapterName = parts[parts.length - 1];

              // Find the book ID
              const bookId = this.findBookIdByName(bookName.replace(/_/g, ' '));

              if (Array.isArray(highlightData)) {
                for (const highlight of highlightData) {
                  highlights.push({
                    bookId: bookId || 'unknown',
                    bookName: bookName.replace(/_/g, ' '),
                    chapterName: chapterName.replace(/_/g, ' '),
                    text: highlight.text || '',
                    color: highlight.color || 'yellow',
                    position: highlight.position || { start: 0, end: 0 },
                    note: highlight.note,
                    localKey: key
                  });
                }
              }
            }
          } catch (error) {
            console.warn(`Failed to parse highlights for key ${key}:`, error);
          }
        }
      }
    }

    return highlights;
  }

  /**
   * Extract custom tabs from localStorage
   */
  private extractCustomTabsFromLocalStorage(bookName: string): CustomTabSync[] {
    const customTabs: CustomTabSync[] = [];
    const normalizedBookName = bookName.replace(/\s+/g, '_');

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.includes('customtab_') && key.includes(`_${normalizedBookName}_`)) {
        const value = localStorage.getItem(key);
        if (value && value !== 'null') {
          try {
            const content = JSON.parse(value);
            
            // Parse customtab_TabName_BookName_ChapterName pattern
            const parts = key.split('_');
            if (parts.length >= 4 && parts[0] === 'customtab') {
              const tabName = parts[1];
              const chapterName = parts.slice(3).join('_');
              const bookId = this.findBookIdByName(bookName);

              customTabs.push({
                bookId: bookId || 'unknown',
                bookName: bookName,
                chapterName: chapterName.replace(/_/g, ' '),
                tabName: tabName,
                content: content,
                localKey: key
              });
            }
          } catch (error) {
            console.warn(`Failed to parse custom tab for key ${key}:`, error);
          }
        }
      }
    }

    return customTabs;
  }

  /**
   * Extract exam mode data from localStorage
   */
  private extractExamModeFromLocalStorage(bookName: string): ExamModeSync[] {
    const examModeData: ExamModeSync[] = [];
    const normalizedBookName = bookName.replace(/\s+/g, '_');

    const examPrefixes = ['questionPapers_', 'evaluationReports_'];

    for (const prefix of examPrefixes) {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefix) && key.includes(`_${normalizedBookName}_`)) {
          const value = localStorage.getItem(key);
          if (value && value !== 'null') {
            try {
              const content = JSON.parse(value);
              
              // Parse pattern: questionPapers_BookName_ChapterName
              const chapterName = key.replace(prefix + normalizedBookName + '_', '');
              const bookId = this.findBookIdByName(bookName);

              examModeData.push({
                bookId: bookId || 'unknown',
                bookName: bookName,
                chapterName: chapterName.replace(/_/g, ' '),
                type: prefix.replace('_', '') as 'questionPapers' | 'evaluationReports',
                content: content,
                localKey: key
              });
            } catch (error) {
              console.warn(`Failed to parse exam mode data for key ${key}:`, error);
            }
          }
        }
      }
    }

    return examModeData;
  }

  /**
   * Find book ID by name from localStorage
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
   * Sync data from cloud to local storage
   */
  async syncFromCloudToLocal(): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('📥 Syncing data from cloud to local...');

      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        return { success: false, error: 'User not authenticated' };
      }

      // 1. Sync highlights from cloud
      await this.syncHighlightsFromCloud(user.id);

      // 2. Sync book content (including custom tabs and question papers) from cloud
      const { data: cloudBooks } = await supabase
        .from('user_books')
        .select('*')
        .eq('user_id', user.id);

      if (cloudBooks) {
        for (const cloudBook of cloudBooks) {
          if (cloudBook.content_data) {
            // Restore all content data to localStorage
            for (const [key, value] of Object.entries(cloudBook.content_data)) {
              localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
            }
          }
        }
      }

      // 3. Sync exam evaluations from dedicated table
      await this.syncExamEvaluationsFromCloud(user.id);

      console.log('✅ Cloud to local sync completed');
      return { success: true };

    } catch (error) {
      console.error('💥 Cloud to local sync failed:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Sync exam evaluations from cloud to local storage
   */
  private async syncExamEvaluationsFromCloud(userId: string): Promise<void> {
    const { data: cloudEvaluations } = await supabase
      .from('exam_evaluations')
      .select('*')
      .eq('user_id', userId);

    if (cloudEvaluations) {
      // Group evaluations by book and chapter
      const groupedEvaluations: { [key: string]: any[] } = {};

      for (const evaluation of cloudEvaluations) {
        const bookName = this.findBookNameById(evaluation.book_id);
        if (bookName) {
          const normalizedBookName = bookName.replace(/\s+/g, '_');
          const normalizedChapterName = evaluation.chapter_id.replace(/\s+/g, '_');
          const key = `evaluationReports_${normalizedBookName}_${normalizedChapterName}`;

          if (!groupedEvaluations[key]) {
            groupedEvaluations[key] = [];
          }

          groupedEvaluations[key].push(evaluation.evaluation_data);
        }
      }

      // Save grouped evaluations to localStorage
      for (const [key, evaluations] of Object.entries(groupedEvaluations)) {
        localStorage.setItem(key, JSON.stringify(evaluations));
      }

      console.log(`📊 Synced ${Object.keys(groupedEvaluations).length} evaluation report groups from cloud`);
    }
  }

  /**
   * Sync highlights from cloud to local
   */
  private async syncHighlightsFromCloud(userId: string): Promise<void> {
    const { data: cloudHighlights } = await supabase
      .from('user_highlights')
      .select('*')
      .eq('user_id', userId);

    if (cloudHighlights) {
      // Group highlights by book and chapter
      const groupedHighlights: { [key: string]: any[] } = {};

      for (const highlight of cloudHighlights) {
        const bookName = this.findBookNameById(highlight.book_id);
        if (bookName) {
          const normalizedBookName = bookName.replace(/\s+/g, '_');
          const normalizedChapterName = highlight.chapter_id.replace(/\s+/g, '_');
          const key = `highlights_${normalizedBookName}_${normalizedChapterName}`;

          if (!groupedHighlights[key]) {
            groupedHighlights[key] = [];
          }

          groupedHighlights[key].push({
            id: highlight.id,
            text: highlight.text,
            color: highlight.color,
            position: highlight.position,
            note: highlight.note,
            timestamp: highlight.created_at
          });
        }
      }

      // Save grouped highlights to localStorage
      for (const [key, highlights] of Object.entries(groupedHighlights)) {
        localStorage.setItem(key, JSON.stringify(highlights));
      }
    }
  }

  /**
   * Find book name by ID from localStorage
   */
  private findBookNameById(bookId: string): string | null {
    try {
      const booksData = localStorage.getItem('createdBooks');
      if (booksData) {
        const books = JSON.parse(booksData);
        const foundBook = books.find((book: any) => book.id === bookId);
        return foundBook?.name || null;
      }
    } catch (error) {
      console.warn('Failed to find book name:', error);
    }
    return null;
  }

  /**
   * Force complete resync - useful for debugging
   */
  async forceCompleteResync(): Promise<{ success: boolean; details: any; errors: string[] }> {
    console.log('🔄 FORCE COMPLETE RESYNC - This will sync everything!');

    const results = {
      toCloud: await this.syncAllUserDataToCloud(),
      fromCloud: await this.syncFromCloudToLocal()
    };

    return {
      success: results.toCloud.success && results.fromCloud.success,
      details: results,
      errors: [...results.toCloud.errors, ...(results.fromCloud.error ? [results.fromCloud.error] : [])]
    };
  }
}

export default EnhancedSyncService;
