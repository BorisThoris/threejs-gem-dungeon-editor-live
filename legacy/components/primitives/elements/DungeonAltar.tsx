import React, { useState, useEffect, useMemo } from "react";
import { Box } from "@react-three/drei";
import * as THREE from "three";
import withOptionalBreaking from "../../withOptionalBreaking";
import { loadTextureFromImage } from "../../../utils/textureUtils";

export interface DungeonAltarProps {
  position?: [number, number, number];
  width?: number;
  height?: number;
  depth?: number;
  color?: string;
  rotation?: [number, number, number];
  isCollidable?: boolean;
  hasCandles?: boolean;
  candleCount?: number;
  hasSkulls?: boolean;
  skullCount?: number;
  hasRunes?: boolean;
  runeCount?: number;
  hasChains?: boolean;
  chainCount?: number;
  hasBlood?: boolean;
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

const DungeonAltar: React.FC<DungeonAltarProps> = ({
  position = [0, 0, 0],
  width = 3,
  height = 2,
  depth = 2,
  color,
  rotation = [0, 0, 0],
  isCollidable = true,
  hasCandles = true,
  candleCount = 4,
  hasSkulls = true,
  skullCount = 2,
  hasRunes = true,
  runeCount = 6,
  hasChains = true,
  chainCount = 4,
  hasBlood = true,
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

  // Generate altar structure
  const altarStructure = useMemo(() => {
    const elements = [];

    // Base platform
    elements.push({
      type: "base",
      position: [0, -height / 2, 0] as [number, number, number],
      size: [width, 0.3, depth] as [number, number, number],
      rotation: [0, 0, 0] as [number, number, number],
    });

    // Main altar block
    elements.push({
      type: "altar",
      position: [0, 0, 0] as [number, number, number],
      size: [width * 0.8, height * 0.7, depth * 0.8] as [
        number,
        number,
        number
      ],
      rotation: [0, 0, 0] as [number, number, number],
    });

    // Top slab
    elements.push({
      type: "slab",
      position: [0, height * 0.35, 0] as [number, number, number],
      size: [width * 0.9, 0.2, depth * 0.9] as [number, number, number],
      rotation: [0, 0, 0] as [number, number, number],
    });

    // Candles
    if (hasCandles) {
      const candlePositions = [
        [-width * 0.3, height * 0.4, -depth * 0.3],
        [width * 0.3, height * 0.4, -depth * 0.3],
        [-width * 0.3, height * 0.4, depth * 0.3],
        [width * 0.3, height * 0.4, depth * 0.3],
      ];

      for (let i = 0; i < Math.min(candleCount, candlePositions.length); i++) {
        elements.push({
          type: "candle",
          position: candlePositions[i] as [number, number, number],
          size: [0.1, 0.4, 0.1] as [number, number, number],
          rotation: [0, 0, 0] as [number, number, number],
        });
      }
    }

    // Skulls
    if (hasSkulls) {
      for (let i = 0; i < skullCount; i++) {
        const angle = (i / skullCount) * Math.PI * 2;
        const x = Math.cos(angle) * (width * 0.2);
        const z = Math.sin(angle) * (depth * 0.2);
        elements.push({
          type: "skull",
          position: [x, height * 0.45, z] as [number, number, number],
          size: [0.2, 0.2, 0.2] as [number, number, number],
          rotation: [0, angle, 0] as [number, number, number],
        });
      }
    }

    // Runes on the altar surface
    if (hasRunes) {
      for (let i = 0; i < runeCount; i++) {
        const x = (Math.random() - 0.5) * width * 0.6;
        const z = (Math.random() - 0.5) * depth * 0.6;
        elements.push({
          type: "rune",
          position: [x, height * 0.36, z] as [number, number, number],
          size: [0.1, 0.01, 0.1] as [number, number, number],
          rotation: [0, Math.random() * Math.PI * 2, 0] as [
            number,
            number,
            number
          ],
        });
      }
    }

    // Chains hanging from ceiling
    if (hasChains) {
      const chainPositions = [
        [-width * 0.4, height * 0.8, -depth * 0.4],
        [width * 0.4, height * 0.8, -depth * 0.4],
        [-width * 0.4, height * 0.8, depth * 0.4],
        [width * 0.4, height * 0.8, depth * 0.4],
      ];

      for (let i = 0; i < Math.min(chainCount, chainPositions.length); i++) {
        elements.push({
          type: "chain",
          position: chainPositions[i] as [number, number, number],
          size: [0.05, height * 0.6, 0.05] as [number, number, number],
          rotation: [0, 0, 0] as [number, number, number],
        });
      }
    }

    // Blood stains
    if (hasBlood) {
      for (let i = 0; i < 3; i++) {
        const x = (Math.random() - 0.5) * width * 0.7;
        const z = (Math.random() - 0.5) * depth * 0.7;
        elements.push({
          type: "blood",
          position: [x, height * 0.36, z] as [number, number, number],
          size: [0.2, 0.01, 0.2] as [number, number, number],
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
    hasCandles,
    candleCount,
    hasSkulls,
    skullCount,
    hasRunes,
    runeCount,
    hasChains,
    chainCount,
    hasBlood,
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

  const getCandleMaterial = () => ({
    color: "#8B4513",
    roughness: 0.8,
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

  const getRuneMaterial = () => ({
    color: "#FFD700",
    roughness: 0.3,
    metalness: 0.2,
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

  const getBloodMaterial = () => ({
    color: "#8B0000",
    roughness: 0.9,
    metalness: 0.0,
    transparent: true,
    opacity: 0.7,
  });

  const altarContent = (
    <group position={position} rotation={rotation}>
      {altarStructure.map((element, index) => {
        const materialProps = (() => {
          switch (element.type) {
            case "candle":
              return getCandleMaterial();
            case "skull":
              return getSkullMaterial();
            case "rune":
              return getRuneMaterial();
            case "chain":
              return getChainMaterial();
            case "blood":
              return getBloodMaterial();
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
    <group>{altarContent}</group>
  ) : (
    <group>{altarContent}</group>
  );
};

// Create breakable version using HOC
const BreakableDungeonAltar = withOptionalBreaking(DungeonAltar, {
  breakingOptions: {
    fragmentCount: 8,
    fractureImpulse: 1.2,
    minSizeForFracture: 0.6,
    maxSizeForFracture: 1.4,
  },
});

export default BreakableDungeonAltar;
