import React from "react";
import { useTheme } from "./themeHooks";
import { THEMES } from "./colors";

interface ThemeSelectorProps {
  className?: string;
  style?: React.CSSProperties;
}

export const ThemeSelector: React.FC<ThemeSelectorProps> = ({
  className,
  style,
}) => {
  const { currentTheme, setTheme, availableThemes } = useTheme();

  return (
    <div
      className={className}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        ...style,
      }}
    >
      <label
        style={{
          color: currentTheme.text,
          fontSize: "14px",
          fontWeight: "600",
          marginBottom: "4px",
        }}
      >
        Theme
      </label>
      <select
        value={currentTheme.name.toLowerCase()}
        onChange={(e) => setTheme(e.target.value)}
        style={{
          backgroundColor: currentTheme.surface,
          color: currentTheme.text,
          border: `1px solid ${currentTheme.border}`,
          borderRadius: "6px",
          padding: "8px 12px",
          fontSize: "14px",
          cursor: "pointer",
          outline: "none",
          transition: "border-color 0.3s ease",
        }}
        onFocus={(e) => {
          e.target.style.borderColor = currentTheme.primary;
        }}
        onBlur={(e) => {
          e.target.style.borderColor = currentTheme.border;
        }}
      >
        {availableThemes.map((themeName) => (
          <option key={themeName} value={themeName}>
            {THEMES[themeName].name}
          </option>
        ))}
      </select>
    </div>
  );
};

// Theme preview component
export const ThemePreview: React.FC = () => {
  const { currentTheme } = useTheme();

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        padding: "16px",
        backgroundColor: currentTheme.surface,
        border: `1px solid ${currentTheme.border}`,
        borderRadius: "8px",
        margin: "16px 0",
      }}
    >
      <h3
        style={{
          color: currentTheme.text,
          margin: 0,
          fontSize: "18px",
        }}
      >
        Theme Preview
      </h3>

      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        <div
          style={{
            width: "40px",
            height: "40px",
            backgroundColor: currentTheme.primary,
            borderRadius: "6px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: currentTheme.text,
            fontSize: "12px",
            fontWeight: "bold",
          }}
          title="Primary"
        >
          P
        </div>
        <div
          style={{
            width: "40px",
            height: "40px",
            backgroundColor: currentTheme.secondary,
            borderRadius: "6px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: currentTheme.text,
            fontSize: "12px",
            fontWeight: "bold",
          }}
          title="Secondary"
        >
          S
        </div>
        <div
          style={{
            width: "40px",
            height: "40px",
            backgroundColor: currentTheme.accent,
            borderRadius: "6px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: currentTheme.text,
            fontSize: "12px",
            fontWeight: "bold",
          }}
          title="Accent"
        >
          A
        </div>
        <div
          style={{
            width: "40px",
            height: "40px",
            backgroundColor: currentTheme.success,
            borderRadius: "6px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: currentTheme.text,
            fontSize: "12px",
            fontWeight: "bold",
          }}
          title="Success"
        >
          ✓
        </div>
        <div
          style={{
            width: "40px",
            height: "40px",
            backgroundColor: currentTheme.warning,
            borderRadius: "6px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: currentTheme.text,
            fontSize: "12px",
            fontWeight: "bold",
          }}
          title="Warning"
        >
          !
        </div>
        <div
          style={{
            width: "40px",
            height: "40px",
            backgroundColor: currentTheme.error,
            borderRadius: "6px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: currentTheme.text,
            fontSize: "12px",
            fontWeight: "bold",
          }}
          title="Error"
        >
          ✕
        </div>
      </div>

      <div
        style={{
          color: currentTheme.textSecondary,
          fontSize: "12px",
        }}
      >
        {currentTheme.name} Theme
      </div>
    </div>
  );
};
