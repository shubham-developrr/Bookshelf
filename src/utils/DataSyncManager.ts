/**
 * DATA SYNCHRONIZATION AND MIGRATION UTILITY
 * Fixes data persistence issues across browser tabs
 * Consolidates tab-isolated data back into base storage keys
 */

export class DataSyncManager {

  /**
   * Migrate isolated tab data to base storage keys
   * This ensures data appears consistently across all browser tabs
   */
  static migrateIsolatedTabData(): {
    migrated: number;
    errors: string[];
    summary: string;
  } {
    console.log('🔄 Starting data synchronization and migration...');

    const migrated: string[] = [];
    const errors: string[] = [];
    const templateTypes = ['flashcards', 'mcq', 'qa', 'notes', 'mindmaps', 'videos'];

    try {
      // Get all localStorage keys
      const allKeys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) allKeys.push(key);
      }

      // Process each template type
      templateTypes.forEach(templateType => {
        // Find all keys for this template type with tab isolation
        const isolatedKeys = allKeys.filter(key => {
          // Pattern: templateType_bookName_chapterName_tabId
          const regex = new RegExp(`^${templateType}_[^_]+_[^_]+_[^_]+$`);
          return regex.test(key);
        });

        console.log(`📋 Found ${isolatedKeys.length} isolated keys for ${templateType}`);

        isolatedKeys.forEach(isolatedKey => {
          try {
            // Extract base key (without tabId)
            const parts = isolatedKey.split('_');
            if (parts.length >= 4) {
              // Remove the last part (tabId) to get base key
              const baseKey = parts.slice(0, -1).join('_');
              
              const isolatedData = localStorage.getItem(isolatedKey);
              const baseData = localStorage.getItem(baseKey);

              if (isolatedData && isolatedData !== 'null' && isolatedData !== '[]') {
                try {
                  const isolatedParsed = JSON.parse(isolatedData);
                  
                  // Check if isolated data has content
                  const hasContent = Array.isArray(isolatedParsed) 
                    ? isolatedParsed.length > 0 
                    : (typeof isolatedParsed === 'object' && Object.keys(isolatedParsed).length > 0);

                  if (hasContent) {
                    if (!baseData || baseData === 'null' || baseData === '[]') {
                      // Base key is empty, move isolated data to base
                      localStorage.setItem(baseKey, isolatedData);
                      localStorage.removeItem(isolatedKey);
                      migrated.push(`${isolatedKey} → ${baseKey}`);
                      console.log(`✅ Migrated: ${isolatedKey} → ${baseKey}`);
                    } else {
                      // Both have data, try to merge intelligently
                      try {
                        const baseParsed = JSON.parse(baseData);
                        let merged = baseParsed;

                        if (Array.isArray(baseParsed) && Array.isArray(isolatedParsed)) {
                          // Merge arrays, avoiding duplicates
                          merged = this.mergeArrays(baseParsed, isolatedParsed);
                        } else if (typeof baseParsed === 'object' && typeof isolatedParsed === 'object') {
                          // Merge objects
                          merged = { ...baseParsed, ...isolatedParsed };
                        }

                        localStorage.setItem(baseKey, JSON.stringify(merged));
                        localStorage.removeItem(isolatedKey);
                        migrated.push(`${isolatedKey} → ${baseKey} (merged)`);
                        console.log(`✅ Merged: ${isolatedKey} → ${baseKey}`);
                      } catch (mergeError) {
                        errors.push(`Failed to merge ${isolatedKey}: ${mergeError}`);
                      }
                    }
                  } else {
                    // Empty isolated data, just remove it
                    localStorage.removeItem(isolatedKey);
                    migrated.push(`${isolatedKey} (removed empty)`);
                  }
                } catch (parseError) {
                  errors.push(`Failed to parse ${isolatedKey}: ${parseError}`);
                }
              }
            }
          } catch (error) {
            errors.push(`Error processing ${isolatedKey}: ${error}`);
          }
        });
      });

      const summary = `✅ Migration complete: ${migrated.length} items migrated, ${errors.length} errors`;
      console.log(summary);

      if (migrated.length > 0) {
        console.log('📋 Migrated items:', migrated);
      }
      
      if (errors.length > 0) {
        console.warn('⚠️ Migration errors:', errors);
      }

      return {
        migrated: migrated.length,
        errors,
        summary
      };

    } catch (error) {
      const errorMsg = `Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      errors.push(errorMsg);
      console.error('❌', errorMsg);
      
      return {
        migrated: 0,
        errors,
        summary: `❌ Migration failed: ${errorMsg}`
      };
    }
  }

  /**
   * Merge two arrays, avoiding duplicates based on content or id
   */
  private static mergeArrays(base: any[], isolated: any[]): any[] {
    const merged = [...base];
    
    isolated.forEach(item => {
      // Try to avoid duplicates
      let isDuplicate = false;
      
      if (typeof item === 'object' && item !== null) {
        // Check for duplicate by id or content
        isDuplicate = merged.some(existingItem => {
          if (typeof existingItem === 'object' && existingItem !== null) {
            // Check by id if both have id
            if (item.id && existingItem.id) {
              return item.id === existingItem.id;
            }
            // Check by content similarity
            return JSON.stringify(item) === JSON.stringify(existingItem);
          }
          return false;
        });
      } else {
        // For primitive values, check direct equality
        isDuplicate = merged.includes(item);
      }
      
      if (!isDuplicate) {
        merged.push(item);
      }
    });
    
    return merged;
  }

  /**
   * Check for data consistency issues
   * Returns information about potential sync problems
   */
  static checkDataConsistency(): {
    issues: string[];
    isolatedDataCount: number;
    baseDataCount: number;
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];
    let isolatedDataCount = 0;
    let baseDataCount = 0;

    const templateTypes = ['flashcards', 'mcq', 'qa', 'notes', 'mindmaps', 'videos'];
    
    // Get all localStorage keys
    const allKeys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) allKeys.push(key);
    }

    templateTypes.forEach(templateType => {
      const baseKeys = allKeys.filter(key => {
        // Pattern: templateType_bookName_chapterName (no tabId)
        const regex = new RegExp(`^${templateType}_[^_]+_[^_]+$`);
        return regex.test(key);
      });

      const isolatedKeys = allKeys.filter(key => {
        // Pattern: templateType_bookName_chapterName_tabId
        const regex = new RegExp(`^${templateType}_[^_]+_[^_]+_[^_]+$`);
        return regex.test(key);
      });

      baseDataCount += baseKeys.length;
      isolatedDataCount += isolatedKeys.length;

      if (isolatedKeys.length > 0) {
        issues.push(`${templateType}: ${isolatedKeys.length} isolated tab data entries found`);
        recommendations.push(`Run migration to consolidate ${templateType} data`);
      }
    });

    if (isolatedDataCount > 0) {
      issues.push(`Total isolated data entries: ${isolatedDataCount}`);
      recommendations.push('Run DataSyncManager.migrateIsolatedTabData() to fix synchronization');
    }

    return {
      issues,
      isolatedDataCount,
      baseDataCount,
      recommendations
    };
  }

  /**
   * Auto-run migration when needed
   * Safe to call multiple times
   */
  static autoMigrate(): boolean {
    const check = this.checkDataConsistency();
    
    if (check.isolatedDataCount > 0) {
      console.log(`🔄 Auto-migration triggered: ${check.isolatedDataCount} isolated data entries found`);
      const result = this.migrateIsolatedTabData();
      return result.migrated > 0;
    }
    
    console.log('✅ No migration needed - data is already consistent');
    return false;
  }

  /**
   * Debug function to show all template data in localStorage
   */
  static debugTemplateData(): void {
    const templateTypes = ['flashcards', 'mcq', 'qa', 'notes', 'mindmaps', 'videos'];
    
    console.log('🔍 === TEMPLATE DATA DEBUG ===');
    
    templateTypes.forEach(templateType => {
      console.log(`\n📋 ${templateType.toUpperCase()}:`);
      
      const allKeys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(templateType)) {
          allKeys.push(key);
        }
      }
      
      if (allKeys.length === 0) {
        console.log('  No data found');
      } else {
        allKeys.forEach(key => {
          const data = localStorage.getItem(key);
          let status = 'empty';
          let itemCount = 0;
          
          if (data && data !== 'null' && data !== '[]') {
            try {
              const parsed = JSON.parse(data);
              if (Array.isArray(parsed)) {
                itemCount = parsed.length;
                status = itemCount > 0 ? `${itemCount} items` : 'empty array';
              } else if (typeof parsed === 'object') {
                itemCount = Object.keys(parsed).length;
                status = itemCount > 0 ? `${itemCount} properties` : 'empty object';
              }
            } catch {
              status = 'invalid JSON';
            }
          }
          
          console.log(`  ${key}: ${status}`);
        });
      }
    });
    
    console.log('\n🔍 === END DEBUG ===');
  }

  /**
   * Clean up empty storage entries
   */
  static cleanupEmptyEntries(): number {
    let cleaned = 0;
    const toRemove: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const data = localStorage.getItem(key);
        if (!data || data === 'null' || data === '[]' || data === '{}') {
          toRemove.push(key);
        }
      }
    }
    
    toRemove.forEach(key => {
      localStorage.removeItem(key);
      cleaned++;
    });
    
    if (cleaned > 0) {
      console.log(`🧹 Cleaned up ${cleaned} empty storage entries`);
    }
    
    return cleaned;
  }
}

// Auto-run migration on module load to fix existing issues
DataSyncManager.autoMigrate();
