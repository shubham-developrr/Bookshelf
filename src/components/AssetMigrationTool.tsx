import React, { useState } from 'react';
import { useAssetManager } from '../hooks/useAssetManager';

interface AssetMigrationToolProps {
    bookId?: string;
    bookName?: string;
    onClose?: () => void;
    className?: string;
}

interface MigrationProgress {
    total: number;
    completed: number;
    failed: number;
    currentItem: string;
    errors: string[];
}

const AssetMigrationTool: React.FC<AssetMigrationToolProps> = ({
    bookId,
    bookName,
    onClose,
    className = ''
}) => {
    const [isRunning, setIsRunning] = useState(false);
    const [progress, setProgress] = useState<MigrationProgress>({
        total: 0,
        completed: 0,
        failed: 0,
        currentItem: '',
        errors: []
    });
    const [showDetails, setShowDetails] = useState(false);

    const assetManager = useAssetManager({
        bookId,
        onMigrationComplete: (oldUrl, newUrl) => {
            console.log(`Migrated: ${oldUrl.substring(0, 50)}... -> ${newUrl}`);
        }
    });

    const analyzeAssets = (): { total: number; needsMigration: string[] } => {
        const needsMigration: string[] = [];
        let total = 0;

        // Scan localStorage for assets that need migration
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (!key) continue;

            // Check if key is related to the book
            const isBookKey = bookName ? 
                key.includes(bookName.replace(/\s+/g, '_')) || (bookId && key.includes(bookId)) :
                true;

            if (isBookKey) {
                const value = localStorage.getItem(key);
                if (value) {
                    try {
                        const data = JSON.parse(value);
                        const assets = findAssetsInData(data);
                        assets.forEach(asset => {
                            if (assetManager.needsMigration(asset)) {
                                needsMigration.push(`${key}: ${asset.substring(0, 100)}...`);
                                total++;
                            }
                        });
                    } catch (e) {
                        // Not JSON, check if it's a direct asset URL
                        if (assetManager.needsMigration(value)) {
                            needsMigration.push(`${key}: ${value.substring(0, 100)}...`);
                            total++;
                        }
                    }
                }
            }
        }

        return { total, needsMigration };
    };

    const findAssetsInData = (data: any, path = ''): string[] => {
        const assets: string[] = [];

        if (typeof data === 'string') {
            if (assetManager.needsMigration(data)) {
                assets.push(data);
            }
        } else if (Array.isArray(data)) {
            data.forEach((item, index) => {
                assets.push(...findAssetsInData(item, `${path}[${index}]`));
            });
        } else if (typeof data === 'object' && data !== null) {
            Object.entries(data).forEach(([key, value]) => {
                assets.push(...findAssetsInData(value, `${path}.${key}`));
            });
        }

        return assets;
    };

    const runMigration = async () => {
        if (!bookId || !bookName) {
            alert('Book ID and name required for migration');
            return;
        }

        setIsRunning(true);
        setProgress({ total: 0, completed: 0, failed: 0, currentItem: '', errors: [] });

        try {
            const analysis = analyzeAssets();
            setProgress(prev => ({ ...prev, total: analysis.total }));

            if (analysis.total === 0) {
                alert('No assets found that need migration!');
                setIsRunning(false);
                return;
            }

            console.log(`🔄 Starting migration of ${analysis.total} assets...`);

            // Use the bulk migration feature
            const result = await assetManager.migrateAllBookAssets();
            
            setProgress({
                total: analysis.total,
                completed: result.migrated,
                failed: result.failed,
                currentItem: 'Migration completed',
                errors: []
            });

            if (result.success) {
                alert(`✅ Migration completed successfully!\n${result.migrated} assets migrated to cloud storage.`);
            } else {
                alert(`⚠️ Migration completed with some failures.\n${result.migrated} migrated, ${result.failed} failed.`);
            }

        } catch (error) {
            console.error('Migration failed:', error);
            setProgress(prev => ({
                ...prev,
                currentItem: 'Migration failed',
                errors: [...prev.errors, error instanceof Error ? error.message : 'Unknown error']
            }));
        } finally {
            setIsRunning(false);
        }
    };

    const analysis = analyzeAssets();

    return (
        <div className={`theme-surface rounded-lg p-6 ${className}`}>
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold theme-text flex items-center gap-2">
                    <span className="text-2xl">☁️</span>
                    Asset Migration Tool
                </h2>
                {onClose && (
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700 p-1"
                        title="Close"
                    >
                        ✕
                    </button>
                )}
            </div>

            <div className="space-y-6">
                {/* Migration Overview */}
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <h3 className="font-semibold text-blue-800 dark:text-blue-200 mb-3">
                        🔍 Migration Analysis
                    </h3>
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-blue-700 dark:text-blue-300">Book:</span>
                            <span className="font-medium">{bookName || 'All Books'}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-blue-700 dark:text-blue-300">Assets needing migration:</span>
                            <span className="font-medium text-orange-600">{analysis.total}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-blue-700 dark:text-blue-300">Status:</span>
                            <span className="font-medium">
                                {analysis.total > 0 ? '⚠️ Migration recommended' : '✅ All assets in cloud'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Migration Progress */}
                {isRunning && (
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                        <h3 className="font-semibold text-green-800 dark:text-green-200 mb-3">
                            🔄 Migration Progress
                        </h3>
                        <div className="space-y-3">
                            <div className="flex justify-between text-sm">
                                <span>Progress:</span>
                                <span>{progress.completed + progress.failed} / {progress.total}</span>
                            </div>
                            <div className="w-full bg-green-200 dark:bg-green-800 rounded-full h-2">
                                <div 
                                    className="bg-green-500 h-2 rounded-full transition-all duration-300" 
                                    style={{ width: `${((progress.completed + progress.failed) / progress.total) * 100}%` }}
                                ></div>
                            </div>
                            <div className="text-sm text-green-700 dark:text-green-300">
                                <div>✅ Migrated: {progress.completed}</div>
                                <div>❌ Failed: {progress.failed}</div>
                                <div>📂 Current: {progress.currentItem}</div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Error Display */}
                {progress.errors.length > 0 && (
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                        <h3 className="font-semibold text-red-800 dark:text-red-200 mb-2">
                            ❌ Migration Errors
                        </h3>
                        <div className="space-y-1 text-sm">
                            {progress.errors.map((error, index) => (
                                <div key={index} className="text-red-700 dark:text-red-300">
                                    • {error}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Asset Details */}
                {analysis.total > 0 && (
                    <div>
                        <button
                            onClick={() => setShowDetails(!showDetails)}
                            className="flex items-center gap-2 text-sm font-medium theme-text hover:theme-accent"
                        >
                            {showDetails ? '🔽' : '▶️'} View Asset Details ({analysis.needsMigration.length} items)
                        </button>
                        
                        {showDetails && (
                            <div className="mt-3 p-4 theme-surface2 rounded-lg max-h-60 overflow-y-auto">
                                <div className="space-y-1 text-xs font-mono">
                                    {analysis.needsMigration.map((asset, index) => (
                                        <div key={index} className="text-gray-600 dark:text-gray-400 break-all">
                                            {index + 1}. {asset}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Actions */}
                <div className="flex gap-3">
                    <button
                        onClick={runMigration}
                        disabled={isRunning || analysis.total === 0}
                        className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isRunning ? (
                            <>
                                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                                Migrating Assets...
                            </>
                        ) : (
                            <>
                                ☁️ Migrate to Cloud Storage
                            </>
                        )}
                    </button>
                    
                    {onClose && (
                        <button
                            onClick={onClose}
                            disabled={isRunning}
                            className="btn-secondary disabled:opacity-50"
                        >
                            Close
                        </button>
                    )}
                </div>

                {/* Information */}
                <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg text-sm">
                    <h4 className="font-medium mb-2">ℹ️ What this tool does:</h4>
                    <ul className="space-y-1 text-gray-600 dark:text-gray-400 ml-4">
                        <li>• Scans your book data for blob URLs and base64-encoded assets</li>
                        <li>• Uploads these assets to secure Supabase cloud storage</li>
                        <li>• Replaces local references with permanent cloud URLs</li>
                        <li>• Fixes export issues caused by temporary blob URLs</li>
                        <li>• Enables proper handling of large files (like 20MB PDFs)</li>
                    </ul>
                    <p className="mt-3 font-medium text-green-600 dark:text-green-400">
                        ✅ Your data will be preserved and exports will work properly after migration.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default AssetMigrationTool;
