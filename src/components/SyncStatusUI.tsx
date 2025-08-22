import React, { useState, useEffect } from 'react';
import BookSyncService, { SyncStatus } from '../services/BookSyncService';

/**
 * SYNC STATUS COMPONENT
 * Shows current sync status and allows manual sync operations
 */

interface SyncStatusUIProps {
  className?: string;
  showDetailed?: boolean;
}

export const SyncStatusUI: React.FC<SyncStatusUIProps> = ({ 
  className = '', 
  showDetailed = false 
}) => {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(BookSyncService.getSyncStatus());
  const [isManualSync, setIsManualSync] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);

  useEffect(() => {
    // Subscribe to sync status updates
    const handleStatusUpdate = (status: SyncStatus) => {
      setSyncStatus(status);
    };

    BookSyncService.addStatusListener(handleStatusUpdate);

    return () => {
      BookSyncService.removeStatusListener(handleStatusUpdate);
    };
  }, []);

  const handleManualSync = async () => {
    setIsManualSync(true);
    setSyncResult(null);

    try {
      const result = await BookSyncService.syncAllUserBooks();
      
      if (result.success) {
        setSyncResult(`✅ Synced ${result.syncedBooks} books successfully`);
      } else {
        setSyncResult(`⚠️ Synced ${result.syncedBooks}/${result.totalBooks} books. Failed: ${result.failedBooks.join(', ')}`);
      }
    } catch (error) {
      setSyncResult(`❌ Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsManualSync(false);
    }
  };

  const handleReloadFromBackend = async () => {
    if (!confirm('This will replace all local data with data from the cloud. Continue?')) {
      return;
    }

    setIsManualSync(true);
    setSyncResult(null);

    try {
      const success = await BookSyncService.resetAndReloadFromBackend();
      if (success) {
        setSyncResult('✅ Successfully reloaded from backend');
      } else {
        setSyncResult('❌ Failed to reload from backend');
      }
    } catch (error) {
      setSyncResult(`❌ Reload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsManualSync(false);
    }
  };

  const getSyncStatusIcon = () => {
    if (syncStatus.isSyncing || isManualSync) {
      return (
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
      );
    }
    
    if (!syncStatus.isOnline) {
      return <span className="text-red-500">📶</span>;
    }
    
    if (syncStatus.pendingSync.length > 0) {
      return <span className="text-yellow-500">⏳</span>;
    }
    
    return <span className="text-green-500">✅</span>;
  };

  const getSyncStatusText = () => {
    if (syncStatus.isSyncing || isManualSync) {
      return 'Syncing...';
    }
    
    if (!syncStatus.isOnline) {
      return 'Offline';
    }
    
    if (syncStatus.pendingSync.length > 0) {
      return `${syncStatus.pendingSync.length} pending`;
    }
    
    return 'Synced';
  };

  const formatLastSync = () => {
    if (!syncStatus.lastSync) return 'Never';
    
    const date = new Date(syncStatus.lastSync);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString();
  };

  if (!showDetailed) {
    // Compact version for header/footer
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {getSyncStatusIcon()}
        <span className="text-sm text-gray-600 dark:text-gray-300">
          {getSyncStatusText()}
        </span>
      </div>
    );
  }

  // Detailed version for settings or dedicated sync page
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Sync Status
        </h3>
        <div className="flex items-center gap-2">
          {getSyncStatusIcon()}
          <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
            {getSyncStatusText()}
          </span>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">Network Status:</span>
          <span className={`font-medium ${
            syncStatus.isOnline 
              ? 'text-green-600 dark:text-green-400' 
              : 'text-red-600 dark:text-red-400'
          }`}>
            {syncStatus.isOnline ? 'Online' : 'Offline'}
          </span>
        </div>

        <div className="flex justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">Last Sync:</span>
          <span className="font-medium text-gray-700 dark:text-gray-200">
            {formatLastSync()}
          </span>
        </div>

        {syncStatus.pendingSync.length > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Pending:</span>
            <span className="font-medium text-yellow-600 dark:text-yellow-400">
              {syncStatus.pendingSync.length} books
            </span>
          </div>
        )}
      </div>

      <div className="flex gap-3 mt-6">
        <button
          onClick={handleManualSync}
          disabled={isManualSync || !syncStatus.isOnline}
          className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 
                     text-white font-medium py-2 px-4 rounded-lg transition-colors
                     disabled:cursor-not-allowed"
        >
          {isManualSync ? 'Syncing...' : 'Sync Now'}
        </button>

        <button
          onClick={handleReloadFromBackend}
          disabled={isManualSync || !syncStatus.isOnline}
          className="flex-1 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-300 
                     text-white font-medium py-2 px-4 rounded-lg transition-colors
                     disabled:cursor-not-allowed"
        >
          {isManualSync ? 'Loading...' : 'Reload from Cloud'}
        </button>
      </div>

      {syncResult && (
        <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <p className="text-sm text-gray-700 dark:text-gray-200">
            {syncResult}
          </p>
        </div>
      )}

      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
        💡 Your data is automatically synced to the cloud. Manual sync is useful 
        when switching devices or troubleshooting.
      </div>
    </div>
  );
};

/**
 * SYNC STATUS HOOK
 * React hook for components that need sync status
 */
export const useSyncStatus = () => {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(BookSyncService.getSyncStatus());

  useEffect(() => {
    const handleStatusUpdate = (status: SyncStatus) => {
      setSyncStatus(status);
    };

    BookSyncService.addStatusListener(handleStatusUpdate);

    return () => {
      BookSyncService.removeStatusListener(handleStatusUpdate);
    };
  }, []);

  return {
    syncStatus,
    isOnline: syncStatus.isOnline,
    isSyncing: syncStatus.isSyncing,
    lastSync: syncStatus.lastSync,
    hasPendingSync: syncStatus.pendingSync.length > 0,
    syncBook: BookSyncService.forceSyncBook,
    syncAllBooks: BookSyncService.syncAllUserBooks,
    loadBook: BookSyncService.forceLoadBook,
    resetAndReload: BookSyncService.resetAndReloadFromBackend
  };
};

export default SyncStatusUI;
