import React, { useState, useEffect, ReactNode } from "react";
import type { ColorTheme } from "./colors";
import { THEMES, DEFAULT_THEME } from "./colors";
import { ThemeContext, type ThemeContextType } from "./themeContext";

interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: string;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  defaultTheme = "dark",
}) => {
  const [currentTheme, setCurrentTheme] = useState<ColorTheme>(
    THEMES[defaultTheme] || DEFAULT_THEME
  );

  const availableThemes = Object.keys(THEMES);
  const isDark =
    currentTheme.background === "#121212" ||
    currentTheme.background === "#000000" ||
    currentTheme.background === "#0A0A0A";

  const setTheme = (themeName: string) => {
    if (THEMES[themeName]) {
      setCurrentTheme(THEMES[themeName]);
      localStorage.setItem("selectedTheme", themeName);
    }
  };

  // Load saved theme on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem("selectedTheme");
    if (savedTheme && THEMES[savedTheme]) {
      setCurrentTheme(THEMES[savedTheme]);
    }
  }, []);

  // Apply theme to document root
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--color-primary", currentTheme.primary);
    root.style.setProperty("--color-secondary", currentTheme.secondary);
    root.style.setProperty("--color-accent", currentTheme.accent);
    root.style.setProperty("--color-background", currentTheme.background);
    root.style.setProperty("--color-surface", currentTheme.surface);
    root.style.setProperty("--color-text", currentTheme.text);
    root.style.setProperty(
      "--color-text-secondary",
      currentTheme.textSecondary
    );
    root.style.setProperty("--color-border", currentTheme.border);
    root.style.setProperty("--color-success", currentTheme.success);
    root.style.setProperty("--color-warning", currentTheme.warning);
    root.style.setProperty("--color-error", currentTheme.error);
    root.style.setProperty("--color-info", currentTheme.info);
  }, [currentTheme]);

  const value: ThemeContextType = {
    currentTheme,
    setTheme,
    availableThemes,
    isDark,
  };

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};
