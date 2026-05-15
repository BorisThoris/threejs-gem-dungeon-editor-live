import React, { useState, useRef, useCallback, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Text, Html } from "@react-three/drei";
import * as THREE from "three";
import {
  GridCellPrototype,
  prototypeManager,
  createGridCell,
} from "../../../types/PrototypeSystem";
import { textureManager } from "../../../types/TextureSystem";
import { actionManager, BUILT_IN_ACTIONS } from "../../../types/ActionSystem";

// Types
interface GridCell {
  x: number;
  y: number;
  color: string;
  shape: "square" | "circle" | "triangle" | "diamond" | "hexagon";
  size: number;
  rotation: number;
  prototype?: GridCellPrototype; // Link to prototype system
}

interface BrushTool {
  id: string;
  name: string;
  icon: string;
  description: string;
  size: number;
  shape: "square" | "circle" | "triangle" | "diamond" | "hexagon";
}

interface TexturePainterProps {
  gridSize?: number;
  cellSize?: number;
  onExport?: (texture: string) => void;
}

// Default brush tools
const BRUSH_TOOLS: BrushTool[] = [
  {
    id: "square",
    name: "Square",
    icon: "⬜",
    description: "Paint square shapes",
    size: 1,
    shape: "square",
  },
  {
    id: "circle",
    name: "Circle",
    icon: "⭕",
    description: "Paint circular shapes",
    size: 1,
    shape: "circle",
  },
  {
    id: "triangle",
    name: "Triangle",
    icon: "🔺",
    description: "Paint triangular shapes",
    size: 1,
    shape: "triangle",
  },
  {
    id: "diamond",
    name: "Diamond",
    icon: "💎",
    description: "Paint diamond shapes",
    size: 1,
    shape: "diamond",
  },
  {
    id: "hexagon",
    name: "Hexagon",
    icon: "⬡",
    description: "Paint hexagonal shapes",
    size: 1,
    shape: "hexagon",
  },
];

// Color palette
const COLOR_PALETTE = [
  "#FF6B6B",
  "#4ECDC4",
  "#45B7D1",
  "#96CEB4",
  "#FFEAA7",
  "#DDA0DD",
  "#98D8C8",
  "#F7DC6F",
  "#BB8FCE",
  "#85C1E9",
  "#F8C471",
  "#82E0AA",
  "#F1948A",
  "#D7BDE2",
  "#A9DFBF",
  "#F9E79F",
  "#D5DBDB",
  "#FADBD8",
  "#E8DAEF",
  "#D1F2EB",
  "#FCF3CF",
  "#FF9F43",
  "#6C5CE7",
  "#A29BFE",
  "#FD79A8",
  "#FDCB6E",
  "#E17055",
  "#00B894",
  "#00CEC9",
  "#74B9FF",
];

// Grid cell component
const GridCell: React.FC<{
  cell: GridCell;
  cellSize: number;
  isSelected: boolean;
  onClick: () => void;
  onHover: () => void;
}> = ({ cell, cellSize, isSelected, onClick, onHover }) => {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.z = cell.rotation;
      if (isSelected) {
        meshRef.current.scale.setScalar(1.1);
      } else {
        meshRef.current.scale.setScalar(1);
      }
    }
  });

  const getGeometry = () => {
    const size = cellSize * cell.size * 0.8;
    switch (cell.shape) {
      case "circle":
        return <circleGeometry args={[size, 32]} />;
      case "triangle":
        return <coneGeometry args={[size, 0, 3]} />;
      case "diamond":
        return <octahedronGeometry args={[size]} />;
      case "hexagon":
        return <coneGeometry args={[size, 0, 6]} />;
      default:
        return <boxGeometry args={[size, size, 0.1]} />;
    }
  };

  return (
    <mesh
      ref={meshRef}
      position={[cell.x * cellSize, cell.y * cellSize, 0]}
      onClick={onClick}
      onPointerOver={onHover}
    >
      {getGeometry()}
      <meshStandardMaterial
        color={cell.color}
        metalness={0.1}
        roughness={0.3}
        emissive={isSelected ? "#ffffff" : "#000000"}
        emissiveIntensity={isSelected ? 0.2 : 0}
      />
    </mesh>
  );
};

// Grid component
const Grid: React.FC<{
  gridSize: number;
  cellSize: number;
  cells: GridCell[];
  selectedCell: { x: number; y: number } | null;
  onCellClick: (x: number, y: number) => void;
  onCellHover: (x: number, y: number) => void;
}> = ({
  gridSize,
  cellSize,
  cells,
  selectedCell,
  onCellClick,
  onCellHover,
}) => {
  const gridRef = useRef<THREE.Group>(null);

  return (
    <group ref={gridRef}>
      {/* Grid lines */}
      <group>
        {Array.from({ length: gridSize + 1 }, (_, i) => (
          <group key={`vertical-${i}`}>
            <mesh position={[(i - gridSize / 2) * cellSize, 0, -0.01]}>
              <boxGeometry args={[0.02, (gridSize - 1) * cellSize, 0.01]} />
              <meshBasicMaterial color="#333333" />
            </mesh>
          </group>
        ))}
        {Array.from({ length: gridSize + 1 }, (_, i) => (
          <group key={`horizontal-${i}`}>
            <mesh position={[0, (i - gridSize / 2) * cellSize, -0.01]}>
              <boxGeometry args={[(gridSize - 1) * cellSize, 0.02, 0.01]} />
              <meshBasicMaterial color="#333333" />
            </mesh>
          </group>
        ))}
      </group>

      {/* Grid cells */}
      {cells.map((cell, index) => (
        <GridCell
          key={`${cell.x}-${cell.y}`}
          cell={cell}
          cellSize={cellSize}
          isSelected={selectedCell?.x === cell.x && selectedCell?.y === cell.y}
          onClick={() => onCellClick(cell.x, cell.y)}
          onHover={() => onCellHover(cell.x, cell.y)}
        />
      ))}
    </group>
  );
};

// Main MosaicCreator component
const MosaicCreator: React.FC<TexturePainterProps> = ({
  gridSize = 16,
  cellSize = 0.5,
  onExport,
}) => {
  const [cells, setCells] = useState<GridCell[]>([]);
  const [selectedCell, setSelectedCell] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [selectedTool, setSelectedTool] = useState<BrushTool>(BRUSH_TOOLS[0]);
  const [selectedColor, setSelectedColor] = useState(COLOR_PALETTE[0]);
  const [brushSize, setBrushSize] = useState(1);
  const [isPainting, setIsPainting] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [showPreview, setShowPreview] = useState(false);

  // Initialize grid
  useEffect(() => {
    const newCells: GridCell[] = [];
    for (let x = 0; x < gridSize; x++) {
      for (let y = 0; y < gridSize; y++) {
        // Create prototype for this cell
        const prototype = createGridCell({
          position: [
            x - Math.floor(gridSize / 2),
            y - Math.floor(gridSize / 2),
            0,
          ],
          color: "#2a2a2a",
          shape: "square",
          size: 1,
        });

        newCells.push({
          x: x - Math.floor(gridSize / 2),
          y: y - Math.floor(gridSize / 2),
          color: "#2a2a2a",
          shape: "square",
          size: 1,
          rotation: 0,
          prototype,
        });
      }
    }
    setCells(newCells);
  }, [gridSize]);

  // Handle cell click
  const handleCellClick = useCallback(
    (x: number, y: number) => {
      setSelectedCell({ x, y });
      setIsPainting(true);

      setCells((prevCells) =>
        prevCells.map((cell) => {
          if (cell.x === x && cell.y === y) {
            // Use prototype system to update the cell
            if (cell.prototype) {
              // Execute paint action
              actionManager.executeAction(cell.prototype, "paint", {
                color: selectedColor,
              });

              // Execute shape change action
              actionManager.executeAction(cell.prototype, "change-shape", {
                shape: selectedTool.shape,
              });

              // Execute scale action
              actionManager.executeAction(cell.prototype, "scale", {
                factor: brushSize,
              });

              // Execute rotate action
              actionManager.executeAction(cell.prototype, "rotate", {
                angle: Math.random() * Math.PI * 2,
              });
            }

            return {
              ...cell,
              color: selectedColor,
              shape: selectedTool.shape,
              size: brushSize,
              rotation: Math.random() * Math.PI * 2,
            };
          }
          return cell;
        })
      );
    },
    [selectedColor, selectedTool.shape, brushSize]
  );

  // Handle cell hover
  const handleCellHover = useCallback(
    (x: number, y: number) => {
      if (isPainting) {
        setCells((prevCells) =>
          prevCells.map((cell) =>
            cell.x === x && cell.y === y
              ? {
                  ...cell,
                  color: selectedColor,
                  shape: selectedTool.shape,
                  size: brushSize,
                  rotation: Math.random() * Math.PI * 2,
                }
              : cell
          )
        );
      }
    },
    [isPainting, selectedColor, selectedTool.shape, brushSize]
  );

  // Clear grid
  const clearGrid = () => {
    setCells((prevCells) =>
      prevCells.map((cell) => ({
        ...cell,
        color: "#2a2a2a",
        shape: "square",
        size: 1,
        rotation: 0,
      }))
    );
  };

  // Export texture
  const exportTexture = () => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const pixelSize = 32;
    canvas.width = gridSize * pixelSize;
    canvas.height = gridSize * pixelSize;

    // Fill background
    ctx.fillStyle = "#2a2a2a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw cells
    cells.forEach((cell) => {
      const x = (cell.x + Math.floor(gridSize / 2)) * pixelSize;
      const y = (cell.y + Math.floor(gridSize / 2)) * pixelSize;
      const size = cell.size * pixelSize * 0.8;

      ctx.fillStyle = cell.color;
      ctx.save();
      ctx.translate(x + pixelSize / 2, y + pixelSize / 2);
      ctx.rotate(cell.rotation);

      switch (cell.shape) {
        case "circle":
          ctx.beginPath();
          ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
          ctx.fill();
          break;
        case "triangle":
          ctx.beginPath();
          ctx.moveTo(0, -size / 2);
          ctx.lineTo(-size / 2, size / 2);
          ctx.lineTo(size / 2, size / 2);
          ctx.closePath();
          ctx.fill();
          break;
        case "diamond":
          ctx.beginPath();
          ctx.moveTo(0, -size / 2);
          ctx.lineTo(size / 2, 0);
          ctx.lineTo(0, size / 2);
          ctx.lineTo(-size / 2, 0);
          ctx.closePath();
          ctx.fill();
          break;
        case "hexagon":
          ctx.beginPath();
          for (let i = 0; i < 6; i++) {
            const angle = (i * Math.PI) / 3;
            const x = (Math.cos(angle) * size) / 2;
            const y = (Math.sin(angle) * size) / 2;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.closePath();
          ctx.fill();
          break;
        default: // square
          ctx.fillRect(-size / 2, -size / 2, size, size);
      }

      ctx.restore();
    });

    const dataURL = canvas.toDataURL("image/png");
    if (onExport) {
      onExport(dataURL);
    } else {
      // Download the image
      const link = document.createElement("a");
      link.download = "texture-painter-export.png";
      link.href = dataURL;
      link.click();
    }
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
      }}
    >
      {/* Control Panel */}
      <div
        style={{
          width: "300px",
          background: "linear-gradient(180deg, #1a1a1a 0%, #0f0f0f 100%)",
          padding: "20px",
          overflowY: "auto",
          borderRight: "1px solid #333",
          color: "white",
          flexShrink: 0,
        }}
      >
        <h2 style={{ margin: "0 0 20px 0", color: "#4CAF50" }}>
          🧩 3D Mosaic Creator
        </h2>

        {/* Brush Tools */}
        <div style={{ marginBottom: "20px" }}>
          <h3 style={{ margin: "0 0 10px 0" }}>Brush Tools</h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
            {BRUSH_TOOLS.map((tool) => (
              <button
                key={tool.id}
                onClick={() => setSelectedTool(tool)}
                style={{
                  padding: "8px",
                  background: selectedTool.id === tool.id ? "#4CAF50" : "#333",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "12px",
                  minWidth: "60px",
                }}
                title={tool.description}
              >
                {tool.icon} {tool.name}
              </button>
            ))}
          </div>
        </div>

        {/* Color Palette */}
        <div style={{ marginBottom: "20px" }}>
          <h3 style={{ margin: "0 0 10px 0" }}>Colors</h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
            {COLOR_PALETTE.map((color) => (
              <button
                key={color}
                onClick={() => setSelectedColor(color)}
                style={{
                  width: "30px",
                  height: "30px",
                  background: color,
                  border:
                    selectedColor === color
                      ? "2px solid white"
                      : "1px solid #333",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
                title={color}
              />
            ))}
          </div>
        </div>

        {/* Brush Size */}
        <div style={{ marginBottom: "20px" }}>
          <h3 style={{ margin: "0 0 10px 0" }}>Brush Size</h3>
          <input
            type="range"
            min="0.5"
            max="2"
            step="0.1"
            value={brushSize}
            onChange={(e) => setBrushSize(Number(e.target.value))}
            style={{ width: "100%" }}
          />
          <div style={{ fontSize: "12px", color: "#888", textAlign: "center" }}>
            {brushSize}x
          </div>
        </div>

        {/* Grid Controls */}
        <div style={{ marginBottom: "20px" }}>
          <h3 style={{ margin: "0 0 10px 0" }}>Grid Controls</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
            <button
              onClick={() => setShowGrid(!showGrid)}
              style={{
                padding: "8px",
                background: showGrid ? "#4CAF50" : "#333",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "12px",
              }}
            >
              {showGrid ? "✅" : "❌"} Show Grid
            </button>
            <button
              onClick={() => setShowPreview(!showPreview)}
              style={{
                padding: "8px",
                background: showPreview ? "#4CAF50" : "#333",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "12px",
              }}
            >
              {showPreview ? "✅" : "❌"} Show Preview
            </button>
          </div>
        </div>

        {/* Actions */}
        <div style={{ marginBottom: "20px" }}>
          <h3 style={{ margin: "0 0 10px 0" }}>Actions</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
            <button
              onClick={clearGrid}
              style={{
                padding: "8px",
                background: "#FF6B6B",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "12px",
              }}
            >
              🗑️ Clear Grid
            </button>
            <button
              onClick={exportTexture}
              style={{
                padding: "8px",
                background: "#4CAF50",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "12px",
              }}
            >
              💾 Export Texture
            </button>
          </div>
        </div>

        {/* Cell Actions */}
        {selectedCell && (
          <div style={{ marginBottom: "20px" }}>
            <h3 style={{ margin: "0 0 10px 0" }}>Cell Actions</h3>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
              {BUILT_IN_ACTIONS.PAINT && (
                <button
                  onClick={() => {
                    const cell = cells.find(
                      (c) => c.x === selectedCell.x && c.y === selectedCell.y
                    );
                    if (cell?.prototype) {
                      actionManager.executeAction(cell.prototype, "paint", {
                        color: selectedColor,
                      });
                    }
                  }}
                  style={{
                    padding: "6px 10px",
                    background: "#4CAF50",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "11px",
                  }}
                >
                  🎨 Paint
                </button>
              )}
              {BUILT_IN_ACTIONS.ROTATE && (
                <button
                  onClick={() => {
                    const cell = cells.find(
                      (c) => c.x === selectedCell.x && c.y === selectedCell.y
                    );
                    if (cell?.prototype) {
                      actionManager.executeAction(cell.prototype, "rotate");
                    }
                  }}
                  style={{
                    padding: "6px 10px",
                    background: "#2196F3",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "11px",
                  }}
                >
                  🔄 Rotate
                </button>
              )}
              {BUILT_IN_ACTIONS.SCALE && (
                <button
                  onClick={() => {
                    const cell = cells.find(
                      (c) => c.x === selectedCell.x && c.y === selectedCell.y
                    );
                    if (cell?.prototype) {
                      actionManager.executeAction(cell.prototype, "scale", {
                        factor: 1.1,
                      });
                    }
                  }}
                  style={{
                    padding: "6px 10px",
                    background: "#FF9800",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "11px",
                  }}
                >
                  📏 Scale
                </button>
              )}
              {BUILT_IN_ACTIONS.GLOW && (
                <button
                  onClick={() => {
                    const cell = cells.find(
                      (c) => c.x === selectedCell.x && c.y === selectedCell.y
                    );
                    if (cell?.prototype) {
                      actionManager.executeAction(cell.prototype, "glow", {
                        intensity: 1.5,
                      });
                    }
                  }}
                  style={{
                    padding: "6px 10px",
                    background: "#9C27B0",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "11px",
                  }}
                >
                  ✨ Glow
                </button>
              )}
            </div>
          </div>
        )}

        {/* Instructions */}
        <div style={{ marginBottom: "20px" }}>
          <h3 style={{ margin: "0 0 10px 0" }}>Instructions</h3>
          <div style={{ fontSize: "12px", lineHeight: "1.4", color: "#ccc" }}>
            <p>• Click to paint cells</p>
            <p>• Drag to paint multiple cells</p>
            <p>• Use different brush tools</p>
            <p>• Adjust brush size</p>
            <p>• Click cell actions for more options</p>
            <p>• Export your texture</p>
          </div>
        </div>
      </div>

      {/* 3D Canvas */}
      <div
        style={{
          flex: 1,
          position: "relative",
          height: "100vh",
          minWidth: 0,
        }}
      >
        <Canvas
          shadows
          camera={{ position: [0, 0, 12], fov: 75 }}
          onPointerDown={() => setIsPainting(true)}
          onPointerUp={() => setIsPainting(false)}
          onPointerLeave={() => setIsPainting(false)}
          style={{
            width: "100%",
            height: "100%",
            display: "block",
          }}
        >
          <ambientLight intensity={0.6} />
          <directionalLight position={[10, 10, 5]} intensity={0.8} />

          <Grid
            gridSize={gridSize}
            cellSize={cellSize}
            cells={cells}
            selectedCell={selectedCell}
            onCellClick={handleCellClick}
            onCellHover={handleCellHover}
          />

          <OrbitControls
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            minDistance={8}
            maxDistance={25}
            target={[0, 0, 0]}
          />
        </Canvas>

        {/* Preview Panel */}
        {showPreview && (
          <div
            style={{
              position: "absolute",
              top: "20px",
              right: "20px",
              width: "200px",
              height: "200px",
              background: "rgba(0, 0, 0, 0.8)",
              border: "2px solid #333",
              borderRadius: "8px",
              padding: "10px",
              color: "white",
            }}
          >
            <h4 style={{ margin: "0 0 10px 0", fontSize: "14px" }}>Preview</h4>
            <div
              style={{
                width: "100%",
                height: "150px",
                background: "#2a2a2a",
                border: "1px solid #555",
                borderRadius: "4px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "12px",
                color: "#888",
              }}
            >
              Texture Preview
            </div>
          </div>
        )}

        {/* Status */}
        <div
          style={{
            position: "absolute",
            bottom: "20px",
            left: "20px",
            background: "rgba(0, 0, 0, 0.8)",
            color: "white",
            padding: "10px",
            borderRadius: "4px",
            fontSize: "12px",
          }}
        >
          <div>
            Tool: {selectedTool.icon} {selectedTool.name}
          </div>
          <div>Color: {selectedColor}</div>
          <div>Size: {brushSize}x</div>
          <div>
            Grid: {gridSize}x{gridSize}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MosaicCreator;
