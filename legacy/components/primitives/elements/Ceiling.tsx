import React from "react";
import { RigidBody } from "@react-three/rapier";
import { Box } from "@react-three/drei";
import * as THREE from "three";
import withOptionalBreaking from "../../withOptionalBreaking";

export interface CeilingProps {
  position: [number, number, number];
  width?: number;
  height?: number;
  depth?: number;
  material?: "wood" | "plaster" | "stone" | "metal" | "tile" | "fabric";
  style?: "flat" | "beamed" | "vaulted" | "coffered" | "exposed";
  color?: string;
  rotation?: [number, number, number];
  isCollidable?: boolean;
  hasLighting?: boolean;
  lightCount?: number;
  opacity?: number;
  onClick?: () => void;
  onPointerOver?: () => void;
  onPointerOut?: () => void;
  // Prototype props
  prototypeId?: string;
  onPrototypeAction?: (action: string, data?: any) => void;
  // Breaking props
  enabled?: boolean;
  breakingOptions?: any;
  onBreak?: (impactPoint: THREE.Vector3) => void;
  onFragmentClick?: (fragmentId: string) => void;
  showHoverEffect?: boolean;
  hoverColor?: string;
}

const Ceiling: React.FC<CeilingProps> = ({
  position,
  width = 8,
  height = 0.2,
  depth = 8,
  material = "wood",
  style = "flat",
  color,
  rotation = [0, 0, 0],
  isCollidable = true,
  hasLighting = false,
  lightCount = 1,
  opacity = 1,
  onClick,
  onPointerOver,
  onPointerOut,
  prototypeId,
  onPrototypeAction,
}) => {
  // Material color configurations
  const getMaterialColor = () => {
    if (color) return color;

    switch (material) {
      case "wood":
        return "#D2B48C";
      case "plaster":
        return "#F5F5DC";
      case "stone":
        return "#A0A0A0";
      case "metal":
        return "#C0C0C0";
      case "tile":
        return "#F0F0F0";
      case "fabric":
        return "#E6E6FA";
      default:
        return "#D2B48C";
    }
  };

  // Material properties
  const getMaterialProps = () => {
    const baseColor = getMaterialColor();

    return {
      color: baseColor,
      transparent: opacity < 1,
      opacity,
      roughness: material === "metal" ? 0.2 : 0.6,
      metalness: material === "metal" ? 0.8 : 0.1,
    };
  };

  // Calculate light positions
  const getLightPositions = () => {
    if (!hasLighting || lightCount <= 0) return [];

    const positions = [];
    const gridSize = Math.ceil(Math.sqrt(lightCount));
    const spacing = Math.min(width, depth) / (gridSize + 1);

    for (let i = 0; i < lightCount; i++) {
      const row = Math.floor(i / gridSize);
      const col = i % gridSize;
      const x = (col + 1) * spacing - width / 2;
      const z = (row + 1) * spacing - depth / 2;
      positions.push([x, z]);
    }

    return positions;
  };

  const ceilingContent = (
    <group position={position} rotation={rotation}>
      {/* Main ceiling body */}
      <Box args={[width, height, depth]}>
        <meshStandardMaterial {...getMaterialProps()} />
      </Box>

      {/* Style-specific details */}
      {style === "beamed" && material === "wood" && (
        <group>
          {/* Cross beams */}
          {Array.from({ length: 3 }).map((_, i) => (
            <Box
              key={`beam-x-${i}`}
              args={[width * 0.9, 0.3, 0.2]}
              position={[0, height / 2 + 0.15, (i - 1) * (depth / 3)]}
            >
              <meshStandardMaterial color="#8B4513" />
            </Box>
          ))}
          {Array.from({ length: 3 }).map((_, i) => (
            <Box
              key={`beam-z-${i}`}
              args={[0.2, 0.3, depth * 0.9]}
              position={[(i - 1) * (width / 3), height / 2 + 0.15, 0]}
            >
              <meshStandardMaterial color="#8B4513" />
            </Box>
          ))}
        </group>
      )}

      {style === "coffered" && (
        <group>
          {/* Coffered panels */}
          {Array.from({ length: 3 }).map((_, row) =>
            Array.from({ length: 3 }).map((_, col) => (
              <Box
                key={`coffer-${row}-${col}`}
                args={[width / 4, 0.1, depth / 4]}
                position={[
                  (col - 1) * (width / 3),
                  height / 2 + 0.05,
                  (row - 1) * (depth / 3),
                ]}
              >
                <meshStandardMaterial
                  color={material === "wood" ? "#654321" : "#D3D3D3"}
                />
              </Box>
            ))
          )}
        </group>
      )}

      {style === "exposed" && (
        <group>
          {/* Exposed structural elements */}
          {Array.from({ length: 5 }).map((_, i) => (
            <Box
              key={`exposed-${i}`}
              args={[0.1, 0.4, depth * 0.8]}
              position={[(i - 2) * (width / 4), height / 2 + 0.2, 0]}
            >
              <meshStandardMaterial color="#8B4513" />
            </Box>
          ))}
        </group>
      )}

      {/* Material-specific patterns */}
      {material === "tile" && (
        <group>
          {/* Tile pattern */}
          {Array.from({ length: Math.floor(width) }).map((_, row) =>
            Array.from({ length: Math.floor(depth) }).map((_, col) => (
              <Box
                key={`tile-${row}-${col}`}
                args={[0.9, 0.01, 0.9]}
                position={[
                  (col - Math.floor(depth) / 2) * 1,
                  height / 2 + 0.01,
                  (row - Math.floor(width) / 2) * 1,
                ]}
              >
                <meshStandardMaterial
                  color="#E0E0E0"
                  transparent
                  opacity={0.3}
                />
              </Box>
            ))
          )}
        </group>
      )}

      {/* Lighting fixtures */}
      {hasLighting &&
        getLightPositions().map(([x, z], i) => (
          <group key={`light-${i}`}>
            {/* Light fixture */}
            <Box args={[0.3, 0.1, 0.3]} position={[x, height / 2 + 0.05, z]}>
              <meshStandardMaterial
                color="#FFD700"
                emissive="#FFD700"
                emissiveIntensity={0.5}
              />
            </Box>
            {/* Light beam */}
            <Box args={[0.1, 0.2, 0.1]} position={[x, height / 2 - 0.1, z]}>
              <meshStandardMaterial color="#FFFFE0" transparent opacity={0.3} />
            </Box>
          </group>
        ))}

      {/* Decorative elements for fabric ceiling */}
      {material === "fabric" && (
        <group>
          {/* Fabric folds */}
          {Array.from({ length: 4 }).map((_, i) => (
            <Box
              key={`fold-${i}`}
              args={[0.05, 0.1, depth * 0.8]}
              position={[(i - 1.5) * (width / 3), height / 2 + 0.05, 0]}
            >
              <meshStandardMaterial color="#D8BFD8" transparent opacity={0.6} />
            </Box>
          ))}
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
          {ceilingContent}
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
      {ceilingContent}
    </mesh>
  );
};

// Create breakable version using HOC
const BreakableCeiling = withOptionalBreaking(Ceiling, {
  breakingOptions: {
    fragmentCount: 10,
    fractureImpulse: 1.5,
    minSizeForFracture: 0.8,
    maxSizeForFracture: 1.8,
  },
});

export default BreakableCeiling;
