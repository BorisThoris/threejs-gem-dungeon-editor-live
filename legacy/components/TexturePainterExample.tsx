import React, { useState, useEffect } from "react";
import TexturePainter from "./TexturePainter";
import { ColorPaletteDemo } from "./ColorPaletteDemo";
import PresetTextureGenerator from "./TextureGenerator";
import { ProgrammaticTextureGenerator } from "./ProgrammaticTextureGenerator";

const TexturePainterExample: React.FC = () => {
  const [textureData, setTextureData] = useState<string>("");
  const [isProgrammaticMode, setIsProgrammaticMode] = useState(false);

  const handleTextureChange = (texture: string) => {
    setTextureData(texture);
  };

  const handleExport = (texture: string) => {
    console.log("Texture exported:", texture);
    setTextureData(texture);
  };

  // Example of programmatic usage
  useEffect(() => {
    if (isProgrammaticMode && (window as any).texturePainter) {
      const painter = (window as any).texturePainter;

      // Example: Create a simple pattern programmatically
      setTimeout(() => {
        painter.setMode("grid");
        painter.setPixelSize(16);
        painter.setColor("#ff0000");

        // Draw a simple pattern
        for (let x = 0; x < 8; x++) {
          for (let y = 0; y < 8; y++) {
            if ((x + y) % 2 === 0) {
              painter.paintAt(x * 16, y * 16);
            }
          }
        }

        // Change color and add more pattern
        painter.setColor("#00ff00");
        for (let x = 0; x < 8; x++) {
          for (let y = 0; y < 8; y++) {
            if ((x + y) % 2 === 1) {
              painter.paintAt(x * 16, y * 16);
            }
          }
        }
      }, 1000);
    }
  }, [isProgrammaticMode]);

  return (
    <div style={{ width: "100vw", height: "100vh", display: "flex" }}>
      {/* Control Panel */}
      <div
        style={{
          width: "300px",
          background: "#1a1a1a",
          padding: "20px",
          color: "white",
          borderRight: "1px solid #333",
        }}
      >
        <h2>Texture Painter Example</h2>

        <div style={{ marginBottom: "20px" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <input
              type="checkbox"
              checked={isProgrammaticMode}
              onChange={(e) => setIsProgrammaticMode(e.target.checked)}
            />
            Enable Programmatic Mode
          </label>
        </div>

        <div style={{ marginBottom: "20px" }}>
          <h3>Programmatic Controls</h3>
          <button
            onClick={() => {
              if ((window as any).texturePainter) {
                (window as any).texturePainter.setMode("grid");
                (window as any).texturePainter.setPixelSize(32);
                (window as any).texturePainter.setColor("#ff0000");
              }
            }}
            style={{
              padding: "8px 16px",
              background: "#4CAF50",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              margin: "5px",
              display: "block",
              width: "100%",
            }}
          >
            Set Grid Mode (32px)
          </button>

          <button
            onClick={() => {
              if ((window as any).texturePainter) {
                (window as any).texturePainter.setMode("free");
                (window as any).texturePainter.setColor("#00ff00");
              }
            }}
            style={{
              padding: "8px 16px",
              background: "#4CAF50",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              margin: "5px",
              display: "block",
              width: "100%",
            }}
          >
            Set Free Mode
          </button>

          <button
            onClick={() => {
              if ((window as any).texturePainter) {
                (window as any).texturePainter.clearLayer();
              }
            }}
            style={{
              padding: "8px 16px",
              background: "#ff4444",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              margin: "5px",
              display: "block",
              width: "100%",
            }}
          >
            Clear Layer
          </button>
        </div>

        {textureData && (
          <div style={{ marginBottom: "20px" }}>
            <h3>Current Texture</h3>
            <img
              src={textureData}
              alt="Current texture"
              style={{
                width: "100%",
                maxWidth: "200px",
                border: "1px solid #333",
                imageRendering: "pixelated",
              }}
            />
          </div>
        )}
      </div>

      {/* Color Palette Demo */}
      <div style={{ marginBottom: "20px" }}>
        <ColorPaletteDemo />
      </div>

      {/* Texture Generator */}
      <div style={{ marginBottom: "20px" }}>
        <PresetTextureGenerator />
      </div>

      {/* Programmatic Texture Generator */}
      <div style={{ marginBottom: "20px" }}>
        <ProgrammaticTextureGenerator
          onTextureGenerated={(texture, name) => {
            console.log(`Generated programmatic texture: ${name}`);
            setTextureData(texture);
          }}
        />
      </div>

      {/* Texture Painter */}
      <div style={{ flex: 1 }}>
        <TexturePainter
          width={512}
          height={512}
          mode="free"
          pixelSize={16}
          onExport={handleExport}
          onTextureChange={handleTextureChange}
          programmaticAccess={isProgrammaticMode}
        />
      </div>
    </div>
  );
};

export default TexturePainterExample;
