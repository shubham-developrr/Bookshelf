import React, { useState, useRef } from 'react';
import { PlusIcon, TrashIcon, FileIcon, ImageIcon } from './icons';

interface MindMapItem {
    id: string;
    label: string;
    type: 'image' | 'pdf';
    fileUrl: string;
    fileName: string;
    fileSize?: string;
    timestamp: Date;
}

interface MindMapManagerProps {
    currentBook: string;
    currentChapter: string;
    className?: string;
}

const MindMapManager: React.FC<MindMapManagerProps> = ({
    currentBook,
    currentChapter,
    className = ''
}) => {
    const [mindMaps, setMindMaps] = useState<MindMapItem[]>([]);
    const [mode, setMode] = useState<'view' | 'add'>('view');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [newLabel, setNewLabel] = useState('');
    const [fullScreenItem, setFullScreenItem] = useState<MindMapItem | null>(null);
    const [pendingFile, setPendingFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const storageKey = `mindmaps_${currentBook}_${currentChapter.replace(/\s+/g, '_')}`;

    // Load mind maps from localStorage
    React.useEffect(() => {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
            const mindMapData = JSON.parse(saved).map((m: any) => ({
                ...m,
                timestamp: new Date(m.timestamp)
            }));
            setMindMaps(mindMapData);
        }
    }, [storageKey]);

    // Save mind maps to localStorage
    const saveMindMaps = (mapList: MindMapItem[]) => {
        localStorage.setItem(storageKey, JSON.stringify(mapList));
        setMindMaps(mapList);
    };

    // Handle file upload
    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Check file type
        const fileType = file.type;
        const isImage = fileType.startsWith('image/');
        const isPdf = fileType === 'application/pdf';

        if (!isImage && !isPdf) {
            alert('Please upload only images (PNG, JPG, etc.) or PDF files');
            return;
        }

        // If no label provided, store the file temporarily and ask for label
        if (!newLabel.trim()) {
            setPendingFile(file);
            // Don't process file yet, let user add label first
            return;
        }

        // Process the file immediately if label is provided
        processFileUpload(file);
    };

    // Process file upload with label
    const processFileUpload = (file: File) => {
        const fileType = file.type;
        const isImage = fileType.startsWith('image/');
        
        // Create file URL
        const fileUrl = URL.createObjectURL(file);

        // Format file size
        const formatFileSize = (bytes: number): string => {
            if (bytes === 0) return '0 Bytes';
            const k = 1024;
            const sizes = ['Bytes', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        };

        const newMindMap: MindMapItem = {
            id: Date.now().toString(),
            label: newLabel.trim(),
            type: isImage ? 'image' : 'pdf',
            fileUrl: fileUrl,
            fileName: file.name,
            fileSize: formatFileSize(file.size),
            timestamp: new Date()
        };

        const updatedMindMaps = [...mindMaps, newMindMap];
        saveMindMaps(updatedMindMaps);

        // Reset form
        setNewLabel('');
        setPendingFile(null);
        setMode('view');
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    // Save pending file when label is provided
    const handleSavePendingFile = () => {
        if (pendingFile && newLabel.trim()) {
            processFileUpload(pendingFile);
        }
    };

    // Delete mind map
    const deleteMindMap = (id: string) => {
        const mapToDelete = mindMaps.find(m => m.id === id);
        if (mapToDelete) {
            // Revoke the object URL to free memory
            URL.revokeObjectURL(mapToDelete.fileUrl);
            const updatedMindMaps = mindMaps.filter(m => m.id !== id);
            saveMindMaps(updatedMindMaps);
        }
    };

    // Open full screen view
    const openFullScreen = (item: MindMapItem) => {
        setFullScreenItem(item);
        document.body.style.overflow = 'hidden'; // Prevent background scrolling
    };

    // Close full screen view
    const closeFullScreen = () => {
        setFullScreenItem(null);
        document.body.style.overflow = 'auto'; // Restore scrolling
    };

    // Handle ESC key for closing full screen
    React.useEffect(() => {
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && fullScreenItem) {
                closeFullScreen();
            }
        };

        document.addEventListener('keydown', handleEscape);
        return () => {
            document.removeEventListener('keydown', handleEscape);
        };
    }, [fullScreenItem]);

    // Add mode view
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
                            setMode('view');
                            setNewLabel('');
                        }}
                        className="btn-secondary text-sm"
                    >
                        Back to Mind Maps
                    </button>
                </div>

                <div className="space-y-4 max-w-2xl">
                    {pendingFile && (
                        <div className="p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                            <h4 className="font-medium text-orange-800 dark:text-orange-200 mb-2">
                                📁 File Ready to Upload
                            </h4>
                            <p className="text-sm text-orange-700 dark:text-orange-300 mb-2">
                                <strong>File:</strong> {pendingFile.name} ({(pendingFile.size / 1024).toFixed(1)} KB)
                            </p>
                            <p className="text-sm text-orange-700 dark:text-orange-300 mb-3">
                                Please enter a label below and click "Save Mind Map" to complete the upload.
                            </p>
                        </div>
                    )}
                    
                    <div>
                        <label className="block text-sm font-medium theme-text mb-2">
                            Mind Map Label: {pendingFile && <span className="text-red-500">*Required</span>}
                        </label>
                        <input
                            type="text"
                            value={newLabel}
                            onChange={(e) => setNewLabel(e.target.value)}
                            placeholder="Enter a descriptive label (e.g., Chapter Overview, Key Concepts)"
                            className="w-full p-3 theme-surface border rounded-lg theme-text"
                        />
                        <p className="text-xs theme-text-secondary mt-1">
                            This label will help you identify the mind map later
                        </p>
                    </div>

                    {pendingFile ? (
                        // Show save option for pending file
                        <div className="flex gap-3">
                            <button
                                onClick={handleSavePendingFile}
                                disabled={!newLabel.trim()}
                                className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                💾 Save Mind Map
                            </button>
                            <button
                                onClick={() => {
                                    setPendingFile(null);
                                    setNewLabel('');
                                    if (fileInputRef.current) {
                                        fileInputRef.current.value = '';
                                    }
                                }}
                                className="btn-secondary"
                            >
                                Cancel
                            </button>
                        </div>
                    ) : (
                        // Show file upload option
                        <div>
                            <label className="block text-sm font-medium theme-text mb-2">
                                Upload File:
                            </label>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*,.pdf"
                                onChange={handleFileUpload}
                                className="w-full p-3 theme-surface border rounded-lg theme-text file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                            />
                            <p className="text-xs theme-text-secondary mt-1">
                                Supported formats: Images (PNG, JPG, GIF, etc.) and PDF files. You can upload first, then add label.
                            </p>
                        </div>
                    )}

                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                        <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">
                            📋 Mind Map Features
                        </h4>
                        <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                            <li>• Full-screen viewing with zoom capabilities</li>
                            <li>• Support for images and PDF documents</li>
                            <li>• Easy organization with custom labels</li>
                            <li>• Click any mind map to view in full screen</li>
                            <li>• Press ESC or click outside to exit full screen</li>
                        </ul>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={`theme-surface rounded-lg p-6 ${className}`}>
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold theme-text flex items-center gap-2">
                    <ImageIcon />
                    Mind Maps
                </h2>
                <div className="flex gap-2">
                    <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`px-3 py-1 text-sm rounded ${
                                viewMode === 'grid' 
                                    ? 'bg-white dark:bg-gray-700 theme-text shadow-sm' 
                                    : 'theme-text-secondary hover:theme-text'
                            }`}
                        >
                            🔲 Grid
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`px-3 py-1 text-sm rounded ${
                                viewMode === 'list' 
                                    ? 'bg-white dark:bg-gray-700 theme-text shadow-sm' 
                                    : 'theme-text-secondary hover:theme-text'
                            }`}
                        >
                            📋 List
                        </button>
                    </div>
                    <button
                        onClick={() => setMode('add')}
                        className="btn-secondary text-sm flex items-center gap-2"
                    >
                        <PlusIcon />
                        Add Mind Map
                    </button>
                </div>
            </div>

            {/* Mind Maps display */}
            {mindMaps.length === 0 ? (
                <div className="text-center py-12">
                    <ImageIcon className="w-16 h-16 mx-auto mb-4 theme-text-secondary" />
                    <h3 className="text-xl font-semibold mb-2 theme-text">Create Your Mind Maps</h3>
                    <p className="theme-text-secondary mb-4">Upload visual concept maps to organize your learning</p>
                    
                    {/* Mind Map Structure Example */}
                    <div className="mb-6 p-4 theme-surface2 rounded-lg max-w-lg mx-auto">
                        <div className="text-sm theme-text-secondary mb-3 font-medium">Mind Map Structure Guide:</div>
                        <div className="space-y-3 text-left">
                            <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border-l-4 border-purple-500">
                                <div className="font-semibold text-purple-800 dark:text-purple-300 mb-1">Central Topic</div>
                                <div className="text-sm text-purple-700 dark:text-purple-200">
                                    Main concept in the center (e.g., "Database Systems")
                                </div>
                            </div>
                            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border-l-4 border-blue-500">
                                <div className="font-semibold text-blue-800 dark:text-blue-300 mb-1">Main Branches</div>
                                <div className="text-sm text-blue-700 dark:text-blue-200">
                                    Key categories extending outward (Types, Operations, etc.)
                                </div>
                            </div>
                            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border-l-4 border-green-500">
                                <div className="font-semibold text-green-800 dark:text-green-300 mb-1">Sub-branches</div>
                                <div className="text-sm text-green-700 dark:text-green-200">
                                    Details and examples connected to main branches
                                </div>
                            </div>
                            <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border-l-4 border-orange-500">
                                <div className="font-semibold text-orange-800 dark:text-orange-300 mb-1">Visual Elements</div>
                                <div className="text-sm text-orange-700 dark:text-orange-200">
                                    Colors, icons, images to enhance memory
                                </div>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={() => setMode('add')}
                        className="px-6 py-3 theme-accent text-white rounded-lg hover:bg-opacity-90 theme-transition"
                    >
                        <PlusIcon className="w-5 h-5 inline mr-2" />
                        Upload Your First Mind Map
                    </button>
                </div>
            ) : (
                <div>
                    {viewMode === 'grid' ? (
                        // Grid View
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {mindMaps.map((mindMap) => (
                                <div key={mindMap.id} className="border theme-border rounded-lg p-4 hover:shadow-md transition-shadow">
                                    {/* Preview */}
                                    <div 
                                        className="aspect-video bg-gray-200 dark:bg-gray-700 rounded-lg mb-3 relative overflow-hidden cursor-pointer group"
                                        onClick={() => openFullScreen(mindMap)}
                                    >
                                        {mindMap.type === 'image' ? (
                                            <img 
                                                src={mindMap.fileUrl} 
                                                alt={mindMap.label}
                                                className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-red-100 dark:bg-red-900/20">
                                                <div className="text-center">
                                                    <FileIcon className="w-12 h-12 text-red-500 mx-auto mb-2" />
                                                    <span className="text-xs font-medium text-red-700 dark:text-red-300">PDF</span>
                                                </div>
                                            </div>
                                        )}
                                        
                                        {/* Overlay on hover */}
                                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center">
                                            <span className="text-white opacity-0 group-hover:opacity-100 transition-opacity text-sm font-medium">
                                                Click to view full screen
                                            </span>
                                        </div>
                                    </div>

                                    {/* Mind Map info */}
                                    <div>
                                        <h3 className="font-medium theme-text text-sm line-clamp-2 mb-2">
                                            {mindMap.label}
                                        </h3>
                                        
                                        <div className="text-xs theme-text-secondary mb-2">
                                            <div className="flex items-center justify-between">
                                                <span>{mindMap.fileName}</span>
                                                {mindMap.fileSize && <span>{mindMap.fileSize}</span>}
                                            </div>
                                            <div>Added {mindMap.timestamp.toLocaleDateString()}</div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex gap-2 mt-3">
                                            <button
                                                onClick={() => openFullScreen(mindMap)}
                                                className="flex-1 btn-primary text-xs"
                                            >
                                                View Full Screen
                                            </button>
                                            <button
                                                onClick={() => deleteMindMap(mindMap.id)}
                                                className="px-2 py-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded text-xs"
                                                title="Delete mind map"
                                            >
                                                <TrashIcon />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        // List View
                        <div className="space-y-3">
                            {mindMaps.map((mindMap) => (
                                <div key={mindMap.id} className="border theme-border rounded-lg p-4 hover:shadow-md transition-shadow">
                                    <div className="flex items-center gap-4">
                                        {/* Thumbnail */}
                                        <div 
                                            className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-lg flex-shrink-0 overflow-hidden cursor-pointer group"
                                            onClick={() => openFullScreen(mindMap)}
                                        >
                                            {mindMap.type === 'image' ? (
                                                <img 
                                                    src={mindMap.fileUrl} 
                                                    alt={mindMap.label}
                                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-red-100 dark:bg-red-900/20">
                                                    <FileIcon className="w-6 h-6 text-red-500" />
                                                </div>
                                            )}
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-medium theme-text text-sm truncate mb-1">
                                                {mindMap.label}
                                            </h3>
                                            <div className="text-xs theme-text-secondary space-y-1">
                                                <div className="flex items-center justify-between">
                                                    <span className="truncate mr-2">{mindMap.fileName}</span>
                                                    {mindMap.fileSize && <span className="flex-shrink-0">{mindMap.fileSize}</span>}
                                                </div>
                                                <div>Added {mindMap.timestamp.toLocaleDateString()}</div>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex gap-2 flex-shrink-0">
                                            <button
                                                onClick={() => openFullScreen(mindMap)}
                                                className="btn-primary text-xs px-3 py-1"
                                            >
                                                View
                                            </button>
                                            <button
                                                onClick={() => deleteMindMap(mindMap.id)}
                                                className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                                                title="Delete mind map"
                                            >
                                                <TrashIcon />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Full Screen Modal */}
            {fullScreenItem && (
                <div 
                    className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50"
                    onClick={closeFullScreen}
                >
                    <div className="relative w-full h-full p-4">
                        {/* Close button */}
                        <button
                            onClick={closeFullScreen}
                            className="absolute top-4 right-4 z-60 bg-white bg-opacity-20 hover:bg-opacity-30 text-white rounded-full p-2 transition-all"
                            title="Close (ESC)"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>

                        {/* Title */}
                        <div className="absolute top-4 left-4 z-60 bg-white bg-opacity-20 text-white px-4 py-2 rounded-lg">
                            <h3 className="font-medium">{fullScreenItem.label}</h3>
                            <p className="text-xs opacity-80">{fullScreenItem.fileName}</p>
                        </div>

                        {/* Content */}
                        <div 
                            className="w-full h-full flex items-center justify-center"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {fullScreenItem.type === 'image' ? (
                                <img 
                                    src={fullScreenItem.fileUrl} 
                                    alt={fullScreenItem.label}
                                    className="max-w-full max-h-full object-contain cursor-zoom-in"
                                    onClick={(e) => e.stopPropagation()}
                                />
                            ) : (
                                <iframe
                                    src={fullScreenItem.fileUrl}
                                    className="w-full h-full border-0 rounded-lg"
                                    title={fullScreenItem.label}
                                    onClick={(e) => e.stopPropagation()}
                                />
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MindMapManager;
