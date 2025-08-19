import JSZip from 'jszip';

interface BookExportData {
    manifest: {
        bookName: string;
        bookId: string;
        exportDate: string;
        version: string;
        chapters: string[];
        description?: string;
    };
    content: {
        [chapterName: string]: {
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
        };
    };
}

/**
 * Export a complete book with all its content into a ZIP file
 */
export class BookExportService {
    /**
     * Export a book to ZIP file
     */
    static async exportBook(bookName: string, bookId: string): Promise<void> {
        try {
            const exportData = await this.gatherBookData(bookName, bookId);
            const zipBlob = await this.createZipFile(exportData);
            this.downloadZipFile(zipBlob, bookName);
        } catch (error) {
            console.error('Export failed:', error);
            throw new Error(`Failed to export book: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Gather all data for a book from localStorage
     */
    private static async gatherBookData(bookName: string, bookId: string): Promise<BookExportData> {
        // Get book chapters
        const savedBooks = JSON.parse(localStorage.getItem('createdBooks') || '[]');
        const book = savedBooks.find((b: any) => b.id === bookId || b.name === bookName);
        
        if (!book) {
            throw new Error('Book not found');
        }

        // Fix: Get chapters from localStorage using the correct key pattern
        const chapters = JSON.parse(localStorage.getItem(`chapters_${bookId}`) || '[]');
        console.log('Export Service - Found chapters:', chapters);
        const content: BookExportData['content'] = {};

        // Process each chapter - chapters are objects with {id, number, name, subtopics}
        for (const chapter of chapters) {
            const chapterName = chapter.name || chapter; // Handle both object and string formats
            const chapterKey = chapterName.replace(/\s+/g, '_');
            const chapterData = {
                subtopics: this.getChapterSubtopics(bookId, chapterName),
                templates: this.getTemplateData(bookName, chapterKey)
            };
            
            content[chapterName] = chapterData;
        }

        const exportData: BookExportData = {
            manifest: {
                bookName: book.name,
                bookId: book.id,
                exportDate: new Date().toISOString(),
                version: '1.0',
                chapters: chapters.map((ch: any) => ch.name || ch), // Extract chapter names for manifest
                description: book.description || `Exported study book: ${book.name}`
            },
            content
        };

        return exportData;
    }

    /**
     * Get subtopics data for a chapter
     */
    private static getChapterSubtopics(bookId: string, chapterName: string): any[] {
        const subtopicsKey = `subtopics_${bookId}_${chapterName.replace(/\s+/g, '_')}`;
        const saved = localStorage.getItem(subtopicsKey);
        return saved ? JSON.parse(saved) : [];
    }

    /**
     * Get all template data for a chapter
     */
    private static getTemplateData(bookName: string, chapterKey: string): any {
        const templates: any = {};

        // Define template storage patterns
        const templateMappings = [
            { key: `flashcards_${bookName}_${chapterKey}`, name: 'flashcards' },
            { key: `mcq_${bookName}_${chapterKey}`, name: 'mcq' },
            { key: `qa_${bookName}_${chapterKey}`, name: 'qa' },
            { key: `videos_${bookName}_${chapterKey}`, name: 'videos' },
            { key: `anki_cards_${bookName}_${chapterKey}`, name: 'anki_cards' },
            { key: `notes_${bookName}_${chapterKey}`, name: 'notes' },
            { key: `mindmap_${bookName}_${chapterKey}`, name: 'mindmap' }
        ];

        // Collect template data
        templateMappings.forEach(({ key, name }) => {
            const data = localStorage.getItem(key);
            if (data && data !== 'null' && data !== '[]') {
                try {
                    const parsed = JSON.parse(data);
                    if ((Array.isArray(parsed) && parsed.length > 0) || 
                        (typeof parsed === 'object' && Object.keys(parsed).length > 0)) {
                        templates[name] = parsed;
                    }
                } catch (err) {
                    console.warn(`Failed to parse ${name} data:`, err);
                }
            }
        });

        // Collect custom tabs
        const customTabs: { [tabName: string]: string } = {};
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
     * Create ZIP file from export data
     */
    private static async createZipFile(exportData: BookExportData): Promise<Blob> {
        const zip = new JSZip();

        // Add manifest file
        zip.file('manifest.json', JSON.stringify(exportData.manifest, null, 2));

        // Add content for each chapter
        const contentFolder = zip.folder('content');
        if (!contentFolder) {
            throw new Error('Failed to create content folder in ZIP');
        }

        for (const [chapterName, chapterData] of Object.entries(exportData.content)) {
            const chapterFolder = contentFolder.folder(chapterName);
            if (!chapterFolder) {
                console.warn(`Failed to create folder for chapter: ${chapterName}`);
                continue;
            }

            // Add subtopics
            if (chapterData.subtopics && chapterData.subtopics.length > 0) {
                chapterFolder.file('subtopics.json', JSON.stringify(chapterData.subtopics, null, 2));
            }

            // Add template data
            for (const [templateName, templateData] of Object.entries(chapterData.templates)) {
                if (templateData) {
                    chapterFolder.file(`${templateName}.json`, JSON.stringify(templateData, null, 2));
                }
            }
        }

        // Generate ZIP blob
        return await zip.generateAsync({ type: 'blob' });
    }

    /**
     * Download ZIP file
     */
    private static downloadZipFile(blob: Blob, bookName: string): void {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${bookName.replace(/[^a-zA-Z0-9]/g, '_')}_export.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    /**
     * Get export summary for a book (for UI display)
     */
    static async getExportSummary(bookName: string, bookId: string): Promise<{
        chapterCount: number;
        templateCount: number;
        subtopicCount: number;
    }> {
        try {
            const exportData = await this.gatherBookData(bookName, bookId);
            let templateCount = 0;
            let subtopicCount = 0;

            for (const chapterData of Object.values(exportData.content)) {
                subtopicCount += chapterData.subtopics?.length || 0;
                templateCount += Object.keys(chapterData.templates).length;
            }

            return {
                chapterCount: exportData.manifest.chapters.length,
                templateCount,
                subtopicCount
            };
        } catch (error) {
            console.error('Failed to get export summary:', error);
            return { chapterCount: 0, templateCount: 0, subtopicCount: 0 };
        }
    }
}
