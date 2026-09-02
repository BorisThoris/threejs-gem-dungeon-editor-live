import React, { useState } from "react";
import { useTheme, COLOR_PALETTE, getRandomColor } from "../themes";

export const ColorPaletteDemo: React.FC = () => {
  const { currentTheme } = useTheme();
  const [selectedPalette, setSelectedPalette] =
    useState<keyof typeof COLOR_PALETTE>("red");

  return (
    <div
      style={{
        padding: "20px",
        backgroundColor: currentTheme.surface,
        border: `1px solid ${currentTheme.border}`,
        borderRadius: "12px",
        margin: "20px",
        color: currentTheme.text,
      }}
    >
      <h2 style={{ color: currentTheme.primary, marginBottom: "20px" }}>
        🎨 Color Palette Demo
      </h2>

      {/* Palette Selector */}
      <div style={{ marginBottom: "20px" }}>
        <label
          style={{
            display: "block",
            marginBottom: "8px",
            color: currentTheme.textSecondary,
          }}
        >
          Select Color Palette:
        </label>
        <select
          value={selectedPalette}
          onChange={(e) =>
            setSelectedPalette(e.target.value as keyof typeof COLOR_PALETTE)
          }
          style={{
            backgroundColor: currentTheme.surface,
            color: currentTheme.text,
            border: `1px solid ${currentTheme.border}`,
            borderRadius: "6px",
            padding: "8px 12px",
            fontSize: "14px",
            cursor: "pointer",
            outline: "none",
          }}
        >
          {Object.keys(COLOR_PALETTE).map((palette) => (
            <option key={palette} value={palette}>
              {palette.charAt(0).toUpperCase() + palette.slice(1)} (
              {COLOR_PALETTE[palette as keyof typeof COLOR_PALETTE].length}{" "}
              colors)
            </option>
          ))}
        </select>
      </div>

      {/* Color Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(40px, 1fr))",
          gap: "4px",
          marginBottom: "20px",
        }}
      >
        {COLOR_PALETTE[selectedPalette].map((color, index) => (
          <div
            key={index}
            style={{
              width: "40px",
              height: "40px",
              backgroundColor: color,
              borderRadius: "6px",
              cursor: "pointer",
              border: `2px solid ${
                color === currentTheme.primary
                  ? currentTheme.accent
                  : "transparent"
              }`,
              transition: "transform 0.2s ease, border-color 0.2s ease",
            }}
            onClick={() => {
              navigator.clipboard.writeText(color);
              // You could add a toast notification here
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "scale(1.1)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "scale(1)";
            }}
            title={`${color} - Click to copy`}
          />
        ))}
      </div>

      {/* Random Color Generator */}
      <div style={{ marginBottom: "20px" }}>
        <h3 style={{ color: currentTheme.text, marginBottom: "10px" }}>
          Random Color Generator
        </h3>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button
            onClick={() => {
              const randomColor = getRandomColor();
              navigator.clipboard.writeText(randomColor);
            }}
            style={{
              backgroundColor: currentTheme.primary,
              color: currentTheme.text,
              border: "none",
              borderRadius: "6px",
              padding: "8px 16px",
              cursor: "pointer",
              fontSize: "14px",
            }}
          >
            Generate Random Color
          </button>
          <div
            style={{
              width: "40px",
              height: "40px",
              backgroundColor: getRandomColor(),
              borderRadius: "6px",
              border: `2px solid ${currentTheme.border}`,
            }}
            title="Current random color"
          />
        </div>
      </div>

      {/* Color Statistics */}
      <div
        style={{
          backgroundColor: currentTheme.background,
          padding: "15px",
          borderRadius: "8px",
          border: `1px solid ${currentTheme.border}`,
        }}
      >
        <h3 style={{ color: currentTheme.text, marginBottom: "10px" }}>
          Color Statistics
        </h3>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "10px",
            fontSize: "14px",
            color: currentTheme.textSecondary,
          }}
        >
          <div>Total Colors: {Object.values(COLOR_PALETTE).flat().length}</div>
          <div>Selected Palette: {selectedPalette}</div>
          <div>Colors in Palette: {COLOR_PALETTE[selectedPalette].length}</div>
          <div>Available Palettes: {Object.keys(COLOR_PALETTE).length}</div>
        </div>
      </div>
    </div>
  );
};
