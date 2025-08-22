import React, { useState } from 'react';
import UnifiedBookService from '../services/UnifiedBookService';
import EnhancedSyncService from '../services/EnhancedSyncService';

interface SyncDebugProps {
  onClose: () => void;
}

interface SyncStatus {
  isRunning: boolean;
  currentStep: string;
  results?: any;
  errors: string[];
}

const SyncDebugComponent: React.FC<SyncDebugProps> = ({ onClose }) => {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isRunning: false,
    currentStep: '',
    errors: []
  });

  const [diagnosticsData, setDiagnosticsData] = useState<any>(null);

  const runComprehensiveSync = async () => {
    setSyncStatus({
      isRunning: true,
      currentStep: 'Starting comprehensive sync...',
      errors: []
    });

    try {
      const unifiedService = UnifiedBookService.getInstance();
      
      setSyncStatus(prev => ({ ...prev, currentStep: 'Running bidirectional sync...' }));
      const result = await unifiedService.completeBidirectionalSync();

      setSyncStatus({
        isRunning: false,
        currentStep: 'Sync completed',
        results: result,
        errors: result.errors
      });

    } catch (error) {
      setSyncStatus({
        isRunning: false,
        currentStep: 'Sync failed',
        errors: [error instanceof Error ? error.message : 'Unknown error']
      });
    }
  };

  const runDiagnostics = async () => {
    setSyncStatus({
      isRunning: true,
      currentStep: 'Running diagnostics...',
      errors: []
    });

    try {
      const diagnostics = {
        localStorage: {
          totalKeys: localStorage.length,
          highlights: [] as string[],
          customTabs: [] as string[],
          examMode: [] as string[],
          books: [] as any[]
        },
        supabase: {
          connected: false,
          userAuthenticated: false,
          tablesAccessible: false,
          error: undefined as string | undefined
        }
      };

      // Scan localStorage
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          if (key.startsWith('highlights_')) {
            diagnostics.localStorage.highlights.push(key);
          } else if (key.includes('customtab_')) {
            diagnostics.localStorage.customTabs.push(key);
          } else if (key.startsWith('questionPapers_') || key.startsWith('evaluationReports_')) {
            diagnostics.localStorage.examMode.push(key);
          } else if (key === 'createdBooks') {
            const books = localStorage.getItem(key);
            if (books) {
              try {
                const parsed = JSON.parse(books);
                diagnostics.localStorage.books = Array.isArray(parsed) ? parsed.map(b => ({ id: b.id, name: b.name })) : [];
              } catch (error) {
                diagnostics.localStorage.books = ['Parse error'];
              }
            }
          }
        }
      }

      // Check Supabase connection
      try {
        const { supabase } = await import('../services/supabaseClient');
        diagnostics.supabase.connected = true;

        const { data: { user }, error } = await supabase.auth.getUser();
        diagnostics.supabase.userAuthenticated = !error && !!user;

        if (user) {
          // Test table access
          const { data, error: tableError } = await supabase
            .from('user_books')
            .select('id')
            .limit(1);
          
          diagnostics.supabase.tablesAccessible = !tableError;
        }
      } catch (error) {
        diagnostics.supabase.connected = false;
        diagnostics.supabase.userAuthenticated = false;
        diagnostics.supabase.tablesAccessible = false;
        diagnostics.supabase.error = error instanceof Error ? error.message : 'Unknown error';
      }

      setDiagnosticsData(diagnostics);
      setSyncStatus({
        isRunning: false,
        currentStep: 'Diagnostics completed',
        errors: []
      });

    } catch (error) {
      setSyncStatus({
        isRunning: false,
        currentStep: 'Diagnostics failed',
        errors: [error instanceof Error ? error.message : 'Unknown error']
      });
    }
  };

  const forceResync = async () => {
    setSyncStatus({
      isRunning: true,
      currentStep: 'Force resyncing all data...',
      errors: []
    });

    try {
      const enhancedSync = EnhancedSyncService.getInstance();
      const result = await enhancedSync.forceCompleteResync();

      setSyncStatus({
        isRunning: false,
        currentStep: 'Force resync completed',
        results: result,
        errors: result.errors
      });

    } catch (error) {
      setSyncStatus({
        isRunning: false,
        currentStep: 'Force resync failed',
        errors: [error instanceof Error ? error.message : 'Unknown error']
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-4xl max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Sync Debug & Diagnostics</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={runDiagnostics}
            disabled={syncStatus.isRunning}
            className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
          >
            Run Diagnostics
          </button>
          <button
            onClick={runComprehensiveSync}
            disabled={syncStatus.isRunning}
            className="px-4 py-2 bg-green-500 text-white rounded disabled:opacity-50"
          >
            Comprehensive Sync
          </button>
          <button
            onClick={forceResync}
            disabled={syncStatus.isRunning}
            className="px-4 py-2 bg-orange-500 text-white rounded disabled:opacity-50"
          >
            Force Resync
          </button>
        </div>

        {/* Status Display */}
        {syncStatus.isRunning && (
          <div className="mb-4 p-3 bg-blue-100 rounded">
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span>{syncStatus.currentStep}</span>
            </div>
          </div>
        )}

        {/* Errors Display */}
        {syncStatus.errors.length > 0 && (
          <div className="mb-4 p-3 bg-red-100 rounded">
            <h3 className="font-bold text-red-800 mb-2">Errors:</h3>
            <ul className="text-red-700 text-sm">
              {syncStatus.errors.map((error, index) => (
                <li key={index}>• {error}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Results Display */}
        {syncStatus.results && (
          <div className="mb-4 p-3 bg-green-100 rounded">
            <h3 className="font-bold text-green-800 mb-2">Sync Results:</h3>
            <pre className="text-sm text-green-700 overflow-x-auto">
              {JSON.stringify(syncStatus.results, null, 2)}
            </pre>
          </div>
        )}

        {/* Diagnostics Display */}
        {diagnosticsData && (
          <div className="mb-4 p-3 bg-gray-100 rounded">
            <h3 className="font-bold text-gray-800 mb-2">System Diagnostics:</h3>
            
            <div className="mb-4">
              <h4 className="font-semibold text-gray-700">LocalStorage Status:</h4>
              <p className="text-sm">Total Keys: {diagnosticsData.localStorage.totalKeys}</p>
              <p className="text-sm">Books: {diagnosticsData.localStorage.books.length}</p>
              <p className="text-sm">Highlights: {diagnosticsData.localStorage.highlights.length} keys</p>
              <p className="text-sm">Custom Tabs: {diagnosticsData.localStorage.customTabs.length} keys</p>
              <p className="text-sm">Exam Mode: {diagnosticsData.localStorage.examMode.length} keys</p>
            </div>

            <div className="mb-4">
              <h4 className="font-semibold text-gray-700">Supabase Status:</h4>
              <p className="text-sm">Connected: {diagnosticsData.supabase.connected ? '✅' : '❌'}</p>
              <p className="text-sm">User Authenticated: {diagnosticsData.supabase.userAuthenticated ? '✅' : '❌'}</p>
              <p className="text-sm">Tables Accessible: {diagnosticsData.supabase.tablesAccessible ? '✅' : '❌'}</p>
            </div>

            {diagnosticsData.localStorage.highlights.length > 0 && (
              <div className="mb-2">
                <h4 className="font-semibold text-gray-700 text-sm">Highlight Keys:</h4>
                <div className="max-h-20 overflow-y-auto text-xs text-gray-600">
                  {diagnosticsData.localStorage.highlights.map((key: string, index: number) => (
                    <div key={index}>{key}</div>
                  ))}
                </div>
              </div>
            )}

            {diagnosticsData.localStorage.customTabs.length > 0 && (
              <div className="mb-2">
                <h4 className="font-semibold text-gray-700 text-sm">Custom Tab Keys:</h4>
                <div className="max-h-20 overflow-y-auto text-xs text-gray-600">
                  {diagnosticsData.localStorage.customTabs.map((key: string, index: number) => (
                    <div key={index}>{key}</div>
                  ))}
                </div>
              </div>
            )}

            {diagnosticsData.localStorage.examMode.length > 0 && (
              <div className="mb-2">
                <h4 className="font-semibold text-gray-700 text-sm">Exam Mode Keys:</h4>
                <div className="max-h-20 overflow-y-auto text-xs text-gray-600">
                  {diagnosticsData.localStorage.examMode.map((key: string, index: number) => (
                    <div key={index}>{key}</div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="text-sm text-gray-600 mt-4">
          <p><strong>Comprehensive Sync:</strong> Syncs all data bidirectionally (to cloud and from cloud)</p>
          <p><strong>Force Resync:</strong> Emergency resync that handles all data types</p>
          <p><strong>Diagnostics:</strong> Shows what data exists locally and cloud connectivity status</p>
        </div>
      </div>
    </div>
  );
};

export default SyncDebugComponent;
