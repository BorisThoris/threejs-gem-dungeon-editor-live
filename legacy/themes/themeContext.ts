import { createContext } from "react";
import type { ColorTheme } from "./colors";

export type ThemeContextType = {
  currentTheme: ColorTheme;
  setTheme: (themeName: string) => void;
  availableThemes: string[];
  isDark: boolean;
};

// Runtime export for compatibility
export const ThemeContextType = {} as ThemeContextType;

export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);
