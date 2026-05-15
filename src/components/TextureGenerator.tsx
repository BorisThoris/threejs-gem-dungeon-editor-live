import React, { useState } from "react";
import { useTheme } from "../themes";
import { generateThemeTextures } from "../utils/generateThemeTextures";

const PresetTextureGenerator: React.FC = () => {
  const { currentTheme } = useTheme();
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedTextures, setGeneratedTextures] = useState<any[]>([]);

  const handleLoadTextures = () => {
    setIsGenerating(true);
    try {
      const textures = generateThemeTextures();
      setGeneratedTextures(textures);
      // Generated theme textures
    } catch (error) {
      // Failed to generate textures
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadAll = () => {
    // Generate and download the JSON file
    const textures = generateThemeTextures();
    const dataStr = JSON.stringify(textures, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement("a");
    link.download = "textureDefinitions.json";
    link.href = url;
    link.click();

    URL.revokeObjectURL(url);
  };

  const handleCopyManifest = async () => {
    try {
      const textures = generateThemeTextures();
      const manifest = JSON.stringify(textures, null, 2);
      await navigator.clipboard.writeText(manifest);
      alert("JSON definitions copied to clipboard!");
    } catch (error) {
      // Failed to copy manifest
    }
  };

  return (
    <div
      style={{
        background: currentTheme.surface,
        border: `1px solid ${currentTheme.border}`,
        borderRadius: "8px",
        padding: "16px",
        color: currentTheme.text,
        marginBottom: "20px",
      }}
    >
      <h3 style={{ margin: "0 0 16px 0", color: currentTheme.primary }}>
        🎨 Texture Generator
      </h3>

      <p
        style={{
          margin: "0 0 16px 0",
          color: currentTheme.textSecondary,
          fontSize: "14px",
        }}
      >
        Generate theme-based textures using the application's color palette.
        These are dynamically generated using theme color variables and won't
        regenerate each time.
      </p>

      <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
        <button
          onClick={handleLoadTextures}
          disabled={isGenerating}
          style={{
            padding: "8px 16px",
            background: isGenerating
              ? currentTheme.background
              : currentTheme.primary,
            color: currentTheme.text,
            border: "none",
            borderRadius: "4px",
            cursor: isGenerating ? "not-allowed" : "pointer",
            fontSize: "14px",
          }}
        >
          {isGenerating ? "Generating..." : "Generate Theme Textures"}
        </button>

        {generatedTextures.length > 0 && (
          <>
            <button
              onClick={handleDownloadAll}
              style={{
                padding: "8px 16px",
                background: currentTheme.secondary,
                color: currentTheme.text,
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "14px",
              }}
            >
              Download All
            </button>

            <button
              onClick={handleCopyManifest}
              style={{
                padding: "8px 16px",
                background: currentTheme.accent,
                color: currentTheme.text,
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "14px",
              }}
            >
              Copy Manifest
            </button>
          </>
        )}
      </div>

      {generatedTextures.length > 0 && (
        <div>
          <h4 style={{ margin: "0 0 8px 0", color: currentTheme.text }}>
            Generated Textures ({generatedTextures.length})
          </h4>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))",
              gap: "8px",
              maxHeight: "200px",
              overflowY: "auto",
            }}
          >
            {generatedTextures.map((texture) => (
              <div
                key={texture.id}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  padding: "8px",
                  background: currentTheme.background,
                  border: `1px solid ${currentTheme.border}`,
                  borderRadius: "4px",
                }}
              >
                <img
                  src={texture.previewUrl}
                  alt={texture.name}
                  style={{
                    width: "48px",
                    height: "48px",
                    imageRendering: "pixelated",
                    border: `1px solid ${currentTheme.border}`,
                    borderRadius: "2px",
                  }}
                />
                <div
                  style={{
                    fontSize: "10px",
                    textAlign: "center",
                    marginTop: "4px",
                    color: currentTheme.textSecondary,
                  }}
                >
                  {texture.name}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div
        style={{
          marginTop: "16px",
          padding: "12px",
          background: currentTheme.background,
          borderRadius: "4px",
          fontSize: "12px",
          color: currentTheme.textSecondary,
        }}
      >
        <strong>Instructions:</strong>
        <ol style={{ margin: "8px 0 0 0", paddingLeft: "20px" }}>
          <li>Click "Load JSON Textures" to load texture definitions</li>
          <li>Click "Download All" to download the JSON definitions file</li>
          <li>Click "Copy Manifest" to copy the JSON definitions</li>
          <li>
            Textures are defined as pixel arrays in{" "}
            <code>public/textureDefinitions.json</code>
          </li>
          <li>
            Each texture has width, height, and a pixels array of hex colors
          </li>
        </ol>
      </div>
    </div>
  );
};

export default PresetTextureGenerator;
