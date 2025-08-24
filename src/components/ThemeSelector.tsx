import React, { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { CloseIcon } from './icons';

const ThemeSelector: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { themeMode, setThemeMode, availableThemes, setCustomTheme, customColors } = useTheme();
  const [showCustomThemeForm, setShowCustomThemeForm] = useState(false);
  const [customThemeColors, setCustomThemeColors] = useState({
    primary: customColors?.primary || '#1e293b',
    secondary: customColors?.secondary || '#334155', 
    accent: customColors?.accent || '#3b82f6'
  });

  if (!isOpen) return null;

  const themeLabels: Record<string, string> = {
    light: 'Light',
    dark: 'Dark',
    blue: 'Ocean Blue',
    amoled: 'AMOLED Black',
    custom: 'Custom Theme',
  };

  const themeDescriptions: Record<string, string> = {
    light: 'Clean and bright interface',
    dark: 'Easy on the eyes',
    blue: 'Calm ocean vibes',
    amoled: 'Pure black for AMOLED screens',
    custom: 'Your personalized color scheme',
  };

  const handleCustomThemeSubmit = () => {
    setCustomTheme(customThemeColors);
    setShowCustomThemeForm(false);
    onClose();
  };

  // Helper function to determine if accent color is light
  const isLightAccent = (color: string): boolean => {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const brightness = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return brightness > 128;
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
          {showCustomThemeForm ? (
            // Custom Theme Form
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold theme-text">Create Custom Theme</h3>
                <button 
                  onClick={() => setShowCustomThemeForm(false)}
                  className="text-sm theme-text-secondary hover:theme-text"
                >
                  Back
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium theme-text mb-2">
                    Primary Color (Background)
                  </label>
                  <div className="flex gap-3 items-center">
                    <input
                      type="color"
                      value={customThemeColors.primary}
                      onChange={(e) => setCustomThemeColors(prev => ({ ...prev, primary: e.target.value }))}
                      className="w-12 h-12 rounded-lg border theme-border cursor-pointer"
                    />
                    <input
                      type="text"
                      value={customThemeColors.primary}
                      onChange={(e) => setCustomThemeColors(prev => ({ ...prev, primary: e.target.value }))}
                      className="flex-1 p-2 theme-surface2 border theme-border rounded-lg theme-text text-sm font-mono"
                      placeholder="#1e293b"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium theme-text mb-2">
                    Secondary Color (Cards/Surfaces)
                  </label>
                  <div className="flex gap-3 items-center">
                    <input
                      type="color"
                      value={customThemeColors.secondary}
                      onChange={(e) => setCustomThemeColors(prev => ({ ...prev, secondary: e.target.value }))}
                      className="w-12 h-12 rounded-lg border theme-border cursor-pointer"
                    />
                    <input
                      type="text"
                      value={customThemeColors.secondary}
                      onChange={(e) => setCustomThemeColors(prev => ({ ...prev, secondary: e.target.value }))}
                      className="flex-1 p-2 theme-surface2 border theme-border rounded-lg theme-text text-sm font-mono"
                      placeholder="#334155"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium theme-text mb-2">
                    Accent Color (Buttons/Links)
                  </label>
                  <div className="flex gap-3 items-center">
                    <input
                      type="color"
                      value={customThemeColors.accent}
                      onChange={(e) => setCustomThemeColors(prev => ({ ...prev, accent: e.target.value }))}
                      className="w-12 h-12 rounded-lg border theme-border cursor-pointer"
                    />
                    <input
                      type="text"
                      value={customThemeColors.accent}
                      onChange={(e) => setCustomThemeColors(prev => ({ ...prev, accent: e.target.value }))}
                      className="flex-1 p-2 theme-surface2 border theme-border rounded-lg theme-text text-sm font-mono"
                      placeholder="#3b82f6"
                    />
                  </div>
                </div>

                {/* Preview */}
                <div className="p-4 rounded-lg border theme-border">
                  <h4 className="text-sm font-medium theme-text mb-3">Preview</h4>
                  <div 
                    className="p-4 rounded-lg relative"
                    style={{ backgroundColor: customThemeColors.primary }}
                  >
                    <div 
                      className="p-3 rounded-lg mb-3"
                      style={{ backgroundColor: customThemeColors.secondary }}
                    >
                      <div style={{ color: customThemeColors.primary === '#ffffff' || customThemeColors.primary.toLowerCase() === '#fff' ? '#1e293b' : '#f8fafc' }}>
                        Sample card content
                      </div>
                    </div>
                    <button 
                      className="px-3 py-2 rounded text-sm"
                      style={{ 
                        backgroundColor: customThemeColors.accent,
                        color: isLightAccent(customThemeColors.accent) ? '#1e293b' : '#ffffff'
                      }}
                    >
                      Sample Button
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleCustomThemeSubmit}
                  className="flex-1 py-3 px-4 rounded-xl font-semibold theme-accent hover:bg-opacity-90 theme-transition"
                  style={{ color: 'var(--color-accent-text-contrast)' }}
                >
                  Apply Custom Theme
                </button>
                <button
                  onClick={() => setShowCustomThemeForm(false)}
                  className="px-4 py-3 theme-surface2 theme-text rounded-xl hover:theme-surface theme-transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            // Theme Selection
            <>
              {availableThemes.filter(theme => theme !== 'custom').map((theme) => (
                <button
                  key={theme}
                  onClick={() => {
                    setThemeMode(theme);
                    onClose();
                  }}
                  className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                    themeMode === theme
                      ? 'theme-accent border-transparent'
                      : 'theme-surface2 theme-text theme-border hover:theme-surface'
                  }`}
                  style={themeMode === theme ? { color: 'var(--color-accent-text-contrast)' } : {}}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-lg">{themeLabels[theme]}</h3>
                      <p className={`text-sm ${themeMode === theme ? 'opacity-90' : 'theme-text-secondary'}`} 
                         style={themeMode === theme ? { color: 'var(--color-accent-text-contrast)' } : {}}>
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
                          <div className="w-4 h-4 bg-white rounded"></div>
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              ))}

              {/* Custom Theme Option */}
              <button
                onClick={() => {
                  if (themeMode === 'custom') {
                    setThemeMode('custom');
                    onClose();
                  } else {
                    setShowCustomThemeForm(true);
                  }
                }}
                className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                  themeMode === 'custom'
                    ? 'theme-accent border-transparent'
                    : 'theme-surface2 theme-text theme-border hover:theme-surface'
                }`}
                style={themeMode === 'custom' ? { color: 'var(--color-accent-text-contrast)' } : {}}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-lg">{themeLabels.custom}</h3>
                    <p className={`text-sm ${themeMode === 'custom' ? 'opacity-90' : 'theme-text-secondary'}`}
                       style={themeMode === 'custom' ? { color: 'var(--color-accent-text-contrast)' } : {}}>
                      {themeDescriptions.custom}
                    </p>
                  </div>
                  <div className="flex gap-2 items-center">
                    {themeMode === 'custom' && customColors ? (
                      <div className="flex gap-1">
                        <div className="w-4 h-4 rounded" style={{ backgroundColor: customColors.primary }}></div>
                        <div className="w-4 h-4 rounded" style={{ backgroundColor: customColors.secondary }}></div>
                        <div className="w-4 h-4 rounded" style={{ backgroundColor: customColors.accent }}></div>
                      </div>
                    ) : (
                      <div className="text-2xl">🎨</div>
                    )}
                  </div>
                </div>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ThemeSelector;
