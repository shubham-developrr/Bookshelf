import React from 'react';
import { useAuth } from '../contexts/UserContext';

interface AuthWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * AuthWrapper - Wraps components that require authentication
 * Shows auth modal or fallback when user is not authenticated
 */
export const AuthWrapper: React.FC<AuthWrapperProps> = ({ children, fallback }) => {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen theme-surface">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="theme-text">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return fallback || (
      <div className="flex items-center justify-center min-h-screen theme-surface">
        <div className="max-w-md w-full mx-auto p-6">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold theme-text mb-2">Cloud Sync Demo</h1>
            <p className="theme-text-secondary">
              Please sign in to access the cloud synchronization features.
            </p>
          </div>
          
          <div className="theme-surface-alt p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold theme-text mb-4">Authentication Required</h2>
            <p className="theme-text-secondary mb-4">
              This demo requires authentication to showcase cross-device data synchronization using Supabase Storage.
            </p>
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  <strong>Demo Features:</strong>
                  <br />• localStorage-like API with cloud sync
                  <br />• Cross-device data synchronization  
                  <br />• Real-time sync status indicators
                  <br />• Automatic conflict resolution
                </p>
              </div>
              <p className="text-sm theme-text-secondary">
                To test the cloud sync functionality, you'll need to authenticate using the existing auth system in the app.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default AuthWrapper;