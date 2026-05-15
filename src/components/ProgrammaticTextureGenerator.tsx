import React, { useState, useEffect } from "react";
import { useTheme } from "../themes";

interface ProgrammaticTextureGeneratorProps {
  onTextureGenerated: (textureData: string, name: string) => void;
}

export const ProgrammaticTextureGenerator: React.FC<
  ProgrammaticTextureGeneratorProps
> = ({ onTextureGenerated }) => {
  const { currentTheme } = useTheme();
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentTexture, setCurrentTexture] = useState<string>("");
  const [currentName, setCurrentName] = useState<string>("");

  // Programmatically generate textures using the TexturePainter API
  const generateProgrammaticTexture = (textureType: string) => {
    setIsGenerating(true);

    // Wait for the texture painter to be available
    const checkForPainter = () => {
      if ((window as any).texturePainter) {
        const painter = (window as any).texturePainter;

        // Set to grid mode for pixel art
        painter.setMode("grid");
        painter.setPixelSize(8); // 8x8 pixel grid

        // Clear the current layer
        painter.clearLayer();

        switch (textureType) {
          case "red-pixel":
            generateRedPixelTexture(painter);
            break;
          case "cobblestone":
            generateCobblestoneTexture(painter);
            break;
          case "wood":
            generateWoodTexture(painter);
            break;
          case "grass":
            generateGrassTexture(painter);
            break;
          case "metal":
            generateMetalTexture(painter);
            break;
          case "water":
            generateWaterTexture(painter);
            break;
        }

        // Get the generated texture
        setTimeout(() => {
          const texture = painter.getCurrentTexture();
          setCurrentTexture(texture);
          setCurrentName(textureType);
          onTextureGenerated(texture, textureType);
          setIsGenerating(false);
        }, 500);
      } else {
        setTimeout(checkForPainter, 100);
      }
    };

    checkForPainter();
  };

  const generateRedPixelTexture = (painter: any) => {
    // Set red color
    painter.setColor("#8B0000");

    // Fill the entire canvas with red
    for (let x = 0; x < 64; x += 8) {
      for (let y = 0; y < 64; y += 8) {
        painter.paintAt(x, y);
      }
    }

    // Add some variation
    painter.setColor("#DC143C");
    for (let i = 0; i < 20; i++) {
      const x = Math.floor(Math.random() * 8) * 8;
      const y = Math.floor(Math.random() * 8) * 8;
      painter.paintAt(x, y);
    }

    painter.setColor("#A52A2A");
    for (let i = 0; i < 15; i++) {
      const x = Math.floor(Math.random() * 8) * 8;
      const y = Math.floor(Math.random() * 8) * 8;
      painter.paintAt(x, y);
    }
  };

  const generateCobblestoneTexture = (painter: any) => {
    const stoneColors = ["#696969", "#808080", "#A9A9A9", "#778899", "#708090"];

    for (let x = 0; x < 64; x += 8) {
      for (let y = 0; y < 64; y += 8) {
        const color =
          stoneColors[Math.floor(Math.random() * stoneColors.length)];
        painter.setColor(color);
        painter.paintAt(x, y);
      }
    }

    // Add some darker edges
    painter.setColor("#2F2F2F");
    for (let x = 0; x < 64; x += 16) {
      for (let y = 0; y < 64; y += 16) {
        if (Math.random() < 0.5) {
          painter.paintAt(x, y);
        }
      }
    }
  };

  const generateWoodTexture = (painter: any) => {
    const woodColors = ["#8B4513", "#A0522D", "#CD853F", "#DEB887", "#D2691E"];

    // Create wood grain pattern
    for (let y = 0; y < 64; y += 8) {
      const color = woodColors[Math.floor(Math.random() * woodColors.length)];
      painter.setColor(color);
      for (let x = 0; x < 64; x += 8) {
        painter.paintAt(x, y);
      }
    }

    // Add some darker grain lines
    painter.setColor("#654321");
    for (let y = 0; y < 64; y += 16) {
      for (let x = 0; x < 64; x += 8) {
        if (Math.random() < 0.3) {
          painter.paintAt(x, y);
        }
      }
    }
  };

  const generateGrassTexture = (painter: any) => {
    const grassColors = ["#228B22", "#32CD32", "#00FF00", "#9ACD32", "#7CFC00"];

    for (let x = 0; x < 64; x += 8) {
      for (let y = 0; y < 64; y += 8) {
        const color =
          grassColors[Math.floor(Math.random() * grassColors.length)];
        painter.setColor(color);
        painter.paintAt(x, y);
      }
    }

    // Add some darker spots
    painter.setColor("#006400");
    for (let i = 0; i < 10; i++) {
      const x = Math.floor(Math.random() * 8) * 8;
      const y = Math.floor(Math.random() * 8) * 8;
      painter.paintAt(x, y);
    }
  };

  const generateMetalTexture = (painter: any) => {
    const metalColors = ["#C0C0C0", "#A8A8A8", "#D3D3D3", "#F5F5F5", "#B0B0B0"];

    for (let x = 0; x < 64; x += 8) {
      for (let y = 0; y < 64; y += 8) {
        const color =
          metalColors[Math.floor(Math.random() * metalColors.length)];
        painter.setColor(color);
        painter.paintAt(x, y);
      }
    }

    // Add some scratches
    painter.setColor("#808080");
    for (let i = 0; i < 5; i++) {
      const x = Math.floor(Math.random() * 8) * 8;
      const y = Math.floor(Math.random() * 8) * 8;
      painter.paintAt(x, y);
    }
  };

  const generateWaterTexture = (painter: any) => {
    const waterColors = ["#4169E1", "#1E90FF", "#00BFFF", "#87CEEB", "#87CEFA"];

    for (let x = 0; x < 64; x += 8) {
      for (let y = 0; y < 64; y += 8) {
        const color =
          waterColors[Math.floor(Math.random() * waterColors.length)];
        painter.setColor(color);
        painter.paintAt(x, y);
      }
    }

    // Add wave patterns
    painter.setColor("#0000FF");
    for (let y = 0; y < 64; y += 16) {
      for (let x = 0; x < 64; x += 8) {
        if (Math.sin(y * 0.5) > 0) {
          painter.paintAt(x, y);
        }
      }
    }
  };

  const downloadTexture = () => {
    if (currentTexture) {
      const link = document.createElement("a");
      link.download = `${currentName}-programmatic.png`;
      link.href = currentTexture;
      link.click();
    }
  };

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
        🤖 Programmatic Texture Generator
      </h2>
      <p
        style={{
          color: currentTheme.textSecondary,
          marginBottom: "20px",
          fontSize: "14px",
        }}
      >
        Uses the TexturePainter's programmatic API to generate pixel-perfect
        textures
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "15px",
          marginBottom: "20px",
        }}
      >
        <button
          onClick={() => generateProgrammaticTexture("red-pixel")}
          disabled={isGenerating}
          style={{
            padding: "15px",
            backgroundColor: currentTheme.primary,
            color: currentTheme.text,
            border: "none",
            borderRadius: "8px",
            cursor: isGenerating ? "not-allowed" : "pointer",
            fontSize: "14px",
            fontWeight: "bold",
            opacity: isGenerating ? 0.6 : 1,
          }}
        >
          🔴 Red Pixel (API)
        </button>

        <button
          onClick={() => generateProgrammaticTexture("cobblestone")}
          disabled={isGenerating}
          style={{
            padding: "15px",
            backgroundColor: currentTheme.secondary,
            color: currentTheme.text,
            border: "none",
            borderRadius: "8px",
            cursor: isGenerating ? "not-allowed" : "pointer",
            fontSize: "14px",
            fontWeight: "bold",
            opacity: isGenerating ? 0.6 : 1,
          }}
        >
          🪨 Cobblestone (API)
        </button>

        <button
          onClick={() => generateProgrammaticTexture("wood")}
          disabled={isGenerating}
          style={{
            padding: "15px",
            backgroundColor: "#8B4513",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: isGenerating ? "not-allowed" : "pointer",
            fontSize: "14px",
            fontWeight: "bold",
            opacity: isGenerating ? 0.6 : 1,
          }}
        >
          🪵 Wood (API)
        </button>

        <button
          onClick={() => generateProgrammaticTexture("grass")}
          disabled={isGenerating}
          style={{
            padding: "15px",
            backgroundColor: "#228B22",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: isGenerating ? "not-allowed" : "pointer",
            fontSize: "14px",
            fontWeight: "bold",
            opacity: isGenerating ? 0.6 : 1,
          }}
        >
          🌱 Grass (API)
        </button>

        <button
          onClick={() => generateProgrammaticTexture("metal")}
          disabled={isGenerating}
          style={{
            padding: "15px",
            backgroundColor: "#C0C0C0",
            color: "black",
            border: "none",
            borderRadius: "8px",
            cursor: isGenerating ? "not-allowed" : "pointer",
            fontSize: "14px",
            fontWeight: "bold",
            opacity: isGenerating ? 0.6 : 1,
          }}
        >
          ⚙️ Metal (API)
        </button>

        <button
          onClick={() => generateProgrammaticTexture("water")}
          disabled={isGenerating}
          style={{
            padding: "15px",
            backgroundColor: "#4169E1",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: isGenerating ? "not-allowed" : "pointer",
            fontSize: "14px",
            fontWeight: "bold",
            opacity: isGenerating ? 0.6 : 1,
          }}
        >
          💧 Water (API)
        </button>
      </div>

      {isGenerating && (
        <div style={{ textAlign: "center", margin: "20px 0" }}>
          <div style={{ color: currentTheme.textSecondary }}>
            Generating texture using TexturePainter API...
          </div>
        </div>
      )}

      {currentTexture && (
        <div style={{ textAlign: "center", margin: "20px 0" }}>
          <h3 style={{ color: currentTheme.text, marginBottom: "10px" }}>
            {currentName} Texture (Programmatic)
          </h3>
          <div style={{ marginBottom: "15px" }}>
            <img
              src={currentTexture}
              alt={currentName}
              style={{
                width: "128px",
                height: "128px",
                imageRendering: "pixelated",
                border: `2px solid ${currentTheme.border}`,
                borderRadius: "8px",
              }}
            />
          </div>
          <button
            onClick={downloadTexture}
            style={{
              padding: "10px 20px",
              backgroundColor: currentTheme.accent,
              color: currentTheme.text,
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "bold",
            }}
          >
            💾 Download {currentName}-programmatic.png
          </button>
        </div>
      )}
    </div>
  );
};




