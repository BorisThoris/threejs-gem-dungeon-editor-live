import React, { useState, useEffect, useMemo } from "react";
import { RigidBody } from "@react-three/rapier";
import { Box } from "@react-three/drei";
import * as THREE from "three";
import withOptionalBreaking from "../../../withOptionalBreaking";
import { loadTextureFromImage } from "../../../../utils/textureUtils";

export interface BrickHouseProps {
  position: [number, number, number];
  width?: number;
  height?: number;
  depth?: number;
  color?: string;
  rotation?: [number, number, number];
  isCollidable?: boolean;
  hasWindows?: boolean;
  windowCount?: number;
  hasDoor?: boolean;
  doorWidth?: number;
  hasChimney?: boolean;
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

const BrickHouse: React.FC<BrickHouseProps> = ({
  position,
  width = 8,
  height = 6,
  depth = 6,
  color,
  rotation = [0, 0, 0],
  isCollidable = true,
  hasWindows = true,
  windowCount = 2,
  hasDoor = true,
  doorWidth = 2,
  hasChimney = true,
  opacity = 1,
  onClick,
  onPointerOver,
  onPointerOut,
  prototypeId: _prototypeId,
  onPrototypeAction: _onPrototypeAction,
}) => {
  // Load brick texture
  const [brickTexture, setBrickTexture] = useState(null);

  useEffect(() => {
    const loadTexture = async () => {
      try {
        const loadedTexture = await loadTextureFromImage("brick");
        setBrickTexture(loadedTexture);
      } catch (error) {
        console.error("Failed to load brick texture:", error);
      }
    };

    loadTexture();
  }, []);

  // Helper function to generate wall bricks
  const generateWallBricks = (
    wallWidth: number,
    wallHeight: number,
    brickWidth: number,
    brickHeight: number,
    brickDepth: number,
    mortarThickness: number,
    wallCenter: [number, number, number],
    hasWindows: boolean,
    windowCount: number,
    hasDoor: boolean,
    doorWidth: number
  ) => {
    const bricks = [];
    const bricksPerRow = Math.floor(wallWidth / (brickWidth + mortarThickness));
    const rows = Math.floor(wallHeight / (brickHeight + mortarThickness));

    for (let row = 0; row < rows; row++) {
      const rowOffset = row % 2 === 0 ? 0 : brickWidth / 2; // Offset every other row

      for (let col = 0; col < bricksPerRow; col++) {
        const x =
          col * (brickWidth + mortarThickness) -
          wallWidth / 2 +
          rowOffset +
          brickWidth / 2;
        const y =
          row * (brickHeight + mortarThickness) -
          wallHeight / 2 +
          brickHeight / 2;
        const z = 0;

        // Skip bricks in window/door areas
        const isInWindow =
          hasWindows &&
          windowCount > 0 &&
          Math.abs(x) < wallWidth / (windowCount + 1) &&
          y > wallHeight * 0.3 &&
          y < wallHeight * 0.8;

        const isInDoor =
          hasDoor && Math.abs(x) < doorWidth / 2 && y < wallHeight * 0.7;

        if (!isInWindow && !isInDoor) {
          const sizeVariation = 0.95 + Math.random() * 0.1;
          bricks.push({
            position: [
              wallCenter[0] + x,
              wallCenter[1] - wallHeight / 2 + y,
              wallCenter[2],
            ] as [number, number, number],
            size: [
              brickWidth * sizeVariation,
              brickHeight * sizeVariation,
              brickDepth,
            ] as [number, number, number],
            id: `brick-${wallCenter[0]}-${wallCenter[1]}-${wallCenter[2]}-${row}-${col}`,
            rotation: [0, 0, (Math.random() - 0.5) * 0.05] as [
              number,
              number,
              number
            ],
          });
        }
      }
    }

    return bricks;
  };

  // Helper function to generate roof bricks
  const generateRoofBricks = (
    width: number,
    depth: number,
    height: number,
    brickWidth: number,
    brickHeight: number,
    brickDepth: number,
    mortarThickness: number
  ) => {
    const bricks = [];
    const roofHeight = 2;
    const roofBricks = Math.floor(width / (brickWidth + mortarThickness));

    for (let i = 0; i < roofBricks; i++) {
      const x = i * (brickWidth + mortarThickness) - width / 2 + brickWidth / 2;
      const y = height + roofHeight / 2;
      const z = 0;

      // Create triangular roof section
      for (
        let j = 0;
        j < Math.floor(roofHeight / (brickHeight + mortarThickness));
        j++
      ) {
        const roofY = y + j * (brickHeight + mortarThickness);
        const roofWidth = width - j * 2 * (brickWidth + mortarThickness);

        if (roofWidth > brickWidth) {
          const roofBricksInRow = Math.floor(
            roofWidth / (brickWidth + mortarThickness)
          );
          for (let k = 0; k < roofBricksInRow; k++) {
            const roofX =
              k * (brickWidth + mortarThickness) -
              roofWidth / 2 +
              brickWidth / 2;
            bricks.push({
              position: [roofX, roofY, z] as [number, number, number],
              size: [brickWidth, brickHeight, depth] as [
                number,
                number,
                number
              ],
              id: `roof-${i}-${j}-${k}`,
              rotation: [0, 0, 0] as [number, number, number],
            });
          }
        }
      }
    }

    return bricks;
  };

  // Helper function to generate chimney bricks
  const generateChimneyBricks = (
    brickWidth: number,
    brickHeight: number,
    brickDepth: number,
    mortarThickness: number,
    chimneyCenter: [number, number, number]
  ) => {
    const bricks = [];
    const chimneyWidth = 1;
    const chimneyHeight = 2;
    const chimneyDepth = 1;

    const chimneyBricksX = Math.floor(
      chimneyWidth / (brickWidth + mortarThickness)
    );
    const chimneyBricksZ = Math.floor(
      chimneyDepth / (brickDepth + mortarThickness)
    );
    const chimneyBricksY = Math.floor(
      chimneyHeight / (brickHeight + mortarThickness)
    );

    for (let y = 0; y < chimneyBricksY; y++) {
      for (let x = 0; x < chimneyBricksX; x++) {
        for (let z = 0; z < chimneyBricksZ; z++) {
          const brickX =
            chimneyCenter[0] +
            x * (brickWidth + mortarThickness) -
            chimneyWidth / 2 +
            brickWidth / 2;
          const brickY =
            chimneyCenter[1] +
            y * (brickHeight + mortarThickness) -
            chimneyHeight / 2 +
            brickHeight / 2;
          const brickZ =
            chimneyCenter[2] +
            z * (brickDepth + mortarThickness) -
            chimneyDepth / 2 +
            brickDepth / 2;

          bricks.push({
            position: [brickX, brickY, brickZ] as [number, number, number],
            size: [brickWidth, brickHeight, brickDepth] as [
              number,
              number,
              number
            ],
            id: `chimney-${y}-${x}-${z}`,
            rotation: [0, 0, 0] as [number, number, number],
          });
        }
      }
    }

    return bricks;
  };

  // Generate brick positions for walls
  const brickPositions = useMemo(() => {
    const brickWidth = 0.2;
    const brickHeight = 0.1;
    const brickDepth = 0.1;
    const mortarThickness = 0.02;

    const bricks = [];

    // Front wall
    const frontWallBricks = generateWallBricks(
      width,
      height,
      brickWidth,
      brickHeight,
      brickDepth,
      mortarThickness,
      [0, height / 2, depth / 2],
      hasWindows,
      windowCount,
      hasDoor,
      doorWidth
    );
    bricks.push(...frontWallBricks);

    // Back wall
    const backWallBricks = generateWallBricks(
      width,
      height,
      brickWidth,
      brickHeight,
      brickDepth,
      mortarThickness,
      [0, height / 2, -depth / 2],
      false,
      0,
      false,
      0
    );
    bricks.push(...backWallBricks);

    // Left wall
    const leftWallBricks = generateWallBricks(
      depth,
      height,
      brickWidth,
      brickHeight,
      brickDepth,
      mortarThickness,
      [-width / 2, height / 2, 0],
      false,
      0,
      false,
      0
    );
    // Rotate left wall bricks
    leftWallBricks.forEach((brick) => {
      brick.rotation = [0, Math.PI / 2, 0];
    });
    bricks.push(...leftWallBricks);

    // Right wall
    const rightWallBricks = generateWallBricks(
      depth,
      height,
      brickWidth,
      brickHeight,
      brickDepth,
      mortarThickness,
      [width / 2, height / 2, 0],
      false,
      0,
      false,
      0
    );
    // Rotate right wall bricks
    rightWallBricks.forEach((brick) => {
      brick.rotation = [0, Math.PI / 2, 0];
    });
    bricks.push(...rightWallBricks);

    // Roof (triangular)
    const roofBricks = generateRoofBricks(
      width,
      depth,
      height,
      brickWidth,
      brickHeight,
      brickDepth,
      mortarThickness
    );
    bricks.push(...roofBricks);

    // Chimney
    if (hasChimney) {
      const chimneyBricks = generateChimneyBricks(
        brickWidth,
        brickHeight,
        brickDepth,
        mortarThickness,
        [width / 4, height + 1, depth / 4]
      );
      bricks.push(...chimneyBricks);
    }

    return bricks;
  }, [
    width,
    height,
    depth,
    hasWindows,
    windowCount,
    hasDoor,
    doorWidth,
    hasChimney,
  ]);

  // Material color configurations
  const getMaterialColor = () => {
    if (color) return color;
    return "#8B4513"; // Default brick color
  };

  const getMaterialProps = () => ({
    color: getMaterialColor(),
    map: brickTexture,
    roughness: 0.8,
    metalness: 0.0,
    transparent: opacity < 1,
    opacity,
  });

  const houseContent = (
    <group position={position} rotation={rotation}>
      {brickTexture ? (
        <group>
          {brickPositions.map((brick) => (
            <Box
              key={brick.id}
              args={brick.size}
              position={brick.position}
              rotation={brick.rotation}
            >
              <meshStandardMaterial {...getMaterialProps()} />
            </Box>
          ))}

          {/* Windows */}
          {hasWindows &&
            Array.from({ length: windowCount }).map((_, i) => {
              const x = (i + 1) * (width / (windowCount + 1)) - width / 2;
              return (
                <group key={`window-${i}`}>
                  {/* Window frame */}
                  <Box
                    args={[1.2, 1.5, 0.1]}
                    position={[x, height * 0.5, depth / 2 + 0.05]}
                  >
                    <meshStandardMaterial color="#8B4513" />
                  </Box>
                  {/* Window glass */}
                  <Box
                    args={[1.0, 1.3, 0.02]}
                    position={[x, height * 0.5, depth / 2 + 0.1]}
                  >
                    <meshStandardMaterial
                      color="#87CEEB"
                      transparent
                      opacity={0.7}
                    />
                  </Box>
                </group>
              );
            })}

          {/* Door */}
          {hasDoor && (
            <group>
              {/* Door frame */}
              <Box
                args={[doorWidth + 0.2, height * 0.7, 0.1]}
                position={[0, height * 0.35, depth / 2 + 0.05]}
              >
                <meshStandardMaterial color="#8B4513" />
              </Box>
              {/* Door */}
              <Box
                args={[doorWidth, height * 0.65, 0.05]}
                position={[0, height * 0.325, depth / 2 + 0.1]}
              >
                <meshStandardMaterial color="#654321" />
              </Box>
            </group>
          )}
        </group>
      ) : (
        /* Fallback solid house while texture loads */
        <Box args={[width, height, depth]}>
          <meshStandardMaterial {...getMaterialProps()} />
        </Box>
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
          {houseContent}
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
      {houseContent}
    </mesh>
  );
};

const BrickHouseWithBreaking = withOptionalBreaking(BrickHouse);
export default BrickHouseWithBreaking;
