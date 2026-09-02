// Export all theme-related functionality
export * from './colors';
export * from './ThemeContext';
export * from './ThemeSelector';

// Explicitly export the interface
export type { ColorTheme } from './colors';

// Re-export commonly used items for convenience
export { 
  THEMES, 
  DEFAULT_THEME, 
  ALL_COLORS, 
  COLOR_PALETTE,
  getRandomColor,
  getRandomColorFromPalette,
  getColorByIndex,
  getColorsByPalette,
  hexToRgb,
  rgbToHex,
  lightenColor,
  darkenColor
} from './colors';

export { 
  ThemeProvider
} from './themeProvider';

export { 
  ThemeContext,
  ThemeContextType
} from './themeContext';

export { 
  useTheme, 
  useThemeStyles 
} from './themeHooks';

export { 
  ThemeSelector, 
  ThemePreview 
} from './ThemeSelector';
