import React, { useState, useRef, useCallback } from 'react';
import { MarketplaceBookExportService } from '../services/marketplaceExportService';
import { MarketplaceBookImportService } from '../services/marketplaceImportService';
import { ExportIcon, ImportIcon, UploadIcon, DownloadIcon, CheckIcon, AlertIcon } from './icons';

interface MarketplaceManagerProps {
    className?: string;
    initialTab?: 'export' | 'import';
}

interface ExportPreview {
    totalChapters: number;
    totalSubtopics: number;
    totalTabs: number;
    totalAssets: number;
    totalExamPapers: number;
    totalHighlights: number;
    estimatedSize: string;
    compatibility: string[];
}

interface ImportPreview {
    bookName: string;
    description: string;
    chapters: string[];
    totalTabs: number;
    totalAssets: number;
    compatibility: string;
    estimatedSize: string;
    warnings: string[];
}

interface ExportStatus {
    isExporting: boolean;
    progress: number;
    message: string;
    error?: string;
}

interface ImportStatus {
    isImporting: boolean;
    progress: number;
    message: string;
    error?: string;
}

/**
 * MARKETPLACE BOOK MANAGER
 * Complete UI for marketplace export/import operations
 */
const MarketplaceBookManager: React.FC<MarketplaceManagerProps> = ({ 
    className = '', 
    initialTab = 'export' 
}) => {
    const [activeTab, setActiveTab] = useState<'export' | 'import'>(initialTab);
    const [selectedBookId, setSelectedBookId] = useState<string>('');
    const [exportPreview, setExportPreview] = useState<ExportPreview | null>(null);
    const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
    const [exportStatus, setExportStatus] = useState<ExportStatus>({
        isExporting: false,
        progress: 0,
        message: ''
    });
    const [importStatus, setImportStatus] = useState<ImportStatus>({
        isImporting: false,
        progress: 0,
        message: ''
    });
    
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [dragActive, setDragActive] = useState(false);

    // Get available books
    const availableBooks = JSON.parse(localStorage.getItem('createdBooks') || '[]');

    /**
     * EXPORT FUNCTIONALITY
     */
    const handleBookSelection = useCallback(async (bookId: string) => {
        setSelectedBookId(bookId);
        
        if (!bookId) {
            setExportPreview(null);
            return;
        }

        try {
            const book = availableBooks.find((b: any) => b.id === bookId);
            if (!book) return;

            const preview = await MarketplaceBookExportService.getExportPreview(book.name, bookId);
            setExportPreview(preview);
        } catch (error) {
            console.error('Failed to generate export preview:', error);
            setExportPreview(null);
        }
    }, [availableBooks]);

    const handleExport = useCallback(async () => {
        if (!selectedBookId) return;

        const book = availableBooks.find((b: any) => b.id === selectedBookId);
        if (!book) return;

        setExportStatus({
            isExporting: true,
            progress: 0,
            message: 'Preparing export...'
        });

        try {
            // Simulate progress updates
            const progressUpdates = [
                { progress: 20, message: 'Collecting book data...' },
                { progress: 40, message: 'Processing assets...' },
                { progress: 60, message: 'Generating marketplace package...' },
                { progress: 80, message: 'Creating ZIP file...' },
                { progress: 100, message: 'Export completed!' }
            ];

            for (const update of progressUpdates) {
                setExportStatus(prev => ({ ...prev, ...update }));
                await new Promise(resolve => setTimeout(resolve, 500));
            }

            // Perform the actual export
            await MarketplaceBookExportService.exportBookModule(book.name, book.id);

            setExportStatus({
                isExporting: false,
                progress: 100,
                message: 'Export completed successfully! Download started.'
            });

        } catch (error) {
            setExportStatus({
                isExporting: false,
                progress: 0,
                message: '',
                error: error instanceof Error ? error.message : 'Export failed'
            });
        }
    }, [selectedBookId, availableBooks]);

    /**
     * IMPORT FUNCTIONALITY
     */
    const handleFileSelect = useCallback(async (file: File) => {
        if (!file || !file.name.endsWith('.zip')) {
            alert('Please select a valid ZIP file');
            return;
        }

        try {
            const preview = await MarketplaceBookImportService.getImportPreview(file);
            setImportPreview(preview);
        } catch (error) {
            console.error('Failed to preview import:', error);
            alert(`Failed to preview import: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }, []);

    const handleImport = useCallback(async (file: File) => {
        setImportStatus({
            isImporting: true,
            progress: 0,
            message: 'Starting import...'
        });

        try {
            // Simulate progress updates
            const progressUpdates = [
                { progress: 20, message: 'Extracting ZIP file...' },
                { progress: 40, message: 'Validating compatibility...' },
                { progress: 60, message: 'Importing book data...' },
                { progress: 80, message: 'Restoring assets...' },
                { progress: 100, message: 'Import completed!' }
            ];

            for (const update of progressUpdates) {
                setImportStatus(prev => ({ ...prev, ...update }));
                await new Promise(resolve => setTimeout(resolve, 500));
            }

            // Perform the actual import
            const result = await MarketplaceBookImportService.importBookModule(file);

            setImportStatus({
                isImporting: false,
                progress: 100,
                message: `Import completed! ${result.message}`
            });

            // Clear import preview
            setImportPreview(null);

            // Refresh the page or update UI to show the new book
            setTimeout(() => {
                window.location.reload();
            }, 2000);

        } catch (error) {
            setImportStatus({
                isImporting: false,
                progress: 0,
                message: '',
                error: error instanceof Error ? error.message : 'Import failed'
            });
        }
    }, []);

    // File input handlers
    const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            handleFileSelect(file);
        }
    };

    // Drag and drop handlers
    const handleDrag = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileSelect(e.dataTransfer.files[0]);
        }
    }, [handleFileSelect]);

    return (
        <div className={`marketplace-manager theme-surface rounded-lg p-6 ${className}`}>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold theme-text flex items-center gap-2">
                    <ExportIcon className="w-6 h-6" />
                    Marketplace Book Manager
                </h2>
                <div className="text-sm theme-text-secondary">
                    Export books to marketplace or import from ZIP files
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex border-b theme-border mb-6">
                <button
                    onClick={() => setActiveTab('export')}
                    className={`px-4 py-2 font-medium border-b-2 transition-colors ${
                        activeTab === 'export'
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent theme-text-secondary hover:theme-text'
                    }`}
                >
                    <ExportIcon className="w-4 h-4 inline mr-2" />
                    Export Books
                </button>
                <button
                    onClick={() => setActiveTab('import')}
                    className={`px-4 py-2 font-medium border-b-2 transition-colors ${
                        activeTab === 'import'
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent theme-text-secondary hover:theme-text'
                    }`}
                >
                    <ImportIcon className="w-4 h-4 inline mr-2" />
                    Import Books
                </button>
            </div>

            {/* Export Tab */}
            {activeTab === 'export' && (
                <div className="space-y-6">
                    {/* Book Selection */}
                    <div>
                        <label className="block text-sm font-medium theme-text mb-2">
                            Select Book to Export
                        </label>
                        <select
                            value={selectedBookId}
                            onChange={(e) => handleBookSelection(e.target.value)}
                            className="w-full p-3 theme-surface theme-border border rounded-lg theme-text"
                        >
                            <option value="">-- Select a book --</option>
                            {availableBooks.map((book: any) => (
                                <option key={book.id} value={book.id}>
                                    {book.name} ({book.chapters?.length || 0} chapters)
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Export Preview */}
                    {exportPreview && (
                        <div className="theme-surface-elevated rounded-lg p-4">
                            <h3 className="text-lg font-semibold theme-text mb-3">Export Preview</h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                                <div>
                                    <div className="theme-text-secondary">Chapters</div>
                                    <div className="font-semibold theme-text">{exportPreview.totalChapters}</div>
                                </div>
                                <div>
                                    <div className="theme-text-secondary">Subtopics</div>
                                    <div className="font-semibold theme-text">{exportPreview.totalSubtopics}</div>
                                </div>
                                <div>
                                    <div className="theme-text-secondary">Tabs</div>
                                    <div className="font-semibold theme-text">{exportPreview.totalTabs}</div>
                                </div>
                                <div>
                                    <div className="theme-text-secondary">Assets</div>
                                    <div className="font-semibold theme-text">{exportPreview.totalAssets}</div>
                                </div>
                                <div>
                                    <div className="theme-text-secondary">Exam Papers</div>
                                    <div className="font-semibold theme-text">{exportPreview.totalExamPapers}</div>
                                </div>
                                <div>
                                    <div className="theme-text-secondary">Size</div>
                                    <div className="font-semibold theme-text">{exportPreview.estimatedSize}</div>
                                </div>
                            </div>
                            
                            {exportPreview.compatibility.length > 0 && (
                                <div className="mt-4">
                                    <div className="theme-text-secondary text-sm mb-2">Features Included:</div>
                                    <div className="flex flex-wrap gap-2">
                                        {exportPreview.compatibility.map((feature) => (
                                            <span
                                                key={feature}
                                                className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs"
                                            >
                                                {feature}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Export Button */}
                    <div>
                        <button
                            onClick={handleExport}
                            disabled={!selectedBookId || exportStatus.isExporting}
                            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                            {exportStatus.isExporting ? (
                                <>
                                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                                    Exporting...
                                </>
                            ) : (
                                <>
                                    <DownloadIcon className="w-4 h-4" />
                                    Export to Marketplace
                                </>
                            )}
                        </button>
                    </div>

                    {/* Export Progress */}
                    {exportStatus.isExporting && (
                        <div className="theme-surface-elevated rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm theme-text">{exportStatus.message}</span>
                                <span className="text-sm theme-text-secondary">{exportStatus.progress}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${exportStatus.progress}%` }}
                                ></div>
                            </div>
                        </div>
                    )}

                    {/* Export Success */}
                    {exportStatus.progress === 100 && !exportStatus.isExporting && !exportStatus.error && (
                        <div className="flex items-center gap-2 p-4 bg-green-50 text-green-800 rounded-lg">
                            <CheckIcon className="w-5 h-5" />
                            <span>{exportStatus.message}</span>
                        </div>
                    )}

                    {/* Export Error */}
                    {exportStatus.error && (
                        <div className="flex items-center gap-2 p-4 bg-red-50 text-red-800 rounded-lg">
                            <AlertIcon className="w-5 h-5" />
                            <span>{exportStatus.error}</span>
                        </div>
                    )}
                </div>
            )}

            {/* Import Tab */}
            {activeTab === 'import' && (
                <div className="space-y-6">
                    {/* File Upload Area */}
                    <div
                        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                            dragActive
                                ? 'border-blue-500 bg-blue-50'
                                : 'theme-border hover:border-blue-300'
                        }`}
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={handleDrop}
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".zip"
                            onChange={handleFileInputChange}
                            className="hidden"
                        />
                        
                        <div className="space-y-4">
                            <UploadIcon className="w-12 h-12 mx-auto theme-text-secondary" />
                            <div>
                                <p className="text-lg font-medium theme-text">
                                    Drop marketplace book file here
                                </p>
                                <p className="theme-text-secondary">
                                    Or click to browse for ZIP files
                                </p>
                            </div>
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
                            >
                                Browse Files
                            </button>
                        </div>
                    </div>

                    {/* Import Preview */}
                    {importPreview && (
                        <div className="theme-surface-elevated rounded-lg p-4">
                            <h3 className="text-lg font-semibold theme-text mb-3">Import Preview</h3>
                            
                            <div className="space-y-3">
                                <div>
                                    <div className="theme-text-secondary text-sm">Book Name</div>
                                    <div className="font-semibold theme-text">{importPreview.bookName}</div>
                                </div>
                                
                                <div>
                                    <div className="theme-text-secondary text-sm">Description</div>
                                    <div className="theme-text">{importPreview.description}</div>
                                </div>
                                
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                    <div>
                                        <div className="theme-text-secondary">Chapters</div>
                                        <div className="font-semibold theme-text">{importPreview.chapters.length}</div>
                                    </div>
                                    <div>
                                        <div className="theme-text-secondary">Tabs</div>
                                        <div className="font-semibold theme-text">{importPreview.totalTabs}</div>
                                    </div>
                                    <div>
                                        <div className="theme-text-secondary">Assets</div>
                                        <div className="font-semibold theme-text">{importPreview.totalAssets}</div>
                                    </div>
                                    <div>
                                        <div className="theme-text-secondary">Size</div>
                                        <div className="font-semibold theme-text">{importPreview.estimatedSize}</div>
                                    </div>
                                </div>
                                
                                {importPreview.chapters.length > 0 && (
                                    <div>
                                        <div className="theme-text-secondary text-sm mb-2">Chapters:</div>
                                        <div className="flex flex-wrap gap-2">
                                            {importPreview.chapters.map((chapter) => (
                                                <span
                                                    key={chapter}
                                                    className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs"
                                                >
                                                    {chapter}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                
                                {importPreview.warnings.length > 0 && (
                                    <div>
                                        <div className="theme-text-secondary text-sm mb-2">Warnings:</div>
                                        <div className="space-y-1">
                                            {importPreview.warnings.map((warning, index) => (
                                                <div
                                                    key={index}
                                                    className="flex items-center gap-2 text-orange-600 text-sm"
                                                >
                                                    <AlertIcon className="w-4 h-4" />
                                                    {warning}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Import Button */}
                    {importPreview && (
                        <div>
                            <button
                                onClick={() => {
                                    if (fileInputRef.current?.files?.[0]) {
                                        handleImport(fileInputRef.current.files[0]);
                                    }
                                }}
                                disabled={importStatus.isImporting}
                                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                            >
                                {importStatus.isImporting ? (
                                    <>
                                        <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                                        Importing...
                                    </>
                                ) : (
                                    <>
                                        <ImportIcon className="w-4 h-4" />
                                        Import Book
                                    </>
                                )}
                            </button>
                        </div>
                    )}

                    {/* Import Progress */}
                    {importStatus.isImporting && (
                        <div className="theme-surface-elevated rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm theme-text">{importStatus.message}</span>
                                <span className="text-sm theme-text-secondary">{importStatus.progress}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                    className="bg-green-600 h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${importStatus.progress}%` }}
                                ></div>
                            </div>
                        </div>
                    )}

                    {/* Import Success */}
                    {importStatus.progress === 100 && !importStatus.isImporting && !importStatus.error && (
                        <div className="flex items-center gap-2 p-4 bg-green-50 text-green-800 rounded-lg">
                            <CheckIcon className="w-5 h-5" />
                            <span>{importStatus.message}</span>
                        </div>
                    )}

                    {/* Import Error */}
                    {importStatus.error && (
                        <div className="flex items-center gap-2 p-4 bg-red-50 text-red-800 rounded-lg">
                            <AlertIcon className="w-5 h-5" />
                            <span>{importStatus.error}</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default MarketplaceBookManager;
