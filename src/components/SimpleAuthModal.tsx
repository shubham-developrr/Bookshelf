import React, { useState } from 'react';
import { useAuth } from '../contexts/UserContext';

/**
 * SimpleAuthModal - Basic authentication interface for testing Supabase integration
 */
export function SimpleAuthModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    username: '',
    fullName: ''
  });

  const { user, isAuthenticated, isLoading, error, login, register, logout } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (mode === 'login') {
        await login(formData.email, formData.password);
      } else {
        await register({
          email: formData.email,
          password: formData.password,
          username: formData.username,
          fullName: formData.fullName
        });
      }
      setIsOpen(false);
      setFormData({ email: '', password: '', username: '', fullName: '' });
    } catch (error) {
      console.error('Auth error:', error);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  if (isAuthenticated && user) {
    return (
      <div className="fixed top-4 left-4 z-50">
        <div className="theme-surface rounded-lg p-3 border border-gray-200 max-w-xs">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
              {user.fullName?.charAt(0) || user.email.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="theme-text font-medium text-sm">{user.fullName || user.username}</div>
              <div className="text-gray-500 text-xs">{user.email}</div>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full px-3 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600 transition-colors"
          >
            Logout
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Auth Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed top-4 left-4 z-50 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
      >
        🔐 Login / Register
      </button>

      {/* Auth Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="theme-surface rounded-lg p-6 w-full max-w-md border border-gray-200">
            <div className="flex justify-between items-center mb-4">
              <h2 className="theme-text text-lg font-semibold">
                {mode === 'login' ? 'Login' : 'Create Account'}
              </h2>
              <button
                onClick={() => setIsOpen(false)}
                className="theme-text hover:text-red-500 text-xl"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block theme-text text-sm font-medium mb-1">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md theme-surface theme-text"
                  placeholder="your@email.com"
                />
              </div>

              <div>
                <label className="block theme-text text-sm font-medium mb-1">
                  Password
                </label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  minLength={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md theme-surface theme-text"
                  placeholder="••••••••"
                />
              </div>

              {mode === 'register' && (
                <>
                  <div>
                    <label className="block theme-text text-sm font-medium mb-1">
                      Username
                    </label>
                    <input
                      type="text"
                      name="username"
                      value={formData.username}
                      onChange={handleChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md theme-surface theme-text"
                      placeholder="username"
                    />
                  </div>

                  <div>
                    <label className="block theme-text text-sm font-medium mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md theme-surface theme-text"
                      placeholder="Your Full Name"
                    />
                  </div>
                </>
              )}

              {error && (
                <div className="p-2 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? 'Processing...' : (mode === 'login' ? 'Login' : 'Create Account')}
              </button>
            </form>

            <div className="mt-4 text-center">
              <button
                onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
                className="theme-text hover:text-blue-500 text-sm"
              >
                {mode === 'login' ? "Don't have an account? Register" : "Already have an account? Login"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
