import React, { useState, useEffect } from 'react';
import { EnhancedMarketplaceService } from '../services/EnhancedMarketplaceService';

interface UpdateInfo {
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion: string;
  releaseNotes?: string;
}

interface UpdateCheckerProps {
  userId: string;
  onUpdateAvailable?: (updates: UpdateInfo[]) => void;
}

/**
 * Simplified Update Checker Component
 */
const UpdateChecker: React.FC<UpdateCheckerProps> = ({ userId, onUpdateAvailable }) => {
  const [updates, setUpdates] = useState<UpdateInfo[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const [lastCheck, setLastCheck] = useState<string>('');

  useEffect(() => {
    checkForUpdates();
    
    // Set up periodic checks (every 30 minutes)
    const interval = setInterval(checkForUpdates, 30 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [userId]);

  const checkForUpdates = async () => {
    if (!userId) return;

    setIsChecking(true);

    try {
      const updateInfo = await EnhancedMarketplaceService.checkForUpdates(userId);
      
      // Convert to our simplified format
      const simplifiedUpdates: UpdateInfo[] = updateInfo
        .filter(update => update.hasUpdate)
        .map(update => ({
          hasUpdate: update.hasUpdate,
          currentVersion: update.currentVersion,
          latestVersion: update.latestVersion,
          releaseNotes: update.releaseNotes
        }));

      setUpdates(simplifiedUpdates);
      setLastCheck(new Date().toLocaleString());

      if (simplifiedUpdates.length > 0 && onUpdateAvailable) {
        onUpdateAvailable(simplifiedUpdates);
      }
    } catch (error) {
      console.error('Error checking for updates:', error);
    } finally {
      setIsChecking(false);
    }
  };

  if (updates.length === 0) {
    return (
      <div className="text-sm text-gray-500">
        {isChecking ? 'Checking for updates...' : `Last checked: ${lastCheck || 'Never'}`}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-orange-600">
          {updates.length} Update{updates.length > 1 ? 's' : ''} Available
        </h3>
        <button
          onClick={checkForUpdates}
          disabled={isChecking}
          className="text-sm text-blue-500 hover:text-blue-700"
        >
          {isChecking ? 'Checking...' : 'Check Again'}
        </button>
      </div>

      <div className="space-y-1">
        {updates.map((update, index) => (
          <div key={index} className="bg-orange-50 border border-orange-200 rounded p-2 text-sm">
            <div className="font-medium">
              Version {update.latestVersion} available
            </div>
            <div className="text-gray-600">
              Current: {update.currentVersion}
            </div>
            {update.releaseNotes && (
              <div className="text-gray-600 mt-1">
                {update.releaseNotes}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default UpdateChecker;
