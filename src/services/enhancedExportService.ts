import JSZip from 'jszip';

/**
 * @interface EnhancedBookExportData
 * @description Defines the complete data structure for a version 2.0 book export,
 * including a manifest, chapter-specific content, and global data.
 * @param {object} manifest - The manifest for the export.
 * @param {string} manifest.bookName - The name of the book.
 * @param {string} manifest.bookId - The ID of the book.
 * @param {string} manifest.exportDate - The date of the export.
 * @param {string} manifest.version - The version of the export format.
 * @param {string} manifest.appVersion - The version of the application.
 * @param {'complete' | 'templates-only'} manifest.exportType - The type of the export.
 * @param {string[]} manifest.chapters - An array of chapter names.
 * @param {string} [manifest.description] - An optional description of the book.
 * @param {string[]} manifest.dataTypes - An array of data types included in the export.
 * @param {object} [manifest.deviceInfo] - Optional information about the device used for the export.
 * @param {string} manifest.deviceInfo.platform - The platform of the device.
 * @param {string} manifest.deviceInfo.userAgent - The user agent of the device.
 * @param {string} manifest.deviceInfo.exportTime - The time of the export.
 * @param {object} content - The content of the book, organized by chapter.
 * @param {object} [globalData] - Optional global data for the book.
 */
export interface EnhancedBookExportData {
    manifest: {
        bookName: string;
        bookId: string;
        exportDate: string;
        version: string; // "2.0" for new format
        appVersion: string;
        exportType: 'complete' | 'templates-only';
        chapters: string[];
        description?: string;
        dataTypes: string[]; // List of data types included
        deviceInfo?: {
            platform: string;
            userAgent: string;
            exportTime: string;
        };
    };
    content: {
        [chapterName: string]: {
            // Core Content
            subtopics?: any[];
            
            // Template Data (existing)
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
            
            // NEW: Exam Mode Data (complete)
            examMode?: {
                questionPapers?: any[];
                evaluationReports?: any[];
                backgroundEvaluations?: any[];
                examAnswers?: { [examId: string]: any }; // Saved exam answers
                examProgress?: any[];
            };
            
            // NEW: Highlights & Annotations
            highlights?: {
                textHighlights?: any[];
                aiConversations?: any[];
                annotations?: any[];
                selectionHistory?: any[];
            };
            
            // NEW: User Progress & Performance
            userProgress?: {
                readingProgress?: any;
                completionStatus?: any;
                timeSpent?: number;
                lastAccessed?: string;
                performanceMetrics?: any;
                studyStats?: any;
            };
            
            // NEW: UI State & Preferences
            uiState?: {
                activeTab?: string;
                tabConfigurations?: any;
                mobileSettings?: any;
                themePreferences?: any;
                layoutPreferences?: any;
            };
        };
    };
    // NEW: Global Settings & Metadata
    globalData?: {
        bookSettings?: any;
        userPreferences?: any;
        appConfig?: any;
        importedBooksMetadata?: any;
        crossChapterData?: any;
    };
}

/**
 * @class EnhancedBookExportService
 * @description A service to capture a complete snapshot of a user's data for a specific book,
 * including content, templates, progress, and settings, and package it into a structured ZIP file.
 */
export class EnhancedBookExportService {
    /**
     * @description The main public method to trigger the full export process for a book.
     * @param {string} bookName - The name of the book to export.
     * @param {string} bookId - The ID of the book to export.
     */
    static async exportBook(bookName: string, bookId: string): Promise<void> {
        try {
            console.log('🚀 Starting enhanced export for:', bookName);
            const exportData = await this.gatherCompleteBookData(bookName, bookId);
            const zipBlob = await this.createEnhancedZipFile(exportData);
            this.downloadZipFile(zipBlob, bookName);
            console.log('✅ Export completed successfully');
        } catch (error) {
            console.error('❌ Export failed:', error);
            throw new Error(`Failed to export book: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * @description Scans all of localStorage for keys related to the specified book and aggregates
     * the data into the EnhancedBookExportData structure.
     * @private
     * @param {string} bookName - The name of the book.
     * @param {string} bookId - The ID of the book.
     * @returns {Promise<EnhancedBookExportData>} A promise that resolves with the complete book data.
     */
    private static async gatherCompleteBookData(bookName: string, bookId: string): Promise<EnhancedBookExportData> {
        console.log('📊 Gathering complete book data...');
        
        // Get book metadata
        const savedBooks = JSON.parse(localStorage.getItem('createdBooks') || '[]');
        const book = savedBooks.find((b: any) => b.id === bookId || b.name === bookName);
        
        if (!book) {
            throw new Error('Book not found');
        }

        // Get chapters
        const chapters = JSON.parse(localStorage.getItem(`chapters_${bookId}`) || '[]');
        console.log('📚 Found chapters:', chapters.length);
        
        const content: EnhancedBookExportData['content'] = {};
        const dataTypesFound: string[] = [];

        // Process each chapter with comprehensive data collection
        for (const chapter of chapters) {
            const chapterName = chapter.name || chapter;
            const chapterKey = chapterName.replace(/\s+/g, '_');
            console.log(`📖 Processing chapter: ${chapterName}`);
            
            const chapterData: EnhancedBookExportData['content'][string] = {
                templates: {},
                subtopics: this.getChapterSubtopics(bookId, chapterName),
                examMode: this.getExamModeData(bookName, chapterName),
                highlights: this.getHighlightsData(bookName, chapterName),
                userProgress: this.getUserProgressData(bookName, chapterName),
                uiState: this.getUIStateData(bookName, chapterName)
            };

            // Get template data (existing system)
            chapterData.templates = this.getTemplateData(bookName, chapterKey);
            
            // Track what data types we found
            if (chapterData.subtopics?.length) dataTypesFound.push('subtopics');
            if (Object.keys(chapterData.templates).length) dataTypesFound.push('templates');
            if (chapterData.examMode && Object.keys(chapterData.examMode).length) dataTypesFound.push('examMode');
            if (chapterData.highlights && Object.keys(chapterData.highlights).length) dataTypesFound.push('highlights');
            if (chapterData.userProgress && Object.keys(chapterData.userProgress).length) dataTypesFound.push('userProgress');
            if (chapterData.uiState && Object.keys(chapterData.uiState).length) dataTypesFound.push('uiState');
            
            content[chapterName] = chapterData;
        }

        // Gather global data
        const globalData = this.getGlobalData(bookName, bookId);
        if (globalData && Object.keys(globalData).length) {
            dataTypesFound.push('globalData');
        }

        // Create comprehensive manifest
        const exportData: EnhancedBookExportData = {
            manifest: {
                bookName: book.name,
                bookId: book.id,
                exportDate: new Date().toISOString(),
                version: '2.0', // New enhanced version
                appVersion: '2.0.0', // Current app version
                exportType: 'complete',
                chapters: chapters.map((ch: any) => ch.name || ch),
                description: book.description || `Complete export of study book: ${book.name}`,
                dataTypes: [...new Set(dataTypesFound)], // Unique data types
                deviceInfo: {
                    platform: navigator.platform || 'Unknown',
                    userAgent: navigator.userAgent,
                    exportTime: new Date().toLocaleString()
                }
            },
            content,
            globalData
        };

        console.log('📋 Export summary:', {
            chapters: chapters.length,
            dataTypes: exportData.manifest.dataTypes,
            version: exportData.manifest.version
        });

        return exportData;
    }

    /**
     * @description Gathers subtopic data for a chapter from localStorage.
     * @private
     */
    private static getChapterSubtopics(bookId: string, chapterName: string): any[] {
        const chapterKey = chapterName.replace(/\s+/g, '_');
        const subtopicsKey = `subtopics_${bookId}_${chapterKey}`;
        const subtopics = localStorage.getItem(subtopicsKey);
        return subtopics ? JSON.parse(subtopics) : [];
    }

    /**
     * @description Gathers all exam mode related data for a chapter from localStorage.
     * @private
     */
    private static getExamModeData(bookName: string, chapterName: string): any {
        const examData: any = {};
        
        // Question papers
        const questionPapersKey = `questionPapers_${bookName}_${chapterName}`;
        const questionPapers = localStorage.getItem(questionPapersKey);
        if (questionPapers) {
            examData.questionPapers = JSON.parse(questionPapers);
        }

        // Evaluation reports
        const evaluationReportsKey = `evaluationReports_${bookName}_${chapterName}`;
        const evaluationReports = localStorage.getItem(evaluationReportsKey);
        if (evaluationReports) {
            examData.evaluationReports = JSON.parse(evaluationReports);
        }

        // Background evaluations (scan for all related keys)
        const backgroundEvaluations: any[] = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.includes(`backgroundEvaluation_${bookName}_${chapterName}`)) {
                const evalData = localStorage.getItem(key);
                if (evalData) {
                    backgroundEvaluations.push({
                        key,
                        data: JSON.parse(evalData)
                    });
                }
            }
        }
        if (backgroundEvaluations.length > 0) {
            examData.backgroundEvaluations = backgroundEvaluations;
        }

        // Exam answers (scan for exam answer patterns)
        const examAnswers: any = {};
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.includes(`examAnswers_`) && key.includes(bookName) && key.includes(chapterName)) {
                const answers = localStorage.getItem(key);
                if (answers) {
                    examAnswers[key] = JSON.parse(answers);
                }
            }
        }
        if (Object.keys(examAnswers).length > 0) {
            examData.examAnswers = examAnswers;
        }

        return Object.keys(examData).length > 0 ? examData : undefined;
    }

    /**
     * @description Gathers all highlight and annotation data for a chapter from localStorage.
     * @private
     */
    private static getHighlightsData(bookName: string, chapterName: string): any {
        const highlightsData: any = {};
        
        // Scan for all highlight-related data
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.includes('highlight') && key.includes(bookName)) {
                const data = localStorage.getItem(key);
                if (data) {
                    if (key.includes('textHighlights')) {
                        highlightsData.textHighlights = JSON.parse(data);
                    } else if (key.includes('aiConversations')) {
                        highlightsData.aiConversations = JSON.parse(data);
                    } else if (key.includes('annotations')) {
                        highlightsData.annotations = JSON.parse(data);
                    }
                }
            }
        }

        return Object.keys(highlightsData).length > 0 ? highlightsData : undefined;
    }

    /**
     * @description Gathers all user progress and performance data for a chapter from localStorage.
     * @private
     */
    private static getUserProgressData(bookName: string, chapterName: string): any {
        const progressData: any = {};
        
        // Reading progress
        const readingProgressKey = `readingProgress_${bookName}_${chapterName}`;
        const readingProgress = localStorage.getItem(readingProgressKey);
        if (readingProgress) {
            progressData.readingProgress = JSON.parse(readingProgress);
        }

        // Time spent
        const timeSpentKey = `timeSpent_${bookName}_${chapterName}`;
        const timeSpent = localStorage.getItem(timeSpentKey);
        if (timeSpent) {
            progressData.timeSpent = parseInt(timeSpent);
        }

        // Performance metrics
        const performanceKey = `performance_${bookName}_${chapterName}`;
        const performance = localStorage.getItem(performanceKey);
        if (performance) {
            progressData.performanceMetrics = JSON.parse(performance);
        }

        // Last accessed
        const lastAccessedKey = `lastAccessed_${bookName}_${chapterName}`;
        const lastAccessed = localStorage.getItem(lastAccessedKey);
        if (lastAccessed) {
            progressData.lastAccessed = lastAccessed;
        }

        return Object.keys(progressData).length > 0 ? progressData : undefined;
    }

    /**
     * @description Gathers all UI state and preference data for a chapter from localStorage.
     * @private
     */
    private static getUIStateData(bookName: string, chapterName: string): any {
        const uiData: any = {};
        
        // Active tab
        const activeTabKey = `activeTab_${bookName}_${chapterName}`;
        const activeTab = localStorage.getItem(activeTabKey);
        if (activeTab) {
            uiData.activeTab = activeTab;
        }

        // Tab configurations
        const tabConfigKey = `tabConfig_${bookName}_${chapterName}`;
        const tabConfig = localStorage.getItem(tabConfigKey);
        if (tabConfig) {
            uiData.tabConfigurations = JSON.parse(tabConfig);
        }

        // Mobile settings
        const mobileSettingsKey = `mobileSettings_${bookName}_${chapterName}`;
        const mobileSettings = localStorage.getItem(mobileSettingsKey);
        if (mobileSettings) {
            uiData.mobileSettings = JSON.parse(mobileSettings);
        }

        return Object.keys(uiData).length > 0 ? uiData : undefined;
    }

    /**
     * @description Gathers all template data (flashcards, MCQs, etc.) for a chapter from localStorage.
     * @private
     */
    private static getTemplateData(bookName: string, chapterKey: string): any {
        const templates: any = {};

        // Standard template types
        const templateTypes = [
            'flashcards', 'mcq', 'qa', 'videos', 'anki_cards', 'notes', 'mindmap'
        ];

        for (const templateType of templateTypes) {
            const key = `${templateType}_${bookName}_${chapterKey}`;
            const data = localStorage.getItem(key);
            if (data && data.trim() && data !== 'null') {
                try {
                    templates[templateType] = JSON.parse(data);
                } catch (error) {
                    console.warn(`Failed to parse ${templateType} data:`, error);
                }
            }
        }

        // Custom tabs (scan for all custom tab keys)
        const customTabs: any = {};
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(`customtab_${bookName}_${chapterKey}_`)) {
                const tabName = key.replace(`customtab_${bookName}_${chapterKey}_`, '');
                const content = localStorage.getItem(key);
                if (content && content.trim() && content !== 'null') {
                    customTabs[tabName] = content;
                }
            }
        }

        if (Object.keys(customTabs).length > 0) {
            templates.customTabs = customTabs;
        }

        return templates;
    }

    /**
     * @description Gathers global data not specific to a single chapter, such as book-wide settings.
     * @private
     */
    private static getGlobalData(bookName: string, bookId: string): any {
        const globalData: any = {};

        // Book settings
        const bookSettingsKey = `bookSettings_${bookId}`;
        const bookSettings = localStorage.getItem(bookSettingsKey);
        if (bookSettings) {
            globalData.bookSettings = JSON.parse(bookSettings);
        }

        // User preferences
        const userPrefsKey = `userPreferences_${bookId}`;
        const userPrefs = localStorage.getItem(userPrefsKey);
        if (userPrefs) {
            globalData.userPreferences = JSON.parse(userPrefs);
        }

        // Imported books metadata
        const importedBooks = localStorage.getItem('importedBooks');
        const importedChapterSubtopics = localStorage.getItem('importedChapterSubtopics');
        if (importedBooks || importedChapterSubtopics) {
            globalData.importedBooksMetadata = {
                books: importedBooks ? JSON.parse(importedBooks) : [],
                chapterSubtopics: importedChapterSubtopics ? JSON.parse(importedChapterSubtopics) : {}
            };
        }

        return Object.keys(globalData).length > 0 ? globalData : undefined;
    }

    /**
     * @description Takes the aggregated export data and creates a structured ZIP file blob.
     * @private
     * @param {EnhancedBookExportData} exportData - The complete data for the book.
     * @returns {Promise<Blob>} A promise that resolves with the generated ZIP file blob.
     */
    private static async createEnhancedZipFile(exportData: EnhancedBookExportData): Promise<Blob> {
        const zip = new JSZip();

        console.log('📦 Creating enhanced ZIP structure...');

        // Add manifest file
        zip.file('manifest.json', JSON.stringify(exportData.manifest, null, 2));

        // Create organized folder structure
        const contentFolder = zip.folder('content');
        if (!contentFolder) {
            throw new Error('Failed to create content folder in ZIP');
        }

        // Add content for each chapter with organized subfolders
        for (const [chapterName, chapterData] of Object.entries(exportData.content)) {
            console.log(`📁 Adding chapter: ${chapterName}`);
            const chapterFolder = contentFolder.folder(chapterName);
            if (!chapterFolder) {
                console.warn(`Failed to create folder for chapter: ${chapterName}`);
                continue;
            }

            // Add subtopics
            if (chapterData.subtopics && chapterData.subtopics.length > 0) {
                chapterFolder.file('subtopics.json', JSON.stringify(chapterData.subtopics, null, 2));
            }

            // Add templates in organized subfolder
            if (chapterData.templates && Object.keys(chapterData.templates).length > 0) {
                const templatesFolder = chapterFolder.folder('templates');
                if (templatesFolder) {
                    for (const [templateName, templateData] of Object.entries(chapterData.templates)) {
                        if (templateData) {
                            templatesFolder.file(`${templateName}.json`, JSON.stringify(templateData, null, 2));
                        }
                    }
                }
            }

            // Add exam mode data
            if (chapterData.examMode) {
                const examFolder = chapterFolder.folder('examMode');
                if (examFolder) {
                    for (const [examKey, examValue] of Object.entries(chapterData.examMode)) {
                        if (examValue) {
                            examFolder.file(`${examKey}.json`, JSON.stringify(examValue, null, 2));
                        }
                    }
                }
            }

            // Add highlights data
            if (chapterData.highlights) {
                const highlightsFolder = chapterFolder.folder('highlights');
                if (highlightsFolder) {
                    for (const [highlightKey, highlightValue] of Object.entries(chapterData.highlights)) {
                        if (highlightValue) {
                            highlightsFolder.file(`${highlightKey}.json`, JSON.stringify(highlightValue, null, 2));
                        }
                    }
                }
            }

            // Add user progress data
            if (chapterData.userProgress) {
                const progressFolder = chapterFolder.folder('userProgress');
                if (progressFolder) {
                    for (const [progressKey, progressValue] of Object.entries(chapterData.userProgress)) {
                        if (progressValue !== undefined) {
                            progressFolder.file(`${progressKey}.json`, JSON.stringify(progressValue, null, 2));
                        }
                    }
                }
            }

            // Add UI state data
            if (chapterData.uiState) {
                const uiFolder = chapterFolder.folder('uiState');
                if (uiFolder) {
                    for (const [uiKey, uiValue] of Object.entries(chapterData.uiState)) {
                        if (uiValue) {
                            uiFolder.file(`${uiKey}.json`, JSON.stringify(uiValue, null, 2));
                        }
                    }
                }
            }
        }

        // Add global data
        if (exportData.globalData) {
            const globalFolder = zip.folder('metadata');
            if (globalFolder) {
                for (const [globalKey, globalValue] of Object.entries(exportData.globalData)) {
                    if (globalValue) {
                        globalFolder.file(`${globalKey}.json`, JSON.stringify(globalValue, null, 2));
                    }
                }
            }
        }

        console.log('✅ ZIP structure created successfully');

        // Generate ZIP blob
        return await zip.generateAsync({ type: 'blob' });
    }

    /**
     * @description Triggers a browser download for the generated ZIP blob.
     * @private
     * @param {Blob} zipBlob - The ZIP file blob to download.
     * @param {string} bookName - The name of the book, used for the filename.
     */
    private static downloadZipFile(zipBlob: Blob, bookName: string): void {
        const url = URL.createObjectURL(zipBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${bookName.replace(/[^a-zA-Z0-9]/g, '_')}_v2_export.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        // Show success message
        console.log(`📥 Downloaded: ${link.download}`);
    }

    /**
     * @description Gathers and returns statistics about what will be included in an export,
     * without actually creating the file.
     * @param {string} bookName - The name of the book.
     * @param {string} bookId - The ID of the book.
     * @returns {Promise<any | null>} A promise that resolves with the export statistics, or null on error.
     */
    static async getExportStats(bookName: string, bookId: string): Promise<any> {
        try {
            const exportData = await this.gatherCompleteBookData(bookName, bookId);
            
            let totalFiles = 0;
            let totalSize = 0;
            const dataTypeCounts: any = {};

            // Count files and estimate size
            for (const [chapterName, chapterData] of Object.entries(exportData.content)) {
                if (chapterData.subtopics?.length) {
                    totalFiles++;
                    dataTypeCounts.subtopics = (dataTypeCounts.subtopics || 0) + 1;
                }
                if (chapterData.templates) {
                    const templateCount = Object.keys(chapterData.templates).length;
                    totalFiles += templateCount;
                    dataTypeCounts.templates = (dataTypeCounts.templates || 0) + templateCount;
                }
                if (chapterData.examMode) {
                    const examCount = Object.keys(chapterData.examMode).length;
                    totalFiles += examCount;
                    dataTypeCounts.examMode = (dataTypeCounts.examMode || 0) + examCount;
                }
                if (chapterData.highlights) {
                    const highlightCount = Object.keys(chapterData.highlights).length;
                    totalFiles += highlightCount;
                    dataTypeCounts.highlights = (dataTypeCounts.highlights || 0) + highlightCount;
                }
                if (chapterData.userProgress) {
                    const progressCount = Object.keys(chapterData.userProgress).length;
                    totalFiles += progressCount;
                    dataTypeCounts.userProgress = (dataTypeCounts.userProgress || 0) + progressCount;
                }
                if (chapterData.uiState) {
                    const uiCount = Object.keys(chapterData.uiState).length;
                    totalFiles += uiCount;
                    dataTypeCounts.uiState = (dataTypeCounts.uiState || 0) + uiCount;
                }
            }

            if (exportData.globalData) {
                const globalCount = Object.keys(exportData.globalData).length;
                totalFiles += globalCount;
                dataTypeCounts.globalData = globalCount;
            }

            return {
                version: exportData.manifest.version,
                chapters: exportData.manifest.chapters.length,
                totalFiles,
                dataTypes: exportData.manifest.dataTypes,
                dataTypeCounts,
                estimatedSizeKB: Math.round(JSON.stringify(exportData).length / 1024)
            };
        } catch (error) {
            console.error('Failed to get export stats:', error);
            return null;
        }
    }
}
