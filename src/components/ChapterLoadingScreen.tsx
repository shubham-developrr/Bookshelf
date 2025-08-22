/**
 * CHAPTER LOADING SCREEN COMPONENT
 * 
 * Shows progress when loading chapter data from cloud
 * Displays meaningful messages and progress indicators
 */

import React, { useState, useEffect } from 'react';
import { ChapterDataLoader } from '../services/ChapterDataLoader';

interface LoadingProgress {
  phase: 'cloudSync' | 'localStorage' | 'backgroundSync' | 'complete';
  progress: number;
  message: string;
  smallFilesLoaded: boolean;
  backgroundFilesLoading: boolean;
}

interface ChapterLoadingScreenProps {
  bookName: string;
  chapterName: string;
  onLoadingComplete?: () => void;
  onLoadingStart?: () => void;
}

const ChapterLoadingScreen: React.FC<ChapterLoadingScreenProps> = ({
  bookName,
  chapterName,
  onLoadingComplete,
  onLoadingStart
}) => {
  const [loadingState, setLoadingState] = useState<LoadingProgress>({
    phase: 'cloudSync',
    progress: 0,
    message: 'Initializing...',
    smallFilesLoaded: false,
    backgroundFilesLoading: false
  });
  
  const [isVisible, setIsVisible] = useState(true);
  const [loadingResult, setLoadingResult] = useState<any>(null);

  useEffect(() => {
    const loader = ChapterDataLoader.getInstance();
    
    // Subscribe to loading progress
    const unsubscribe = loader.subscribe((progress) => {
      setLoadingState(progress);
      
      // Hide loading screen when small files are loaded (UI can render)
      if (progress.smallFilesLoaded && progress.phase !== 'cloudSync') {
        setTimeout(() => {
          setIsVisible(false);
          onLoadingComplete?.();
        }, 500); // Small delay for smooth transition
      }
    });

    // Start loading
    const startLoading = async () => {
      onLoadingStart?.();
      try {
        const result = await loader.loadChapterData(bookName, chapterName);
        setLoadingResult(result);
        console.log('📊 Chapter loading result:', result);
      } catch (error) {
        console.error('❌ Loading failed:', error);
        // Still complete loading to show whatever data we have
        setTimeout(() => {
          setIsVisible(false);
          onLoadingComplete?.();
        }, 1000);
      }
    };

    startLoading();

    // Cleanup subscription
    return () => {
      unsubscribe();
    };
  }, [bookName, chapterName, onLoadingComplete, onLoadingStart]);

  if (!isVisible) {
    return null;
  }

  const getPhaseColor = (phase: string): string => {
    switch (phase) {
      case 'cloudSync':
        return 'text-blue-500';
      case 'localStorage':
        return 'text-green-500';
      case 'backgroundSync':
        return 'text-purple-500';
      case 'complete':
        return 'text-green-600';
      default:
        return 'text-gray-500';
    }
  };

  const getPhaseIcon = (phase: string): string => {
    switch (phase) {
      case 'cloudSync':
        return '☁️';
      case 'localStorage':
        return '📱';
      case 'backgroundSync':
        return '🔄';
      case 'complete':
        return '✅';
      default:
        return '⏳';
    }
  };

  const renderDataStats = () => {
    if (!loadingResult) return null;

    return (
      <div className="mt-4 p-3 rounded-lg bg-gray-100 dark:bg-gray-800 text-sm">
        <div className="grid grid-cols-2 gap-2 text-center">
          <div>
            <div className="font-semibold text-blue-600 dark:text-blue-400">
              {loadingResult.highlightCount}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Highlights</div>
          </div>
          <div>
            <div className="font-semibold text-green-600 dark:text-green-400">
              {loadingResult.templateCount}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Templates</div>
          </div>
          <div>
            <div className="font-semibold text-purple-600 dark:text-purple-400">
              {loadingResult.customTabCount}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Custom Tabs</div>
          </div>
          <div>
            <div className="font-semibold text-orange-600 dark:text-orange-400">
              {loadingResult.examDataCount}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Exam Data</div>
          </div>
        </div>
        <div className="text-center mt-2 text-xs text-gray-500">
          Total: {loadingResult.totalSizeKB}KB loaded
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-white dark:bg-gray-900 z-50 flex items-center justify-center">
      <div className="max-w-md w-full mx-4 p-6 text-center">
        {/* Book and Chapter Info */}
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
            Loading Chapter
          </h2>
          <div className="text-sm text-gray-600 dark:text-gray-400 truncate">
            {bookName}
          </div>
          <div className="text-lg font-semibold text-gray-700 dark:text-gray-300 truncate">
            {chapterName}
          </div>
        </div>

        {/* Progress Circle */}
        <div className="relative mb-6">
          <div className="w-24 h-24 mx-auto">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              {/* Background circle */}
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                className="text-gray-200 dark:text-gray-700"
              />
              {/* Progress circle */}
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray="283"
                strokeDashoffset={283 - (283 * loadingState.progress) / 100}
                className={getPhaseColor(loadingState.phase)}
                style={{
                  transition: 'stroke-dashoffset 0.5s ease-in-out',
                }}
              />
            </svg>
          </div>
          
          {/* Progress percentage and icon */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-2xl mb-1">
                {getPhaseIcon(loadingState.phase)}
              </div>
              <div className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                {loadingState.progress}%
              </div>
            </div>
          </div>
        </div>

        {/* Status Message */}
        <div className={`text-sm font-medium mb-4 ${getPhaseColor(loadingState.phase)}`}>
          {loadingState.message}
        </div>

        {/* Phase Indicators */}
        <div className="flex justify-center space-x-4 mb-6">
          {['cloudSync', 'localStorage', 'complete'].map((phase) => (
            <div
              key={phase}
              className={`flex flex-col items-center transition-opacity duration-300 ${
                loadingState.phase === phase 
                  ? 'opacity-100' 
                  : loadingState.progress >= (phase === 'cloudSync' ? 0 : phase === 'localStorage' ? 50 : 90)
                    ? 'opacity-60'
                    : 'opacity-30'
              }`}
            >
              <div className={`w-3 h-3 rounded-full mb-1 ${
                loadingState.phase === phase 
                  ? getPhaseColor(phase).replace('text-', 'bg-')
                  : 'bg-gray-300 dark:bg-gray-600'
              }`} />
              <div className="text-xs text-gray-600 dark:text-gray-400">
                {phase === 'cloudSync' ? 'Sync' : phase === 'localStorage' ? 'Load' : 'Done'}
              </div>
            </div>
          ))}
        </div>

        {/* Data Statistics (shown after loading starts) */}
        {loadingState.progress > 50 && renderDataStats()}

        {/* Background Loading Indicator */}
        {loadingState.backgroundFilesLoading && (
          <div className="mt-4 p-2 rounded bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-xs">
            <div className="flex items-center justify-center space-x-2">
              <div className="animate-spin w-3 h-3 border border-blue-400 border-t-transparent rounded-full" />
              <span>Loading additional content in background...</span>
            </div>
          </div>
        )}

        {/* Tips */}
        <div className="mt-6 text-xs text-gray-500 dark:text-gray-400">
          <p>💡 Essential content loads first for immediate access</p>
          {loadingState.backgroundFilesLoading && (
            <p>🔄 Large files loading in background</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChapterLoadingScreen;
