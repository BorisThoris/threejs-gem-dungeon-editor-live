import React, { useState, useEffect, useMemo } from "react";
import { Box } from "@react-three/drei";
import * as THREE from "three";
import withOptionalBreaking from "../../withOptionalBreaking";
import { loadTextureFromImage } from "../../../utils/textureUtils";

export interface DungeonGateProps {
  position?: [number, number, number];
  width?: number;
  height?: number;
  depth?: number;
  color?: string;
  rotation?: [number, number, number];
  isCollidable?: boolean;
  hasPortcullis?: boolean;
  hasChains?: boolean;
  chainCount?: number;
  hasSkulls?: boolean;
  skullCount?: number;
  hasRunes?: boolean;
  runeCount?: number;
  hasSpikes?: boolean;
  spikeCount?: number;
  hasTorches?: boolean;
  torchCount?: number;
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

const DungeonGate: React.FC<DungeonGateProps> = ({
  position = [0, 0, 0],
  width = 4,
  height = 6,
  depth = 1,
  color,
  rotation = [0, 0, 0],
  isCollidable = true,
  hasPortcullis = true,
  hasChains = true,
  chainCount = 4,
  hasSkulls = true,
  skullCount = 6,
  hasRunes = true,
  runeCount = 8,
  hasSpikes = true,
  spikeCount = 8,
  hasTorches = true,
  torchCount = 2,
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

  // Generate gate structure
  const gateStructure = useMemo(() => {
    const elements = [];

    // Left pillar
    elements.push({
      type: "pillar",
      position: [-width * 0.4, 0, 0] as [number, number, number],
      size: [0.5, height, 0.5] as [number, number, number],
      rotation: [0, 0, 0] as [number, number, number],
    });

    // Right pillar
    elements.push({
      type: "pillar",
      position: [width * 0.4, 0, 0] as [number, number, number],
      size: [0.5, height, 0.5] as [number, number, number],
      rotation: [0, 0, 0] as [number, number, number],
    });

    // Top arch
    elements.push({
      type: "arch",
      position: [0, height * 0.3, 0] as [number, number, number],
      size: [width * 0.8, height * 0.4, 0.3] as [number, number, number],
      rotation: [0, 0, 0] as [number, number, number],
    });

    // Portcullis
    if (hasPortcullis) {
      const barSpacing = (width * 0.6) / 8;
      for (let i = 0; i < 8; i++) {
        const x = i * barSpacing - width * 0.3 + barSpacing / 2;
        elements.push({
          type: "portcullis",
          position: [x, 0, 0] as [number, number, number],
          size: [0.1, height * 0.8, 0.1] as [number, number, number],
          rotation: [0, 0, 0] as [number, number, number],
        });
      }
    }

    // Skulls on pillars
    if (hasSkulls) {
      const skullPositions = [
        [-width * 0.4, height * 0.2, 0.3],
        [-width * 0.4, height * 0.4, 0.3],
        [-width * 0.4, height * 0.6, 0.3],
        [width * 0.4, height * 0.2, 0.3],
        [width * 0.4, height * 0.4, 0.3],
        [width * 0.4, height * 0.6, 0.3],
      ];

      for (let i = 0; i < Math.min(skullCount, skullPositions.length); i++) {
        elements.push({
          type: "skull",
          position: skullPositions[i] as [number, number, number],
          size: [0.2, 0.2, 0.2] as [number, number, number],
          rotation: [0, 0, 0] as [number, number, number],
        });
      }
    }

    // Runes on arch
    if (hasRunes) {
      for (let i = 0; i < runeCount; i++) {
        const angle = (i / runeCount) * Math.PI;
        const x = Math.cos(angle) * (width * 0.3);
        const y = height * 0.3 + Math.sin(angle) * 0.2;
        elements.push({
          type: "rune",
          position: [x, y, 0.2] as [number, number, number],
          size: [0.1, 0.1, 0.05] as [number, number, number],
          rotation: [0, angle, 0] as [number, number, number],
        });
      }
    }

    // Spikes on top
    if (hasSpikes) {
      const spikeSpacing = (width * 0.8) / spikeCount;
      for (let i = 0; i < spikeCount; i++) {
        const x = i * spikeSpacing - width * 0.4 + spikeSpacing / 2;
        elements.push({
          type: "spike",
          position: [x, height * 0.5, 0] as [number, number, number],
          size: [0.1, 0.3, 0.1] as [number, number, number],
          rotation: [0, 0, 0] as [number, number, number],
        });
      }
    }

    // Chains
    if (hasChains) {
      const chainPositions = [
        [-width * 0.3, height * 0.4, 0.2],
        [width * 0.3, height * 0.4, 0.2],
        [-width * 0.2, height * 0.6, 0.2],
        [width * 0.2, height * 0.6, 0.2],
      ];

      for (let i = 0; i < Math.min(chainCount, chainPositions.length); i++) {
        elements.push({
          type: "chain",
          position: chainPositions[i] as [number, number, number],
          size: [0.05, height * 0.3, 0.05] as [number, number, number],
          rotation: [0, 0, 0] as [number, number, number],
        });
      }
    }

    // Torches
    if (hasTorches) {
      elements.push({
        type: "torch",
        position: [-width * 0.5, height * 0.3, 0.3] as [number, number, number],
        size: [0.1, 0.4, 0.1] as [number, number, number],
        rotation: [0, 0, 0] as [number, number, number],
      });
      elements.push({
        type: "torch",
        position: [width * 0.5, height * 0.3, 0.3] as [number, number, number],
        size: [0.1, 0.4, 0.1] as [number, number, number],
        rotation: [0, 0, 0] as [number, number, number],
      });
    }

    return elements;
  }, [
    width,
    height,
    hasPortcullis,
    hasChains,
    chainCount,
    hasSkulls,
    skullCount,
    hasRunes,
    runeCount,
    hasSpikes,
    spikeCount,
    hasTorches,
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

  const getSkullMaterial = () => ({
    color: "#F5F5DC",
    roughness: 0.7,
    metalness: 0.0,
    transparent: opacity < 1,
    opacity,
  });

  const getRuneMaterial = () => ({
    color: "#FFD700",
    roughness: 0.3,
    metalness: 0.2,
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

  const getTorchMaterial = () => ({
    color: "#8B4513",
    roughness: 0.8,
    metalness: 0.0,
    transparent: opacity < 1,
    opacity,
  });

  const gateContent = (
    <group position={position} rotation={rotation}>
      {gateStructure.map((element, index) => {
        const materialProps = (() => {
          switch (element.type) {
            case "portcullis":
            case "chain":
              return getMetalMaterial();
            case "skull":
              return getSkullMaterial();
            case "rune":
              return getRuneMaterial();
            case "spike":
              return getSpikeMaterial();
            case "torch":
              return getTorchMaterial();
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
    <group>{gateContent}</group>
  ) : (
    <group>{gateContent}</group>
  );
};

// Create breakable version using HOC
const BreakableDungeonGate = withOptionalBreaking(DungeonGate, {
  breakingOptions: {
    fragmentCount: 10,
    fractureImpulse: 1.5,
    minSizeForFracture: 0.8,
    maxSizeForFracture: 1.8,
  },
});

export default BreakableDungeonGate;
