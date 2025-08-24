import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import { supabaseUserService } from '../services/SupabaseUserService';

const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const { state } = useUser();
  const [isProcessing, setIsProcessing] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        setIsProcessing(true);
        
        // Handle OAuth callback
        const user = await supabaseUserService.handleOAuthCallback();
        
        if (user) {
          // Successfully logged in with OAuth
          console.log('OAuth login successful:', user);
          navigate('/', { replace: true });
        } else {
          setError('OAuth authentication failed');
        }
      } catch (err: any) {
        console.error('OAuth callback error:', err);
        setError(err.message || 'Authentication failed');
      } finally {
        setIsProcessing(false);
      }
    };

    handleAuthCallback();
  }, [navigate]);

  // If user is already authenticated, redirect to home
  useEffect(() => {
    if (state.isAuthenticated && !isProcessing) {
      navigate('/', { replace: true });
    }
  }, [state.isAuthenticated, isProcessing, navigate]);

  if (isProcessing) {
    return (
      <div className="min-h-screen theme-bg flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold theme-text mb-2">Completing sign in...</h2>
          <p className="theme-text-secondary">Please wait while we set up your account</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen theme-bg flex items-center justify-center">
        <div className="max-w-md w-full mx-4">
          <div className="theme-surface rounded-lg p-8 text-center theme-border border">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold theme-text mb-2">Authentication Failed</h2>
            <p className="theme-text-secondary mb-6">{error}</p>
            <button
              onClick={() => navigate('/', { replace: true })}
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg
                         transition-colors duration-200"
            >
              Return to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  // This shouldn't normally be reached
  return null;
};

export default AuthCallback;
