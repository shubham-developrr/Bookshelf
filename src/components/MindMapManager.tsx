import React, { useState, useRef } from 'react';
import { PlusIcon, TrashIcon, FileIcon, ImageIcon } from './icons';
import { useAssetManager } from '../hooks/useAssetManager';
import { useBackgroundUpload } from '../hooks/useBackgroundUpload';
import { BookBasedAssetService } from '../services/BookBasedAssetService';
import { BookIdResolver } from '../utils/BookIdResolver';
import { BookTabManager, BookTabContext } from '../utils/BookTabManager';

interface MindMapItem {
    id: string;
    label: string;
    type: 'image' | 'pdf';
    fileUrl: string; // Now stores cloud URL instead of blob URL
    fileName: string;
    fileSize?: string;
    timestamp: Date;
    assetId?: string; // Cloud asset ID for management
    isUploading?: boolean; // Upload state
}

interface MindMapManagerProps {
    currentBook: string;
    currentChapter: string;
    tabId?: string; // Unique tab identifier for isolation
    className?: string;
}

const MindMapManager: React.FC<MindMapManagerProps> = ({
    currentBook,
    currentChapter,
    tabId,
    className = ''
}) => {
    const [mindMaps, setMindMaps] = useState<MindMapItem[]>([]);
    const [mode, setMode] = useState<'view' | 'add'>('view');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [fullScreenItem, setFullScreenItem] = useState<MindMapItem | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Resolve Book ID from book name for book-based authentication
    const bookContext = React.useMemo(() => 
        BookIdResolver.resolveBookId(currentBook), 
        [currentBook]
    );

    // Background upload management with book-based authentication
    const backgroundUpload = useBackgroundUpload({
        bookId: bookContext.bookId, // Use resolved Book ID
        bookName: currentBook, // Pass book name for book-based authentication
        chapterId: currentChapter,
        tabId,
        componentType: 'mindmap',
        onUploadComplete: (upload) => {
            console.log(`🎉 Background upload completed: ${upload.fileName}`);
            console.log(`📖 Book-based asset created for Book ID: ${bookContext.bookId}`);
            
            // Update mind map item with the cloud URL
            if (upload.result?.success && upload.result.url) {
                const updatedMindMaps = mindMaps.map(item => {
                    if (item.id.startsWith(`uploading_${upload.metadata.label}`) || 
                        (item.label === upload.metadata.label && item.isUploading)) {
                        return {
                            ...item,
                            id: `mindmap_${Date.now()}`,
                            fileUrl: upload.result.url,
                            assetId: upload.result.assetId,
                            isUploading: false
                        };
                    }
                    return item;
                });
                setMindMaps(updatedMindMaps);
                saveMindMaps(updatedMindMaps);
            }
        },
        onUploadError: (upload) => {
            console.error(`💥 Background upload failed: ${upload.fileName} - ${upload.error}`);
            
            // Remove failed upload item from mind maps
            const updatedMindMaps = mindMaps.filter(item => 
                !item.id.startsWith(`uploading_${upload.metadata.label}`)
            );
            setMindMaps(updatedMindMaps);
            saveMindMaps(updatedMindMaps);
        }
    });

    // Asset management hook for deletion (updated for book-based authentication)
    const assetManager = useAssetManager({
        bookId: bookContext.bookId, // Use resolved Book ID
        chapterId: currentChapter,
        tabId,
        onUploadComplete: () => {}, // Not used anymore
        onUploadError: () => {} // Not used anymore
    });

    // Book tab context for proper data isolation
    const tabContext: BookTabContext = React.useMemo(() => {
        return BookTabManager.createTemplateTabContext(
            currentBook,
            currentChapter,
            'mindmaps'
        );
    }, [currentBook, currentChapter]);

    // Mobile detection
    const isMobile = () => window.innerWidth <= 768;

    // Load mind maps using book-linked tab system
    React.useEffect(() => {
        try {
            const data = BookTabManager.loadTabData('mindmaps', tabContext);
            if (data && Array.isArray(data)) {
                const mindMapData = data.map((m: any) => ({
                    ...m,
                    timestamp: new Date(m.timestamp)
                }));
                setMindMaps(mindMapData);
            } else {
                setMindMaps([]);
            }
        } catch (error) {
            console.error('Failed to load mind maps:', error);
            setMindMaps([]);
        }
    }, [tabContext]);

    // Save mind maps using book-linked tab system
    const saveMindMaps = (mapList: MindMapItem[]) => {
        try {
            BookTabManager.saveTabData('mindmaps', tabContext, mapList);
            setMindMaps(mapList);
        } catch (error) {
            console.error('Failed to save mind maps:', error);
        }
    };

    // Handle file upload with background processing
    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        Array.from(files).forEach((file) => {
            const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
            
            if (!validTypes.includes(file.type)) {
                alert('Please select a valid file type (JPEG, PNG, GIF, WebP, or PDF)');
                return;
            }

            const maxSize = 50 * 1024 * 1024; // 50MB
            if (file.size > maxSize) {
                alert('File size must be under 50MB');
                return;
            }

            const label = file.name.split('.')[0]; // Use filename as label
            const uploadId = `${label}_${Date.now()}`;
            
            // Create temporary mind map item with loading state
            const tempMindMap: MindMapItem = {
                id: `uploading_${uploadId}`,
                label,
                type: file.type.startsWith('image/') ? 'image' : 'pdf',
                fileUrl: '',
                fileName: file.name,
                fileSize: `${(file.size / 1024).toFixed(1)} KB`,
                timestamp: new Date(),
                isUploading: true
            };

            // Add to mind maps immediately for user feedback
            const updatedMindMaps = [...mindMaps, tempMindMap];
            setMindMaps(updatedMindMaps);
            saveMindMaps(updatedMindMaps);

            // Start background upload
            backgroundUpload.startBackgroundUpload(file, label);
        });

        // Reset file input
        event.target.value = '';
    };

    // Delete mind map
    const deleteMindMap = async (id: string) => {
        const mapToDelete = mindMaps.find(m => m.id === id);
        if (mapToDelete) {
            // If it has an asset ID, delete from cloud storage
            if (mapToDelete.assetId) {
                const success = await assetManager.deleteAsset(mapToDelete.assetId);
                if (!success) {
                    console.warn('Failed to delete asset from cloud storage, but removing from local list');
                }
            }
            
            // Remove from local state
            const updatedMindMaps = mindMaps.filter(m => m.id !== id);
            saveMindMaps(updatedMindMaps);
        }
    };

    // Handle full screen view
    const openFullScreen = (item: MindMapItem) => {
        setFullScreenItem(item);
        document.body.style.overflow = 'hidden';
    };

    const closeFullScreen = () => {
        setFullScreenItem(null);
        document.body.style.overflow = 'unset';
    };

    // Full screen view
    if (fullScreenItem) {
        return (
            <div className="fixed inset-0 z-50 theme-bg flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-black/70" onClick={closeFullScreen}></div>
                <div className="relative max-w-[95vw] max-h-[95vh] bg-white dark:bg-gray-800 rounded-lg overflow-hidden">
                    <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b p-4 flex justify-between items-center">
                        <h3 className="text-lg font-semibold theme-text">{fullScreenItem.label}</h3>
                        <button
                            onClick={closeFullScreen}
                            className="text-2xl theme-text-secondary hover:theme-text p-1"
                            aria-label="Close"
                        >
                            ×
                        </button>
                    </div>
                    <div className="p-4">
                        {fullScreenItem.type === 'image' ? (
                            <img
                                src={fullScreenItem.fileUrl}
                                alt={fullScreenItem.label}
                                className="max-w-full max-h-[80vh] object-contain mx-auto"
                            />
                        ) : (
                            <iframe
                                src={fullScreenItem.fileUrl}
                                className="w-full h-[80vh]"
                                title={fullScreenItem.label}
                            />
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // Add mind map mode
    if (mode === 'add') {
        return (
            <div className={`theme-surface rounded-lg p-6 ${className}`}>
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-semibold theme-text flex items-center gap-2">
                        <PlusIcon />
                        Add Mind Map
                    </h2>
                    <button
                        onClick={() => {
                            // Save current state and allow background uploads to continue
                            setMode('view');
                            
                            // Optional: Show confirmation that uploads continue in background
                            if (backgroundUpload.hasActiveUploads) {
                                console.log(`✅ ${backgroundUpload.activeUploads} uploads continuing in background`);
                            }
                        }}
                        className="btn-secondary text-sm flex items-center gap-2"
                    >
                        <span>💾</span>
                        Save & Continue
                        {backgroundUpload.hasActiveUploads && (
                            <span className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded-full">
                                {backgroundUpload.activeUploads}
                            </span>
                        )}
                    </button>
                </div>

                <div className="space-y-4 max-w-2xl">
                    {/* Upload Progress Indicator */}
                    {backgroundUpload.hasActiveUploads && (
                        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="animate-spin text-blue-500">⏳</div>
                                <div className="font-medium text-blue-800 dark:text-blue-200">
                                    {backgroundUpload.activeUploads} file{backgroundUpload.activeUploads > 1 ? 's' : ''} uploading...
                                </div>
                            </div>
                            <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2">
                                <div 
                                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${Math.round(backgroundUpload.totalProgress)}%` }}
                                ></div>
                            </div>
                            <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                                {Math.round(backgroundUpload.totalProgress)}% complete • Uploads continue in background
                            </div>
                        </div>
                    )}

                    {/* File Upload Section */}
                    <div>
                        <label className="block text-sm font-medium theme-text mb-2">
                            Upload File(s):
                        </label>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*,.pdf"
                            multiple
                            onChange={handleFileUpload}
                            className="w-full p-3 theme-surface border rounded-lg theme-text file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                        />
                        <p className="text-xs theme-text-secondary mt-1">
                            Supported formats: Images (PNG, JPG, GIF, etc.) and PDF files. Multiple files supported. Files will upload in background.
                        </p>
                    </div>

                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                        <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">
                            📋 Mind Map Features
                        </h4>
                        <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                            <li>• Full-screen viewing with zoom capabilities</li>
                            <li>• Support for images and PDF documents</li>
                            <li>• Easy organization with custom labels</li>
                            <li>• Multiple file uploads with background processing</li>
                            <li>• Files upload even if you navigate away</li>
                            <li>• Click any mind map to view in full screen</li>
                            <li>• Press ESC or click outside to exit full screen</li>
                        </ul>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={`theme-surface rounded-lg p-2 sm:p-6 ${className}`}>
            {/* Background Upload Status */}
            {backgroundUpload.hasActiveUploads && (
                <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="animate-spin text-blue-500">⏳</div>
                            <div>
                                <div className="font-medium text-blue-800 dark:text-blue-200 text-sm">
                                    {backgroundUpload.activeUploads} file{backgroundUpload.activeUploads > 1 ? 's' : ''} uploading in background
                                </div>
                                <div className="text-xs text-blue-600 dark:text-blue-300">
                                    Progress: {Math.round(backgroundUpload.totalProgress)}% • Uploads continue even if you navigate away
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={() => backgroundUpload.clearCompleted()}
                            className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                        >
                            Clear Completed
                        </button>
                    </div>
                </div>
            )}

            <div className={`flex ${isMobile() ? 'flex-col gap-3' : 'items-center justify-between'} mb-4 sm:mb-6`}>
                <div className={`flex items-center ${isMobile() ? 'justify-between' : 'gap-4'}`}>
                    <h2 className="text-lg font-semibold theme-text flex items-center gap-2">
                        <ImageIcon />
                        Mind Maps
                    </h2>
                    
                    {/* View mode controls */}
                    <div className={`flex ${isMobile() ? 'gap-1' : 'gap-2'}`}>
                        <div className={`flex theme-surface2 rounded-lg ${isMobile() ? 'p-0.5' : 'p-1'}`}>
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`${isMobile() ? 'px-2 py-1 text-xs' : 'px-3 py-1 text-sm'} rounded ${
                                    viewMode === 'grid' 
                                        ? 'theme-surface theme-text shadow-sm' 
                                        : 'theme-text-secondary hover:theme-text'
                                }`}
                            >
                                🔲 {!isMobile() && 'Grid'}
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={`${isMobile() ? 'px-2 py-1 text-xs' : 'px-3 py-1 text-sm'} rounded ${
                                    viewMode === 'list' 
                                        ? 'theme-surface theme-text shadow-sm' 
                                        : 'theme-text-secondary hover:theme-text'
                                }`}
                            >
                                📋 {!isMobile() && 'List'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Add button */}
                <button
                    onClick={() => setMode('add')}
                    className={`btn-primary ${isMobile() ? 'w-full' : ''} flex items-center gap-2 text-sm`}
                >
                    <PlusIcon />
                    Add Mind Map
                </button>
            </div>

            {/* Mind Maps Display */}
            {mindMaps.length === 0 ? (
                <div className="text-center py-12">
                    <div className="text-6xl mb-4">🧠</div>
                    <h3 className="text-lg font-medium theme-text mb-2">No Mind Maps Yet</h3>
                    <p className="theme-text-secondary mb-4">Upload images or PDF files to create your first mind map</p>
                    <button
                        onClick={() => setMode('add')}
                        className="btn-primary flex items-center gap-2 mx-auto"
                    >
                        <PlusIcon />
                        Add Your First Mind Map
                    </button>
                </div>
            ) : (
                <>
                    {viewMode === 'grid' ? (
                        <div className={`grid ${isMobile() ? 'grid-cols-1 gap-3' : 'grid-cols-2 lg:grid-cols-3 gap-4'}`}>
                            {mindMaps.map((item) => (
                                <div key={item.id} className="theme-surface2 rounded-lg border hover:shadow-md transition-shadow">
                                    <div 
                                        className="relative cursor-pointer"
                                        onClick={() => !item.isUploading && openFullScreen(item)}
                                    >
                                        {item.isUploading ? (
                                            <div className="aspect-video bg-gray-100 dark:bg-gray-800 rounded-t-lg flex items-center justify-center">
                                                <div className="text-center">
                                                    <div className="animate-spin text-2xl mb-2">⏳</div>
                                                    <div className="text-sm theme-text">Uploading...</div>
                                                </div>
                                            </div>
                                        ) : item.type === 'image' ? (
                                            <img
                                                src={item.fileUrl}
                                                alt={item.label}
                                                className="w-full aspect-video object-cover rounded-t-lg"
                                            />
                                        ) : (
                                            <div className="aspect-video bg-red-50 dark:bg-red-900/20 rounded-t-lg flex items-center justify-center">
                                                <FileIcon className="text-red-500 w-12 h-12" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-3">
                                        <div className="flex items-start justify-between gap-2 mb-2">
                                            <h4 className="font-medium theme-text text-sm line-clamp-2">{item.label}</h4>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    deleteMindMap(item.id);
                                                }}
                                                className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-1 rounded flex-shrink-0"
                                                title="Delete mind map"
                                            >
                                                <TrashIcon className="w-3 h-3" />
                                            </button>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs theme-text-secondary">
                                            <span>{item.fileName}</span>
                                            {item.fileSize && <span>• {item.fileSize}</span>}
                                        </div>
                                        {item.isUploading && (
                                            <div className="mt-2 text-xs text-blue-600 dark:text-blue-400">
                                                ⏳ Uploading in background...
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {mindMaps.map((item) => (
                                <div key={item.id} className="theme-surface2 rounded-lg border p-4 flex items-center gap-4 hover:shadow-sm transition-shadow">
                                    <div 
                                        className={`flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center ${
                                            item.isUploading 
                                                ? 'bg-gray-100 dark:bg-gray-800' 
                                                : item.type === 'image' 
                                                    ? 'bg-green-100 dark:bg-green-900/20' 
                                                    : 'bg-red-100 dark:bg-red-900/20'
                                        } cursor-pointer`}
                                        onClick={() => !item.isUploading && openFullScreen(item)}
                                    >
                                        {item.isUploading ? (
                                            <div className="animate-spin">⏳</div>
                                        ) : item.type === 'image' ? (
                                            <ImageIcon className="text-green-600 w-6 h-6" />
                                        ) : (
                                            <FileIcon className="text-red-600 w-6 h-6" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-medium theme-text truncate">{item.label}</h4>
                                        <div className="text-sm theme-text-secondary">
                                            {item.fileName} {item.fileSize && `• ${item.fileSize}`}
                                        </div>
                                        {item.isUploading && (
                                            <div className="text-xs text-blue-600 dark:text-blue-400">
                                                ⏳ Uploading in background...
                                            </div>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => deleteMindMap(item.id)}
                                        className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-2 rounded flex-shrink-0"
                                        title="Delete mind map"
                                    >
                                        <TrashIcon className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default MindMapManager;
