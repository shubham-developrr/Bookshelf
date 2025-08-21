import JSZip from 'jszip';

interface EnhancedImportManifest {
    bookName: string;
    bookId: string;
    exportDate: string;
    version: string; // "1.0" or "2.0"
    appVersion?: string;
    exportType?: string;
    chapters: string[];
    description?: string;
    dataTypes?: string[];
    deviceInfo?: any;
}

interface EnhancedImportChapterData {
    subtopics?: any[];
    templates: {
        flashcards?: any[];
        mcq?: any[];
        qa?: any[];
        videos?: any[];
        anki_cards?: any[];
        notes?: any;
        mindmap?: any;
        customTabs?: { [tabName: string]: string };
    };
    examMode?: {
        questionPapers?: any[];
        evaluationReports?: any[];
        backgroundEvaluations?: any[];
        examAnswers?: any;
        examProgress?: any[];
    };
    highlights?: {
        textHighlights?: any[];
        aiConversations?: any[];
        annotations?: any[];
        selectionHistory?: any[];
    };
    userProgress?: {
        readingProgress?: any;
        completionStatus?: any;
        timeSpent?: number;
        lastAccessed?: string;
        performanceMetrics?: any;
        studyStats?: any;
    };
    uiState?: {
        activeTab?: string;
        tabConfigurations?: any;
        mobileSettings?: any;
        themePreferences?: any;
        layoutPreferences?: any;
    };
}

/**
 * Enhanced Import Service v2.0 - Complete Data Restoration
 * Handles both v1.0 (legacy) and v2.0 (enhanced) export formats
 */
export class EnhancedBookImportService {
    /**
     * Import a book from ZIP file with version detection
     */
    static async importBook(zipFile: File): Promise<void> {
        try {
            console.log('🔄 Starting enhanced import...');
            const zipData = await this.readZipFile(zipFile);
            
            // Detect export version
            const version = await this.detectExportVersion(zipData);
            console.log(`📋 Detected export version: ${version}`);
            
            if (version === '2.0') {
                await this.importEnhancedBook(zipData);
            } else {
                // Handle v1.0 legacy format
                await this.importLegacyBook(zipData);
            }
            
            console.log('✅ Import completed successfully');
        } catch (error) {
            console.error('❌ Import failed:', error);
            throw new Error(`Failed to import book: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Detect export version from manifest
     */
    private static async detectExportVersion(zip: JSZip): Promise<string> {
        const manifestFile = zip.file('manifest.json');
        if (!manifestFile) {
            throw new Error('Invalid book export: manifest.json not found');
        }

        const manifestContent = await manifestFile.async('text');
        const manifest = JSON.parse(manifestContent);
        return manifest.version || '1.0';
    }

    /**
     * Import enhanced v2.0 format with complete data restoration
     */
    private static async importEnhancedBook(zip: JSZip): Promise<void> {
        console.log('📦 Importing enhanced v2.0 format...');
        
        const importData = await this.parseEnhancedZipData(zip);
        await this.integrateIntoLegacyBooks(importData);
        await this.restoreCompleteContentData(importData);
        await this.restoreGlobalData(importData);
    }

    /**
     * Import legacy v1.0 format (backwards compatibility)
     */
    private static async importLegacyBook(zip: JSZip): Promise<void> {
        console.log('📦 Importing legacy v1.0 format...');
        
        // Use original import logic for v1.0
        const importData = await this.parseLegacyZipData(zip);
        await this.integrateIntoLegacyBooks(importData);
        await this.restoreLegacyContentData(importData);
    }

    /**
     * Read ZIP file and extract data
     */
    private static async readZipFile(zipFile: File): Promise<JSZip> {
        const zip = new JSZip();
        return await zip.loadAsync(zipFile);
    }

    /**
     * Parse enhanced v2.0 ZIP data into structured format
     */
    private static async parseEnhancedZipData(zip: JSZip): Promise<{
        manifest: EnhancedImportManifest;
        content: { [chapterName: string]: EnhancedImportChapterData };
        globalData?: any;
    }> {
        // Read manifest
        const manifestFile = zip.file('manifest.json');
        if (!manifestFile) {
            throw new Error('Invalid book export: manifest.json not found');
        }

        const manifestContent = await manifestFile.async('text');
        const manifest: EnhancedImportManifest = JSON.parse(manifestContent);

        console.log('📋 Processing enhanced manifest:', {
            version: manifest.version,
            dataTypes: manifest.dataTypes,
            chapters: manifest.chapters.length
        });

        // Read content data
        const content: { [chapterName: string]: EnhancedImportChapterData } = {};
        
        for (const chapterName of manifest.chapters) {
            console.log(`📖 Processing chapter: ${chapterName}`);
            const chapterData: EnhancedImportChapterData = { templates: {} };
            
            // Read subtopics
            const subtopicsFile = zip.file(`content/${chapterName}/subtopics.json`);
            if (subtopicsFile) {
                const subtopicsContent = await subtopicsFile.async('text');
                chapterData.subtopics = JSON.parse(subtopicsContent);
            }

            // Read templates folder
            await this.readTemplateData(zip, chapterName, chapterData);

            // Read exam mode folder
            await this.readExamModeData(zip, chapterName, chapterData);

            // Read highlights folder
            await this.readHighlightsData(zip, chapterName, chapterData);

            // Read user progress folder
            await this.readUserProgressData(zip, chapterName, chapterData);

            // Read UI state folder
            await this.readUIStateData(zip, chapterName, chapterData);

            content[chapterName] = chapterData;
        }

        // Read global data
        const globalData = await this.readGlobalData(zip);

        return { manifest, content, globalData };
    }

    /**
     * Read template data from templates folder
     */
    private static async readTemplateData(zip: JSZip, chapterName: string, chapterData: EnhancedImportChapterData): Promise<void> {
        const templateFiles = [
            'flashcards.json', 'mcq.json', 'qa.json', 'videos.json',
            'anki_cards.json', 'notes.json', 'mindmap.json', 'customTabs.json'
        ];

        for (const templateFile of templateFiles) {
            const file = zip.file(`content/${chapterName}/templates/${templateFile}`);
            if (file) {
                const templateContent = await file.async('text');
                const templateName = templateFile.replace('.json', '');
                (chapterData.templates as any)[templateName] = JSON.parse(templateContent);
            }
        }
    }

    /**
     * Read exam mode data from examMode folder
     */
    private static async readExamModeData(zip: JSZip, chapterName: string, chapterData: EnhancedImportChapterData): Promise<void> {
        const examModeFiles = [
            'questionPapers.json', 'evaluationReports.json', 
            'backgroundEvaluations.json', 'examAnswers.json', 'examProgress.json'
        ];

        const examModeData: any = {};
        for (const examFile of examModeFiles) {
            const file = zip.file(`content/${chapterName}/examMode/${examFile}`);
            if (file) {
                const examContent = await file.async('text');
                const examKey = examFile.replace('.json', '');
                examModeData[examKey] = JSON.parse(examContent);
            }
        }

        if (Object.keys(examModeData).length > 0) {
            chapterData.examMode = examModeData;
        }
    }

    /**
     * Read highlights data from highlights folder
     */
    private static async readHighlightsData(zip: JSZip, chapterName: string, chapterData: EnhancedImportChapterData): Promise<void> {
        const highlightFiles = [
            'textHighlights.json', 'aiConversations.json', 
            'annotations.json', 'selectionHistory.json'
        ];

        const highlightsData: any = {};
        for (const highlightFile of highlightFiles) {
            const file = zip.file(`content/${chapterName}/highlights/${highlightFile}`);
            if (file) {
                const highlightContent = await file.async('text');
                const highlightKey = highlightFile.replace('.json', '');
                highlightsData[highlightKey] = JSON.parse(highlightContent);
            }
        }

        if (Object.keys(highlightsData).length > 0) {
            chapterData.highlights = highlightsData;
        }
    }

    /**
     * Read user progress data from userProgress folder
     */
    private static async readUserProgressData(zip: JSZip, chapterName: string, chapterData: EnhancedImportChapterData): Promise<void> {
        const progressFiles = [
            'readingProgress.json', 'completionStatus.json', 'timeSpent.json',
            'lastAccessed.json', 'performanceMetrics.json', 'studyStats.json'
        ];

        const progressData: any = {};
        for (const progressFile of progressFiles) {
            const file = zip.file(`content/${chapterName}/userProgress/${progressFile}`);
            if (file) {
                const progressContent = await file.async('text');
                const progressKey = progressFile.replace('.json', '');
                progressData[progressKey] = JSON.parse(progressContent);
            }
        }

        if (Object.keys(progressData).length > 0) {
            chapterData.userProgress = progressData;
        }
    }

    /**
     * Read UI state data from uiState folder
     */
    private static async readUIStateData(zip: JSZip, chapterName: string, chapterData: EnhancedImportChapterData): Promise<void> {
        const uiFiles = [
            'activeTab.json', 'tabConfigurations.json', 'mobileSettings.json',
            'themePreferences.json', 'layoutPreferences.json'
        ];

        const uiData: any = {};
        for (const uiFile of uiFiles) {
            const file = zip.file(`content/${chapterName}/uiState/${uiFile}`);
            if (file) {
                const uiContent = await file.async('text');
                const uiKey = uiFile.replace('.json', '');
                uiData[uiKey] = JSON.parse(uiContent);
            }
        }

        if (Object.keys(uiData).length > 0) {
            chapterData.uiState = uiData;
        }
    }

    /**
     * Read global data from metadata folder
     */
    private static async readGlobalData(zip: JSZip): Promise<any> {
        const globalFiles = [
            'bookSettings.json', 'userPreferences.json', 'appConfig.json',
            'importedBooksMetadata.json', 'crossChapterData.json'
        ];

        const globalData: any = {};
        for (const globalFile of globalFiles) {
            const file = zip.file(`metadata/${globalFile}`);
            if (file) {
                const globalContent = await file.async('text');
                const globalKey = globalFile.replace('.json', '');
                globalData[globalKey] = JSON.parse(globalContent);
            }
        }

        return Object.keys(globalData).length > 0 ? globalData : undefined;
    }

    /**
     * Parse legacy v1.0 ZIP data (backwards compatibility)
     */
    private static async parseLegacyZipData(zip: JSZip): Promise<{
        manifest: EnhancedImportManifest;
        content: { [chapterName: string]: EnhancedImportChapterData };
    }> {
        // Read manifest
        const manifestFile = zip.file('manifest.json');
        if (!manifestFile) {
            throw new Error('Invalid book export: manifest.json not found');
        }

        const manifestContent = await manifestFile.async('text');
        const manifest: EnhancedImportManifest = JSON.parse(manifestContent);

        // Read content data (legacy format)
        const content: { [chapterName: string]: EnhancedImportChapterData } = {};
        
        for (const chapterName of manifest.chapters) {
            const chapterData: EnhancedImportChapterData = { templates: {} };
            
            // Read subtopics
            const subtopicsFile = zip.file(`content/${chapterName}/subtopics.json`);
            if (subtopicsFile) {
                const subtopicsContent = await subtopicsFile.async('text');
                chapterData.subtopics = JSON.parse(subtopicsContent);
            }

            // Read template data (legacy flat structure)
            const templateFiles = [
                'flashcards.json', 'mcq.json', 'qa.json', 'videos.json',
                'anki_cards.json', 'notes.json', 'mindmap.json', 'customTabs.json'
            ];

            for (const templateFile of templateFiles) {
                const file = zip.file(`content/${chapterName}/${templateFile}`);
                if (file) {
                    const templateContent = await file.async('text');
                    const templateName = templateFile.replace('.json', '');
                    (chapterData.templates as any)[templateName] = JSON.parse(templateContent);
                }
            }

            content[chapterName] = chapterData;
        }

        return { manifest, content };
    }

    /**
     * Integrate book into legacy books system (same as before)
     */
    private static async integrateIntoLegacyBooks(importData: {
        manifest: EnhancedImportManifest;
        content: { [chapterName: string]: EnhancedImportChapterData };
    }): Promise<void> {
        const { manifest, content } = importData;

        // Add to imported books list
        const importedBooks = JSON.parse(localStorage.getItem('importedBooks') || '[]');
        const newBook = {
            id: manifest.bookId,
            name: manifest.bookName,
            importDate: new Date().toISOString(),
            originalExportDate: manifest.exportDate,
            version: manifest.version,
            description: manifest.description
        };
        
        // Check if book already exists and update it
        const existingIndex = importedBooks.findIndex((book: any) => book.id === manifest.bookId);
        if (existingIndex >= 0) {
            importedBooks[existingIndex] = newBook;
            console.log('📝 Updated existing imported book');
        } else {
            importedBooks.push(newBook);
            console.log('📚 Added new imported book');
        }
        
        localStorage.setItem('importedBooks', JSON.stringify(importedBooks));

        // Create chapter subtopics mapping
        const chapterSubtopics = JSON.parse(localStorage.getItem('importedChapterSubtopics') || '{}');
        chapterSubtopics[manifest.bookName] = {};
        
        for (const [chapterName, chapterData] of Object.entries(content)) {
            if (chapterData.subtopics && chapterData.subtopics.length > 0) {
                chapterSubtopics[manifest.bookName][chapterName] = chapterData.subtopics;
            }
        }
        
        localStorage.setItem('importedChapterSubtopics', JSON.stringify(chapterSubtopics));
    }

    /**
     * Restore complete content data to localStorage (v2.0 format)
     */
    private static async restoreCompleteContentData(importData: {
        manifest: EnhancedImportManifest;
        content: { [chapterName: string]: EnhancedImportChapterData };
    }): Promise<void> {
        const { manifest, content } = importData;
        const bookName = manifest.bookName;

        console.log('🔄 Restoring complete content data...');

        for (const [chapterName, chapterData] of Object.entries(content)) {
            const chapterKey = chapterName.replace(/\s+/g, '_');

            // Restore subtopics data
            if (chapterData.subtopics && chapterData.subtopics.length > 0) {
                const subtopicsKey = `subtopics_${manifest.bookId}_${chapterKey}`;
                localStorage.setItem(subtopicsKey, JSON.stringify(chapterData.subtopics));
            }

            // Restore template data
            await this.restoreTemplateData(bookName, chapterKey, chapterData.templates);

            // Restore exam mode data
            if (chapterData.examMode) {
                await this.restoreExamModeData(bookName, chapterName, chapterData.examMode);
            }

            // Restore highlights data
            if (chapterData.highlights) {
                await this.restoreHighlightsData(bookName, chapterName, chapterData.highlights);
            }

            // Restore user progress data
            if (chapterData.userProgress) {
                await this.restoreUserProgressData(bookName, chapterName, chapterData.userProgress);
            }

            // Restore UI state data
            if (chapterData.uiState) {
                await this.restoreUIStateData(bookName, chapterName, chapterData.uiState);
            }
        }

        console.log('✅ Complete content data restored');
    }

    /**
     * Restore template data (existing system)
     */
    private static async restoreTemplateData(bookName: string, chapterKey: string, templates: any): Promise<void> {
        const templateMappings = [
            { name: 'flashcards', key: `flashcards_${bookName}_${chapterKey}` },
            { name: 'mcq', key: `mcq_${bookName}_${chapterKey}` },
            { name: 'qa', key: `qa_${bookName}_${chapterKey}` },
            { name: 'videos', key: `videos_${bookName}_${chapterKey}` },
            { name: 'anki_cards', key: `anki_cards_${bookName}_${chapterKey}` },
            { name: 'notes', key: `notes_${bookName}_${chapterKey}` },
            { name: 'mindmap', key: `mindmap_${bookName}_${chapterKey}` }
        ];

        templateMappings.forEach(({ name, key }) => {
            const templateData = templates[name];
            if (templateData) {
                localStorage.setItem(key, JSON.stringify(templateData));
            }
        });

        // Restore custom tabs
        if (templates.customTabs) {
            for (const [tabName, tabContent] of Object.entries(templates.customTabs)) {
                const customTabKey = `customtab_${bookName}_${chapterKey}_${tabName}`;
                localStorage.setItem(customTabKey, tabContent as string);
            }
        }
    }

    /**
     * Restore exam mode data
     */
    private static async restoreExamModeData(bookName: string, chapterName: string, examMode: any): Promise<void> {
        if (examMode.questionPapers) {
            const questionPapersKey = `questionPapers_${bookName}_${chapterName}`;
            localStorage.setItem(questionPapersKey, JSON.stringify(examMode.questionPapers));
        }

        if (examMode.evaluationReports) {
            const evaluationReportsKey = `evaluationReports_${bookName}_${chapterName}`;
            localStorage.setItem(evaluationReportsKey, JSON.stringify(examMode.evaluationReports));
        }

        if (examMode.backgroundEvaluations) {
            for (const bgEval of examMode.backgroundEvaluations) {
                localStorage.setItem(bgEval.key, JSON.stringify(bgEval.data));
            }
        }

        if (examMode.examAnswers) {
            for (const [key, answers] of Object.entries(examMode.examAnswers)) {
                localStorage.setItem(key, JSON.stringify(answers));
            }
        }
    }

    /**
     * Restore highlights data
     */
    private static async restoreHighlightsData(bookName: string, chapterName: string, highlights: any): Promise<void> {
        if (highlights.textHighlights) {
            const textHighlightsKey = `textHighlights_${bookName}_${chapterName}`;
            localStorage.setItem(textHighlightsKey, JSON.stringify(highlights.textHighlights));
        }

        if (highlights.aiConversations) {
            const aiConversationsKey = `aiConversations_${bookName}_${chapterName}`;
            localStorage.setItem(aiConversationsKey, JSON.stringify(highlights.aiConversations));
        }

        if (highlights.annotations) {
            const annotationsKey = `annotations_${bookName}_${chapterName}`;
            localStorage.setItem(annotationsKey, JSON.stringify(highlights.annotations));
        }
    }

    /**
     * Restore user progress data
     */
    private static async restoreUserProgressData(bookName: string, chapterName: string, userProgress: any): Promise<void> {
        if (userProgress.readingProgress) {
            const readingProgressKey = `readingProgress_${bookName}_${chapterName}`;
            localStorage.setItem(readingProgressKey, JSON.stringify(userProgress.readingProgress));
        }

        if (userProgress.timeSpent !== undefined) {
            const timeSpentKey = `timeSpent_${bookName}_${chapterName}`;
            localStorage.setItem(timeSpentKey, userProgress.timeSpent.toString());
        }

        if (userProgress.performanceMetrics) {
            const performanceKey = `performance_${bookName}_${chapterName}`;
            localStorage.setItem(performanceKey, JSON.stringify(userProgress.performanceMetrics));
        }

        if (userProgress.lastAccessed) {
            const lastAccessedKey = `lastAccessed_${bookName}_${chapterName}`;
            localStorage.setItem(lastAccessedKey, userProgress.lastAccessed);
        }
    }

    /**
     * Restore UI state data
     */
    private static async restoreUIStateData(bookName: string, chapterName: string, uiState: any): Promise<void> {
        if (uiState.activeTab) {
            const activeTabKey = `activeTab_${bookName}_${chapterName}`;
            localStorage.setItem(activeTabKey, uiState.activeTab);
        }

        if (uiState.tabConfigurations) {
            const tabConfigKey = `tabConfig_${bookName}_${chapterName}`;
            localStorage.setItem(tabConfigKey, JSON.stringify(uiState.tabConfigurations));
        }

        if (uiState.mobileSettings) {
            const mobileSettingsKey = `mobileSettings_${bookName}_${chapterName}`;
            localStorage.setItem(mobileSettingsKey, JSON.stringify(uiState.mobileSettings));
        }
    }

    /**
     * Restore global data
     */
    private static async restoreGlobalData(importData: {
        manifest: EnhancedImportManifest;
        globalData?: any;
    }): Promise<void> {
        if (!importData.globalData) return;

        console.log('🌍 Restoring global data...');

        const { globalData } = importData;

        if (globalData.bookSettings) {
            const bookSettingsKey = `bookSettings_${importData.manifest.bookId}`;
            localStorage.setItem(bookSettingsKey, JSON.stringify(globalData.bookSettings));
        }

        if (globalData.userPreferences) {
            const userPrefsKey = `userPreferences_${importData.manifest.bookId}`;
            localStorage.setItem(userPrefsKey, JSON.stringify(globalData.userPreferences));
        }

        if (globalData.importedBooksMetadata) {
            const { books, chapterSubtopics } = globalData.importedBooksMetadata;
            
            if (books && books.length > 0) {
                // Merge with existing imported books
                const existingBooks = JSON.parse(localStorage.getItem('importedBooks') || '[]');
                const mergedBooks = [...existingBooks];
                
                for (const book of books) {
                    const existingIndex = mergedBooks.findIndex((b: any) => b.id === book.id);
                    if (existingIndex >= 0) {
                        mergedBooks[existingIndex] = book;
                    } else {
                        mergedBooks.push(book);
                    }
                }
                
                localStorage.setItem('importedBooks', JSON.stringify(mergedBooks));
            }

            if (chapterSubtopics) {
                // Merge with existing chapter subtopics
                const existingSubtopics = JSON.parse(localStorage.getItem('importedChapterSubtopics') || '{}');
                const mergedSubtopics = { ...existingSubtopics, ...chapterSubtopics };
                localStorage.setItem('importedChapterSubtopics', JSON.stringify(mergedSubtopics));
            }
        }

        console.log('✅ Global data restored');
    }

    /**
     * Restore legacy content data (v1.0 format)
     */
    private static async restoreLegacyContentData(importData: {
        manifest: EnhancedImportManifest;
        content: { [chapterName: string]: EnhancedImportChapterData };
    }): Promise<void> {
        const { manifest, content } = importData;
        const bookName = manifest.bookName;

        for (const [chapterName, chapterData] of Object.entries(content)) {
            const chapterKey = chapterName.replace(/\s+/g, '_');

            // Restore subtopics data
            if (chapterData.subtopics && chapterData.subtopics.length > 0) {
                const subtopicsKey = `subtopics_${manifest.bookId}_${chapterKey}`;
                localStorage.setItem(subtopicsKey, JSON.stringify(chapterData.subtopics));
            }

            // Restore template data
            await this.restoreTemplateData(bookName, chapterKey, chapterData.templates);
        }
    }

    /**
     * Validate ZIP file before import
     */
    static async validateImportFile(zipFile: File): Promise<{
        isValid: boolean;
        version?: string;
        bookName?: string;
        chapterCount?: number;
        dataTypes?: string[];
        error?: string;
    }> {
        try {
            const zip = await this.readZipFile(zipFile);
            const manifestFile = zip.file('manifest.json');
            
            if (!manifestFile) {
                return { isValid: false, error: 'Invalid book export: manifest.json not found' };
            }

            const manifestContent = await manifestFile.async('text');
            const manifest: EnhancedImportManifest = JSON.parse(manifestContent);

            return {
                isValid: true,
                version: manifest.version || '1.0',
                bookName: manifest.bookName,
                chapterCount: manifest.chapters.length,
                dataTypes: manifest.dataTypes || ['templates'],
            };
        } catch (error) {
            return { 
                isValid: false, 
                error: `Invalid book export file: ${error instanceof Error ? error.message : 'Unknown error'}` 
            };
        }
    }

    /**
     * Get list of imported books
     */
    static getImportedBooks(): any[] {
        return JSON.parse(localStorage.getItem('importedBooks') || '[]');
    }

    /**
     * Get chapter subtopics for imported book
     */
    static getImportedChapterSubtopics(bookName: string): { [chapterName: string]: string[] } {
        const allSubtopics = JSON.parse(localStorage.getItem('importedChapterSubtopics') || '{}');
        return allSubtopics[bookName] || {};
    }

    /**
     * Delete imported book and all its data
     */
    static async deleteImportedBook(bookName: string, bookId: string): Promise<void> {
        try {
            // Remove from imported books list
            const importedBooks = JSON.parse(localStorage.getItem('importedBooks') || '[]');
            const updatedBooks = importedBooks.filter((book: any) => book.id !== bookId && book.name !== bookName);
            localStorage.setItem('importedBooks', JSON.stringify(updatedBooks));

            // Remove chapter subtopics mapping
            const chapterSubtopics = JSON.parse(localStorage.getItem('importedChapterSubtopics') || '{}');
            delete chapterSubtopics[bookName];
            localStorage.setItem('importedChapterSubtopics', JSON.stringify(chapterSubtopics));

            // Remove all content data from localStorage
            const keysToRemove: string[] = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && (key.includes(bookName) || key.includes(bookId))) {
                    // Skip core system keys
                    if (!key.startsWith('createdBooks') && !key.startsWith('importedBooks')) {
                        keysToRemove.push(key);
                    }
                }
            }

            // Remove all related keys
            keysToRemove.forEach(key => {
                localStorage.removeItem(key);
            });

            console.log(`📚 Deleted imported book: ${bookName} (removed ${keysToRemove.length} data keys)`);
        } catch (error) {
            console.error('Failed to delete imported book:', error);
            throw error;
        }
    }

    /**
     * Get import statistics
     */
    static async getImportStats(zipFile: File): Promise<any> {
        try {
            const validation = await this.validateImportFile(zipFile);
            if (!validation.isValid) {
                return { error: validation.error };
            }

            const zip = await this.readZipFile(zipFile);
            const files = Object.keys(zip.files);
            const dataFolders = files.filter(file => file.includes('/') && !file.endsWith('/')).length;

            return {
                isValid: validation.isValid,
                version: validation.version,
                bookName: validation.bookName,
                chapters: validation.chapterCount,
                dataTypes: validation.dataTypes,
                totalFiles: files.length,
                dataFolders,
                estimatedSizeKB: Math.round(zipFile.size / 1024)
            };
        } catch (error) {
            return { 
                error: `Failed to analyze import file: ${error instanceof Error ? error.message : 'Unknown error'}` 
            };
        }
    }
}
