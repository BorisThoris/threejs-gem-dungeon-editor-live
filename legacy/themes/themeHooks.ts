import { useContext } from "react";
import { ThemeContext, type ThemeContextType } from "./themeContext";

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};

// Hook for getting theme-aware styles
export const useThemeStyles = () => {
  const { currentTheme } = useTheme();

  return {
    // Common component styles
    button: {
      primary: {
        backgroundColor: currentTheme.primary,
        color: currentTheme.text,
        border: `1px solid ${currentTheme.primary}`,
        borderRadius: "8px",
        padding: "12px 24px",
        cursor: "pointer",
        transition: "all 0.3s ease",
      },
      secondary: {
        backgroundColor: "transparent",
        color: currentTheme.primary,
        border: `1px solid ${currentTheme.primary}`,
        borderRadius: "8px",
        padding: "12px 24px",
        cursor: "pointer",
        transition: "all 0.3s ease",
      },
    },
    input: {
      backgroundColor: currentTheme.background,
      color: currentTheme.text,
      border: `1px solid ${currentTheme.secondary}`,
      borderRadius: "8px",
      padding: "12px 16px",
      outline: "none",
      transition: "border-color 0.3s ease",
    },
    card: {
      backgroundColor: currentTheme.surface,
      color: currentTheme.text,
      border: `1px solid ${currentTheme.secondary}`,
      borderRadius: "12px",
      padding: "20px",
      boxShadow: `0 4px 8px ${currentTheme.shadow}`,
    },
    panel: {
      backgroundColor: currentTheme.surface,
      color: currentTheme.text,
      border: `1px solid ${currentTheme.secondary}`,
      borderRadius: "12px",
      padding: "24px",
    },
  };
};
