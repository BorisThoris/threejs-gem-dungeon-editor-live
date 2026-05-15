import React, { useState, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Text } from "@react-three/drei";
import { Physics } from "@react-three/rapier";
import MultiBiomeRoom from "./primitives/game-rooms/MultiBiomeRoom";

// Define BiomePlacement interface locally to avoid import issues
interface BiomePlacement {
  type: string;
  position: [number, number, number];
  rotation?: [number, number, number];
  size?: number;
  props?: any;
}

// Predefined room templates
const ROOM_TEMPLATES = {
  "starter-base": {
    name: "Starter Base",
    description: "A basic room with essential facilities",
    biomes: [
      { type: "bedroom", position: [-6, 0, -6], size: 8 },
      { type: "kitchen", position: [6, 0, -6], size: 8 },
      { type: "library", position: [-6, 0, 6], size: 8 },
      { type: "garden", position: [6, 0, 6], size: 8 },
    ],
  },
  "combat-arena": {
    name: "Combat Arena",
    description: "A room designed for combat and challenges",
    biomes: [
      { type: "arena", position: [0, 0, 0], size: 12 },
      { type: "gym", position: [-8, 0, -8], size: 6 },
      { type: "treasure", position: [8, 0, -8], size: 6 },
      { type: "portal", position: [0, 0, 8], size: 8 },
    ],
  },
  "mystery-dungeon": {
    name: "Mystery Dungeon",
    description: "A complex room with puzzles and secrets",
    biomes: [
      { type: "maze", position: [-4, 0, 0], size: 12 },
      { type: "puzzle", position: [4, 0, -4], size: 8 },
      { type: "crypt", position: [4, 0, 4], size: 8 },
      { type: "special", position: [0, 0, 0], size: 6 },
    ],
  },
  "trading-post": {
    name: "Trading Post",
    description: "A commercial hub with shops and services",
    biomes: [
      { type: "shop", position: [-6, 0, 0], size: 8 },
      { type: "workshop", position: [6, 0, 0], size: 8 },
      { type: "library-upgrade", position: [0, 0, -6], size: 8 },
      { type: "coffee", position: [0, 0, 6], size: 6 },
    ],
  },
  "meditation-sanctuary": {
    name: "Meditation Sanctuary",
    description: "A peaceful room for healing and reflection",
    biomes: [
      { type: "meditation", position: [0, 0, 0], size: 10 },
      { type: "garden", position: [-8, 0, 0], size: 8 },
      { type: "observatory", position: [8, 0, 0], size: 8 },
      { type: "bedroom", position: [0, 0, -8], size: 6 },
    ],
  },
};

const RoomBuilder: React.FC = () => {
  const [selectedTemplate, setSelectedTemplate] =
    useState<string>("starter-base");
  const [customBiomes, setCustomBiomes] = useState<BiomePlacement[]>([]);
  const [selectedBiome, setSelectedBiome] = useState<string>("bedroom");
  const [roomSize, setRoomSize] = useState<number>(20);
  const [isBuilding, setIsBuilding] = useState<boolean>(false);

  const handleTemplateSelect = (templateKey: string) => {
    setSelectedTemplate(templateKey);
    setCustomBiomes([]);
  };

  const handleAddBiome = () => {
    const newBiome: BiomePlacement = {
      type: selectedBiome,
      position: [0, 0, 0],
      size: 10,
    };
    setCustomBiomes([...customBiomes, newBiome]);
  };

  const handleRemoveBiome = (index: number) => {
    setCustomBiomes(customBiomes.filter((_, i) => i !== index));
  };

  const handleBiomePositionChange = (
    index: number,
    position: [number, number, number]
  ) => {
    const updatedBiomes = [...customBiomes];
    updatedBiomes[index].position = position;
    setCustomBiomes(updatedBiomes);
  };

  const currentBiomes =
    customBiomes.length > 0
      ? customBiomes
      : ROOM_TEMPLATES[selectedTemplate as keyof typeof ROOM_TEMPLATES].biomes;

  return (
    <div style={{ display: "flex", height: "100vh", background: "#1a1a1a" }}>
      {/* Control Panel */}
      <div
        style={{
          width: "350px",
          background: "#2a2a2a",
          padding: "20px",
          overflowY: "auto",
          borderRight: "1px solid #444",
        }}
      >
        <h2 style={{ color: "white", marginBottom: "20px" }}>Room Builder</h2>

        {/* Room Size */}
        <div style={{ marginBottom: "20px" }}>
          <label
            style={{ color: "white", display: "block", marginBottom: "8px" }}
          >
            Room Size: {roomSize}
          </label>
          <input
            type="range"
            min="10"
            max="40"
            value={roomSize}
            onChange={(e) => setRoomSize(Number(e.target.value))}
            style={{ width: "100%" }}
          />
        </div>

        {/* Template Selection */}
        <div style={{ marginBottom: "20px" }}>
          <label
            style={{ color: "white", display: "block", marginBottom: "8px" }}
          >
            Room Templates:
          </label>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {Object.entries(ROOM_TEMPLATES).map(([key, template]) => (
              <button
                key={key}
                onClick={() => handleTemplateSelect(key)}
                style={{
                  padding: "10px",
                  background: selectedTemplate === key ? "#4CAF50" : "#333",
                  color: "white",
                  border: "none",
                  borderRadius: "5px",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <div style={{ fontWeight: "bold" }}>{template.name}</div>
                <div style={{ fontSize: "12px", opacity: 0.8 }}>
                  {template.description}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Custom Biome Builder */}
        <div style={{ marginBottom: "20px" }}>
          <label
            style={{ color: "white", display: "block", marginBottom: "8px" }}
          >
            Add Custom Biomes:
          </label>
          <div style={{ display: "flex", gap: "8px", marginBottom: "10px" }}>
            <select
              value={selectedBiome}
              onChange={(e) => setSelectedBiome(e.target.value)}
              style={{
                flex: 1,
                padding: "8px",
                background: "#444",
                color: "white",
                border: "1px solid #666",
                borderRadius: "4px",
              }}
            >
              <option value="bedroom">🛏️ Bedroom</option>
              <option value="kitchen">🍳 Kitchen</option>
              <option value="library">📚 Library</option>
              <option value="shop">🛒 Shop</option>
              <option value="treasure">💰 Treasure</option>
              <option value="gym">💪 Gym</option>
              <option value="garden">🌿 Garden</option>
              <option value="workshop">🔨 Workshop</option>
              <option value="arena">⚔️ Arena</option>
              <option value="maze">🌀 Maze</option>
              <option value="portal">🌀 Portal</option>
            </select>
            <button
              onClick={handleAddBiome}
              style={{
                padding: "8px 12px",
                background: "#4CAF50",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              Add
            </button>
          </div>
        </div>

        {/* Current Biomes */}
        <div style={{ marginBottom: "20px" }}>
          <label
            style={{ color: "white", display: "block", marginBottom: "8px" }}
          >
            Current Biomes ({currentBiomes.length}):
          </label>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            {currentBiomes.map((biome, index) => (
              <div
                key={index}
                style={{
                  padding: "8px",
                  background: "#333",
                  borderRadius: "4px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span style={{ color: "white", fontSize: "12px" }}>
                  {biome.type} ({biome.position[0]}, {biome.position[1]},{" "}
                  {biome.position[2]})
                </span>
                {customBiomes.length > 0 && (
                  <button
                    onClick={() => handleRemoveBiome(index)}
                    style={{
                      background: "#f44336",
                      color: "white",
                      border: "none",
                      borderRadius: "3px",
                      padding: "4px 8px",
                      cursor: "pointer",
                      fontSize: "10px",
                    }}
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Build Controls */}
        <div>
          <button
            onClick={() => setIsBuilding(!isBuilding)}
            style={{
              width: "100%",
              padding: "12px",
              background: isBuilding ? "#f44336" : "#4CAF50",
              color: "white",
              border: "none",
              borderRadius: "5px",
              cursor: "pointer",
              fontSize: "16px",
              fontWeight: "bold",
            }}
          >
            {isBuilding ? "Stop Building" : "Start Building"}
          </button>
        </div>
      </div>

      {/* 3D Viewport */}
      <div style={{ flex: 1, position: "relative" }}>
        <Canvas camera={{ position: [15, 15, 15], fov: 60 }}>
          <ambientLight intensity={0.4} />
          <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
          <OrbitControls
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
          />

          <Physics>
            <MultiBiomeRoom
              roomSize={roomSize}
              biomes={currentBiomes}
              onRoomComplete={() => {
                /* Room complete! */
              }}
            />
          </Physics>

          {/* Grid Helper */}
          <gridHelper args={[roomSize * 2, roomSize / 2, "#444", "#222"]} />
        </Canvas>
      </div>
    </div>
  );
};

export default RoomBuilder;
