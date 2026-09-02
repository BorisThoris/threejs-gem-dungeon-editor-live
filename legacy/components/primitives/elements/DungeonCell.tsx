import React, { useState, useEffect, useMemo } from "react";
import { Box } from "@react-three/drei";
import * as THREE from "three";
import withOptionalBreaking from "../../withOptionalBreaking";
import { loadTextureFromImage } from "../../../utils/textureUtils";

export interface DungeonCellProps {
  position?: [number, number, number];
  width?: number;
  height?: number;
  depth?: number;
  color?: string;
  rotation?: [number, number, number];
  isCollidable?: boolean;
  hasBars?: boolean;
  barCount?: number;
  hasDoor?: boolean;
  doorWidth?: number;
  hasChains?: boolean;
  chainCount?: number;
  hasStraw?: boolean;
  opacity?: number;
  onClick?: () => void;
  onPointerOver?: () => void;
  onPointerOut?: () => void;
  // Prototype props
  prototypeId?: string;
  onPrototypeAction?: (action: string, data?: unknown) => void;
  // Breaking props
  enabled?: boolean;
  breakingOptions?: any;
  onBreak?: (impactPoint: THREE.Vector3) => void;
  onFragmentClick?: (fragmentId: string) => void;
  showHoverEffect?: boolean;
  hoverColor?: string;
}

const DungeonCell: React.FC<DungeonCellProps> = ({
  position = [0, 0, 0],
  width = 4,
  height = 3,
  depth = 4,
  color,
  rotation = [0, 0, 0],
  isCollidable = true,
  hasBars = true,
  barCount = 6,
  hasDoor = true,
  doorWidth = 1.5,
  hasChains = true,
  chainCount = 2,
  hasStraw = true,
  opacity = 1,
  onClick,
  onPointerOver,
  onPointerOut,
  prototypeId: _prototypeId,  
  onPrototypeAction: _onPrototypeAction,  
}) => {
  const [stoneTexture, setStoneTexture] = useState<THREE.Texture | null>(null);
  const [metalTexture, setMetalTexture] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    const loadTextures = async () => {
      try {
        const stone = await loadTextureFromImage("cobblestone");
        setStoneTexture(stone);
        const metal = await loadTextureFromImage("pixel_checkerboard");
        setMetalTexture(metal);
      } catch (error) {
        console.error("Failed to load textures:", error);
      }
    };

    loadTextures();
  }, []);

  // Generate cell structure
  const cellStructure = useMemo(() => {
    const elements = [];

    // Floor
    elements.push({
      type: "floor",
      position: [0, -height / 2, 0] as [number, number, number],
      size: [width, 0.2, depth] as [number, number, number],
      rotation: [0, 0, 0] as [number, number, number],
    });

    // Walls
    elements.push({
      type: "wall",
      position: [0, 0, depth / 2] as [number, number, number],
      size: [width, height, 0.2] as [number, number, number],
      rotation: [0, 0, 0] as [number, number, number],
    });

    elements.push({
      type: "wall",
      position: [0, 0, -depth / 2] as [number, number, number],
      size: [width, height, 0.2] as [number, number, number],
      rotation: [0, Math.PI, 0] as [number, number, number],
    });

    elements.push({
      type: "wall",
      position: [-width / 2, 0, 0] as [number, number, number],
      size: [0.2, height, depth] as [number, number, number],
      rotation: [0, 0, 0] as [number, number, number],
    });

    elements.push({
      type: "wall",
      position: [width / 2, 0, 0] as [number, number, number],
      size: [0.2, height, depth] as [number, number, number],
      rotation: [0, 0, 0] as [number, number, number],
    });

    // Ceiling
    elements.push({
      type: "ceiling",
      position: [0, height / 2, 0] as [number, number, number],
      size: [width, 0.2, depth] as [number, number, number],
      rotation: [0, 0, 0] as [number, number, number],
    });

    // Prison bars
    if (hasBars) {
      const barSpacing = width / (barCount + 1);
      for (let i = 1; i <= barCount; i++) {
        const x = i * barSpacing - width / 2;
        elements.push({
          type: "bar",
          position: [x, 0, depth / 2 + 0.1] as [number, number, number],
          size: [0.1, height * 0.8, 0.1] as [number, number, number],
          rotation: [0, 0, 0] as [number, number, number],
        });
      }
    }

    // Door
    if (hasDoor) {
      elements.push({
        type: "door",
        position: [0, -height * 0.15, depth / 2 + 0.15] as [
          number,
          number,
          number
        ],
        size: [doorWidth, height * 0.7, 0.1] as [number, number, number],
        rotation: [0, 0, 0] as [number, number, number],
      });
    }

    // Chains
    if (hasChains) {
      const chainSpacing = width / (chainCount + 1);
      for (let i = 1; i <= chainCount; i++) {
        const x = i * chainSpacing - width / 2;
        elements.push({
          type: "chain",
          position: [x, height * 0.3, depth / 2 + 0.2] as [
            number,
            number,
            number
          ],
          size: [0.05, height * 0.4, 0.05] as [number, number, number],
          rotation: [0, 0, 0] as [number, number, number],
        });
      }
    }

    // Straw on floor
    if (hasStraw) {
      const strawCount = Math.floor((width * depth) / 2);
      for (let i = 0; i < strawCount; i++) {
        const x = (Math.random() - 0.5) * width * 0.8;
        const z = (Math.random() - 0.5) * depth * 0.8;
        elements.push({
          type: "straw",
          position: [x, -height / 2 + 0.1, z] as [number, number, number],
          size: [0.1, 0.2, 0.1] as [number, number, number],
          rotation: [0, Math.random() * Math.PI * 2, 0] as [
            number,
            number,
            number
          ],
        });
      }
    }

    return elements;
  }, [
    width,
    height,
    depth,
    hasBars,
    barCount,
    hasDoor,
    doorWidth,
    hasChains,
    chainCount,
    hasStraw,
  ]);

  // Material configurations
  const getMaterialColor = () => {
    if (color) return color;
    return "#8B7355"; // Default stone color
  };

  const getStoneMaterial = () => ({
    color: getMaterialColor(),
    map: stoneTexture,
    roughness: 0.9,
    metalness: 0.0,
    transparent: opacity < 1,
    opacity,
  });

  const getMetalMaterial = () => ({
    color: "#666666",
    map: metalTexture,
    roughness: 0.3,
    metalness: 0.8,
    transparent: opacity < 1,
    opacity,
  });

  const getWoodMaterial = () => ({
    color: "#8B4513",
    roughness: 0.8,
    metalness: 0.0,
    transparent: opacity < 1,
    opacity,
  });

  const getStrawMaterial = () => ({
    color: "#DAA520",
    roughness: 0.9,
    metalness: 0.0,
    transparent: opacity < 1,
    opacity,
  });

  const cellContent = (
    <group position={position} rotation={rotation}>
      {cellStructure.map((element, index) => {
        const materialProps = (() => {
          switch (element.type) {
            case "bar":
            case "chain":
              return getMetalMaterial();
            case "door":
              return getWoodMaterial();
            case "straw":
              return getStrawMaterial();
            default:
              return getStoneMaterial();
          }
        })();

        return (
          <Box
            key={`${element.type}-${index}`}
            args={element.size}
            position={element.position}
            rotation={element.rotation}
          >
            <meshStandardMaterial {...materialProps} />
          </Box>
        );
      })}
    </group>
  );

  return isCollidable ? (
    <group>{cellContent}</group>
  ) : (
    <group>{cellContent}</group>
  );
};

// Create breakable version using HOC
const BreakableDungeonCell = withOptionalBreaking(DungeonCell, {
  breakingOptions: {
    fragmentCount: 10,
    fractureImpulse: 1.5,
    minSizeForFracture: 0.8,
    maxSizeForFracture: 1.8,
  },
});

export default BreakableDungeonCell;
