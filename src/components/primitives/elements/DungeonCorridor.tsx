import React, { useState, useEffect, useMemo } from "react";
import { Box } from "@react-three/drei";
import * as THREE from "three";
import withOptionalBreaking from "../../../withOptionalBreaking";
import { loadTextureFromImage } from "../../../../utils/textureUtils";

export interface DungeonCorridorProps {
  position?: [number, number, number];
  length?: number;
  width?: number;
  height?: number;
  color?: string;
  rotation?: [number, number, number];
  isCollidable?: boolean;
  hasTorches?: boolean;
  torchCount?: number;
  hasPillars?: boolean;
  pillarCount?: number;
  hasCobwebs?: boolean;
  webCount?: number;
  hasDrains?: boolean;
  drainCount?: number;
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

const DungeonCorridor: React.FC<DungeonCorridorProps> = ({
  position = [0, 0, 0],
  length = 8,
  width = 3,
  height = 3,
  color,
  rotation = [0, 0, 0],
  isCollidable = true,
  hasTorches = true,
  torchCount = 4,
  hasPillars = true,
  pillarCount = 2,
  hasCobwebs = true,
  webCount = 3,
  hasDrains = true,
  drainCount = 2,
  opacity = 1,
  onClick,
  onPointerOver,
  onPointerOut,
  prototypeId: _prototypeId,
  onPrototypeAction: _onPrototypeAction,
}) => {
  const [stoneTexture, setStoneTexture] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    const loadTexture = async () => {
      try {
        const texture = await loadTextureFromImage("cobblestone");
        setStoneTexture(texture);
      } catch (error) {
        console.error("Failed to load stone texture:", error);
      }
    };

    loadTexture();
  }, []);

  // Generate corridor structure
  const corridorStructure = useMemo(() => {
    const elements = [];

    // Floor
    elements.push({
      type: "floor",
      position: [0, -height / 2, 0] as [number, number, number],
      size: [length, 0.2, width] as [number, number, number],
      rotation: [0, 0, 0] as [number, number, number],
    });

    // Left wall
    elements.push({
      type: "wall",
      position: [-width / 2, 0, 0] as [number, number, number],
      size: [0.2, height, length] as [number, number, number],
      rotation: [0, 0, 0] as [number, number, number],
    });

    // Right wall
    elements.push({
      type: "wall",
      position: [width / 2, 0, 0] as [number, number, number],
      size: [0.2, height, length] as [number, number, number],
      rotation: [0, 0, 0] as [number, number, number],
    });

    // Ceiling
    elements.push({
      type: "ceiling",
      position: [0, height / 2, 0] as [number, number, number],
      size: [length, 0.2, width] as [number, number, number],
      rotation: [0, 0, 0] as [number, number, number],
    });

    // Support pillars
    if (hasPillars) {
      const pillarSpacing = length / (pillarCount + 1);
      for (let i = 1; i <= pillarCount; i++) {
        const z = i * pillarSpacing - length / 2;
        elements.push({
          type: "pillar",
          position: [0, 0, z] as [number, number, number],
          size: [0.4, height * 0.9, 0.4] as [number, number, number],
          rotation: [0, 0, 0] as [number, number, number],
        });
      }
    }

    // Torches on walls
    if (hasTorches) {
      const torchSpacing = length / (torchCount + 1);
      for (let i = 1; i <= torchCount; i++) {
        const z = i * torchSpacing - length / 2;
        // Left wall torch
        elements.push({
          type: "torch",
          position: [-width / 2 + 0.15, height * 0.3, z] as [
            number,
            number,
            number
          ],
          size: [0.1, 0.3, 0.1] as [number, number, number],
          rotation: [0, 0, 0] as [number, number, number],
        });
        // Right wall torch
        elements.push({
          type: "torch",
          position: [width / 2 - 0.15, height * 0.3, z] as [
            number,
            number,
            number
          ],
          size: [0.1, 0.3, 0.1] as [number, number, number],
          rotation: [0, 0, 0] as [number, number, number],
        });
      }
    }

    // Floor drains
    if (hasDrains) {
      const drainSpacing = length / (drainCount + 1);
      for (let i = 1; i <= drainCount; i++) {
        const z = i * drainSpacing - length / 2;
        elements.push({
          type: "drain",
          position: [0, -height / 2 + 0.05, z] as [number, number, number],
          size: [0.5, 0.1, 0.5] as [number, number, number],
          rotation: [0, 0, 0] as [number, number, number],
        });
      }
    }

    // Cobwebs in corners
    if (hasCobwebs) {
      const webSpacing = length / (webCount + 1);
      for (let i = 1; i <= webCount; i++) {
        const z = i * webSpacing - length / 2;
        // Random corner selection
        const corner = Math.random() > 0.5 ? 1 : -1;
        elements.push({
          type: "cobweb",
          position: [corner * (width / 2 - 0.1), height * 0.2, z] as [
            number,
            number,
            number
          ],
          size: [0.3, 0.3, 0.3] as [number, number, number],
          rotation: [0, Math.random() * Math.PI, 0] as [number, number, number],
        });
      }
    }

    return elements;
  }, [
    length,
    width,
    height,
    hasTorches,
    torchCount,
    hasPillars,
    pillarCount,
    hasCobwebs,
    webCount,
    hasDrains,
    drainCount,
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

  const getTorchMaterial = () => ({
    color: "#8B4513",
    roughness: 0.8,
    metalness: 0.0,
    transparent: opacity < 1,
    opacity,
  });

  const getDrainMaterial = () => ({
    color: "#2F4F4F",
    roughness: 0.7,
    metalness: 0.3,
    transparent: opacity < 1,
    opacity,
  });

  const getCobwebMaterial = () => ({
    color: "#F5F5DC",
    roughness: 0.9,
    metalness: 0.0,
    transparent: true,
    opacity: 0.3,
  });

  const corridorContent = (
    <group position={position} rotation={rotation}>
      {corridorStructure.map((element, index) => {
        const materialProps = (() => {
          switch (element.type) {
            case "torch":
              return getTorchMaterial();
            case "drain":
              return getDrainMaterial();
            case "cobweb":
              return getCobwebMaterial();
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
    <group>{corridorContent}</group>
  ) : (
    <group>{corridorContent}</group>
  );
};

const DungeonCorridorWithBreaking = withOptionalBreaking(DungeonCorridor);
export default DungeonCorridorWithBreaking;
