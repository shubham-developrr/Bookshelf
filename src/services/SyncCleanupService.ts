/**
 * SYNC CLEANUP SERVICE
 * 
 * Fixes template data key conflicts and eliminates duplicate sync systems
 * Addresses the core issues causing:
 * 1. "Brief copy" book duplication on bookshelf
 * 2. Template content not syncing between browsers
 */

import { UnifiedBookAdapter } from './UnifiedBookAdapter';
import { supabase } from './supabaseClient';

export class SyncCleanupService {
  private static instance: SyncCleanupService;

  static getInstance(): SyncCleanupService {
    if (!SyncCleanupService.instance) {
      SyncCleanupService.instance = new SyncCleanupService();
    }
    return SyncCleanupService.instance;
  }

  /**
   * PHASE 1: Fix template data key standardization
   * This addresses the massive key duplication shown in Supabase
   */
  async standardizeTemplateKeys(): Promise<{ success: boolean; fixed: number; errors: string[] }> {
    console.log('🧹 CLEANUP: Starting template key standardization...');
    
    let fixed = 0;
    const errors: string[] = [];
    
    try {
      // Get all localStorage keys
      const allKeys = Object.keys(localStorage);
      
      // Template patterns that need standardization
      const templatePatterns = [
        'NOTES_',
        'FLASHCARD_', 
        'flashcards_',
        'VIDEOS_',
        'MCQ_',
        'QA_',
        'MINDMAP_'
      ];

      // Standard key format: TEMPLATETYPE_bookname_chaptername[_tabid]
      const keyMigrations: Array<{ oldKey: string; newKey: string; data: any }> = [];
      
      for (const key of allKeys) {
        for (const pattern of templatePatterns) {
          if (key.startsWith(pattern)) {
            const data = JSON.parse(localStorage.getItem(key) || '[]');
            
            // Skip empty data
            if (!Array.isArray(data) || data.length === 0) continue;
            
            // Parse key components
            const standardKey = this.standardizeKey(key);
            
            if (standardKey && standardKey !== key) {
              keyMigrations.push({ oldKey: key, newKey: standardKey, data });
              console.log(`🔄 CLEANUP: Will migrate ${key} → ${standardKey} (${data.length} items)`);
            }
          }
        }
      }

      // Apply migrations
      for (const migration of keyMigrations) {
        try {
          // Check if target key already exists
          const existingData = localStorage.getItem(migration.newKey);
          
          if (existingData) {
            // Merge with existing data (avoid duplicates)
            const existing = JSON.parse(existingData);
            const merged = this.mergeTemplateData(existing, migration.data);
            localStorage.setItem(migration.newKey, JSON.stringify(merged));
            console.log(`🔀 CLEANUP: Merged ${migration.oldKey} with existing ${migration.newKey}`);
          } else {
            // Direct migration
            localStorage.setItem(migration.newKey, JSON.stringify(migration.data));
            console.log(`✅ CLEANUP: Migrated ${migration.oldKey} → ${migration.newKey}`);
          }
          
          // Remove old key
          localStorage.removeItem(migration.oldKey);
          fixed++;
        } catch (error) {
          const errorMsg = `Failed to migrate ${migration.oldKey}: ${error}`;
          console.error('❌ CLEANUP:', errorMsg);
          errors.push(errorMsg);
        }
      }

      console.log(`✅ CLEANUP: Template key standardization completed. Fixed ${fixed} keys.`);
      return { success: true, fixed, errors };

    } catch (error) {
      const errorMsg = `Template standardization failed: ${error}`;
      console.error('❌ CLEANUP:', errorMsg);
      return { success: false, fixed, errors: [errorMsg] };
    }
  }

  /**
   * Standardize a template key to the correct format
   * Standard format: TEMPLATETYPE_bookname_chaptername[_tabid]
   */
  private standardizeKey(key: string): string | null {
    try {
      // Remove common inconsistencies
      let cleanKey = key
        .replace(/\s+/g, '_')  // Spaces to underscores
        .replace(/_{2,}/g, '_') // Multiple underscores to single
        .replace(/_+$/, '');   // Trailing underscores

      // Handle special cases that were found in the Supabase data
      if (cleanKey.includes('_template_')) {
        // Remove template prefix: "NOTES_physics__wht_we_know_template_notes_qkgctv"
        // Should become: "NOTES_physics_wht_we_know_NOTES_1"
        const parts = cleanKey.split('_template_');
        if (parts.length === 2) {
          const basePart = parts[0]; // "NOTES_physics__wht_we_know"
          const templatePart = parts[1]; // "notes_qkgctv"
          
          // Extract template type and tab ID
          const templateMatch = templatePart.match(/^(\w+)_(.+)$/);
          if (templateMatch) {
            const [, templateType, tabId] = templateMatch;
            cleanKey = `${basePart}_${templateType.toUpperCase()}_${tabId}`;
          } else {
            cleanKey = basePart;
          }
        }
      }

      // Handle flashcards_* pattern (should be FLASHCARD_*)
      if (cleanKey.startsWith('flashcards_')) {
        cleanKey = cleanKey.replace('flashcards_', 'FLASHCARD_');
      }

      // Fix double underscores from book names
      cleanKey = cleanKey.replace(/_+/g, '_');

      return cleanKey;
    } catch (error) {
      console.warn(`⚠️ CLEANUP: Could not standardize key "${key}":`, error);
      return null;
    }
  }

  /**
   * Merge template data arrays, avoiding duplicates
   */
  private mergeTemplateData(existing: any[], newData: any[]): any[] {
    if (!Array.isArray(existing)) existing = [];
    if (!Array.isArray(newData)) return existing;

    const merged = [...existing];
    
    for (const newItem of newData) {
      // Check for duplicates based on ID or content
      const isDuplicate = merged.some(existingItem => {
        if (existingItem.id && newItem.id) {
          return existingItem.id === newItem.id;
        }
        // For items without ID, compare content
        return JSON.stringify(existingItem) === JSON.stringify(newItem);
      });

      if (!isDuplicate) {
        merged.push(newItem);
      }
    }

    return merged;
  }

  /**
   * PHASE 2: Disable old sync systems and remove their traces
   */
  async disableOldSyncSystems(): Promise<{ success: boolean; message: string }> {
    console.log('🚫 CLEANUP: Disabling old sync systems...');
    
    try {
      // Clear old sync service states
      const oldSyncKeys = [
        'sync_service_state',
        'progressive_loading_state', 
        'backend_books_cache',
        'legacy_books_cache'
      ];

      for (const key of oldSyncKeys) {
        localStorage.removeItem(key);
      }

      console.log('✅ CLEANUP: Old sync systems disabled');
      return { success: true, message: 'Old sync systems disabled successfully' };
    } catch (error) {
      console.error('❌ CLEANUP: Failed to disable old sync systems:', error);
      return { success: false, message: `Failed: ${error}` };
    }
  }

  /**
   * PHASE 3: Clean up Supabase duplicate data
   */
  async cleanupSupabaseDuplicates(): Promise<{ success: boolean; cleaned: number; errors: string[] }> {
    console.log('🧹 CLEANUP: Starting Supabase duplicate cleanup...');
    
    let cleaned = 0;
    const errors: string[] = [];

    try {
      // Get current user's books
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data: books, error: booksError } = await supabase
        .from('user_books')
        .select('id, content_data')
        .eq('user_id', user.id);

      if (booksError) throw booksError;

      for (const book of books || []) {
        if (!book.content_data) continue;

        const contentData = book.content_data as Record<string, any>;
        const cleanedContentData: Record<string, any> = {};
        
        // Group similar keys and keep only the most recent/complete version
        const keyGroups: Record<string, string[]> = {};
        
        for (const key of Object.keys(contentData)) {
          const baseKey = this.getBaseTemplateKey(key);
          if (!keyGroups[baseKey]) {
            keyGroups[baseKey] = [];
          }
          keyGroups[baseKey].push(key);
        }

        // For each group, pick the best key and data
        for (const [baseKey, keys] of Object.entries(keyGroups)) {
          if (keys.length === 1) {
            // No duplicates, keep as is
            cleanedContentData[keys[0]] = contentData[keys[0]];
          } else {
            // Multiple versions, pick the one with most data
            let bestKey = keys[0];
            let bestData = contentData[bestKey];
            let maxLength = Array.isArray(bestData) ? bestData.length : 0;

            for (const key of keys) {
              const data = contentData[key];
              const length = Array.isArray(data) ? data.length : 0;
              if (length > maxLength) {
                maxLength = length;
                bestKey = key;
                bestData = data;
              }
            }

            // Use standardized key format
            const standardKey = this.standardizeKey(bestKey) || bestKey;
            cleanedContentData[standardKey] = bestData;
            
            console.log(`🧹 CLEANUP: Consolidated ${keys.length} duplicate keys into ${standardKey} (${maxLength} items)`);
            cleaned++;
          }
        }

        // Update the book with cleaned data
        const { error: updateError } = await supabase
          .from('user_books')
          .update({ content_data: cleanedContentData })
          .eq('id', book.id);

        if (updateError) {
          errors.push(`Failed to update book ${book.id}: ${updateError.message}`);
        } else {
          console.log(`✅ CLEANUP: Cleaned duplicates in book ${book.id}`);
        }
      }

      console.log(`✅ CLEANUP: Supabase cleanup completed. Cleaned ${cleaned} duplicate groups.`);
      return { success: true, cleaned, errors };

    } catch (error) {
      const errorMsg = `Supabase cleanup failed: ${error}`;
      console.error('❌ CLEANUP:', errorMsg);
      return { success: false, cleaned, errors: [errorMsg] };
    }
  }

  /**
   * Get base template key (without variations)
   */
  private getBaseTemplateKey(key: string): string {
    // Remove common suffixes to group similar keys
    return key
      .replace(/_template_\w+_\w+$/, '') // Remove template suffixes
      .replace(/_\w+_\d+$/, '')          // Remove tab IDs
      .replace(/_[A-Z]+_\d+$/, '');      // Remove type_number suffixes
  }

  /**
   * MASTER CLEANUP: Run all cleanup phases
   */
  async runFullCleanup(): Promise<{ success: boolean; report: string }> {
    console.log('🚀 CLEANUP: Starting full sync cleanup process...');
    
    const report: string[] = [];

    // Phase 1: Standardize local template keys
    const phase1 = await this.standardizeTemplateKeys();
    report.push(`Phase 1 - Template Keys: ${phase1.success ? '✅' : '❌'} Fixed ${phase1.fixed} keys`);
    if (phase1.errors.length > 0) {
      report.push(`  Errors: ${phase1.errors.join(', ')}`);
    }

    // Phase 2: Disable old sync systems
    const phase2 = await this.disableOldSyncSystems();
    report.push(`Phase 2 - Disable Old Systems: ${phase2.success ? '✅' : '❌'} ${phase2.message}`);

    // Phase 3: Clean Supabase duplicates
    const phase3 = await this.cleanupSupabaseDuplicates();
    report.push(`Phase 3 - Supabase Cleanup: ${phase3.success ? '✅' : '❌'} Cleaned ${phase3.cleaned} groups`);
    if (phase3.errors.length > 0) {
      report.push(`  Errors: ${phase3.errors.join(', ')}`);
    }

    const allSuccess = phase1.success && phase2.success && phase3.success;
    const finalReport = report.join('\n');
    
    console.log('🎉 CLEANUP: Full cleanup completed');
    console.log(finalReport);
    
    return { success: allSuccess, report: finalReport };
  }
}

export default SyncCleanupService;
