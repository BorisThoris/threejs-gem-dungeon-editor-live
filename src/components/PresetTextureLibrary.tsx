import React, { useState, useCallback, useEffect } from "react";
import { useTheme } from "../themes";
import {
  type PresetTextureDefinition,
  TEXTURE_CATEGORIES,
} from "./presetTextureLibraryTypes";

// Preset texture library component
interface PresetTextureLibraryProps {
  onTextureSelect: (texture: PresetTextureDefinition) => void;
  onTextureInject: (imageUrl: string, name: string) => void;
  className?: string;
  style?: React.CSSProperties;
}

export const PresetTextureLibrary: React.FC<PresetTextureLibraryProps> = ({
  onTextureSelect,
  onTextureInject,
  className,
  style,
}) => {
  const { currentTheme } = useTheme();
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [textures, setTextures] = useState<PresetTextureDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load texture manifest
  useEffect(() => {
    const loadTextures = async () => {
      try {
        setLoading(true);
        const response = await fetch("/preset-textures/manifest.json");
        if (!response.ok) {
          throw new Error("Failed to load texture manifest");
        }
        const manifest = await response.json();
        setTextures(manifest);
        setError(null);
      } catch (err) {
        console.error("Failed to load preset textures:", err);
        setError("Failed to load texture library");
        // Fallback to empty array
        setTextures([]);
      } finally {
        setLoading(false);
      }
    };

    loadTextures();
  }, []);

  // Filter textures based on category and search
  const filteredTextures = textures.filter((texture) => {
    const matchesCategory =
      selectedCategory === "All" || texture.category === selectedCategory;
    const matchesSearch =
      texture.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      texture.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Handle texture click
  const handleTextureClick = useCallback(
    (texture: PresetTextureDefinition) => {
      onTextureSelect(texture);
      onTextureInject(texture.url, texture.name);
    },
    [onTextureSelect, onTextureInject]
  );

  // Get unique categories
  const categories = [
    "All",
    ...Array.from(new Set(textures.map((t) => t.category))),
  ];

  if (loading) {
    return (
      <div
        className={className}
        style={{
          background: currentTheme.surface,
          border: `1px solid ${currentTheme.border}`,
          borderRadius: "8px",
          padding: "16px",
          color: currentTheme.text,
          textAlign: "center",
          ...style,
        }}
      >
        <div style={{ color: currentTheme.textSecondary }}>
          📚 Loading texture library...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={className}
        style={{
          background: currentTheme.surface,
          border: `1px solid ${currentTheme.border}`,
          borderRadius: "8px",
          padding: "16px",
          color: currentTheme.error,
          textAlign: "center",
          ...style,
        }}
      >
        <div>❌ {error}</div>
        <div
          style={{
            fontSize: "12px",
            color: currentTheme.textSecondary,
            marginTop: "8px",
          }}
        >
          Run <code>npm run generate-textures</code> to create preset textures
        </div>
      </div>
    );
  }

  return (
    <div
      className={className}
      style={{
        background: currentTheme.surface,
        border: `1px solid ${currentTheme.border}`,
        borderRadius: "8px",
        padding: "16px",
        color: currentTheme.text,
        ...style,
      }}
    >
      <h3 style={{ margin: "0 0 16px 0", color: currentTheme.primary }}>
        🎨 Preset Textures
      </h3>

      {/* Search and Filter */}
      <div style={{ marginBottom: "16px" }}>
        <input
          type="text"
          placeholder="Search textures..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            width: "100%",
            padding: "8px",
            marginBottom: "8px",
            background: currentTheme.background,
            color: currentTheme.text,
            border: `1px solid ${currentTheme.border}`,
            borderRadius: "4px",
            fontSize: "14px",
          }}
        />

        <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              style={{
                padding: "4px 8px",
                background:
                  selectedCategory === category
                    ? currentTheme.primary
                    : currentTheme.background,
                color: currentTheme.text,
                border: `1px solid ${currentTheme.border}`,
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "12px",
                transition: "all 0.2s ease",
              }}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Texture Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(80px, 1fr))",
          gap: "8px",
          maxHeight: "400px",
          overflowY: "auto",
        }}
      >
        {filteredTextures.map((texture) => (
          <div
            key={texture.id}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              padding: "8px",
              background: currentTheme.background,
              border: `1px solid ${currentTheme.border}`,
              borderRadius: "6px",
              cursor: "pointer",
              transition: "all 0.2s ease",
              position: "relative",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = currentTheme.primary;
              e.currentTarget.style.transform = "scale(1.05)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = currentTheme.border;
              e.currentTarget.style.transform = "scale(1)";
            }}
            onClick={() => handleTextureClick(texture)}
            title={`${texture.name} - ${texture.description}`}
          >
            <img
              src={texture.previewUrl}
              alt={texture.name}
              style={{
                width: "48px",
                height: "48px",
                imageRendering: "pixelated",
                border: `1px solid ${currentTheme.border}`,
                borderRadius: "4px",
              }}
              onError={(e) => {
                // Fallback if preview image fails to load
                e.currentTarget.style.display = "none";
                const fallback = document.createElement("div");
                fallback.style.cssText = `
                  width: 48px;
                  height: 48px;
                  background: ${currentTheme.background};
                  border: 1px solid ${currentTheme.border};
                  border-radius: 4px;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  font-size: 12px;
                  color: ${currentTheme.textSecondary};
                `;
                fallback.textContent = "?";
                e.currentTarget.parentNode?.insertBefore(
                  fallback,
                  e.currentTarget
                );
              }}
            />
            <div
              style={{
                fontSize: "10px",
                textAlign: "center",
                marginTop: "4px",
                color: currentTheme.textSecondary,
                lineHeight: "1.2",
              }}
            >
              {texture.name}
            </div>
            <div
              style={{
                fontSize: "8px",
                color: currentTheme.textSecondary,
                opacity: 0.7,
              }}
            >
              {texture.width}×{texture.height}
            </div>
          </div>
        ))}
      </div>

      {filteredTextures.length === 0 && !loading && (
        <div
          style={{
            textAlign: "center",
            color: currentTheme.textSecondary,
            padding: "20px",
            fontStyle: "italic",
          }}
        >
          No textures found matching your criteria
        </div>
      )}

      {textures.length === 0 && !loading && !error && (
        <div
          style={{
            textAlign: "center",
            color: currentTheme.textSecondary,
            padding: "20px",
          }}
        >
          <div>No preset textures available</div>
          <div style={{ fontSize: "12px", marginTop: "8px" }}>
            Run <code>npm run generate-textures</code> to create them
          </div>
        </div>
      )}
    </div>
  );
};

export default PresetTextureLibrary;
