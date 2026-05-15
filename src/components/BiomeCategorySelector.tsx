import React, { useState, useEffect } from "react";
import { BIOME_CATEGORIES, getWeightedBiomes } from "../types/biomeCategories";

interface BiomeCategorySelectorProps {
  onCategoriesChange: (enabledCategories: string[]) => void;
  style?: React.CSSProperties;
}

const BiomeCategorySelector: React.FC<BiomeCategorySelectorProps> = ({
  onCategoriesChange,
  style,
}) => {
  const [enabledCategories, setEnabledCategories] = useState<string[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);

  // Initialize with all categories enabled by default
  useEffect(() => {
    const allCategoryIds = BIOME_CATEGORIES.map((cat) => cat.id);
    setEnabledCategories(allCategoryIds);
    onCategoriesChange(allCategoryIds);
  }, [onCategoriesChange]);

  const toggleCategory = (categoryId: string) => {
    const newEnabled = enabledCategories.includes(categoryId)
      ? enabledCategories.filter((id) => id !== categoryId)
      : [...enabledCategories, categoryId];

    setEnabledCategories(newEnabled);
    onCategoriesChange(newEnabled);
  };

  const toggleAll = () => {
    if (enabledCategories.length === BIOME_CATEGORIES.length) {
      // Disable all
      setEnabledCategories([]);
      onCategoriesChange([]);
    } else {
      // Enable all
      const allCategoryIds = BIOME_CATEGORIES.map((cat) => cat.id);
      setEnabledCategories(allCategoryIds);
      onCategoriesChange(allCategoryIds);
    }
  };

  const defaultStyle: React.CSSProperties = {
    position: "fixed",
    top: "80px",
    right: "20px",
    zIndex: 1000,
    background: "rgba(0, 0, 0, 0.8)",
    padding: "15px",
    borderRadius: "8px",
    backdropFilter: "blur(10px)",
    color: "white",
    fontSize: "14px",
    fontFamily: "monospace",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    minWidth: "250px",
    maxHeight: "400px",
    overflowY: "auto",
    ...style,
  };

  return (
    <div style={defaultStyle}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "15px",
        }}
      >
        <h3
          style={{
            margin: 0,
            fontSize: "16px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          🌍 Biome Categories
        </h3>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          style={{
            background: "transparent",
            border: "1px solid rgba(255, 255, 255, 0.3)",
            color: "white",
            borderRadius: "4px",
            padding: "4px 8px",
            cursor: "pointer",
            fontSize: "12px",
          }}
        >
          {isExpanded ? "▼" : "▶"}
        </button>
      </div>

      {isExpanded && (
        <>
          <div style={{ marginBottom: "10px" }}>
            <button
              onClick={toggleAll}
              style={{
                width: "100%",
                padding: "8px",
                background:
                  enabledCategories.length === BIOME_CATEGORIES.length
                    ? "#F44336"
                    : "#4CAF50",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "12px",
                fontWeight: "bold",
              }}
            >
              {enabledCategories.length === BIOME_CATEGORIES.length
                ? "Disable All"
                : "Enable All"}
            </button>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              maxHeight: "300px",
              overflowY: "auto",
            }}
          >
            {BIOME_CATEGORIES.map((category) => (
              <div
                key={category.id}
                onClick={() => toggleCategory(category.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "8px",
                  background: enabledCategories.includes(category.id)
                    ? "rgba(76, 175, 80, 0.2)"
                    : "rgba(255, 255, 255, 0.05)",
                  borderRadius: "4px",
                  cursor: "pointer",
                  border: enabledCategories.includes(category.id)
                    ? `2px solid ${category.color}`
                    : "2px solid transparent",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  if (!enabledCategories.includes(category.id)) {
                    e.currentTarget.style.background =
                      "rgba(255, 255, 255, 0.1)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!enabledCategories.includes(category.id)) {
                    e.currentTarget.style.background =
                      "rgba(255, 255, 255, 0.05)";
                  }
                }}
              >
                <input
                  type="checkbox"
                  checked={enabledCategories.includes(category.id)}
                  onChange={() => {}} // Handled by parent onClick
                  style={{
                    width: "16px",
                    height: "16px",
                    cursor: "pointer",
                  }}
                />
                <span style={{ fontSize: "16px" }}>{category.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: "bold", fontSize: "13px" }}>
                    {category.name}
                  </div>
                  <div
                    style={{
                      fontSize: "11px",
                      opacity: 0.7,
                      marginTop: "2px",
                    }}
                  >
                    {category.biomes.length} biomes
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div
            style={{
              marginTop: "10px",
              padding: "8px",
              background: "rgba(255, 255, 255, 0.05)",
              borderRadius: "4px",
              fontSize: "11px",
              textAlign: "center",
            }}
          >
            {enabledCategories.length} of {BIOME_CATEGORIES.length} categories
            enabled
          </div>
        </>
      )}
    </div>
  );
};

export default BiomeCategorySelector;
