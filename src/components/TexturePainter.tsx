import React, {
  useState,
  useRef,
  useCallback,
  useEffect,
  useMemo,
} from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Text, Html } from "@react-three/drei";
import * as THREE from "three";
import {
  ALL_COLORS,
  COLOR_PALETTE as THEME_COLOR_PALETTE,
  getRandomColor,
  useTheme,
} from "../themes";
import { JsonTextureGrid } from "./JsonTextureGrid";
import { generateThemeTextures } from "../utils/generateThemeTextures";
// Removed PresetTextureLibrary import - now integrated directly

// Types
interface Brush {
  id: string;
  name: string;
  icon: string;
  size: number;
  opacity: number;
  hardness: number;
  spacing: number;
  color: string;
}

interface Layer {
  id: string;
  name: string;
  visible: boolean;
  opacity: number;
  blendMode: string;
  canvas: HTMLCanvasElement;
  texture: THREE.CanvasTexture;
  filter: string;
  filterIntensity: number;
  locked: boolean;
}

interface TexturePainterProps {
  width?: number;
  height?: number;
  onExport?: (texture: string) => void;
  mode?: "free" | "grid";
  pixelSize?: number;
  gridSize?: number;
  onTextureChange?: (texture: string) => void;
  programmaticAccess?: boolean;
  showTextureLibrary?: boolean;
}

// Default brushes
const DEFAULT_BRUSHES: Brush[] = [
  {
    id: "round",
    name: "Round",
    icon: "●",
    size: 20,
    opacity: 1.0,
    hardness: 0.8,
    spacing: 0.1,
    color: "#ff0000",
  },
  {
    id: "square",
    name: "Square",
    icon: "■",
    size: 20,
    opacity: 1.0,
    hardness: 1.0,
    spacing: 0.1,
    color: "#ff0000",
  },
  {
    id: "soft",
    name: "Soft",
    icon: "○",
    size: 30,
    opacity: 0.7,
    hardness: 0.3,
    spacing: 0.05,
    color: "#ff0000",
  },
  {
    id: "hard",
    name: "Hard",
    icon: "●",
    size: 15,
    opacity: 1.0,
    hardness: 1.0,
    spacing: 0.1,
    color: "#ff0000",
  },
];

// Blend modes
const BLEND_MODES = [
  "normal",
  "multiply",
  "screen",
  "overlay",
  "soft-light",
  "hard-light",
  "color-dodge",
  "color-burn",
  "darken",
  "lighten",
  "difference",
  "exclusion",
];

// Filters
const FILTERS = [
  { id: "none", name: "None" },
  { id: "blur", name: "Blur" },
  { id: "sharpen", name: "Sharpen" },
  { id: "emboss", name: "Emboss" },
  { id: "edge-detect", name: "Edge Detect" },
  { id: "grayscale", name: "Grayscale" },
  { id: "sepia", name: "Sepia" },
  { id: "invert", name: "Invert" },
  { id: "brightness", name: "Brightness" },
  { id: "contrast", name: "Contrast" },
];

// Use the extended color palette from themes
const COLOR_PALETTE = THEME_COLOR_PALETTE;

// Filter functions
const applyFilter = (
  canvas: HTMLCanvasElement,
  filter: string,
  intensity: number = 1.0
) => {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  switch (filter) {
    case "blur": {
      // Simple box blur
      const radius = Math.floor(intensity * 3);
      for (let y = radius; y < canvas.height - radius; y++) {
        for (let x = radius; x < canvas.width - radius; x++) {
          let r = 0,
            g = 0,
            b = 0,
            a = 0;
          let count = 0;

          for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
              const idx = ((y + dy) * canvas.width + (x + dx)) * 4;
              r += data[idx];
              g += data[idx + 1];
              b += data[idx + 2];
              a += data[idx + 3];
              count++;
            }
          }

          const idx = (y * canvas.width + x) * 4;
          data[idx] = r / count;
          data[idx + 1] = g / count;
          data[idx + 2] = b / count;
          data[idx + 3] = a / count;
        }
      }
      break;
    }

    case "grayscale":
      for (let i = 0; i < data.length; i += 4) {
        const gray =
          data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
        data[i] = gray;
        data[i + 1] = gray;
        data[i + 2] = gray;
      }
      break;

    case "sepia":
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        data[i] = Math.min(255, r * 0.393 + g * 0.769 + b * 0.189);
        data[i + 1] = Math.min(255, r * 0.349 + g * 0.686 + b * 0.168);
        data[i + 2] = Math.min(255, r * 0.272 + g * 0.534 + b * 0.131);
      }
      break;

    case "invert": {
      for (let i = 0; i < data.length; i += 4) {
        data[i] = 255 - data[i];
        data[i + 1] = 255 - data[i + 1];
        data[i + 2] = 255 - data[i + 2];
      }
      break;
    }

    case "brightness": {
      const brightness = (intensity - 0.5) * 2; // -1 to 1
      for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.max(0, Math.min(255, data[i] + brightness * 255));
        data[i + 1] = Math.max(
          0,
          Math.min(255, data[i + 1] + brightness * 255)
        );
        data[i + 2] = Math.max(
          0,
          Math.min(255, data[i + 2] + brightness * 255)
        );
      }
      break;
    }

    case "contrast": {
      const contrast = intensity * 2; // 0 to 2
      for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.max(0, Math.min(255, (data[i] - 128) * contrast + 128));
        data[i + 1] = Math.max(
          0,
          Math.min(255, (data[i + 1] - 128) * contrast + 128)
        );
        data[i + 2] = Math.max(
          0,
          Math.min(255, (data[i + 2] - 128) * contrast + 128)
        );
      }
      break;
    }
  }

  ctx.putImageData(imageData, 0, 0);
};

// Canvas component for texture painting
const TextureCanvas: React.FC<{
  width: number;
  height: number;
  layers: Layer[];
  activeLayer: Layer | null;
  brush: Brush;
  isPainting: boolean;
  mode: "free" | "grid";
  pixelSize: number;
  showGrid: boolean;
  programmaticAccess: boolean;
  onTextureChange?: (texture: string) => void;
  onPaint: (x: number, y: number, pressure: number) => void;
  onStartPaint: (x: number, y: number, pressure: number) => void;
  onEndPaint: () => void;
}> = ({
  width,
  height,
  layers,
  activeLayer,
  brush,
  isPainting,
  mode,
  pixelSize,
  showGrid,
  programmaticAccess,
  onTextureChange,
  onPaint,
  onStartPaint,
  onEndPaint,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [lastPos, setLastPos] = useState<{ x: number; y: number } | null>(null);
  const [forceUpdate, setForceUpdate] = useState(0);

  // Update canvas when layers change
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw all visible layers
    layers.forEach((layer) => {
      if (layer.visible) {
        ctx.globalAlpha = layer.opacity;
        ctx.globalCompositeOperation =
          layer.blendMode as GlobalCompositeOperation;
        ctx.drawImage(layer.canvas, 0, 0, width, height);
      }
    });

    // Draw grid if in grid mode and showGrid is true
    if (mode === "grid" && showGrid) {
      ctx.globalAlpha = 0.3;
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = "#666";
      ctx.lineWidth = 1;

      // Draw vertical lines
      for (let x = 0; x <= width; x += pixelSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }

      // Draw horizontal lines
      for (let y = 0; y <= height; y += pixelSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
    }

    ctx.globalAlpha = 1.0;
    ctx.globalCompositeOperation = "source-over";
  }, [layers, width, height, mode, pixelSize, showGrid, forceUpdate]);

  const getMousePos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };

    return {
      x: (e.clientX - rect.left) * (width / rect.width),
      y: (e.clientY - rect.top) * (height / rect.height),
    };
  };

  const paint = (x: number, y: number, pressure: number = 1.0) => {
    if (!activeLayer || activeLayer.locked) return;

    const ctx = activeLayer.canvas.getContext("2d");
    if (!ctx) return;

    ctx.globalAlpha = brush.opacity * pressure;
    ctx.fillStyle = brush.color;

    if (mode === "grid") {
      // Grid mode - snap to pixel grid
      const gridX = Math.floor(x / pixelSize) * pixelSize;
      const gridY = Math.floor(y / pixelSize) * pixelSize;

      ctx.fillRect(gridX, gridY, pixelSize, pixelSize);
    } else {
      // Free mode - smooth painting
      const gradient = ctx.createRadialGradient(
        x,
        y,
        0,
        x,
        y,
        brush.size * brush.hardness
      );
      gradient.addColorStop(0, brush.color);
      gradient.addColorStop(1, "transparent");

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, brush.size, 0, Math.PI * 2);
      ctx.fill();
    }

    // Update the texture
    activeLayer.texture.needsUpdate = true;

    // Force canvas re-render
    setForceUpdate((prev) => prev + 1);

    // Notify programmatic access
    if (programmaticAccess && onTextureChange) {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const exportCtx = canvas.getContext("2d");
      if (exportCtx) {
        layers.forEach((layer) => {
          if (layer.visible) {
            exportCtx.globalAlpha = layer.opacity;
            exportCtx.globalCompositeOperation =
              layer.blendMode as GlobalCompositeOperation;
            exportCtx.drawImage(layer.canvas, 0, 0, width, height);
          }
        });
        onTextureChange(canvas.toDataURL("image/png"));
      }
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getMousePos(e);
    setLastPos(pos);
    onStartPaint(pos.x, pos.y, 1.0);
    paint(pos.x, pos.y, 1.0);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isPainting || !lastPos) return;

    const pos = getMousePos(e);

    // Always paint when dragging for continuous drawing
    if (mode === "grid") {
      // In grid mode, paint at the current position
      paint(pos.x, pos.y, 1.0);
    } else {
      // In free mode, interpolate between last position and current position for smooth lines
      const distance = Math.sqrt(
        Math.pow(pos.x - lastPos.x, 2) + Math.pow(pos.y - lastPos.y, 2)
      );

      if (distance > 1) {
        // Always paint if moved at least 1 pixel
        const steps = Math.max(1, Math.ceil(distance / 2)); // Smaller steps for smoother lines
        for (let i = 0; i <= steps; i++) {
          const t = i / steps;
          const x = lastPos.x + (pos.x - lastPos.x) * t;
          const y = lastPos.y + (pos.y - lastPos.y) * t;
          paint(x, y, 1.0);
        }
      }
    }

    setLastPos(pos);
    onPaint(pos.x, pos.y, 1.0);
  };

  const handleMouseUp = () => {
    setLastPos(null);
    onEndPaint();
  };

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{
        border: "1px solid #333",
        cursor: "crosshair",
        background: "#1a1a1a",
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onMouseOut={handleMouseUp}
    />
  );
};

// 3D Preview component
const TexturePreview: React.FC<{
  layers: Layer[];
  width: number;
  height: number;
}> = ({ layers, width, height }) => {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y =
        Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
    }
  });

  // Create combined texture from all visible layers
  const combinedTexture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");

    if (!ctx) return null;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw all visible layers
    layers.forEach((layer) => {
      if (layer.visible) {
        ctx.globalAlpha = layer.opacity;
        ctx.globalCompositeOperation =
          layer.blendMode as GlobalCompositeOperation;
        ctx.drawImage(layer.canvas, 0, 0, width, height);
      }
    });

    return new THREE.CanvasTexture(canvas);
  }, [layers, width, height]);

  return (
    <mesh ref={meshRef}>
      <planeGeometry args={[4, 4]} />
      <meshStandardMaterial
        map={combinedTexture}
        transparent={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
};

// Main TexturePainter component
const TexturePainter: React.FC<TexturePainterProps> = ({
  width = 512,
  height = 512,
  onExport,
  mode = "free",
  pixelSize = 16,
  gridSize = 32,
  onTextureChange,
  programmaticAccess = false,
  showTextureLibrary = true,
}) => {
  const { currentTheme } = useTheme();
  const [layers, setLayers] = useState<Layer[]>([]);
  const [activeLayerId, setActiveLayerId] = useState<string | null>(null);
  const [selectedBrush, setSelectedBrush] = useState<Brush>(DEFAULT_BRUSHES[0]);
  const [selectedColor, setSelectedColor] = useState("#ff0000");
  const [isPainting, setIsPainting] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [brushSize, setBrushSize] = useState(20);
  const [brushOpacity, setBrushOpacity] = useState(1.0);
  const [brushHardness, setBrushHardness] = useState(0.8);
  const [currentMode, setCurrentMode] = useState<"free" | "grid">(mode);
  const [currentPixelSize, setCurrentPixelSize] = useState(pixelSize);
  const [currentGridSize, setCurrentGridSize] = useState(gridSize);
  const [showGrid, setShowGrid] = useState(true);
  // Removed showLibrary state - no longer using separate library
  const [presetTextures, setPresetTextures] = useState<any[]>([]);
  const [showPresetGrid, setShowPresetGrid] = useState(true);

  // Initialize with a base layer
  useEffect(() => {
    const baseLayer = createLayer("Base Layer");
    setLayers([baseLayer]);
    setActiveLayerId(baseLayer.id);
  }, [createLayer]);

  // Load theme-based texture definitions
  useEffect(() => {
    const loadThemeTextures = () => {
      try {
        // Generate textures directly for now
        const textures = generateThemeTextures();
        setPresetTextures(textures);
        console.log(`Loaded ${textures.length} textures`);
      } catch (error) {
        console.error("Failed to generate theme textures:", error);
      }
    };
    loadThemeTextures();
  }, []);

  const createLayer = useCallback(
    (name: string): Layer => {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const texture = new THREE.CanvasTexture(canvas);
      texture.needsUpdate = true;

      return {
        id: `layer_${Date.now()}`,
        name,
        visible: true,
        opacity: 1.0,
        blendMode: "normal",
        canvas,
        texture,
        filter: "none",
        filterIntensity: 1.0,
        locked: false,
      };
    },
    [width, height]
  );

  const addLayer = useCallback(() => {
    const newLayer = createLayer(`Layer ${layers.length + 1}`);
    setLayers([...layers, newLayer]);
    setActiveLayerId(newLayer.id);
  }, [createLayer, layers, setLayers, setActiveLayerId]);

  const deleteLayer = useCallback(
    (layerId: string) => {
      if (layers.length <= 1) return; // Don't delete the last layer

      const newLayers = layers.filter((layer) => layer.id !== layerId);
      setLayers(newLayers);

      if (activeLayerId === layerId) {
        setActiveLayerId(newLayers[0]?.id || null);
      }
    },
    [layers, activeLayerId, setLayers, setActiveLayerId]
  );

  const updateLayer = (layerId: string, updates: Partial<Layer>) => {
    setLayers(
      layers.map((layer) =>
        layer.id === layerId ? { ...layer, ...updates } : layer
      )
    );
  };

  const activeLayer = layers.find((layer) => layer.id === activeLayerId);

  // Handle texture injection from JSON-defined textures
  const handleTextureInject = useCallback(
    (texture: any) => {
      if (activeLayer && !activeLayer.locked) {
        const layerCtx = activeLayer.canvas.getContext("2d");
        if (layerCtx) {
          // Clear the layer first
          layerCtx.clearRect(0, 0, width, height);

          // Calculate scaling factors
          const scaleX = width / texture.width;
          const scaleY = height / texture.height;

          // Draw each pixel from the JSON data
          for (let y = 0; y < texture.height; y++) {
            for (let x = 0; x < texture.width; x++) {
              const pixelIndex = y * texture.width + x;
              const color = texture.pixels[pixelIndex];

              if (color) {
                layerCtx.fillStyle = color;
                layerCtx.fillRect(
                  Math.floor(x * scaleX),
                  Math.floor(y * scaleY),
                  Math.ceil(scaleX),
                  Math.ceil(scaleY)
                );
              }
            }
          }

          // Update the texture and force re-render
          activeLayer.texture.needsUpdate = true;
          setLayers((prevLayers) => [...prevLayers]);

          console.log(`Injected JSON texture: ${texture.name}`);
        }
      }
    },
    [activeLayer, width, height]
  );

  const handlePaint = (x: number, y: number, pressure: number) => {
    // This is handled in the canvas component
  };

  const handleStartPaint = (x: number, y: number, pressure: number) => {
    setIsPainting(true);
  };

  const handleEndPaint = () => {
    setIsPainting(false);
  };

  const exportTexture = () => {
    if (!activeLayer) return;

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");

    if (!ctx) return;

    // Draw all visible layers
    layers.forEach((layer) => {
      if (layer.visible) {
        ctx.globalAlpha = layer.opacity;
        ctx.globalCompositeOperation =
          layer.blendMode as GlobalCompositeOperation;
        ctx.drawImage(layer.canvas, 0, 0, width, height);
      }
    });

    const dataURL = canvas.toDataURL("image/png");
    if (onExport) {
      onExport(dataURL);
    } else {
      // Download the texture
      const link = document.createElement("a");
      link.download = "texture-painter-export.png";
      link.href = dataURL;
      link.click();
    }
  };

  // Programmatic access methods
  const programmaticMethods = useMemo(
    () => ({
      setMode: (mode: "free" | "grid") => setCurrentMode(mode),
      setPixelSize: (size: number) => setCurrentPixelSize(size),
      setColor: (color: string) => setSelectedColor(color),
      setBrushSize: (size: number) => setBrushSize(size),
      setBrushOpacity: (opacity: number) => setBrushOpacity(opacity),
      setBrushHardness: (hardness: number) => setBrushHardness(hardness),
      addLayer: () => addLayer(),
      deleteLayer: (layerId: string) => deleteLayer(layerId),
      setActiveLayer: (layerId: string) => setActiveLayerId(layerId),
      getCurrentTexture: () => {
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return null;

        layers.forEach((layer) => {
          if (layer.visible) {
            ctx.globalAlpha = layer.opacity;
            ctx.globalCompositeOperation =
              layer.blendMode as GlobalCompositeOperation;
            ctx.drawImage(layer.canvas, 0, 0, width, height);
          }
        });

        return canvas.toDataURL("image/png");
      },
      paintAt: (x: number, y: number, color?: string) => {
        if (color) setSelectedColor(color);
        // We need to call the paint function from the main component scope
        // This will be handled by the main component's paint function
        if (activeLayer && !activeLayer.locked) {
          const ctx = activeLayer.canvas.getContext("2d");
          if (!ctx) return;

          ctx.globalAlpha = brushOpacity;
          ctx.fillStyle = color || selectedColor;

          if (currentMode === "grid") {
            // Grid mode - snap to pixel grid
            const gridX = Math.floor(x / currentPixelSize) * currentPixelSize;
            const gridY = Math.floor(y / currentPixelSize) * currentPixelSize;
            ctx.fillRect(gridX, gridY, currentPixelSize, currentPixelSize);
          } else {
            // Free mode - smooth painting
            const gradient = ctx.createRadialGradient(
              x,
              y,
              0,
              x,
              y,
              brushSize * brushHardness
            );
            gradient.addColorStop(0, color || selectedColor);
            gradient.addColorStop(1, "transparent");

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(x, y, brushSize, 0, Math.PI * 2);
            ctx.fill();
          }

          // Update the texture
          activeLayer.texture.needsUpdate = true;

          // Force canvas re-render by updating layers state
          setLayers((prevLayers) => [...prevLayers]);
        }
      },
      clearLayer: (layerId?: string) => {
        const targetLayer = layerId
          ? layers.find((l) => l.id === layerId)
          : activeLayer;
        if (targetLayer) {
          const ctx = targetLayer.canvas.getContext("2d");
          if (ctx) {
            ctx.clearRect(0, 0, width, height);
            targetLayer.texture.needsUpdate = true;

            // Force canvas re-render by updating layers state
            setLayers((prevLayers) => [...prevLayers]);
          }
        }
      },
    }),
    [
      setCurrentMode,
      setCurrentPixelSize,
      setSelectedColor,
      setBrushSize,
      setBrushOpacity,
      setBrushHardness,
      addLayer,
      deleteLayer,
      setActiveLayerId,
      layers,
      activeLayer,
      brushOpacity,
      selectedColor,
      currentMode,
      currentPixelSize,
      brushSize,
      brushHardness,
      width,
      height,
      setLayers,
    ]
  );

  // Expose methods for programmatic access
  useEffect(() => {
    if (programmaticAccess && (window as any).texturePainter) {
      (window as any).texturePainter = programmaticMethods;
    }
  }, [programmaticMethods, programmaticAccess]);

  const currentBrush = {
    ...selectedBrush,
    size: brushSize,
    opacity: brushOpacity,
    hardness: brushHardness,
    color: selectedColor,
  };

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        display: "flex",
        margin: 0,
        padding: 0,
        overflow: "hidden",
        position: "fixed",
        top: 0,
        left: 0,
        background: currentTheme.background,
      }}
    >
      {/* Removed separate texture library - now integrated into main interface */}

      {/* Control Panel */}
      <div
        style={{
          width: "300px",
          background: currentTheme.surface,
          padding: "20px",
          overflowY: "auto",
          borderRight: `1px solid ${currentTheme.border}`,
          color: currentTheme.text,
          flexShrink: 0,
        }}
      >
        <h2 style={{ margin: "0 0 20px 0", color: currentTheme.primary }}>
          🎨 Texture Painter
        </h2>

        {/* Brush Tools */}
        <div style={{ marginBottom: "20px" }}>
          <h3 style={{ margin: "0 0 10px 0" }}>Brush Tools</h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
            {DEFAULT_BRUSHES.map((brush) => (
              <button
                key={brush.id}
                onClick={() => setSelectedBrush(brush)}
                style={{
                  padding: "8px",
                  background:
                    selectedBrush.id === brush.id ? "#4CAF50" : "#333",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "12px",
                  minWidth: "60px",
                }}
                title={brush.name}
              >
                {brush.icon} {brush.name}
              </button>
            ))}
          </div>
        </div>

        {/* Mode Selection */}
        <div style={{ marginBottom: "20px" }}>
          <h3 style={{ margin: "0 0 10px 0" }}>Paint Mode</h3>
          <div style={{ display: "flex", gap: "10px" }}>
            <button
              onClick={() => setCurrentMode("free")}
              style={{
                padding: "8px 16px",
                background: currentMode === "free" ? "#4CAF50" : "#333",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "12px",
                flex: 1,
              }}
            >
              🎨 Free Paint
            </button>
            <button
              onClick={() => setCurrentMode("grid")}
              style={{
                padding: "8px 16px",
                background: currentMode === "grid" ? "#4CAF50" : "#333",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "12px",
                flex: 1,
              }}
            >
              🔲 Grid Paint
            </button>
          </div>
        </div>

        {/* Grid Settings */}
        {currentMode === "grid" && (
          <div style={{ marginBottom: "20px" }}>
            <h3 style={{ margin: "0 0 10px 0" }}>Grid Settings</h3>

            <div style={{ marginBottom: "10px" }}>
              <label style={{ display: "block", marginBottom: "5px" }}>
                Pixel Size: {currentPixelSize}px
              </label>
              <input
                type="range"
                min="4"
                max="64"
                step="4"
                value={currentPixelSize}
                onChange={(e) => setCurrentPixelSize(Number(e.target.value))}
                style={{ width: "100%" }}
              />
            </div>

            <div style={{ marginBottom: "10px" }}>
              <label
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
              >
                <input
                  type="checkbox"
                  checked={showGrid}
                  onChange={(e) => setShowGrid(e.target.checked)}
                />
                Show Grid Lines
              </label>
            </div>
          </div>
        )}

        {/* Brush Settings */}
        <div style={{ marginBottom: "20px" }}>
          <h3 style={{ margin: "0 0 10px 0" }}>Brush Settings</h3>

          <div style={{ marginBottom: "10px" }}>
            <label style={{ display: "block", marginBottom: "5px" }}>
              Size: {brushSize}px
            </label>
            <input
              type="range"
              min="1"
              max="100"
              value={brushSize}
              onChange={(e) => setBrushSize(Number(e.target.value))}
              style={{ width: "100%" }}
            />
          </div>

          <div style={{ marginBottom: "10px" }}>
            <label style={{ display: "block", marginBottom: "5px" }}>
              Opacity: {Math.round(brushOpacity * 100)}%
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={brushOpacity}
              onChange={(e) => setBrushOpacity(Number(e.target.value))}
              style={{ width: "100%" }}
            />
          </div>

          <div style={{ marginBottom: "10px" }}>
            <label style={{ display: "block", marginBottom: "5px" }}>
              Hardness: {Math.round(brushHardness * 100)}%
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={brushHardness}
              onChange={(e) => setBrushHardness(Number(e.target.value))}
              style={{ width: "100%" }}
            />
          </div>
        </div>

        {/* Color Palette */}
        <div style={{ marginBottom: "20px" }}>
          <h3 style={{ margin: "0 0 10px 0", color: currentTheme.text }}>
            Colors
          </h3>

          {/* Quick Color Picker */}
          <div style={{ marginBottom: "15px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "5px",
              }}
            >
              <label
                style={{
                  color: currentTheme.textSecondary,
                  fontSize: "12px",
                }}
              >
                Custom Color:
              </label>
              <button
                onClick={() => setSelectedColor(getRandomColor())}
                style={{
                  padding: "4px 8px",
                  backgroundColor: currentTheme.primary,
                  color: currentTheme.text,
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "10px",
                  transition: "opacity 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = "0.8";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = "1";
                }}
                title="Random Color"
              >
                🎲 Random
              </button>
            </div>
            <input
              type="color"
              value={selectedColor}
              onChange={(e) => setSelectedColor(e.target.value)}
              style={{
                width: "100%",
                height: "40px",
                border: `1px solid ${currentTheme.border}`,
                borderRadius: "6px",
                cursor: "pointer",
                background: "transparent",
              }}
            />
          </div>

          {/* Organized Color Palettes */}
          {Object.entries(COLOR_PALETTE)
            .slice(0, 6)
            .map(([paletteName, colors]) => (
              <div key={paletteName} style={{ marginBottom: "15px" }}>
                <h4
                  style={{
                    margin: "0 0 8px 0",
                    color: currentTheme.textSecondary,
                    fontSize: "12px",
                    textTransform: "capitalize",
                  }}
                >
                  {paletteName} ({colors.length})
                </h4>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "3px",
                    maxHeight: "80px",
                    overflowY: "auto",
                  }}
                >
                  {colors.slice(0, 20).map((color) => (
                    <button
                      key={color}
                      onClick={() => setSelectedColor(color)}
                      style={{
                        width: "24px",
                        height: "24px",
                        background: color,
                        border:
                          selectedColor === color
                            ? `2px solid ${currentTheme.accent}`
                            : `1px solid ${currentTheme.border}`,
                        borderRadius: "4px",
                        cursor: "pointer",
                        transition:
                          "transform 0.2s ease, border-color 0.2s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "scale(1.1)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "scale(1)";
                      }}
                      title={`${color} - ${paletteName}`}
                    />
                  ))}
                </div>
              </div>
            ))}

          {/* Current Color Display */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "10px",
              backgroundColor: currentTheme.background,
              borderRadius: "6px",
              border: `1px solid ${currentTheme.border}`,
              marginTop: "10px",
            }}
          >
            <div
              style={{
                width: "30px",
                height: "30px",
                background: selectedColor,
                borderRadius: "6px",
                border: `2px solid ${currentTheme.border}`,
              }}
            />
            <div
              style={{
                color: currentTheme.text,
                fontSize: "12px",
                fontFamily: "monospace",
              }}
            >
              {selectedColor}
            </div>
          </div>
        </div>

        {/* Layers */}
        <div style={{ marginBottom: "20px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "10px",
            }}
          >
            <h3 style={{ margin: 0 }}>Layers</h3>
            <button
              onClick={addLayer}
              style={{
                padding: "5px 10px",
                background: "#4CAF50",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "12px",
              }}
            >
              + Add
            </button>
          </div>

          <div style={{ maxHeight: "200px", overflowY: "auto" }}>
            {layers.map((layer, index) => (
              <div
                key={layer.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "5px",
                  background:
                    activeLayerId === layer.id ? "#333" : "transparent",
                  borderRadius: "4px",
                  marginBottom: "2px",
                  border: layer.locked
                    ? "1px solid #ffaa00"
                    : "1px solid transparent",
                }}
              >
                <input
                  type="checkbox"
                  checked={layer.visible}
                  onChange={(e) =>
                    updateLayer(layer.id, { visible: e.target.checked })
                  }
                  style={{ marginRight: "8px" }}
                />
                <span
                  style={{
                    flex: 1,
                    fontSize: "12px",
                    cursor: "pointer",
                    color: layer.locked ? "#ffaa00" : "white",
                  }}
                  onClick={() => setActiveLayerId(layer.id)}
                >
                  {layer.name} {layer.locked ? "🔒" : ""}
                </span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={layer.opacity}
                  onChange={(e) =>
                    updateLayer(layer.id, { opacity: Number(e.target.value) })
                  }
                  style={{ width: "40px", marginRight: "5px" }}
                />
                <button
                  onClick={() => deleteLayer(layer.id)}
                  style={{
                    padding: "2px 6px",
                    background: "#ff4444",
                    color: "white",
                    border: "none",
                    borderRadius: "2px",
                    cursor: "pointer",
                    fontSize: "10px",
                  }}
                  disabled={layers.length <= 1}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Layer Filters */}
        {activeLayer && (
          <div style={{ marginBottom: "20px" }}>
            <h3 style={{ margin: "0 0 10px 0" }}>Layer Filters</h3>

            <div style={{ marginBottom: "10px" }}>
              <label style={{ display: "block", marginBottom: "5px" }}>
                Filter:
              </label>
              <select
                value={activeLayer.filter}
                onChange={(e) =>
                  updateLayer(activeLayer.id, { filter: e.target.value })
                }
                style={{
                  width: "100%",
                  padding: "5px",
                  background: "#333",
                  color: "white",
                  border: "1px solid #555",
                  borderRadius: "4px",
                }}
              >
                {FILTERS.map((filter) => (
                  <option key={filter.id} value={filter.id}>
                    {filter.name}
                  </option>
                ))}
              </select>
            </div>

            {activeLayer.filter !== "none" && (
              <div style={{ marginBottom: "10px" }}>
                <label style={{ display: "block", marginBottom: "5px" }}>
                  Intensity: {Math.round(activeLayer.filterIntensity * 100)}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  value={activeLayer.filterIntensity}
                  onChange={(e) => {
                    updateLayer(activeLayer.id, {
                      filterIntensity: Number(e.target.value),
                    });
                    applyFilter(
                      activeLayer.canvas,
                      activeLayer.filter,
                      Number(e.target.value)
                    );
                    activeLayer.texture.needsUpdate = true;
                  }}
                  style={{ width: "100%" }}
                />
              </div>
            )}

            <div style={{ marginBottom: "10px" }}>
              <label
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
              >
                <input
                  type="checkbox"
                  checked={activeLayer.locked}
                  onChange={(e) =>
                    updateLayer(activeLayer.id, { locked: e.target.checked })
                  }
                />
                Lock Layer
              </label>
            </div>

            <div style={{ marginBottom: "10px" }}>
              <label style={{ display: "block", marginBottom: "5px" }}>
                Blend Mode:
              </label>
              <select
                value={activeLayer.blendMode}
                onChange={(e) =>
                  updateLayer(activeLayer.id, { blendMode: e.target.value })
                }
                style={{
                  width: "100%",
                  padding: "5px",
                  background: "#333",
                  color: "white",
                  border: "1px solid #555",
                  borderRadius: "4px",
                }}
              >
                {BLEND_MODES.map((mode) => (
                  <option key={mode} value={mode}>
                    {mode}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Export */}
        <button
          onClick={exportTexture}
          style={{
            width: "100%",
            padding: "12px",
            background: "linear-gradient(45deg, #4CAF50, #45a049)",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: "bold",
            marginBottom: "10px",
          }}
        >
          💾 Export Texture
        </button>

        {/* Preview Toggle */}
        <button
          onClick={() => setShowPreview(!showPreview)}
          style={{
            width: "100%",
            padding: "8px",
            background: showPreview ? "#4CAF50" : "#666",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "12px",
          }}
        >
          {showPreview ? "Hide" : "Show"} 3D Preview
        </button>
      </div>

      {/* Main Content */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          position: "relative",
        }}
      >
        {/* Preset textures are now integrated into the main interface */}

        {/* Canvas Area */}
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
        >
          <TextureCanvas
            width={width}
            height={height}
            layers={layers}
            activeLayer={activeLayer}
            brush={currentBrush}
            isPainting={isPainting}
            mode={currentMode}
            pixelSize={currentPixelSize}
            showGrid={showGrid}
            programmaticAccess={programmaticAccess}
            onTextureChange={onTextureChange}
            onPaint={handlePaint}
            onStartPaint={handleStartPaint}
            onEndPaint={handleEndPaint}
          />
        </div>

        {/* Preset Texture Grid */}
        {showPresetGrid && presetTextures.length > 0 && (
          <div
            style={{
              background: currentTheme.surface,
              borderTop: `1px solid ${currentTheme.border}`,
              padding: "16px",
              maxHeight: "200px",
              overflowY: "auto",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "12px",
              }}
            >
              <h3
                style={{
                  margin: 0,
                  color: currentTheme.primary,
                  fontSize: "16px",
                }}
              >
                🎨 Preset Textures
              </h3>
              <button
                onClick={() => setShowPresetGrid(false)}
                style={{
                  background: "none",
                  border: "none",
                  color: currentTheme.textSecondary,
                  cursor: "pointer",
                  fontSize: "16px",
                  padding: "4px",
                }}
                title="Hide Preset Textures"
              >
                ×
              </button>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(60px, 1fr))",
                gap: "8px",
              }}
            >
              {presetTextures.map((texture) => (
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
                  onClick={() => handleTextureInject(texture)}
                  title={`${texture.name} - ${texture.description}`}
                >
                  <JsonTextureGrid texture={texture} size={40} />
                  <div
                    style={{
                      fontSize: "9px",
                      textAlign: "center",
                      marginTop: "4px",
                      color: currentTheme.textSecondary,
                      lineHeight: "1.2",
                      wordBreak: "break-word",
                    }}
                  >
                    {texture.name}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Show Preset Textures Button */}
        {!showPresetGrid && presetTextures.length > 0 && (
          <button
            onClick={() => setShowPresetGrid(true)}
            style={{
              position: "absolute",
              bottom: "20px",
              right: "20px",
              zIndex: 1000,
              padding: "8px 16px",
              background: currentTheme.primary,
              color: currentTheme.text,
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "bold",
              boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
            }}
          >
            🎨 Show Preset Textures
          </button>
        )}

        {/* 3D Preview */}
        {showPreview && (
          <div
            style={{
              height: "300px",
              background: "#1a1a1a",
              borderTop: "1px solid #333",
            }}
          >
            <Canvas camera={{ position: [0, 0, 5] }}>
              <ambientLight intensity={0.5} />
              <directionalLight position={[10, 10, 5]} intensity={1} />
              <TexturePreview layers={layers} width={width} height={height} />
              <OrbitControls enablePan={false} enableZoom={false} />
            </Canvas>
          </div>
        )}
      </div>
    </div>
  );
};

export default TexturePainter;
