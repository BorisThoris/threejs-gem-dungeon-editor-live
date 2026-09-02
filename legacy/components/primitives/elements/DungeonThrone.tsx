import React, { useState, useEffect, useMemo } from "react";
import { Box } from "@react-three/drei";
import * as THREE from "three";
import withOptionalBreaking from "../../withOptionalBreaking";
import { loadTextureFromImage } from "../../../utils/textureUtils";

export interface DungeonThroneProps {
  position?: [number, number, number];
  width?: number;
  height?: number;
  depth?: number;
  color?: string;
  rotation?: [number, number, number];
  isCollidable?: boolean;
  hasArmrests?: boolean;
  hasBackrest?: boolean;
  hasSkulls?: boolean;
  skullCount?: number;
  hasChains?: boolean;
  chainCount?: number;
  hasCushion?: boolean;
  hasSpikes?: boolean;
  spikeCount?: number;
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

const DungeonThrone: React.FC<DungeonThroneProps> = ({
  position = [0, 0, 0],
  width = 2,
  height = 3,
  depth = 2,
  color,
  rotation = [0, 0, 0],
  isCollidable = true,
  hasArmrests = true,
  hasBackrest = true,
  hasSkulls = true,
  skullCount = 4,
  hasChains = true,
  chainCount = 2,
  hasCushion = true,
  hasSpikes = true,
  spikeCount = 6,
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

  // Generate throne structure
  const throneStructure = useMemo(() => {
    const elements = [];

    // Base platform
    elements.push({
      type: "base",
      position: [0, -height / 2, 0] as [number, number, number],
      size: [width, 0.3, depth] as [number, number, number],
      rotation: [0, 0, 0] as [number, number, number],
    });

    // Seat
    elements.push({
      type: "seat",
      position: [0, -height * 0.1, 0] as [number, number, number],
      size: [width * 0.9, 0.4, depth * 0.7] as [number, number, number],
      rotation: [0, 0, 0] as [number, number, number],
    });

    // Backrest
    if (hasBackrest) {
      elements.push({
        type: "backrest",
        position: [0, height * 0.2, -depth * 0.3] as [number, number, number],
        size: [width * 0.9, height * 0.6, 0.2] as [number, number, number],
        rotation: [0, 0, 0] as [number, number, number],
      });
    }

    // Armrests
    if (hasArmrests) {
      elements.push({
        type: "armrest",
        position: [-width * 0.4, height * 0.1, 0] as [number, number, number],
        size: [0.2, height * 0.3, depth * 0.6] as [number, number, number],
        rotation: [0, 0, 0] as [number, number, number],
      });
      elements.push({
        type: "armrest",
        position: [width * 0.4, height * 0.1, 0] as [number, number, number],
        size: [0.2, height * 0.3, depth * 0.6] as [number, number, number],
        rotation: [0, 0, 0] as [number, number, number],
      });
    }

    // Skulls on backrest
    if (hasSkulls) {
      for (let i = 0; i < skullCount; i++) {
        const angle = (i / skullCount) * Math.PI;
        const x = Math.cos(angle) * (width * 0.3);
        const y = height * 0.4 + Math.sin(angle) * 0.2;
        elements.push({
          type: "skull",
          position: [x, y, -depth * 0.25] as [number, number, number],
          size: [0.15, 0.15, 0.15] as [number, number, number],
          rotation: [0, angle, 0] as [number, number, number],
        });
      }
    }

    // Chains
    if (hasChains) {
      const chainPositions = [
        [-width * 0.3, height * 0.6, -depth * 0.4],
        [width * 0.3, height * 0.6, -depth * 0.4],
      ];

      for (let i = 0; i < Math.min(chainCount, chainPositions.length); i++) {
        elements.push({
          type: "chain",
          position: chainPositions[i] as [number, number, number],
          size: [0.05, height * 0.4, 0.05] as [number, number, number],
          rotation: [0, 0, 0] as [number, number, number],
        });
      }
    }

    // Cushion
    if (hasCushion) {
      elements.push({
        type: "cushion",
        position: [0, -height * 0.05, depth * 0.1] as [number, number, number],
        size: [width * 0.7, 0.1, depth * 0.4] as [number, number, number],
        rotation: [0, 0, 0] as [number, number, number],
      });
    }

    // Spikes on armrests
    if (hasSpikes) {
      for (let i = 0; i < spikeCount; i++) {
        const side = i % 2 === 0 ? -1 : 1;
        const x = side * width * 0.4;
        const z = (i / 2 / (spikeCount / 2) - 0.5) * depth * 0.6;
        elements.push({
          type: "spike",
          position: [x, height * 0.25, z] as [number, number, number],
          size: [0.1, 0.3, 0.1] as [number, number, number],
          rotation: [0, 0, 0] as [number, number, number],
        });
      }
    }

    return elements;
  }, [
    width,
    height,
    depth,
    hasArmrests,
    hasBackrest,
    hasSkulls,
    skullCount,
    hasChains,
    chainCount,
    hasCushion,
    hasSpikes,
    spikeCount,
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

  const getSkullMaterial = () => ({
    color: "#F5F5DC",
    roughness: 0.7,
    metalness: 0.0,
    transparent: opacity < 1,
    opacity,
  });

  const getChainMaterial = () => ({
    color: "#666666",
    roughness: 0.3,
    metalness: 0.8,
    transparent: opacity < 1,
    opacity,
  });

  const getCushionMaterial = () => ({
    color: "#8B0000",
    roughness: 0.8,
    metalness: 0.0,
    transparent: opacity < 1,
    opacity,
  });

  const getSpikeMaterial = () => ({
    color: "#C0C0C0",
    roughness: 0.2,
    metalness: 0.9,
    transparent: opacity < 1,
    opacity,
  });

  const throneContent = (
    <group position={position} rotation={rotation}>
      {throneStructure.map((element, index) => {
        const materialProps = (() => {
          switch (element.type) {
            case "skull":
              return getSkullMaterial();
            case "chain":
              return getChainMaterial();
            case "cushion":
              return getCushionMaterial();
            case "spike":
              return getSpikeMaterial();
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
    <group>{throneContent}</group>
  ) : (
    <group>{throneContent}</group>
  );
};

// Create breakable version using HOC
const BreakableDungeonThrone = withOptionalBreaking(DungeonThrone, {
  breakingOptions: {
    fragmentCount: 8,
    fractureImpulse: 1.2,
    minSizeForFracture: 0.6,
    maxSizeForFracture: 1.4,
  },
});

export default BreakableDungeonThrone;
