import React, { useState, useEffect, useMemo, useRef } from "react";
import { RigidBody } from "@react-three/rapier";
import * as THREE from "three";
import withOptionalBreaking from "../../../withOptionalBreaking";
import { loadTextureFromImage } from "../../../../utils/textureUtils";

export interface InstancedBrickHouseProps {
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

const InstancedBrickHouse: React.FC<InstancedBrickHouseProps> = ({
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
  const meshRef = useRef<THREE.InstancedMesh>(null);

  // Reusable objects to avoid garbage collection
  const tempVector = useRef(new THREE.Vector3());
  const tempEuler = useRef(new THREE.Euler());
  const tempQuaternion = useRef(new THREE.Quaternion());
  const tempMatrix = useRef(new THREE.Matrix4());
  const [brickTexture, setBrickTexture] = useState<THREE.Texture | null>(null);

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

  // Generate brick data for instanced rendering
  const brickData = useMemo(() => {
    const brickWidth = 0.2;
    const brickHeight = 0.1;
    const brickDepth = 0.1;
    const mortarThickness = 0.02;

    const bricks: Array<{
      position: [number, number, number];
      scale: [number, number, number];
      rotation: [number, number, number];
    }> = [];

    // Helper function to add bricks for a wall
    const addWallBricks = (
      wallWidth: number,
      wallHeight: number,
      wallCenter: [number, number, number],
      wallRotation: [number, number, number] = [0, 0, 0],
      hasWindows: boolean = false,
      windowCount: number = 0,
      hasDoor: boolean = false,
      doorWidth: number = 0
    ) => {
      const bricksPerRow = Math.floor(
        wallWidth / (brickWidth + mortarThickness)
      );
      const rows = Math.floor(wallHeight / (brickHeight + mortarThickness));

      for (let row = 0; row < rows; row++) {
        const rowOffset = row % 2 === 0 ? 0 : brickWidth / 2;

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
            const brickPosition: [number, number, number] = [
              wallCenter[0] + x,
              wallCenter[1] - wallHeight / 2 + y,
              wallCenter[2],
            ];

            // Apply wall rotation - reuse objects
            tempVector.current.set(...brickPosition);
            tempEuler.current.set(...wallRotation);
            tempVector.current.applyEuler(tempEuler.current);

            bricks.push({
              position: [
                tempVector.current.x,
                tempVector.current.y,
                tempVector.current.z,
              ],
              scale: [
                brickWidth * sizeVariation,
                brickHeight * sizeVariation,
                brickDepth,
              ],
              rotation: [
                wallRotation[0],
                wallRotation[1] + (Math.random() - 0.5) * 0.05,
                wallRotation[2],
              ],
            });
          }
        }
      }
    };

    // Front wall
    addWallBricks(
      width,
      height,
      [0, height / 2, depth / 2],
      [0, 0, 0],
      hasWindows,
      windowCount,
      hasDoor,
      doorWidth
    );

    // Back wall
    addWallBricks(width, height, [0, height / 2, -depth / 2], [0, Math.PI, 0]);

    // Left wall
    addWallBricks(
      depth,
      height,
      [-width / 2, height / 2, 0],
      [0, Math.PI / 2, 0]
    );

    // Right wall
    addWallBricks(
      depth,
      height,
      [width / 2, height / 2, 0],
      [0, -Math.PI / 2, 0]
    );

    // Roof bricks (simplified)
    const roofHeight = 2;
    const roofBricks = Math.floor(width / (brickWidth + mortarThickness));
    for (let i = 0; i < roofBricks; i++) {
      const x = i * (brickWidth + mortarThickness) - width / 2 + brickWidth / 2;
      const y = height + roofHeight / 2;
      const z = 0;

      bricks.push({
        position: [x, y, z],
        scale: [brickWidth, brickHeight, depth],
        rotation: [0, 0, 0],
      });
    }

    // Chimney bricks
    if (hasChimney) {
      const chimneyWidth = 1;
      const chimneyHeight = 2;
      const chimneyDepth = 1;
      const chimneyCenter: [number, number, number] = [
        width / 4,
        height + 1,
        depth / 4,
      ];

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
              position: [brickX, brickY, brickZ],
              scale: [brickWidth, brickHeight, brickDepth],
              rotation: [0, 0, 0],
            });
          }
        }
      }
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

  // Update instance matrices when brickData changes
  useEffect(() => {
    if (meshRef.current && brickData.length > 0) {
      const matrix = new THREE.Matrix4();

      // Set the instance count
      meshRef.current.count = brickData.length;

      // Update each instance - reuse objects
      brickData.forEach((brick, index) => {
        tempMatrix.current.compose(
          tempVector.current.set(...brick.position),
          tempQuaternion.current.setFromEuler(
            tempEuler.current.set(...brick.rotation)
          ),
          tempVector.current.set(...brick.scale)
        );
        meshRef.current!.setMatrixAt(index, tempMatrix.current);
      });

      meshRef.current.instanceMatrix.needsUpdate = true;
    }
  }, [brickData]);

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
          {/* Instanced brick mesh */}
          <instancedMesh
            ref={meshRef}
            args={[undefined, undefined, brickData.length]}
          >
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial {...getMaterialProps()} />
          </instancedMesh>

          {/* Windows */}
          {hasWindows &&
            Array.from({ length: windowCount }).map((_, i) => {
              const x = (i + 1) * (width / (windowCount + 1)) - width / 2;
              return (
                <group key={`window-${i}`}>
                  {/* Window frame */}
                  <mesh position={[x, height * 0.5, depth / 2 + 0.05]}>
                    <boxGeometry args={[1.2, 1.5, 0.1]} />
                    <meshStandardMaterial color="#8B4513" />
                  </mesh>
                  {/* Window glass */}
                  <mesh position={[x, height * 0.5, depth / 2 + 0.1]}>
                    <boxGeometry args={[1.0, 1.3, 0.02]} />
                    <meshStandardMaterial
                      color="#87CEEB"
                      transparent
                      opacity={0.7}
                    />
                  </mesh>
                </group>
              );
            })}

          {/* Door */}
          {hasDoor && (
            <group>
              {/* Door frame */}
              <mesh position={[0, height * 0.35, depth / 2 + 0.05]}>
                <boxGeometry args={[doorWidth + 0.2, height * 0.7, 0.1]} />
                <meshStandardMaterial color="#8B4513" />
              </mesh>
              {/* Door */}
              <mesh position={[0, height * 0.325, depth / 2 + 0.1]}>
                <boxGeometry args={[doorWidth, height * 0.65, 0.05]} />
                <meshStandardMaterial color="#654321" />
              </mesh>
            </group>
          )}
        </group>
      ) : (
        /* Fallback solid house while texture loads */
        <mesh>
          <boxGeometry args={[width, height, depth]} />
          <meshStandardMaterial {...getMaterialProps()} />
        </mesh>
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

const InstancedBrickHouseWithBreaking =
  withOptionalBreaking(InstancedBrickHouse);
export default InstancedBrickHouseWithBreaking;
