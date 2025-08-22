import React from 'react';
import { RealTimeSyncService } from '../services/RealTimeSyncService';
import { UnifiedBookAdapter } from '../services/UnifiedBookAdapter';

export const SyncDebugTool: React.FC = () => {
  const realTimeSync = React.useMemo(() => RealTimeSyncService.getInstance(), []);
  const [debugInfo, setDebugInfo] = React.useState<string[]>([]);
  const [testData, setTestData] = React.useState({ book: 'physics', chapter: 'wht we know' });

  const addDebugLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setDebugInfo(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 9)]);
  };

  const testSaveData = async () => {
    addDebugLog('🧪 Testing data save...');
    
    const testFlashcard = [{
      id: 'test-' + Date.now(),
      question: 'Test question from sync debug',
      answer: 'Test answer from sync debug',
      created: new Date(),
      difficulty: 'medium'
    }];

    try {
      const adapter = UnifiedBookAdapter.getInstance();
      await adapter.saveTemplateData(testData.book, testData.chapter, 'FLASHCARD', testFlashcard);
      addDebugLog('✅ Test data saved successfully');
      
      // Broadcast sync event
      realTimeSync.broadcastSyncEvent({
        type: 'template_updated',
        bookName: testData.book,
        chapterName: testData.chapter,
        templateType: 'FLASHCARD'
      });
      addDebugLog('📤 Sync event broadcasted');
      
    } catch (error) {
      addDebugLog(`❌ Save failed: ${error}`);
    }
  };

  const testLoadData = () => {
    addDebugLog('🧪 Testing data load...');
    
    const data = UnifiedBookAdapter.getTemplateData(testData.book, testData.chapter, 'FLASHCARD');
    addDebugLog(`📖 Loaded ${data.length} flashcards`);
    
    if (data.length > 0) {
      addDebugLog(`📝 Latest card: ${data[data.length - 1]?.question || 'Unknown'}`);
    }
  };

  const testBroadcast = () => {
    addDebugLog('🧪 Testing broadcast...');
    realTimeSync.testSync();
    addDebugLog('📤 Test broadcast sent');
  };

  const checkStatus = () => {
    const status = realTimeSync.getStatus();
    addDebugLog(`📊 Status: tabId=${status.tabId.substr(0, 8)}..., listeners=${status.listeners}, broadcastChannel=${status.useBroadcastChannel}`);
    
    // Check localStorage keys
    const keys = Object.keys(localStorage).filter(key => 
      key.includes(testData.book.replace(/\s+/g, '_')) || 
      key.includes('FLASHCARD') || 
      key.includes('sync_event')
    );
    addDebugLog(`🔑 LocalStorage keys (${keys.length}): ${keys.join(', ')}`);
  };

  React.useEffect(() => {
    // Subscribe to sync events for debugging
    const unsubscribe = realTimeSync.subscribe('debug_tool', (event) => {
      addDebugLog(`📨 Received sync event: ${event.type} for ${event.templateType} (from tab ${event.tabId?.substr(0, 8)}...)`);
    });

    addDebugLog('🔄 Debug tool initialized');
    checkStatus();

    return unsubscribe;
  }, []);

  return (
    <div className="fixed top-4 right-4 w-96 bg-gray-800 text-white p-4 rounded-lg shadow-lg z-50 max-h-96 overflow-hidden">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-bold text-sm">🔧 Sync Debug Tool</h3>
        <div className="text-xs opacity-70">
          {window.location.origin}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <input
          value={testData.book}
          onChange={(e) => setTestData(prev => ({ ...prev, book: e.target.value }))}
          placeholder="Book name"
          className="px-2 py-1 text-xs bg-gray-700 rounded"
        />
        <input
          value={testData.chapter}
          onChange={(e) => setTestData(prev => ({ ...prev, chapter: e.target.value }))}
          placeholder="Chapter name"
          className="px-2 py-1 text-xs bg-gray-700 rounded"
        />
      </div>

      <div className="grid grid-cols-2 gap-1 mb-3">
        <button onClick={testSaveData} className="px-2 py-1 text-xs bg-blue-600 rounded hover:bg-blue-700">
          💾 Save Test
        </button>
        <button onClick={testLoadData} className="px-2 py-1 text-xs bg-green-600 rounded hover:bg-green-700">
          📖 Load Test
        </button>
        <button onClick={testBroadcast} className="px-2 py-1 text-xs bg-orange-600 rounded hover:bg-orange-700">
          📤 Broadcast
        </button>
        <button onClick={checkStatus} className="px-2 py-1 text-xs bg-purple-600 rounded hover:bg-purple-700">
          📊 Status
        </button>
      </div>

      <div className="bg-gray-900 rounded p-2 text-xs max-h-48 overflow-y-auto">
        <div className="font-semibold mb-1">Debug Log:</div>
        {debugInfo.length === 0 ? (
          <div className="opacity-50">No logs yet...</div>
        ) : (
          debugInfo.map((log, i) => (
            <div key={i} className="mb-1 leading-tight">
              {log}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default SyncDebugTool;
