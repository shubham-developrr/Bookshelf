import React, { useState, useRef, useEffect } from 'react';
import { useUser } from '../contexts/UserContext';
import { useTheme } from '../contexts/ThemeContext';
import { geminiAPIService } from '../services/GeminiAPIService';
import PremiumAIModal from './PremiumAIModal';
import ThemeSelector from './ThemeSelector';

// Custom SVG Icons (replacing lucide-react imports)
const LogOutIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
  </svg>
);

const UserIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const SettingsIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const BookOpenIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
  </svg>
);

const TrophyIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3H5a2 2 0 00-2 2v9a2 2 0 002 2h6m0-9H3m8-4l3 14h6l-3-14H8z" />
  </svg>
);

const SunIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);

const MoonIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
  </svg>
);

const PaletteIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
  </svg>
);

const SmartphoneIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a1 1 0 001-1V4a1 1 0 00-1-1H8a1 1 0 00-1 1v16a1 1 0 001 1z" />
  </svg>
);

const GeminiIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z"/>
  </svg>
);

interface UserProfileDropdownProps {
  className?: string;
}

const UserProfileDropdown: React.FC<UserProfileDropdownProps> = ({ className = '' }) => {
  const { state, actions } = useUser();
  const { theme, setThemeMode } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [showCustomThemeModal, setShowCustomThemeModal] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [geminiStatus, setGeminiStatus] = useState<'checking' | 'available' | 'unavailable'>('checking');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const user = state.user;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowThemeMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Check Gemini API status when dropdown opens
  useEffect(() => {
    if (isOpen && user) {
      setGeminiStatus('checking');
      const hasApiKey = geminiAPIService.isAvailable();
      setGeminiStatus(hasApiKey ? 'available' : 'unavailable');
    }
  }, [isOpen, user]);

  const handleLogout = async () => {
    try {
      await actions.logout();
      setIsOpen(false);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleThemeChange = (newTheme: string) => {
    if (newTheme === 'custom') {
      setShowCustomThemeModal(true);
      setShowThemeMenu(false);
      setIsOpen(false);
    } else {
      setThemeMode(newTheme as any);
      setShowThemeMenu(false);
      setIsOpen(false);
    }
  };

  const handlePremiumAI = () => {
    setIsOpen(false);
    setShowPremiumModal(true);
  };

  const getThemeIcon = (themeName: string) => {
    switch (themeName) {
      case 'light': return <SunIcon />;
      case 'dark': return <MoonIcon />;
      case 'amoled': return <SmartphoneIcon />;
      case 'custom': return <PaletteIcon />;
      default: return <SunIcon />;
    }
  };

  const getThemeLabel = (themeName: string) => {
    switch (themeName) {
      case 'light': return 'Light';
      case 'dark': return 'Dark';
      case 'amoled': return 'AMOLED';
      case 'custom': return 'Custom';
      default: return 'Light';
    }
  };

  if (!user) return null;

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* User Avatar/Profile Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 p-2 rounded-lg transition-all duration-200 
                   theme-surface hover:theme-surface-hover theme-border border
                   focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
        aria-label="User menu"
      >
        {user.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt={user.fullName || user.email}
            className="w-8 h-8 rounded-full object-cover"
          />
        ) : (
          <div className="w-8 h-8 rounded-full theme-accent flex items-center justify-center">
            <UserIcon />
          </div>
        )}
        
        {/* User Name - Hidden on mobile */}
        <div className="hidden md:block text-left">
          <div className="theme-text text-sm font-medium truncate max-w-32">
            {user.fullName || user.email?.split('@')[0]}
          </div>
          <div className="theme-text-secondary text-xs truncate max-w-32">
            {user.email}
          </div>
        </div>

        {/* Dropdown Arrow */}
        <svg
          className={`w-4 h-4 theme-text-secondary transition-transform duration-200 ${
            isOpen ? 'transform rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 theme-surface theme-border border rounded-lg shadow-xl z-50
                       transform transition-all duration-200 origin-top-right
                       translate-x-1/2 -mr-32"
             style={{ 
               left: '50%', 
               transform: 'translateX(-50%)',
               marginTop: '0.5rem'
             }}>
          {/* User Info Header */}
          <div className="p-4 border-b theme-border">
            <div className="flex items-center space-x-3">
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.fullName || user.email}
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-full theme-accent flex items-center justify-center">
                  <UserIcon />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="theme-text font-medium truncate">
                  {user.fullName || 'User'}
                </div>
                <div className="theme-text-secondary text-sm truncate">
                  {user.email}
                </div>
                {user.role && (
                  <div className="theme-accent-text text-xs font-medium uppercase tracking-wide">
                    {user.role}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <div className="py-2">
            {/* Profile/Settings */}
            <button
              onClick={() => {
                setIsOpen(false);
                // TODO: Navigate to profile settings
              }}
              className="flex items-center space-x-3 w-full px-4 py-2 text-left 
                         hover:theme-surface-hover theme-text transition-colors duration-150"
            >
              <SettingsIcon />
              <span>Profile Settings</span>
            </button>

            {/* My Progress */}
            <button
              onClick={() => {
                setIsOpen(false);
                // TODO: Navigate to progress dashboard
              }}
              className="flex items-center space-x-3 w-full px-4 py-2 text-left 
                         hover:theme-surface-hover theme-text transition-colors duration-150"
            >
              <TrophyIcon />
              <span>My Progress</span>
            </button>

            {/* My Library */}
            <button
              onClick={() => {
                setIsOpen(false);
                // TODO: Navigate to user's library
              }}
              className="flex items-center space-x-3 w-full px-4 py-2 text-left 
                         hover:theme-surface-hover theme-text transition-colors duration-150"
            >
              <BookOpenIcon />
              <span>My Library</span>
            </button>

            {/* Premium AI Access */}
            <button
              onClick={handlePremiumAI}
              className="flex items-center justify-between w-full px-4 py-2 text-left 
                         hover:theme-surface-hover theme-text transition-colors duration-150"
            >
              <div className="flex items-center space-x-3">
                <GeminiIcon />
                <span>Premium AI</span>
              </div>
              <div className="flex items-center space-x-2">
                {geminiStatus === 'checking' && (
                  <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                )}
                {geminiStatus === 'available' && (
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <span className="text-xs theme-text-secondary">Active</span>
                  </div>
                )}
                {geminiStatus === 'unavailable' && (
                  <div className="flex items-center space-x-1">
                    <span className="text-xs text-blue-600 font-medium">Upgrade</span>
                    <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                )}
              </div>
            </button>

            {/* Theme Selector */}
            <div className="relative">
              <button
                onClick={() => setShowThemeMenu(!showThemeMenu)}
                className="flex items-center justify-between w-full px-4 py-2 text-left 
                           hover:theme-surface-hover theme-text transition-colors duration-150"
              >
                <div className="flex items-center space-x-3">
                  {getThemeIcon(theme.mode)}
                  <span>Theme</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm theme-text-secondary">
                    {getThemeLabel(theme.mode)}
                  </span>
                  <svg
                    className={`w-4 h-4 theme-text-secondary transition-transform duration-200 ${
                      showThemeMenu ? 'transform rotate-180' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              {/* Theme Submenu */}
              {showThemeMenu && (
                <div className="ml-4 mt-1 mb-2 space-y-1">
                  {['light', 'dark', 'amoled', 'custom'].map((themeName) => (
                    <button
                      key={themeName}
                      onClick={() => handleThemeChange(themeName)}
                      className={`flex items-center space-x-3 w-full px-4 py-2 text-left 
                                 hover:theme-surface-hover transition-colors duration-150 rounded-md
                                 ${theme.mode === themeName ? 'theme-accent-text bg-opacity-10' : 'theme-text'}`}
                    >
                      {getThemeIcon(themeName)}
                      <span className="text-sm">{getThemeLabel(themeName)}</span>
                      {theme.mode === themeName && (
                        <div className="ml-auto w-2 h-2 rounded-full theme-accent"></div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="border-t theme-border my-2"></div>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="flex items-center space-x-3 w-full px-4 py-2 text-left 
                         hover:bg-red-50 hover:text-red-600 theme-text 
                         transition-colors duration-150"
            >
              <LogOutIcon />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}

      {/* Premium AI Modal */}
      <PremiumAIModal
        isOpen={showPremiumModal}
        onClose={() => setShowPremiumModal(false)}
      />

      {/* Custom Theme Modal */}
      {showCustomThemeModal && (
        <ThemeSelector 
          isOpen={showCustomThemeModal} 
          onClose={() => setShowCustomThemeModal(false)} 
        />
      )}
    </div>
  );
};

export default UserProfileDropdown;
