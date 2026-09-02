import React, { useState, useEffect, useMemo } from "react";
import { RigidBody } from "@react-three/rapier";
import { Box } from "@react-three/drei";
import * as THREE from "three";
import withOptionalBreaking from "../../withOptionalBreaking";
import { loadTextureFromImage } from "../../../utils/textureUtils";
import { useWallsEnabled } from "../../../store/consolidatedGameStore";

export interface WallProps {
  position: [number, number, number];
  width?: number;
  height?: number;
  depth?: number;
  material?: "stone" | "brick" | "wood" | "plaster" | "metal" | "concrete";
  texture?: "smooth" | "rough" | "weathered" | "cracked" | "painted";
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
  breakingOptions?: Record<string, unknown>;
  onBreak?: (impactPoint: THREE.Vector3) => void;
  onFragmentClick?: (fragmentId: string) => void;
  showHoverEffect?: boolean;
  hoverColor?: string;
}

const Wall: React.FC<WallProps> = ({
  position,
  width = 8,
  height = 4,
  depth = 0.5,
  material = "stone",
  texture = "smooth",
  color,
  rotation = [0, 0, 0],
  isCollidable = true,
  hasWindows = false,
  windowCount = 1,
  hasDoors = false,
  doorWidth = 1.5,
  opacity = 1,
  onClick,
  onPointerOver,
  onPointerOut,
  prototypeId: _prototypeId,  
  onPrototypeAction: _onPrototypeAction,  
}) => {
  const wallsEnabled = useWallsEnabled();
  // Load appropriate texture based on material
  const [wallTexture, setWallTexture] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    const loadTexture = async () => {
      try {
        let textureId = null;
        switch (material) {
          case "stone":
            textureId = "cobblestone";
            break;
          case "brick":
            textureId = "brick";
            break;
          case "wood":
            textureId = "wood";
            break;
          case "concrete":
            textureId = "cobblestone";
            break;
          case "metal":
            textureId = "pixel_checkerboard";
            break;
          default:
            return;
        }

        if (textureId) {
          const loadedTexture = await loadTextureFromImage(textureId);
          setWallTexture(loadedTexture);
        }
      } catch (error) {
        console.error(`Failed to load texture for ${material}:`, error);
      }
    };

    loadTexture();
  }, [material]);

  // Generate brick positions for brick walls
  const brickPositions = useMemo(() => {
    if (material !== "brick") return [];

    const brickWidth = 0.2; // Standard brick width
    const brickHeight = 0.1; // Standard brick height
    const brickDepth = depth;
    const mortarThickness = 0.01; // Mortar between bricks

    const bricks = [];
    const bricksPerRow = Math.floor(width / (brickWidth + mortarThickness));
    const rows = Math.floor(height / (brickHeight + mortarThickness));

    for (let row = 0; row < rows; row++) {
      const isOffsetRow = row % 2 === 1; // Offset every other row
      const rowOffset = isOffsetRow ? (brickWidth + mortarThickness) / 2 : 0;

      for (let col = 0; col < bricksPerRow; col++) {
        const x =
          col * (brickWidth + mortarThickness) -
          width / 2 +
          rowOffset +
          brickWidth / 2;
        const y =
          row * (brickHeight + mortarThickness) - height / 2 + brickHeight / 2;
        const z = 0;

        // Skip bricks that would be in window/door areas
        const isInWindow =
          hasWindows &&
          windowCount > 0 &&
          Math.abs(x) < width / (windowCount + 1) &&
          y > height * 0.3 &&
          y < height * 0.8;

        const isInDoor =
          hasDoors && Math.abs(x) < doorWidth / 2 && y < height * 0.7;

        if (!isInWindow && !isInDoor) {
          bricks.push({
            position: [x, y, z] as [number, number, number],
            size: [brickWidth, brickHeight, brickDepth] as [
              number,
              number,
              number
            ],
            id: `brick-${row}-${col}`,
          });
        }
      }
    }

    return bricks;
  }, [
    material,
    width,
    height,
    depth,
    hasWindows,
    windowCount,
    hasDoors,
    doorWidth,
  ]);

  // Material color configurations
  const getMaterialColor = () => {
    if (color) return color;

    switch (material) {
      case "stone":
        return texture === "weathered" ? "#8B7355" : "#A0A0A0";
      case "brick":
        return texture === "weathered" ? "#8B4513" : "#CD5C5C";
      case "wood":
        return texture === "weathered" ? "#8B7355" : "#D2B48C";
      case "plaster":
        return texture === "painted" ? "#F5F5DC" : "#F0F0F0";
      case "metal":
        return "#C0C0C0";
      case "concrete":
        return "#D3D3D3";
      default:
        return "#A0A0A0";
    }
  };

  // Material properties
  const getMaterialProps = () => {
    const baseColor = getMaterialColor();

    return {
      color: baseColor,
      transparent: opacity < 1,
      opacity,
      roughness: texture === "rough" ? 0.9 : texture === "smooth" ? 0.3 : 0.6,
      metalness: material === "metal" ? 0.8 : 0.1,
      map: wallTexture,
    };
  };

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
      {/* Render individual bricks for brick walls */}
      {material === "brick" && wallTexture ? (
        <group>
          {brickPositions.map((brick) => (
            <Box key={brick.id} args={brick.size} position={brick.position}>
              <meshStandardMaterial
                color={getMaterialColor()}
                map={wallTexture}
                roughness={0.8}
                metalness={0.0}
                transparent={false}
              />
            </Box>
          ))}

          {/* Mortar lines between bricks */}
          {brickPositions.map((brick) => (
            <Box
              key={`mortar-${brick.id}`}
              args={[brick.size[0] + 0.01, 0.01, brick.size[2]]}
              position={[
                brick.position[0],
                brick.position[1] + brick.size[1] / 2,
                brick.position[2],
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
        /* Regular wall for non-brick materials */
        <Box args={[width, height, depth]}>
          <meshStandardMaterial {...getMaterialProps()} />
        </Box>
      )}

      {/* Material-specific details for non-brick materials */}
      {material !== "brick" && (
        <>
          {material === "wood" && (
            <group>
              {/* Wood planks */}
              {Array.from({ length: Math.floor(height * 2) }).map((_, i) => (
                <Box
                  key={`plank-${i}`}
                  args={[width * 0.98, 0.45, 0.01]}
                  position={[0, i * 0.5 - height / 2 + 0.25, depth / 2 + 0.01]}
                >
                  <meshStandardMaterial
                    color="#654321"
                    transparent
                    opacity={0.2}
                  />
                </Box>
              ))}
            </group>
          )}

          {/* Windows */}
          {hasWindows &&
            getWindowPositions().map((x, i) => (
              <group key={`window-${i}`}>
                {/* Window frame */}
                <Box
                  args={[1.2, 1.5, 0.1]}
                  position={[x, 0.5, depth / 2 + 0.05]}
                >
                  <meshStandardMaterial color="#8B4513" />
                </Box>
                {/* Window glass */}
                <Box
                  args={[1.0, 1.3, 0.02]}
                  position={[x, 0.5, depth / 2 + 0.1]}
                >
                  <meshStandardMaterial
                    color="#87CEEB"
                    transparent
                    opacity={0.7}
                  />
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

          {/* Cracks for weathered walls */}
          {texture === "cracked" && (
            <group>
              {Array.from({ length: 3 }).map((_, i) => (
                <Box
                  key={`crack-${i}`}
                  args={[0.02, height * (0.3 + Math.random() * 0.4), 0.01]}
                  position={[
                    (Math.random() - 0.5) * width * 0.8,
                    (Math.random() - 0.5) * height * 0.5,
                    depth / 2 + 0.01,
                  ]}
                >
                  <meshStandardMaterial
                    color="#000000"
                    transparent
                    opacity={0.3}
                  />
                </Box>
              ))}
            </group>
          )}
        </>
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

// Create breakable version using HOC
const BreakableWall = withOptionalBreaking(Wall, {
  breakingOptions: {
    fragmentCount: 8,
    fractureImpulse: 1.2,
    minSizeForFracture: 0.8,
    maxSizeForFracture: 1.5,
  },
});

export default BreakableWall;
