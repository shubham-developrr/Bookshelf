import React, { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { CloseIcon } from './icons';

const ThemeSelector: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { themeMode, setThemeMode, availableThemes } = useTheme();

  if (!isOpen) return null;

  const themeLabels = {
    light: 'Light',
    dark: 'Dark',
    blue: 'Ocean Blue',
    amoled: 'AMOLED Black',
  };

  const themeDescriptions = {
    light: 'Clean and bright interface',
    dark: 'Easy on the eyes',
    blue: 'Calm ocean vibes',
    amoled: 'Pure black for AMOLED screens',
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="theme-surface rounded-2xl w-full max-w-md shadow-2xl theme-transition">
        <div className="flex items-center justify-between p-6 border-b theme-border">
          <h2 className="text-xl font-bold theme-text">Choose Theme</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-opacity-20 hover:theme-surface2">
            <CloseIcon />
          </button>
        </div>
        
        <div className="p-6 space-y-4">
          {availableThemes.map((theme) => (
            <button
              key={theme}
              onClick={() => {
                setThemeMode(theme);
                onClose();
              }}
              className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                themeMode === theme
                  ? 'theme-accent text-white border-transparent'
                  : 'theme-surface2 theme-text theme-border hover:theme-surface'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg">{themeLabels[theme]}</h3>
                  <p className={`text-sm ${themeMode === theme ? 'text-white opacity-90' : 'theme-text-secondary'}`}>
                    {themeDescriptions[theme]}
                  </p>
                </div>
                <div className="flex gap-2">
                  {theme === 'light' && (
                    <div className="flex gap-1">
                      <div className="w-4 h-4 bg-white border border-gray-300 rounded"></div>
                      <div className="w-4 h-4 bg-gray-100 rounded"></div>
                      <div className="w-4 h-4 bg-blue-500 rounded"></div>
                    </div>
                  )}
                  {theme === 'dark' && (
                    <div className="flex gap-1">
                      <div className="w-4 h-4 bg-gray-900 rounded"></div>
                      <div className="w-4 h-4 bg-gray-700 rounded"></div>
                      <div className="w-4 h-4 bg-blue-500 rounded"></div>
                    </div>
                  )}
                  {theme === 'blue' && (
                    <div className="flex gap-1">
                      <div className="w-4 h-4 bg-blue-900 rounded"></div>
                      <div className="w-4 h-4 bg-blue-600 rounded"></div>
                      <div className="w-4 h-4 bg-cyan-400 rounded"></div>
                    </div>
                  )}
                  {theme === 'amoled' && (
                    <div className="flex gap-1">
                      <div className="w-4 h-4 bg-black rounded"></div>
                      <div className="w-4 h-4 bg-gray-900 rounded"></div>
                      <div className="w-4 h-4 bg-cyan-400 rounded"></div>
                    </div>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ThemeSelector;
