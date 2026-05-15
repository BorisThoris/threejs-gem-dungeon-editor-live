import React, { useState, useEffect, useMemo } from "react";
import { RigidBody } from "@react-three/rapier";
import { Box, Cylinder } from "@react-three/drei";
import * as THREE from "three";
import withOptionalBreaking from "../../withOptionalBreaking";
import { loadTextureFromImage } from "../../../../utils/textureUtils";

export interface StoneTowerProps {
  position: [number, number, number];
  radius?: number;
  height?: number;
  color?: string;
  rotation?: [number, number, number];
  isCollidable?: boolean;
  hasWindows?: boolean;
  windowCount?: number;
  hasDoor?: boolean;
  hasCrenellations?: boolean;
  hasSpiralStairs?: boolean;
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

const StoneTower: React.FC<StoneTowerProps> = ({
  position,
  radius = 3,
  height = 8,
  color,
  rotation = [0, 0, 0],
  isCollidable = true,
  hasWindows = true,
  windowCount = 4,
  hasDoor = true,
  hasCrenellations = true,
  hasSpiralStairs = true,
  opacity = 1,
  onClick,
  onPointerOver,
  onPointerOut,
  prototypeId: _prototypeId,
  onPrototypeAction: _onPrototypeAction,
}) => {
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

  // Generate tower components
  const towerComponents = useMemo(() => {
    const stoneWidth = 0.3;
    const stoneHeight = 0.2;
    const stoneDepth = 0.2;
    const mortarThickness = 0.02;
    const wallThickness = 0.5;

    const components = [];

    // Main tower walls (circular)
    const circumference = 2 * Math.PI * radius;
    const stonesPerLevel = Math.floor(
      circumference / (stoneWidth + mortarThickness)
    );
    const levels = Math.floor(height / (stoneHeight + mortarThickness));

    for (let level = 0; level < levels; level++) {
      const y = level * (stoneHeight + mortarThickness) + stoneHeight / 2;

      for (let i = 0; i < stonesPerLevel; i++) {
        const angle = (i * 2 * Math.PI) / stonesPerLevel;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;

        // Skip stones for door and windows
        const isDoor = hasDoor && level < 3 && Math.abs(angle) < 0.5;
        const isWindow =
          hasWindows &&
          level > 2 &&
          level < levels - 2 &&
          Math.abs(angle - Math.PI) < (windowCount * Math.PI) / 8;

        if (!isDoor && !isWindow) {
          const sizeVariation = 0.9 + Math.random() * 0.2;
          components.push({
            type: "wall-stone",
            position: [x, y, z] as [number, number, number],
            size: [
              stoneWidth * sizeVariation,
              stoneHeight * sizeVariation,
              stoneDepth,
            ] as [number, number, number],
            id: `wall-stone-${level}-${i}`,
            rotation: [0, angle, (Math.random() - 0.5) * 0.1] as [
              number,
              number,
              number
            ],
          });
        }
      }
    }

    // Crenellations (battlements)
    if (hasCrenellations) {
      const crenellationHeight = 0.5;
      const crenellationWidth = 0.4;
      const crenellationSpacing = 0.2;
      const crenellationCount = Math.floor(
        circumference / (crenellationWidth + crenellationSpacing)
      );

      for (let i = 0; i < crenellationCount; i++) {
        const angle = (i * 2 * Math.PI) / crenellationCount;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        const y = height + crenellationHeight / 2;

        components.push({
          type: "crenellation",
          position: [x, y, z] as [number, number, number],
          size: [crenellationWidth, crenellationHeight, stoneDepth] as [
            number,
            number,
            number
          ],
          id: `crenellation-${i}`,
          rotation: [0, angle, 0] as [number, number, number],
        });
      }
    }

    // Spiral stairs
    if (hasSpiralStairs) {
      const stairHeight = 0.15;
      const stairWidth = 0.3;
      const stairDepth = 0.2;
      const stairsPerLevel = 8;
      const totalStairs = Math.floor(height / stairHeight);

      for (let i = 0; i < totalStairs; i++) {
        const angle = (i * 2 * Math.PI) / stairsPerLevel;
        const stairRadius = radius - wallThickness - 0.1;
        const x = Math.cos(angle) * stairRadius;
        const z = Math.sin(angle) * stairRadius;
        const y = i * stairHeight + stairHeight / 2;

        components.push({
          type: "stair",
          position: [x, y, z] as [number, number, number],
          size: [stairWidth, stairHeight, stairDepth] as [
            number,
            number,
            number
          ],
          id: `stair-${i}`,
          rotation: [0, angle, 0] as [number, number, number],
        });
      }
    }

    // Tower roof
    const roofHeight = 2;
    const roofLevels = Math.floor(roofHeight / (stoneHeight + mortarThickness));

    for (let level = 0; level < roofLevels; level++) {
      const roofRadius = radius - level * 0.3;
      const roofCircumference = 2 * Math.PI * roofRadius;
      const roofStonesPerLevel = Math.floor(
        roofCircumference / (stoneWidth + mortarThickness)
      );
      const y =
        height + level * (stoneHeight + mortarThickness) + stoneHeight / 2;

      for (let i = 0; i < roofStonesPerLevel; i++) {
        const angle = (i * 2 * Math.PI) / roofStonesPerLevel;
        const x = Math.cos(angle) * roofRadius;
        const z = Math.sin(angle) * roofRadius;

        components.push({
          type: "roof-stone",
          position: [x, y, z] as [number, number, number],
          size: [stoneWidth, stoneHeight, stoneDepth] as [
            number,
            number,
            number
          ],
          id: `roof-stone-${level}-${i}`,
          rotation: [0, angle, 0] as [number, number, number],
        });
      }
    }

    return components;
  }, [
    radius,
    height,
    hasWindows,
    windowCount,
    hasDoor,
    hasCrenellations,
    hasSpiralStairs,
  ]);

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

  const towerContent = (
    <group position={position} rotation={rotation}>
      {stoneTexture ? (
        <group>
          {towerComponents.map((component) => (
            <Box
              key={component.id}
              args={component.size}
              position={component.position}
              rotation={component.rotation}
            >
              <meshStandardMaterial {...getMaterialProps()} />
            </Box>
          ))}

          {/* Windows */}
          {hasWindows &&
            Array.from({ length: windowCount }).map((_, i) => {
              const angle = (i * 2 * Math.PI) / windowCount + Math.PI;
              const x = Math.cos(angle) * radius;
              const z = Math.sin(angle) * radius;
              const y = height * 0.6;

              return (
                <group key={`window-${i}`}>
                  {/* Window frame */}
                  <Box
                    args={[0.8, 1.2, 0.1]}
                    position={[x, y, z]}
                    rotation={[0, angle, 0]}
                  >
                    <meshStandardMaterial color="#8B4513" />
                  </Box>
                  {/* Window glass */}
                  <Box
                    args={[0.6, 1.0, 0.02]}
                    position={[x, y, z + 0.05]}
                    rotation={[0, angle, 0]}
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
                args={[1.5, 2.5, 0.1]}
                position={[radius, 1.25, 0]}
                rotation={[0, Math.PI / 2, 0]}
              >
                <meshStandardMaterial color="#8B4513" />
              </Box>
              {/* Door */}
              <Box
                args={[1.3, 2.3, 0.05]}
                position={[radius + 0.05, 1.25, 0]}
                rotation={[0, Math.PI / 2, 0]}
              >
                <meshStandardMaterial color="#654321" />
              </Box>
            </group>
          )}
        </group>
      ) : (
        /* Fallback solid tower while texture loads */
        <Cylinder args={[radius, radius, height]}>
          <meshStandardMaterial {...getMaterialProps()} />
        </Cylinder>
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
          {towerContent}
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
      {towerContent}
    </mesh>
  );
};

const StoneTowerWithBreaking = withOptionalBreaking(StoneTower);
export default StoneTowerWithBreaking;
