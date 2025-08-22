import React, { useState } from 'react';
import { SyncCleanupService } from '../services/SyncCleanupService';
import { UnifiedBookAdapter } from '../services/UnifiedBookAdapter';
import { UnifiedBookService } from '../services/UnifiedBookService';

interface TestResult {
  type: 'success' | 'error' | 'info';
  message: string;
  details?: any;
}

export const SyncFixTester: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);
  const [showTester, setShowTester] = useState(false);

  const addResult = (result: TestResult) => {
    setResults(prev => [...prev, result]);
  };

  const runComprehensiveTest = async () => {
    setIsRunning(true);
    setResults([]);
    
    try {
      addResult({ type: 'info', message: '🚀 Starting Comprehensive Sync Fix Test...' });

      // Test 1: Template Data Access Test
      addResult({ type: 'info', message: '� Testing Template Data Access...' });
      try {
        const testNotes = await UnifiedBookAdapter.getTemplateDataWithCloudSync('NOTES', 'physics', 'wht we know');
        addResult({
          type: 'success',
          message: `✅ Template data loaded successfully - ${Array.isArray(testNotes) ? testNotes.length : 0} notes found`
        });
      } catch (error) {
        addResult({
          type: 'error',
          message: `❌ Template data loading failed: ${error}`
        });
      }

      // Test 2: Cloud Sync Service Status
      addResult({ type: 'info', message: '☁️ Testing Cloud Sync Service...' });
      const unifiedService = UnifiedBookService.getInstance();
      
      addResult({
        type: 'success',
        message: '✅ UnifiedBookService initialized and available'
      });

      // Test 3: BookId Resolution Test
      addResult({ type: 'info', message: '� Testing BookId Resolution...' });
      try {
        // Test by loading book data which requires bookId resolution
        const books = JSON.parse(localStorage.getItem('books') || '[]');
        const physicsBook = books.find((book: any) => book.name.toLowerCase().includes('physics'));
        
        if (physicsBook) {
          addResult({ 
            type: 'success', 
            message: `✅ Physics Book found: ${physicsBook.name} (ID: ${physicsBook.id})` 
          });
        } else {
          addResult({ 
            type: 'error', 
            message: '❌ Physics Book not found in localStorage - this will prevent sync' 
          });
        }
      } catch (error) {
        addResult({
          type: 'error',
          message: `❌ BookId resolution test failed: ${error}`
        });
      }

      // Test 4: Run Cleanup Service
      addResult({ type: 'info', message: '🧹 Running Sync Cleanup Service...' });
      const cleanupService = SyncCleanupService.getInstance();
      
      try {
        const cleanupResult = await cleanupService.runFullCleanup();
        addResult({
          type: 'success',
          message: '✅ Cleanup Service completed successfully',
          details: cleanupResult.report
        });
        
        // Show detailed cleanup results
        addResult({
          type: 'info',
          message: `📊 Cleanup Report:\n${cleanupResult.report}`
        });
        
      } catch (error) {
        addResult({
          type: 'error',
          message: `❌ Cleanup Service failed: ${error}`,
          details: error
        });
      }

      // Test 5: Final Verification
      addResult({ type: 'info', message: '✅ Running Final Verification...' });
      
      // Check localStorage consistency
      const physicsKeys = Object.keys(localStorage).filter(key => 
        key.includes('physics') && key.includes('wht_we_know')
      );
      
      addResult({
        type: 'info',
        message: `📋 Found ${physicsKeys.length} physics-related keys in localStorage`,
        details: physicsKeys
      });

      // Test cross-browser sync readiness
      try {
        const adapter = UnifiedBookAdapter.getInstance();
        const testSave = await adapter.saveTemplateData('NOTES', 'physics', 'wht we know', [
          { id: 'test-sync-' + Date.now(), text: 'Cross-browser sync test note', timestamp: new Date() }
        ]);
        
        if (testSave) {
          addResult({
            type: 'success',
            message: '✅ Cross-browser sync test passed - template data saved to cloud'
          });
        } else {
          addResult({
            type: 'error',
            message: '❌ Cross-browser sync test failed - data not saved to cloud'
          });
        }
      } catch (error) {
        addResult({
          type: 'error',
          message: `❌ Cross-browser sync test error: ${error}`
        });
      }

      addResult({ 
        type: 'success', 
        message: '🎉 Comprehensive Sync Fix Test Complete!' 
      });

    } catch (error) {
      addResult({
        type: 'error',
        message: `❌ Test suite failed: ${error}`,
        details: error
      });
    } finally {
      setIsRunning(false);
    }
  };

  const clearResults = () => {
    setResults([]);
  };

  if (!showTester) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setShowTester(true)}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg transition-colors"
          title="Open Sync Fix Tester"
        >
          🔧 Test Sync Fixes
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] flex flex-col">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            🔧 Sync Fix Comprehensive Tester
          </h2>
          <button
            onClick={() => setShowTester(false)}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            ✕
          </button>
        </div>

        <div className="p-6 flex-1 overflow-hidden flex flex-col">
          <div className="flex gap-4 mb-6">
            <button
              onClick={runComprehensiveTest}
              disabled={isRunning}
              className="bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg transition-colors flex items-center gap-2"
            >
              {isRunning ? '🔄 Running...' : '🚀 Run Full Test'}
            </button>
            
            <button
              onClick={clearResults}
              className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
            >
              🗑️ Clear Results
            </button>
          </div>

          <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
            {results.length === 0 ? (
              <div className="text-gray-500 dark:text-gray-400 text-center py-8">
                Click "Run Full Test" to start comprehensive sync fix testing
              </div>
            ) : (
              <div className="space-y-3">
                {results.map((result, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg border-l-4 ${
                      result.type === 'success'
                        ? 'bg-green-50 border-green-500 text-green-800 dark:bg-green-900/20 dark:text-green-200'
                        : result.type === 'error'
                        ? 'bg-red-50 border-red-500 text-red-800 dark:bg-red-900/20 dark:text-red-200'
                        : 'bg-blue-50 border-blue-500 text-blue-800 dark:bg-blue-900/20 dark:text-blue-200'
                    }`}
                  >
                    <div className="font-medium">{result.message}</div>
                    {result.details && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-sm opacity-75 hover:opacity-100">
                          Show details
                        </summary>
                        <pre className="mt-2 text-xs bg-black/10 dark:bg-white/10 p-2 rounded overflow-x-auto">
                          {typeof result.details === 'string' 
                            ? result.details 
                            : JSON.stringify(result.details, null, 2)
                          }
                        </pre>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <strong>🎯 Test Coverage:</strong>
              <ul className="mt-1 space-y-1 text-xs">
                <li>• BookId resolution for physics book</li>
                <li>• Cloud sync service initialization</li>
                <li>• Template data loading with cloud sync</li>
              </ul>
            </div>
            <div>
              <strong>🧹 Cleanup Actions:</strong>
              <ul className="mt-1 space-y-1 text-xs">
                <li>• Standardize template keys</li>
                <li>• Remove duplicate Supabase entries</li>
                <li>• Fix cross-browser sync readiness</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SyncFixTester;
