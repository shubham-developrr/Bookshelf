import { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';

/**
 * SupabaseStatusChecker - Component to verify Supabase integration
 * Shows connection status and environment variables
 */
export function SupabaseStatusChecker() {
  const [status, setStatus] = useState<{
    connection: 'checking' | 'connected' | 'error';
    env: 'configured' | 'missing';
    user: 'authenticated' | 'anonymous';
    error?: string;
  }>({
    connection: 'checking',
    env: 'missing',
    user: 'anonymous'
  });

  useEffect(() => {
    checkSupabaseStatus();
  }, []);

  const checkSupabaseStatus = async () => {
    try {
      // Check environment variables
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseKey) {
        setStatus(prev => ({
          ...prev,
          connection: 'error',
          env: 'missing',
          error: 'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in environment'
        }));
        return;
      }

      // Test connection
      const { data, error } = await supabase.from('profiles').select('count').limit(1);
      
      if (error) {
        setStatus(prev => ({
          ...prev,
          connection: 'error',
          env: 'configured',
          error: `Connection failed: ${error.message}`
        }));
        return;
      }

      // Check user authentication
      const { data: { user } } = await supabase.auth.getUser();
      
      setStatus({
        connection: 'connected',
        env: 'configured',
        user: user ? 'authenticated' : 'anonymous'
      });

    } catch (error) {
      setStatus(prev => ({
        ...prev,
        connection: 'error',
        error: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`
      }));
    }
  };

  const getStatusColor = (value: string) => {
    switch (value) {
      case 'connected':
      case 'configured':
      case 'authenticated':
        return 'text-green-600';
      case 'checking':
        return 'text-yellow-600';
      case 'error':
      case 'missing':
      case 'anonymous':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="theme-surface rounded-lg p-4 border border-gray-200 max-w-md">
      <h3 className="theme-text font-semibold mb-3">🔧 Supabase Status</h3>
      
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="theme-text">Environment:</span>
          <span className={getStatusColor(status.env)}>
            {status.env}
          </span>
        </div>
        
        <div className="flex justify-between">
          <span className="theme-text">Connection:</span>
          <span className={getStatusColor(status.connection)}>
            {status.connection}
          </span>
        </div>
        
        <div className="flex justify-between">
          <span className="theme-text">User:</span>
          <span className={getStatusColor(status.user)}>
            {status.user}
          </span>
        </div>
      </div>

      {status.error && (
        <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-xs">
          {status.error}
        </div>
      )}

      <button
        onClick={checkSupabaseStatus}
        className="mt-3 w-full px-3 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 transition-colors"
      >
        Refresh Status
      </button>
    </div>
  );
}
