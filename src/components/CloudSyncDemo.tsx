import React, { useState } from 'react';
import { useUserData, useUserDataKey, useUserDataObject } from '../hooks/useUserData';
import { useAuth } from '../contexts/UserContext';

/**
 * CloudSyncDemo - Comprehensive demo of localStorage-like cloud sync
 * Demonstrates all features of the UserDataStorageService
 */

interface DemoData {
  profile: {
    name: string;
    preferences: {
      theme: string;
      language: string;
      notifications: {
        email: boolean;
        push: boolean;
        desktop: boolean;
      };
    };
  };
  projectState: {
    activeProject: string;
    openFiles: string[];
    breakpoints: number[];
    editorSettings: {
      fontSize: number;
      tabSize: number;
      wordWrap: boolean;
    };
  };
  appHistory: Array<{
    action: string;
    timestamp: string;
  }>;
}

export const CloudSyncDemo: React.FC = () => {
  const { user, logout } = useAuth();
  const { 
    data, 
    loading, 
    syncStatus, 
    saveData, 
    getData, 
    removeData, 
    clearAllData, 
    forceSync, 
    getDataSize 
  } = useUserData();
  
  // Demo with specific data types
  const { value: counter, setValue: setCounter } = useUserDataKey<number>('counter', 0);
  const { value: userNotes, setValue: setUserNotes } = useUserDataKey<string[]>('notes', []);
  const { 
    value: userPrefs, 
    setValue: setUserPrefs, 
    updateField: updatePref 
  } = useUserDataObject<{theme: string; fontSize: number; autoSave: boolean}>('preferences', {
    theme: 'light',
    fontSize: 14,
    autoSave: true
  });

  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [newNote, setNewNote] = useState('');

  // Demo functions
  const handleSaveComplexData = async () => {
    const complexData: DemoData = {
      profile: {
        name: user?.fullName || 'User',
        preferences: {
          theme: 'dark',
          language: 'en-US',
          notifications: {
            email: true,
            push: false,
            desktop: true
          }
        }
      },
      projectState: {
        activeProject: 'bookshelf-cloud-sync',
        openFiles: ['CloudSyncDemo.tsx', 'useUserData.ts', 'UserDataStorageService.ts'],
        breakpoints: [42, 78, 156],
        editorSettings: {
          fontSize: 14,
          tabSize: 2,
          wordWrap: true
        }
      },
      appHistory: [
        { action: 'login', timestamp: new Date().toISOString() },
        { action: 'save_complex_data', timestamp: new Date().toISOString() }
      ]
    };

    await saveData('complexData', complexData);
  };

  const handleSaveKeyValue = async () => {
    if (newKey && newValue) {
      try {
        // Parse as JSON if possible, otherwise store as string
        const parsedValue = JSON.parse(newValue);
        await saveData(newKey, parsedValue);
      } catch {
        await saveData(newKey, newValue);
      }
      setNewKey('');
      setNewValue('');
    }
  };

  const handleAddNote = async () => {
    if (newNote.trim()) {
      const updatedNotes = [...userNotes, newNote.trim()];
      await setUserNotes(updatedNotes);
      setNewNote('');
    }
  };

  const handleRemoveNote = async (index: number) => {
    const updatedNotes = userNotes.filter((_, i) => i !== index);
    await setUserNotes(updatedNotes);
  };

  const handleIncrementCounter = async () => {
    await setCounter(counter + 1);
  };

  const handleToggleAutoSave = async () => {
    await updatePref('autoSave', !userPrefs.autoSave);
  };

  const handleThemeChange = async (theme: string) => {
    await updatePref('theme', theme);
  };

  const storageInfo = getDataSize();
  const complexData = getData('complexData') as DemoData | undefined;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen theme-surface">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="theme-text">Loading cloud sync...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 theme-surface">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold theme-text">Cloud Sync Demo</h1>
        <button
          onClick={logout}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
        >
          Sign Out
        </button>
      </div>

      {/* Sync Status */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow mb-6 theme-surface">
        <h2 className="text-xl font-semibold mb-4 theme-text">Sync Status</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="font-medium theme-text">Status: </span>
            <span className={`${syncStatus.isSyncing ? 'text-yellow-500' : 'text-green-500'}`}>
              {syncStatus.isSyncing ? 'Syncing...' : 'Ready'}
            </span>
          </div>
          <div>
            <span className="font-medium theme-text">Last Synced: </span>
            <span className="theme-text-secondary">
              {syncStatus.lastSynced ? syncStatus.lastSynced.toLocaleString() : 'Never'}
            </span>
          </div>
          <div>
            <span className="font-medium theme-text">Unsynced: </span>
            <span className={`${syncStatus.hasUnsyncedChanges ? 'text-yellow-500' : 'text-green-500'}`}>
              {syncStatus.hasUnsyncedChanges ? 'Yes' : 'No'}
            </span>
          </div>
          <div>
            <span className="font-medium theme-text">Data Size: </span>
            <span className={`theme-text ${storageInfo.warning ? 'text-red-500' : ''}`}>
              {storageInfo.sizeMB.toFixed(2)}MB
            </span>
          </div>
        </div>
        
        {syncStatus.error && (
          <div className="mt-2 p-2 bg-red-100 border border-red-400 text-red-700 rounded">
            {syncStatus.error}
          </div>
        )}
        
        <button
          onClick={forceSync}
          disabled={syncStatus.isSyncing}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 transition-colors"
        >
          {syncStatus.isSyncing ? 'Syncing...' : 'Force Sync'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Interactive Controls */}
        <div className="space-y-6">
          {/* Simple Counter Demo */}
          <div className="theme-surface p-4 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4 theme-text">Counter Demo</h3>
            <div className="flex items-center gap-4">
              <span className="theme-text">Count: {counter}</span>
              <button
                onClick={handleIncrementCounter}
                className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
              >
                +1
              </button>
              <button
                onClick={() => setCounter(0)}
                className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
              >
                Reset
              </button>
            </div>
          </div>

          {/* User Preferences Demo */}
          <div className="theme-surface p-4 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4 theme-text">Preferences Demo</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium theme-text mb-1">Theme:</label>
                <select
                  value={userPrefs.theme}
                  onChange={(e) => handleThemeChange(e.target.value)}
                  className="w-full p-2 border theme-border rounded theme-surface theme-text"
                >
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                  <option value="blue">Blue</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium theme-text mb-1">Font Size:</label>
                <input
                  type="range"
                  min="12"
                  max="20"
                  value={userPrefs.fontSize}
                  onChange={(e) => updatePref('fontSize', parseInt(e.target.value))}
                  className="w-full"
                />
                <span className="text-sm theme-text-secondary">{userPrefs.fontSize}px</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={userPrefs.autoSave}
                  onChange={handleToggleAutoSave}
                  className="rounded"
                />
                <label className="theme-text">Auto Save</label>
              </div>
            </div>
          </div>

          {/* Notes Demo */}
          <div className="theme-surface p-4 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4 theme-text">Notes Demo</h3>
            <div className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Add a note..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  className="flex-1 p-2 border theme-border rounded theme-surface theme-text"
                  onKeyPress={(e) => e.key === 'Enter' && handleAddNote()}
                />
                <button
                  onClick={handleAddNote}
                  className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
                >
                  Add
                </button>
              </div>
              <ul className="space-y-2 max-h-32 overflow-y-auto">
                {userNotes.map((note, index) => (
                  <li key={index} className="flex items-center justify-between p-2 theme-surface-alt rounded">
                    <span className="theme-text">{note}</span>
                    <button
                      onClick={() => handleRemoveNote(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Custom Key-Value Input */}
          <div className="theme-surface p-4 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4 theme-text">Custom Data</h3>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Key"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                className="w-full p-2 border theme-border rounded theme-surface theme-text"
              />
              <textarea
                placeholder="Value (JSON or string)"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                className="w-full p-2 border theme-border rounded theme-surface theme-text"
                rows={3}
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSaveKeyValue}
                  className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
                >
                  Save
                </button>
                <button
                  onClick={handleSaveComplexData}
                  className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors"
                >
                  Save Complex Demo Data
                </button>
              </div>
            </div>
          </div>

          {/* Data Management */}
          <div className="theme-surface p-4 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4 theme-text">Data Management</h3>
            <div className="flex gap-2">
              <button
                onClick={clearAllData}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
              >
                Clear All Data
              </button>
            </div>
          </div>
        </div>

        {/* Data Display */}
        <div className="space-y-6">
          {/* Current Data Overview */}
          <div className="theme-surface p-4 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4 theme-text">Data Overview</h3>
            <div className="text-sm space-y-2">
              <div>
                <span className="font-medium theme-text">Total Keys: </span>
                <span className="theme-text-secondary">{Object.keys(data).length}</span>
              </div>
              {complexData && (
                <>
                  <div>
                    <span className="font-medium theme-text">Active Project: </span>
                    <span className="theme-text-secondary">{complexData.projectState?.activeProject}</span>
                  </div>
                  <div>
                    <span className="font-medium theme-text">Open Files: </span>
                    <span className="theme-text-secondary">
                      {complexData.projectState?.openFiles?.join(', ') || 'None'}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium theme-text">Theme: </span>
                    <span className="theme-text-secondary">{complexData.profile?.preferences?.theme}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Raw Data Display */}
          <div className="theme-surface p-4 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4 theme-text">Raw Data</h3>
            <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded text-xs overflow-auto max-h-96 theme-text">
              {JSON.stringify(data, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CloudSyncDemo;