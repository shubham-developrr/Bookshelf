import { useState, useEffect, useCallback } from 'react';
import { userDataStorageService, UserData, SyncStatus } from '../services/UserDataStorageService';
import { useAuth } from '../contexts/UserContext';

/**
 * useUserData Hook - localStorage-like API with cloud sync
 * Provides cross-device synchronization for any JavaScript data structures
 */

interface UserDataManager {
  data: UserData;
  loading: boolean;
  syncStatus: SyncStatus;
  saveData: (key: string, value: any) => Promise<void>;
  getData: (key: string) => any;
  removeData: (key: string) => Promise<void>;
  clearAllData: () => Promise<void>;
  getAllData: () => UserData;
  forceSync: () => Promise<void>;
  getDataSize: () => { sizeBytes: number; sizeMB: number; warning: boolean };
}

export const useUserData = (): UserDataManager => {
  const { user, isAuthenticated } = useAuth();
  const [data, setData] = useState<UserData>({});
  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    lastSynced: null,
    isSyncing: false,
    hasUnsyncedChanges: false,
    error: null
  });

  // Initialize service when user logs in
  useEffect(() => {
    if (isAuthenticated && user) {
      initializeService();
    } else {
      // Clear data when user logs out
      setData({});
      setLoading(false);
      setSyncStatus({
        lastSynced: null,
        isSyncing: false,
        hasUnsyncedChanges: false,
        error: null
      });
      userDataStorageService.cleanup();
    }
  }, [isAuthenticated, user]);

  // Subscribe to sync status changes
  useEffect(() => {
    const unsubscribe = userDataStorageService.onSyncStatusChange(setSyncStatus);
    return unsubscribe;
  }, []);

  const initializeService = async () => {
    if (!user) return;

    try {
      setLoading(true);
      await userDataStorageService.initialize(user.id);
      
      // Load initial data
      const initialData = userDataStorageService.getAllData();
      setData(initialData);
      
      // Get initial sync status
      setSyncStatus(userDataStorageService.getSyncStatus());
    } catch (error) {
      console.error('Failed to initialize user data service:', error);
      setSyncStatus(prev => ({
        ...prev,
        error: 'Failed to initialize cloud sync'
      }));
    } finally {
      setLoading(false);
    }
  };

  // Save data (localStorage-like API)
  const saveData = useCallback(async (key: string, value: any) => {
    try {
      await userDataStorageService.saveData(key, value);
      const updatedData = userDataStorageService.getAllData();
      setData(updatedData);
    } catch (error) {
      console.error('Failed to save data:', error);
      throw error;
    }
  }, []);

  // Get data (localStorage-like API)
  const getData = useCallback((key: string) => {
    return userDataStorageService.getData(key);
  }, []);

  // Remove data
  const removeData = useCallback(async (key: string) => {
    try {
      await userDataStorageService.removeData(key);
      const updatedData = userDataStorageService.getAllData();
      setData(updatedData);
    } catch (error) {
      console.error('Failed to remove data:', error);
      throw error;
    }
  }, []);

  // Clear all data
  const clearAllData = useCallback(async () => {
    try {
      await userDataStorageService.clearAllData();
      setData({});
    } catch (error) {
      console.error('Failed to clear data:', error);
      throw error;
    }
  }, []);

  // Get all data
  const getAllData = useCallback(() => {
    return userDataStorageService.getAllData();
  }, []);

  // Force sync
  const forceSync = useCallback(async () => {
    try {
      await userDataStorageService.forceSync();
      const updatedData = userDataStorageService.getAllData();
      setData(updatedData);
    } catch (error) {
      console.error('Failed to force sync:', error);
      throw error;
    }
  }, []);

  // Get data size info
  const getDataSize = useCallback(() => {
    return userDataStorageService.checkStorageUsage();
  }, []);

  return {
    data,
    loading,
    syncStatus,
    saveData,
    getData,
    removeData,
    clearAllData,
    getAllData,
    forceSync,
    getDataSize
  };
};

/**
 * Higher-order hook for specific data types
 */
export const useUserDataKey = <T = any>(key: string, defaultValue?: T) => {
  const { data, saveData, getData, removeData, loading, syncStatus } = useUserData();
  
  const value = getData(key) ?? defaultValue;
  
  const setValue = useCallback(async (newValue: T) => {
    await saveData(key, newValue);
  }, [key, saveData]);
  
  const removeValue = useCallback(async () => {
    await removeData(key);
  }, [key, removeData]);
  
  return {
    value,
    setValue,
    removeValue,
    loading,
    syncStatus
  };
};

/**
 * Hook for complex nested data structures
 */
export const useUserDataObject = <T extends Record<string, any>>(key: string, defaultValue: T = {} as T) => {
  const { value, setValue, loading, syncStatus } = useUserDataKey<T>(key, defaultValue);
  
  const updateField = useCallback(async (field: keyof T, fieldValue: any) => {
    const current = value || defaultValue;
    await setValue({
      ...current,
      [field]: fieldValue
    });
  }, [value, setValue, defaultValue]);
  
  const removeField = useCallback(async (field: keyof T) => {
    const current = value || defaultValue;
    const updated = { ...current };
    delete updated[field];
    await setValue(updated);
  }, [value, setValue, defaultValue]);
  
  return {
    value: value || defaultValue,
    setValue,
    updateField,
    removeField,
    loading,
    syncStatus
  };
};

/**
 * Hook for array data
 */
export const useUserDataArray = <T = any>(key: string, defaultValue: T[] = []) => {
  const { value, setValue, loading, syncStatus } = useUserDataKey<T[]>(key, defaultValue);
  
  const addItem = useCallback(async (item: T) => {
    const current = value || defaultValue;
    await setValue([...current, item]);
  }, [value, setValue, defaultValue]);
  
  const removeItem = useCallback(async (index: number) => {
    const current = value || defaultValue;
    const updated = current.filter((_, i) => i !== index);
    await setValue(updated);
  }, [value, setValue, defaultValue]);
  
  const updateItem = useCallback(async (index: number, item: T) => {
    const current = value || defaultValue;
    const updated = [...current];
    updated[index] = item;
    await setValue(updated);
  }, [value, setValue, defaultValue]);
  
  return {
    value: value || defaultValue,
    setValue,
    addItem,
    removeItem,
    updateItem,
    loading,
    syncStatus
  };
};