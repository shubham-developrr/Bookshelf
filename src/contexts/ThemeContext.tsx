import React, { createContext, useContext, useState, useEffect } from 'react';

export type ThemeMode = 'light' | 'dark' | 'blue' | 'amoled';

interface Theme {
  mode: ThemeMode;
  colors: {
    bg: string;
    surface: string;
    surface2: string;
    text: string;
    textSecondary: string;
    accent: string;
    accentHover: string;
    border: string;
    shadow: string;
  };
}

const themes: Record<ThemeMode, Theme> = {
  light: {
    mode: 'light',
    colors: {
      bg: '#ffffff',
      surface: '#f8fafc',
      surface2: '#f1f5f9',
      text: '#1e293b',
      textSecondary: '#64748b',
      accent: '#3b82f6',
      accentHover: '#2563eb',
      border: '#e2e8f0',
      shadow: 'rgba(0, 0, 0, 0.1)',
    },
  },
  dark: {
    mode: 'dark',
    colors: {
      bg: '#0f172a',
      surface: '#1e293b',
      surface2: '#334155',
      text: '#f8fafc',
      textSecondary: '#94a3b8',
      accent: '#3b82f6',
      accentHover: '#2563eb',
      border: '#475569',
      shadow: 'rgba(0, 0, 0, 0.3)',
    },
  },
  blue: {
    mode: 'blue',
    colors: {
      bg: '#0c4a6e',
      surface: '#0369a1',
      surface2: '#0284c7',
      text: '#f0f9ff',
      textSecondary: '#bae6fd',
      accent: '#06b6d4',
      accentHover: '#0891b2',
      border: '#0ea5e9',
      shadow: 'rgba(6, 182, 212, 0.2)',
    },
  },
  amoled: {
    mode: 'amoled',
    colors: {
      bg: '#000000',
      surface: '#111111',
      surface2: '#1a1a1a',
      text: '#ffffff',
      textSecondary: '#cccccc',
      accent: '#00d9ff',
      accentHover: '#00b8d4',
      border: '#333333',
      shadow: 'rgba(0, 217, 255, 0.2)',
    },
  },
};

interface ThemeContextType {
  theme: Theme;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  availableThemes: ThemeMode[];
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themeMode, setThemeMode] = useState<ThemeMode>('dark');

  useEffect(() => {
    const saved = localStorage.getItem('theme-mode') as ThemeMode;
    if (saved && themes[saved]) {
      setThemeMode(saved);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('theme-mode', themeMode);
    const theme = themes[themeMode];
    
    // Apply CSS variables
    const root = document.documentElement;
    root.style.setProperty('--color-bg', theme.colors.bg);
    root.style.setProperty('--color-surface', theme.colors.surface);
    root.style.setProperty('--color-surface2', theme.colors.surface2);
    root.style.setProperty('--color-text', theme.colors.text);
    root.style.setProperty('--color-text-secondary', theme.colors.textSecondary);
    root.style.setProperty('--color-accent', theme.colors.accent);
    root.style.setProperty('--color-accent-hover', theme.colors.accentHover);
    root.style.setProperty('--color-border', theme.colors.border);
    root.style.setProperty('--color-shadow', theme.colors.shadow);
  }, [themeMode]);

  const value: ThemeContextType = {
    theme: themes[themeMode],
    themeMode,
    setThemeMode: (mode: ThemeMode) => setThemeMode(mode),
    availableThemes: Object.keys(themes) as ThemeMode[],
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
