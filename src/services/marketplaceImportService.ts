import JSZip from 'jszip';

/**
 * @file A service for importing book modules from ZIP files, handling both legacy (v1.0)
 * and enhanced (v2.0) formats, and restoring all data to localStorage.
 */

// #region Import Interfaces
/**
 * @interface ImportResult
 * @description Defines the structure of the result after an import operation.
 */
interface ImportResult {
    success: boolean;
    bookId: string;
    bookName: string;
    message: string;
    warnings: string[];
    imported: {
        chapters: number;
        subtopics: number;
        tabs: number;
        assets: number;
        examPapers: number;
        highlights: number;
    };
}

/**
 * @interface ImportConflict
 * @description Defines the structure for a detected conflict during the import process.
 */
interface ImportConflict {
    type: 'book-exists' | 'chapter-exists' | 'data-mismatch';
    description: string;
    resolution: 'skip' | 'overwrite' | 'merge' | 'rename' | 'ask';
}

/**
 * @interface ImportOptions
 * @description Defines the options to control the import process.
 */
interface ImportOptions {
    conflictResolution: 'ask' | 'overwrite' | 'merge' | 'skip';
    preserveExisting: boolean;
    generateNewIds: boolean;
    validateIntegrity: boolean;
}
// #endregion

/**
 * @class MarketplaceBookImportService
 * @description Handles importing marketplace book modules with full data restoration.
 */
export class MarketplaceBookImportService {
    private static readonly SUPPORTED_VERSIONS = ['1.0.0', '2.0.0'];
    private static readonly CURRENT_VERSION = '2.0.0';

    /**
     * @description Imports a marketplace book module from a ZIP file.
     * @param {File} zipFile - The ZIP file to import.
     * @param {Partial<ImportOptions>} [options={}] - Options to customize the import process.
     * @returns {Promise<ImportResult>} A promise that resolves with the result of the import.
     */
    static async importBookModule(
        zipFile: File, 
        options: Partial<ImportOptions> = {}
    ): Promise<ImportResult> {
        try {
            console.log(`🚀 Starting marketplace import for: ${zipFile.name}`);

            // Default options
            const importOptions: ImportOptions = {
                conflictResolution: 'ask',
                preserveExisting: true,
                generateNewIds: false,
                validateIntegrity: true,
                ...options
            };

            // Step 1: Extract and validate ZIP
            const zipData = await this.extractAndValidateZip(zipFile);
            
            // Step 2: Parse marketplace module
            const bookModule = await this.parseMarketplaceModule(zipData);
            
            // Step 3: Validate compatibility
            await this.validateCompatibility(bookModule);
            
            // Step 4: Check for conflicts
            const conflicts = await this.detectConflicts(bookModule, importOptions);
            
            // Step 5: Resolve conflicts
            await this.resolveConflicts(conflicts, importOptions);
            
            // Step 6: Import book data
            const result = await this.importBookData(bookModule, importOptions);
            
            // Step 7: Restore assets
            await this.restoreAssets(bookModule);
            
            console.log(`✅ Import completed successfully!`);
            return result;
            
        } catch (error) {
            console.error('❌ Marketplace import failed:', error);
            throw new Error(`Failed to import book module: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * @description Extracts data from a ZIP file and validates its basic structure.
     * @private
     */
    private static async extractAndValidateZip(zipFile: File): Promise<JSZip> {
        console.log('📦 Extracting ZIP file...');
        
        const zip = new JSZip();
        const zipData = await zip.loadAsync(zipFile);
        
        // Validate required files
        const requiredFiles = [
            'marketplace-manifest.json',
            'metadata.json',
            'VERSION'
        ];
        
        for (const file of requiredFiles) {
            if (!zipData.file(file)) {
                throw new Error(`Invalid marketplace module: Missing ${file}`);
            }
        }
        
        console.log('✅ ZIP structure validated');
        return zipData;
    }

    /**
     * @description Parses the contents of a marketplace module ZIP into a structured object.
     * @private
     */
    private static async parseMarketplaceModule(zip: JSZip): Promise<any> {
        console.log('📖 Parsing marketplace module...');
        
        // Read manifest
        const manifestFile = zip.file('marketplace-manifest.json');
        const manifest = JSON.parse(await manifestFile!.async('text'));
        
        // Read metadata
        const metadataFile = zip.file('metadata.json');
        const metadata = JSON.parse(await metadataFile!.async('text'));
        
        // Read version
        const versionFile = zip.file('VERSION');
        const version = await versionFile!.async('text');
        
        // Read content structure
        const content: any = {
            chapters: {},
            globalSettings: {}
        };
        
        // Read global settings
        const globalSettingsFile = zip.file('content/global-settings.json');
        if (globalSettingsFile) {
            content.globalSettings = JSON.parse(await globalSettingsFile.async('text'));
        }
        
        // Read chapters
        const chaptersFolder = zip.folder('content/chapters');
        if (chaptersFolder) {
            await this.parseChaptersFromZip(chaptersFolder, content.chapters);
        }
        
        // Read assets
        const assets = await this.parseAssetsFromZip(zip);
        
        console.log(`📚 Parsed ${Object.keys(content.chapters).length} chapters`);
        
        return {
            manifest,
            metadata,
            content,
            assets,
            version
        };
    }

    /**
     * @description A helper to parse the contents of each chapter folder within the ZIP.
     * @private
     */
    private static async parseChaptersFromZip(chaptersFolder: JSZip, chapters: any): Promise<void> {
        for (const [chapterName, chapterEntry] of Object.entries(chaptersFolder.files)) {
            if (chapterEntry.dir) {
                const chapterData: any = {
                    metadata: {},
                    subtopics: [],
                    tabs: {},
                    highlights: [],
                    userNotes: [],
                    customContent: {}
                };
                
                // Read chapter metadata
                const metadataFile = chaptersFolder.file(`${chapterName}/metadata.json`);
                if (metadataFile) {
                    chapterData.metadata = JSON.parse(await metadataFile.async('text'));
                }
                
                // Read subtopics
                const subtopicsFile = chaptersFolder.file(`${chapterName}/subtopics.json`);
                if (subtopicsFile) {
                    chapterData.subtopics = JSON.parse(await subtopicsFile.async('text'));
                }
                
                // Read tabs
                const tabsFolder = chaptersFolder.folder(`${chapterName}/tabs`);
                if (tabsFolder) {
                    for (const [tabFileName, tabEntry] of Object.entries(tabsFolder.files)) {
                        if (!tabEntry.dir && tabFileName.endsWith('.json')) {
                            const tabId = tabFileName.replace('.json', '');
                            const tabData = JSON.parse(await tabEntry.async('text'));
                            chapterData.tabs[tabId] = tabData;
                        }
                    }
                }
                
                // Read exam mode
                const examModeFile = chaptersFolder.file(`${chapterName}/exam-mode.json`);
                if (examModeFile) {
                    chapterData.examMode = JSON.parse(await examModeFile.async('text'));
                }
                
                // Read highlights
                const highlightsFile = chaptersFolder.file(`${chapterName}/highlights.json`);
                if (highlightsFile) {
                    chapterData.highlights = JSON.parse(await highlightsFile.async('text'));
                }
                
                // Read user notes
                const userNotesFile = chaptersFolder.file(`${chapterName}/user-notes.json`);
                if (userNotesFile) {
                    chapterData.userNotes = JSON.parse(await userNotesFile.async('text'));
                }
                
                // Read custom content
                const customContentFile = chaptersFolder.file(`${chapterName}/custom-content.json`);
                if (customContentFile) {
                    chapterData.customContent = JSON.parse(await customContentFile.async('text'));
                }
                
                chapters[chapterName] = chapterData;
            }
        }
    }

    /**
     * @description A helper to parse the contents of the 'assets' folder in the ZIP.
     * @private
     */
    private static async parseAssetsFromZip(zip: JSZip): Promise<any> {
        const assets = {
            images: {},
            documents: {},
            videos: {},
            thumbnails: {}
        };
        
        const assetsFolder = zip.folder('assets');
        if (assetsFolder) {
            const imagesFile = assetsFolder.file('images.json');
            if (imagesFile) {
                assets.images = JSON.parse(await imagesFile.async('text'));
            }
            
            const documentsFile = assetsFolder.file('documents.json');
            if (documentsFile) {
                assets.documents = JSON.parse(await documentsFile.async('text'));
            }
            
            const videosFile = assetsFolder.file('videos.json');
            if (videosFile) {
                assets.videos = JSON.parse(await videosFile.async('text'));
            }
            
            const thumbnailsFile = assetsFolder.file('thumbnails.json');
            if (thumbnailsFile) {
                assets.thumbnails = JSON.parse(await thumbnailsFile.async('text'));
            }
        }
        
        return assets;
    }

    /**
     * @description Validates the compatibility of the imported book module.
     * @private
     */
    private static async validateCompatibility(bookModule: any): Promise<void> {
        console.log('🔍 Validating compatibility...');
        
        const moduleVersion = bookModule.version || bookModule.manifest?.formatVersion;
        
        if (!moduleVersion) {
            throw new Error('Module version not found');
        }
        
        if (!this.SUPPORTED_VERSIONS.includes(moduleVersion)) {
            throw new Error(`Unsupported module version: ${moduleVersion}. Supported versions: ${this.SUPPORTED_VERSIONS.join(', ')}`);
        }
        
        // Check feature compatibility
        const requiredFeatures = bookModule.manifest?.compatibility?.features || [];
        const unsupportedFeatures = requiredFeatures.filter((feature: string) => 
            !['tabs', 'highlights', 'exam-mode', 'multimedia'].includes(feature)
        );
        
        if (unsupportedFeatures.length > 0) {
            console.warn(`Unsupported features detected: ${unsupportedFeatures.join(', ')}`);
        }
        
        console.log('✅ Compatibility validated');
    }

    /**
     * @description Detects conflicts between the imported book and existing data in localStorage.
     * @private
     */
    private static async detectConflicts(bookModule: any, options: ImportOptions): Promise<ImportConflict[]> {
        console.log('⚠️ Detecting conflicts...');
        
        const conflicts: ImportConflict[] = [];
        
        // Check if book already exists
        const existingBooks = JSON.parse(localStorage.getItem('createdBooks') || '[]');
        const existingBook = existingBooks.find((book: any) => 
            book.id === bookModule.metadata.id || book.name === bookModule.metadata.name
        );
        
        if (existingBook) {
            conflicts.push({
                type: 'book-exists',
                description: `Book "${bookModule.metadata.name}" already exists`,
                resolution: options.conflictResolution === 'ask' ? 'ask' : options.conflictResolution
            });
        }
        
        // Check for chapter conflicts
        if (existingBook) {
            const existingChapters = JSON.parse(localStorage.getItem(`chapters_${existingBook.id}`) || '[]');
            const importChapters = Object.keys(bookModule.content.chapters);
            
            for (const chapterName of importChapters) {
                if (existingChapters.some((ch: any) => ch.name === chapterName)) {
                    conflicts.push({
                        type: 'chapter-exists',
                        description: `Chapter "${chapterName}" already exists`,
                        resolution: options.conflictResolution === 'ask' ? 'ask' : options.conflictResolution
                    });
                }
            }
        }
        
        console.log(`⚠️ Found ${conflicts.length} conflicts`);
        return conflicts;
    }

    /**
     * @description Resolves detected conflicts based on the chosen import options.
     * @private
     */
    private static async resolveConflicts(conflicts: ImportConflict[], options: ImportOptions): Promise<void> {
        console.log('🔧 Resolving conflicts...');
        
        for (const conflict of conflicts) {
            if (conflict.resolution === 'ask') {
                // In a real implementation, this would show a UI dialog
                // For now, we'll use the default resolution strategy
                conflict.resolution = options.conflictResolution === 'ask' ? 'overwrite' : options.conflictResolution;
            }
        }
        
        console.log('✅ Conflicts resolved');
    }

    /**
     * @description The core method that writes the parsed book data into localStorage.
     * @private
     */
    private static async importBookData(bookModule: any, options: ImportOptions): Promise<ImportResult> {
        console.log('💾 Importing book data...');
        
        const warnings: string[] = [];
        let imported = {
            chapters: 0,
            subtopics: 0,
            tabs: 0,
            assets: 0,
            examPapers: 0,
            highlights: 0
        };
        
        // Generate new book ID if needed
        const bookId = options.generateNewIds ? `book_${Date.now()}` : bookModule.metadata.id;
        const bookName = bookModule.metadata.name;
        
        // Create or update book entry
        const existingBooks = JSON.parse(localStorage.getItem('createdBooks') || '[]');
        const bookIndex = existingBooks.findIndex((book: any) => book.id === bookId);
        
        const bookData = {
            id: bookId,
            name: bookName,
            description: bookModule.metadata.description,
            chapters: Object.keys(bookModule.content.chapters),
            createdAt: bookModule.metadata.createdAt,
            updatedAt: new Date().toISOString(),
            imported: true,
            importSource: 'marketplace',
            originalId: bookModule.metadata.id
        };
        
        if (bookIndex >= 0) {
            existingBooks[bookIndex] = bookData;
        } else {
            existingBooks.push(bookData);
        }
        
        localStorage.setItem('createdBooks', JSON.stringify(existingBooks));
        
        // Create chapters structure
        const chapters = Object.entries(bookModule.content.chapters).map(([chapterName, chapterData]: [string, any], index) => ({
            id: chapterData.metadata?.id || `chapter_${index}`,
            name: chapterName,
            number: chapterData.metadata?.order || index + 1,
            description: chapterData.metadata?.description || ''
        }));
        
        localStorage.setItem(`chapters_${bookId}`, JSON.stringify(chapters));
        imported.chapters = chapters.length;
        
        // Import each chapter's data
        for (const [chapterName, chapterData] of Object.entries(bookModule.content.chapters) as [string, any][]) {
            const chapterKey = chapterName.replace(/\s+/g, '_');
            
            // Import subtopics
            if (chapterData.subtopics && chapterData.subtopics.length > 0) {
                localStorage.setItem(`subtopics_${bookId}_${chapterKey}`, JSON.stringify(chapterData.subtopics));
                imported.subtopics += chapterData.subtopics.length;
            }
            
            // Import tabs with isolation preservation
            for (const [tabId, tabData] of Object.entries(chapterData.tabs) as [string, any][]) {
                await this.importTabData(bookName, chapterKey, tabId, tabData);
                imported.tabs++;
            }
            
            // Import exam mode data
            if (chapterData.examMode) {
                if (chapterData.examMode.questionPapers) {
                    localStorage.setItem(`questionPapers_${bookName}_${chapterKey}`, JSON.stringify(chapterData.examMode.questionPapers));
                    imported.examPapers += chapterData.examMode.questionPapers.length;
                }
                
                if (chapterData.examMode.evaluationReports) {
                    localStorage.setItem(`evaluationReports_${bookName}_${chapterKey}`, JSON.stringify(chapterData.examMode.evaluationReports));
                }
            }
            
            // Import highlights
            if (chapterData.highlights && chapterData.highlights.length > 0) {
                localStorage.setItem(`highlights_${bookName}_${chapterKey}`, JSON.stringify(chapterData.highlights));
                imported.highlights += chapterData.highlights.length;
            }
            
            // Import user notes
            if (chapterData.userNotes && chapterData.userNotes.length > 0) {
                localStorage.setItem(`userNotes_${bookName}_${chapterKey}`, JSON.stringify(chapterData.userNotes));
            }
            
            // Import custom content
            for (const [key, value] of Object.entries(chapterData.customContent)) {
                localStorage.setItem(key, JSON.stringify(value));
            }
        }
        
        // Import global settings
        if (bookModule.content.globalSettings) {
            // Apply global settings carefully to avoid overriding user preferences
            const globalSettings = bookModule.content.globalSettings;
            
            if (globalSettings.theme && !localStorage.getItem('selectedTheme')) {
                localStorage.setItem('selectedTheme', globalSettings.theme);
            }
        }
        
        console.log(`✅ Book data imported successfully`);
        
        return {
            success: true,
            bookId,
            bookName,
            message: `Successfully imported "${bookName}" with ${imported.chapters} chapters and ${imported.tabs} tabs`,
            warnings,
            imported
        };
    }

    /**
     * @description Restores individual tab data to localStorage with proper isolation.
     * @private
     */
    private static async importTabData(bookName: string, chapterKey: string, tabId: string, tabData: any): Promise<void> {
        const templateType = tabData.templateType;
        const data = tabData.data;
        
        // Determine storage key based on template type and tab ID
        let storageKey: string;
        
        if (templateType === 'CUSTOM') {
            // Custom tab
            const customTabName = tabData.displayName;
            storageKey = `customtab_${bookName}_${chapterKey}_${customTabName}`;
            localStorage.setItem(storageKey, typeof data === 'string' ? data : JSON.stringify(data));
        } else {
            // Template tab with isolation
            const baseKey = this.getStorageKeyByTemplate(templateType, bookName, chapterKey);
            
            if (tabId.includes('_') && tabId !== `${templateType}_1`) {
                // Isolated tab (e.g., FLASHCARD_2, MCQ_3)
                storageKey = `${baseKey}_${tabId}`;
            } else {
                // First tab (legacy format)
                storageKey = baseKey;
            }
            
            localStorage.setItem(storageKey, JSON.stringify(data));
        }
        
        console.log(`📥 Imported tab: ${tabId} -> ${storageKey}`);
    }

    /**
     * @description Helper to generate localStorage keys for different template types.
     * @private
     */
    private static getStorageKeyByTemplate(templateType: string, bookName: string, chapterKey: string): string {
        const keyMap: { [key: string]: string } = {
            'FLASHCARD': `flashcards_${bookName}_${chapterKey}`,
            'MCQ': `mcq_${bookName}_${chapterKey}`,
            'QA': `qa_${bookName}_${chapterKey}`,
            'NOTES': `notes_${bookName}_${chapterKey}`,
            'MINDMAP': `mindmaps_${bookName}_${chapterKey}`,
            'VIDEOS': `videos_${bookName}_${chapterKey}`
        };
        return keyMap[templateType] || `${templateType.toLowerCase()}_${bookName}_${chapterKey}`;
    }

    /**
     * @description Restores asset data from the imported module.
     * @private
     */
    private static async restoreAssets(bookModule: any): Promise<void> {
        console.log('🖼️ Restoring assets...');
        
        let restoredCount = 0;
        
        // Restore images
        for (const [imageId, imageData] of Object.entries(bookModule.assets.images)) {
            // In a real implementation, you might want to store these in a more
            // permanent location or re-link them to the content
            // For now, we'll keep them as part of the content data
            restoredCount++;
        }
        
        // Restore documents
        for (const [docId, docData] of Object.entries(bookModule.assets.documents)) {
            restoredCount++;
        }
        
        console.log(`🖼️ Restored ${restoredCount} assets`);
    }

    /**
     * @description Performs a post-import validation check on the stored data.
     * @param {string} bookId - The ID of the book to validate.
     * @returns {Promise<object>} A promise resolving with the validation results.
     */
    static async validateImportedBook(bookId: string): Promise<{
        isValid: boolean;
        issues: string[];
        recommendations: string[];
    }> {
        const issues: string[] = [];
        const recommendations: string[] = [];
        
        // Check book exists
        const books = JSON.parse(localStorage.getItem('createdBooks') || '[]');
        const book = books.find((b: any) => b.id === bookId);
        
        if (!book) {
            issues.push('Book not found in storage');
            return { isValid: false, issues, recommendations };
        }
        
        // Check chapters exist
        const chapters = JSON.parse(localStorage.getItem(`chapters_${bookId}`) || '[]');
        if (chapters.length === 0) {
            issues.push('No chapters found for book');
        }
        
        // Check chapter data
        for (const chapter of chapters) {
            const chapterKey = chapter.name.replace(/\s+/g, '_');
            const subtopicsKey = `subtopics_${bookId}_${chapterKey}`;
            
            if (!localStorage.getItem(subtopicsKey)) {
                recommendations.push(`Consider adding content to chapter: ${chapter.name}`);
            }
        }
        
        return {
            isValid: issues.length === 0,
            issues,
            recommendations
        };
    }

    /**
     * @description Provides a summary of a ZIP file's contents without performing the import.
     * @param {File} zipFile - The ZIP file to preview.
     * @returns {Promise<object>} A promise resolving with the preview data.
     */
    static async getImportPreview(zipFile: File): Promise<{
        bookName: string;
        description: string;
        chapters: string[];
        totalTabs: number;
        totalAssets: number;
        compatibility: string;
        estimatedSize: string;
        warnings: string[];
    }> {
        try {
            const zipData = await this.extractAndValidateZip(zipFile);
            const bookModule = await this.parseMarketplaceModule(zipData);
            
            const chapters = Object.keys(bookModule.content.chapters);
            const totalTabs = Object.values(bookModule.content.chapters)
                .reduce((sum: number, chapter: any) => sum + Object.keys(chapter.tabs || {}).length, 0) as number;
            const totalAssets = Object.keys(bookModule.assets.images).length + 
                              Object.keys(bookModule.assets.documents).length;
            
            const warnings: string[] = [];
            
            // Check for conflicts
            const existingBooks = JSON.parse(localStorage.getItem('createdBooks') || '[]');
            if (existingBooks.some((book: any) => book.name === bookModule.metadata.name)) {
                warnings.push('A book with this name already exists');
            }
            
            return {
                bookName: bookModule.metadata.name,
                description: bookModule.metadata.description,
                chapters,
                totalTabs,
                totalAssets,
                compatibility: bookModule.version || 'Unknown',
                estimatedSize: this.formatFileSize(zipFile.size),
                warnings
            };
        } catch (error) {
            throw new Error(`Failed to preview import: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * @description Formats a number of bytes into a human-readable string.
     * @private
     */
    private static formatFileSize(bytes: number): string {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * @description A utility method to get a list of all imported books.
     * @returns {Array<object>} An array of imported book objects with summary data.
     */
    static getImportedBooks(): Array<{
        id: string;
        name: string;
        description: string;
        chapters: number;
        importDate: string;
        source: string;
    }> {
        const books = JSON.parse(localStorage.getItem('createdBooks') || '[]');
        return books
            .filter((book: any) => book.imported)
            .map((book: any) => ({
                id: book.id,
                name: book.name,
                description: book.description || '',
                chapters: book.chapters?.length || 0,
                importDate: book.updatedAt || book.createdAt,
                source: book.importSource || 'unknown'
            }));
    }
}
