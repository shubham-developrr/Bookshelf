import JSZip from 'jszip';

interface ImportManifest {
    bookName: string;
    bookId: string;
    exportDate: string;
    version: string;
    chapters: string[];
    description?: string;
}

interface ImportChapterData {
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
}

/**
 * Import a book from ZIP file and integrate into legacy book section
 */
export class BookImportService {
    /**
     * Import a book from ZIP file
     */
    static async importBook(zipFile: File): Promise<void> {
        try {
            const zipData = await this.readZipFile(zipFile);
            const importData = await this.parseZipData(zipData);
            await this.integrateIntoLegacyBooks(importData);
            await this.restoreContentData(importData);
        } catch (error) {
            console.error('Import failed:', error);
            throw new Error(`Failed to import book: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Read ZIP file and extract data
     */
    private static async readZipFile(zipFile: File): Promise<JSZip> {
        const zip = new JSZip();
        return await zip.loadAsync(zipFile);
    }

    /**
     * Parse ZIP data into structured format
     */
    private static async parseZipData(zip: JSZip): Promise<{
        manifest: ImportManifest;
        content: { [chapterName: string]: ImportChapterData };
    }> {
        // Read manifest
        const manifestFile = zip.file('manifest.json');
        if (!manifestFile) {
            throw new Error('Invalid book export: manifest.json not found');
        }

        const manifestContent = await manifestFile.async('text');
        const manifest: ImportManifest = JSON.parse(manifestContent);

        // Read content data
        const content: { [chapterName: string]: ImportChapterData } = {};
        
        for (const chapterName of manifest.chapters) {
            const chapterData: ImportChapterData = { templates: {} };
            
            // Read subtopics
            const subtopicsFile = zip.file(`content/${chapterName}/subtopics.json`);
            if (subtopicsFile) {
                const subtopicsContent = await subtopicsFile.async('text');
                chapterData.subtopics = JSON.parse(subtopicsContent);
            }

            // Read template data
            const templateFiles = [
                'flashcards.json',
                'mcq.json', 
                'qa.json',
                'videos.json',
                'anki_cards.json',
                'notes.json',
                'mindmap.json',
                'customTabs.json'
            ];

            for (const templateFile of templateFiles) {
                const file = zip.file(`content/${chapterName}/${templateFile}`);
                if (file) {
                    const templateContent = await file.async('text');
                    const templateName = templateFile.replace('.json', '');
                    chapterData.templates[templateName as keyof typeof chapterData.templates] = JSON.parse(templateContent);
                }
            }

            content[chapterName] = chapterData;
        }

        return { manifest, content };
    }

    /**
     * Integrate book into legacy books system (constants.tsx)
     */
    private static async integrateIntoLegacyBooks(importData: {
        manifest: ImportManifest;
        content: { [chapterName: string]: ImportChapterData };
    }): Promise<void> {
        // Create new book entry for legacy system
        const legacyBookData = {
            name: importData.manifest.bookName,
            id: importData.manifest.bookId,
            chapters: importData.manifest.chapters,
            description: importData.manifest.description,
            importDate: new Date().toISOString(),
            isImported: true
        };

        // Add to imported books in localStorage
        const importedBooks = JSON.parse(localStorage.getItem('importedBooks') || '[]');
        importedBooks.push(legacyBookData);
        localStorage.setItem('importedBooks', JSON.stringify(importedBooks));

        // Create chapter subtopics mapping for legacy system
        const chapterSubtopics: { [chapterName: string]: string[] } = {};
        
        for (const [chapterName, chapterData] of Object.entries(importData.content)) {
            if (chapterData.subtopics && chapterData.subtopics.length > 0) {
                chapterSubtopics[chapterName] = chapterData.subtopics.map((subtopic: any) => subtopic.title || subtopic.name || 'Untitled Subtopic');
            } else {
                // Create default subtopic structure for chapters without custom subtopics
                chapterSubtopics[chapterName] = ['Introduction', 'Key Concepts', 'Examples', 'Summary'];
            }
        }

        // Store chapter subtopics mapping
        const existingSubtopics = JSON.parse(localStorage.getItem('importedChapterSubtopics') || '{}');
        existingSubtopics[importData.manifest.bookName] = chapterSubtopics;
        localStorage.setItem('importedChapterSubtopics', JSON.stringify(existingSubtopics));
    }

    /**
     * Restore all content data to localStorage with proper keys
     */
    private static async restoreContentData(importData: {
        manifest: ImportManifest;
        content: { [chapterName: string]: ImportChapterData };
    }): Promise<void> {
        const bookName = importData.manifest.bookName;

        for (const [chapterName, chapterData] of Object.entries(importData.content)) {
            const chapterKey = chapterName.replace(/\s+/g, '_');

            // Restore subtopics data
            if (chapterData.subtopics && chapterData.subtopics.length > 0) {
                const subtopicsKey = `subtopics_${importData.manifest.bookId}_${chapterKey}`;
                localStorage.setItem(subtopicsKey, JSON.stringify(chapterData.subtopics));
            }

            // Restore template data
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
                const templateData = chapterData.templates[name as keyof typeof chapterData.templates];
                if (templateData) {
                    localStorage.setItem(key, JSON.stringify(templateData));
                }
            });

            // Restore custom tabs
            if (chapterData.templates.customTabs) {
                for (const [tabName, tabContent] of Object.entries(chapterData.templates.customTabs)) {
                    const customTabKey = `customtab_${bookName}_${chapterKey}_${tabName}`;
                    localStorage.setItem(customTabKey, tabContent);
                }
            }
        }
    }

    /**
     * Validate ZIP file before import
     */
    static async validateImportFile(zipFile: File): Promise<{
        isValid: boolean;
        bookName?: string;
        chapterCount?: number;
        error?: string;
    }> {
        try {
            const zip = await this.readZipFile(zipFile);
            const manifestFile = zip.file('manifest.json');
            
            if (!manifestFile) {
                return { isValid: false, error: 'Invalid book export: manifest.json not found' };
            }

            const manifestContent = await manifestFile.async('text');
            const manifest: ImportManifest = JSON.parse(manifestContent);

            return {
                isValid: true,
                bookName: manifest.bookName,
                chapterCount: manifest.chapters.length
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
                if (key && (key.includes(`_${bookName}_`) || key.includes(`_${bookId}_`))) {
                    keysToRemove.push(key);
                }
            }

            keysToRemove.forEach(key => localStorage.removeItem(key));
        } catch (error) {
            console.error('Failed to delete imported book:', error);
            throw new Error(`Failed to delete imported book: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}
