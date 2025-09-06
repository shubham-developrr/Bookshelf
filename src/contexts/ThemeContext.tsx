import React, { createContext, useContext, useState, useEffect } from 'react';

/**
 * @type ThemeMode
 * @description Defines the available theme modes for the application.
 */
export type ThemeMode = 'light' | 'dark' | 'blue' | 'amoled' | 'custom';

/**
 * @interface CustomThemeColors
 * @description Defines the structure for a user's custom theme colors.
 * @property {string} primary - The primary background color.
 * @property {string} secondary - The secondary surface color.
 * @property {string} accent - The accent color.
 */
interface CustomThemeColors {
  primary: string;
  secondary: string; 
  accent: string;
}

/**
 * @interface Theme
 * @description Defines the complete structure of a theme, including its mode and a detailed color palette.
 * @property {ThemeMode} mode - The current theme mode.
 * @property {object} colors - The detailed color palette for the theme.
 */
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

/**
 * @description Generates a full Theme object from a user's custom color selections.
 * @param {CustomThemeColors} customColors - The user-defined custom colors.
 * @returns {Theme} The generated theme object.
 */
const generateCustomTheme = (customColors: CustomThemeColors): Theme => {
  return {
    mode: 'custom',
    colors: {
      bg: customColors.primary,
      surface: customColors.secondary,
      surface2: customColors.accent,
      text: getContrastText(customColors.primary),
      textSecondary: adjustOpacity(getContrastText(customColors.primary), 0.7),
      accent: customColors.accent,
      accentHover: darkenColor(customColors.accent, 0.1),
      border: adjustOpacity(getContrastText(customColors.primary), 0.2),
      shadow: `rgba(0, 0, 0, 0.2)`,
    },
  };
};

/**
 * @description Determines if a hex color is light or dark.
 * @param {string} color - The hex color string.
 * @returns {boolean} True if the color is light, false otherwise.
 */
const isLightColor = (color: string): boolean => {
  const hex = color.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const brightness = ((r * 299) + (g * 587) + (b * 114)) / 1000;
  return brightness > 128;
};

/**
 * @description Gets a contrasting text color (black or white) for a given background color.
 * @param {string} bgColor - The background hex color string.
 * @returns {string} The contrasting text color ('#1e293b' or '#f8fafc').
 */
const getContrastText = (bgColor: string): string => {
  return isLightColor(bgColor) ? '#1e293b' : '#f8fafc';
};

/**
 * @description Adjusts the opacity of a hex color.
 * @param {string} color - The hex color string.
 * @param {number} opacity - The desired opacity (0-1).
 * @returns {string} The color in rgba format.
 */
const adjustOpacity = (color: string, opacity: number): string => {
  if (color.startsWith('#')) {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }
  return color;
};

/**
 * @description Darkens a hex color by a specified amount.
 * @param {string} color - The hex color string.
 * @param {number} amount - The amount to darken (0-1).
 * @returns {string} The new darkened hex color string.
 */
const darkenColor = (color: string, amount: number): string => {
  const hex = color.replace('#', '');
  const r = Math.max(0, parseInt(hex.substr(0, 2), 16) - Math.floor(255 * amount));
  const g = Math.max(0, parseInt(hex.substr(2, 2), 16) - Math.floor(255 * amount));
  const b = Math.max(0, parseInt(hex.substr(4, 2), 16) - Math.floor(255 * amount));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
};

/**
 * @const themes
 * @description An object containing the definitions for all the predefined themes.
 */
const themes: Record<Exclude<ThemeMode, 'custom'>, Theme> = {
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
      accent: '#ffffff',
      accentHover: '#f0f0f0',
      border: '#ffffff',
      shadow: 'rgba(255, 255, 255, 0.1)',
    },
  },
};

/**
 * @interface ThemeContextType
 * @description Defines the shape of the context value provided by the ThemeProvider.
 * @property {Theme} theme - The current theme object.
 * @property {ThemeMode} themeMode - The current theme mode.
 * @property {(mode: ThemeMode) => void} setThemeMode - Function to set the theme mode.
 * @property {(colors: CustomThemeColors) => void} setCustomTheme - Function to set a custom theme.
 * @property {CustomThemeColors | null} customColors - The current custom theme colors, if any.
 * @property {ThemeMode[]} availableThemes - An array of all available theme modes.
 */
interface ThemeContextType {
  theme: Theme;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  setCustomTheme: (colors: CustomThemeColors) => void;
  customColors: CustomThemeColors | null;
  availableThemes: ThemeMode[];
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

/**
 * @description A provider component that manages the theme state, applies theme styles as CSS variables,
 * and makes the theme context available to its children.
 * @param {{ children: React.ReactNode }} props - The component's props.
 * @returns {React.FC} The ThemeProvider component.
 */
export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themeMode, setThemeMode] = useState<ThemeMode>('dark');
  const [customColors, setCustomColors] = useState<CustomThemeColors | null>(null);

  useEffect(() => {
    const savedMode = localStorage.getItem('theme-mode') as ThemeMode;
    const savedCustomColors = localStorage.getItem('custom-theme-colors');
    
    if (savedCustomColors) {
      setCustomColors(JSON.parse(savedCustomColors));
    }
    
    if (savedMode && (themes[savedMode as keyof typeof themes] || savedMode === 'custom')) {
      setThemeMode(savedMode);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('theme-mode', themeMode);
    
    let currentTheme: Theme;
    if (themeMode === 'custom' && customColors) {
      currentTheme = generateCustomTheme(customColors);
    } else {
      currentTheme = themes[themeMode as keyof typeof themes] || themes.dark;
    }
    
    // Apply CSS variables
    const root = document.documentElement;
    root.style.setProperty('--color-bg', currentTheme.colors.bg);
    root.style.setProperty('--color-surface', currentTheme.colors.surface);
    root.style.setProperty('--color-surface2', currentTheme.colors.surface2);
    root.style.setProperty('--color-text', currentTheme.colors.text);
    root.style.setProperty('--color-text-secondary', currentTheme.colors.textSecondary);
    root.style.setProperty('--color-accent', currentTheme.colors.accent);
    root.style.setProperty('--color-accent-hover', currentTheme.colors.accentHover);
    root.style.setProperty('--color-border', currentTheme.colors.border);
    root.style.setProperty('--color-shadow', currentTheme.colors.shadow);
    
    // Smart accent text color - uses accent color directly
    root.style.setProperty('--color-accent-text', currentTheme.colors.accent);
    
    // Smart accent text contrast - uses best contrast against current background
    const accentIsLight = isLightColor(currentTheme.colors.accent);
    const bgIsLight = isLightColor(currentTheme.colors.bg);
    
    // If accent is light and background is light, use dark text
    // If accent is dark and background is dark, use light text
    // Otherwise use the accent color
    let smartAccentText: string;
    if (accentIsLight && bgIsLight) {
      smartAccentText = '#1e293b'; // dark text for light accent on light bg
    } else if (!accentIsLight && !bgIsLight) {
      smartAccentText = '#f8fafc'; // light text for dark accent on dark bg  
    } else {
      smartAccentText = currentTheme.colors.accent; // use accent color when contrast is good
    }
    
    root.style.setProperty('--color-accent-text-contrast', smartAccentText);
    
    // Accent background text - always contrasting with accent color
    const accentBgText = isLightColor(currentTheme.colors.accent) ? '#1e293b' : '#ffffff';
    root.style.setProperty('--color-accent-bg-text', accentBgText);
  }, [themeMode, customColors]);

  const setCustomTheme = (colors: CustomThemeColors) => {
    setCustomColors(colors);
    localStorage.setItem('custom-theme-colors', JSON.stringify(colors));
    setThemeMode('custom');
  };

  const getCurrentTheme = (): Theme => {
    if (themeMode === 'custom' && customColors) {
      return generateCustomTheme(customColors);
    }
    return themes[themeMode as keyof typeof themes] || themes.dark;
  };

  const value: ThemeContextType = {
    theme: getCurrentTheme(),
    themeMode,
    setThemeMode: (mode: ThemeMode) => setThemeMode(mode),
    setCustomTheme,
    customColors,
    availableThemes: Object.keys(themes).concat(['custom']) as ThemeMode[],
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

/**
 * @description A custom hook for easily accessing the ThemeContext.
 * It must be used within a ThemeProvider.
 * @returns {ThemeContextType} The theme context value.
 */
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
