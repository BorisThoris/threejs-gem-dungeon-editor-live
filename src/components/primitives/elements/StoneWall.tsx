import React, { useState, useEffect, useMemo } from "react";
import { RigidBody } from "@react-three/rapier";
import { Box } from "@react-three/drei";
import * as THREE from "three";
import withOptionalBreaking from "../../withOptionalBreaking";
import { loadTextureFromImage } from "../../../utils/textureUtils";
import { useWallsEnabled } from "../../../store/consolidatedGameStore";

export interface StoneWallProps {
  position: [number, number, number];
  width?: number;
  height?: number;
  depth?: number;
  color?: string;
  rotation?: [number, number, number];
  isCollidable?: boolean;
  hasWindows?: boolean;
  windowCount?: number;
  hasDoors?: boolean;
  doorWidth?: number;
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

const StoneWall: React.FC<StoneWallProps> = ({
  position,
  width = 8,
  height = 4,
  depth = 0.5,
  color,
  rotation = [0, 0, 0],
  isCollidable = true,
  hasWindows = false,
  windowCount = 1,
  hasDoors = false,
  doorWidth = 2,
  opacity = 1,
  onClick,
  onPointerOver,
  onPointerOut,
  prototypeId: _prototypeId,
  onPrototypeAction: _onPrototypeAction,
}) => {
  const wallsEnabled = useWallsEnabled();
  // Load stone texture
  const [stoneTexture, setStoneTexture] = useState(null);

  useEffect(() => {
    const loadTexture = async () => {
      try {
        const loadedTexture = await loadTextureFromImage("cobblestone");
        setStoneTexture(loadedTexture);
      } catch (error) {
        console.error("Failed to load stone texture:", error);
      }
    };

    loadTexture();
  }, []);

  // Generate stone block positions
  const stonePositions = useMemo(() => {
    const stoneWidth = 0.3; // Stone block width
    const stoneHeight = 0.2; // Stone block height
    const stoneDepth = depth;
    const mortarThickness = 0.02; // Mortar between stones

    const stones = [];
    const stonesPerRow = Math.floor(width / (stoneWidth + mortarThickness));
    const rows = Math.floor(height / (stoneHeight + mortarThickness));

    for (let row = 0; row < rows; row++) {
      // Random offset for each row to create irregular stone pattern
      const rowOffset = (Math.random() - 0.5) * 0.1;

      for (let col = 0; col < stonesPerRow; col++) {
        const x =
          col * (stoneWidth + mortarThickness) -
          width / 2 +
          rowOffset +
          stoneWidth / 2;
        const y =
          row * (stoneHeight + mortarThickness) - height / 2 + stoneHeight / 2;
        const z = 0;

        // Skip stones that would be in window/door areas
        const isInWindow =
          hasWindows &&
          windowCount > 0 &&
          Math.abs(x) < width / (windowCount + 1) &&
          y > height * 0.3 &&
          y < height * 0.8;

        const isInDoor =
          hasDoors && Math.abs(x) < doorWidth / 2 && y < height * 0.7;

        if (!isInWindow && !isInDoor) {
          // Add slight random variations to stone size for realism
          const sizeVariation = 0.9 + Math.random() * 0.2;
          stones.push({
            position: [x, y, z] as [number, number, number],
            size: [
              stoneWidth * sizeVariation,
              stoneHeight * sizeVariation,
              stoneDepth,
            ] as [number, number, number],
            id: `stone-${row}-${col}`,
            rotation: [0, 0, (Math.random() - 0.5) * 0.1] as [
              number,
              number,
              number
            ], // Slight random rotation
          });
        }
      }
    }

    return stones;
  }, [width, height, depth, hasWindows, windowCount, hasDoors, doorWidth]);

  // Material color configurations
  const getMaterialColor = () => {
    if (color) return color;
    return "#8B7355"; // Default stone color
  };

  const getMaterialProps = () => ({
    color: getMaterialColor(),
    map: stoneTexture,
    roughness: 0.9,
    metalness: 0.0,
    transparent: opacity < 1,
    opacity,
  });

  // Calculate window positions
  const getWindowPositions = () => {
    if (!hasWindows || windowCount <= 0) return [];

    const positions = [];
    const windowSpacing = width / (windowCount + 1);

    for (let i = 0; i < windowCount; i++) {
      const x = (i + 1) * windowSpacing - width / 2;
      positions.push(x);
    }

    return positions;
  };

  // Don't render if walls are disabled globally
  if (!wallsEnabled) {
    return null;
  }

  const wallContent = (
    <group position={position} rotation={rotation}>
      {/* Render individual stone blocks */}
      {stoneTexture ? (
        <group>
          {stonePositions.map((stone) => (
            <Box
              key={stone.id}
              args={stone.size}
              position={stone.position}
              rotation={stone.rotation}
            >
              <meshStandardMaterial {...getMaterialProps()} />
            </Box>
          ))}

          {/* Mortar lines between stones */}
          {stonePositions.map((stone) => (
            <Box
              key={`mortar-${stone.id}`}
              args={[stone.size[0] + 0.02, 0.02, stone.size[2]]}
              position={[
                stone.position[0],
                stone.position[1] + stone.size[1] / 2,
                stone.position[2],
              ]}
            >
              <meshStandardMaterial
                color="#F5F5F5"
                roughness={0.9}
                metalness={0.0}
              />
            </Box>
          ))}
        </group>
      ) : (
        /* Fallback solid wall while texture loads */
        <Box args={[width, height, depth]}>
          <meshStandardMaterial {...getMaterialProps()} />
        </Box>
      )}

      {/* Windows */}
      {hasWindows &&
        getWindowPositions().map((x, i) => (
          <group key={`window-${i}`}>
            {/* Window frame */}
            <Box args={[1.2, 1.5, 0.1]} position={[x, 0.5, depth / 2 + 0.05]}>
              <meshStandardMaterial color="#8B4513" />
            </Box>
            {/* Window glass */}
            <Box args={[1.0, 1.3, 0.02]} position={[x, 0.5, depth / 2 + 0.1]}>
              <meshStandardMaterial color="#87CEEB" transparent opacity={0.7} />
            </Box>
          </group>
        ))}

      {/* Door */}
      {hasDoors && (
        <group>
          {/* Door frame */}
          <Box
            args={[doorWidth + 0.2, height, 0.1]}
            position={[0, 0, depth / 2 + 0.05]}
          >
            <meshStandardMaterial color="#8B4513" />
          </Box>
          {/* Door */}
          <Box
            args={[doorWidth, height - 0.2, 0.05]}
            position={[0, -0.1, depth / 2 + 0.1]}
          >
            <meshStandardMaterial color="#654321" />
          </Box>
        </group>
      )}
    </group>
  );

  if (isCollidable) {
    return (
      <RigidBody type="fixed" position={position}>
        <mesh
          rotation={rotation}
          onClick={onClick}
          onPointerOver={onPointerOver}
          onPointerOut={onPointerOut}
        >
          {wallContent}
        </mesh>
      </RigidBody>
    );
  }

  return (
    <mesh
      position={position}
      rotation={rotation}
      onClick={onClick}
      onPointerOver={onPointerOver}
      onPointerOut={onPointerOut}
    >
      {wallContent}
    </mesh>
  );
};

const StoneWallWithBreaking = withOptionalBreaking(StoneWall);
export default StoneWallWithBreaking;
