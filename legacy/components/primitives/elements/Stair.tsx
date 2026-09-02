import React from "react";
import { RigidBody } from "@react-three/rapier";
import { Box } from "@react-three/drei";
import * as THREE from "three";
import withOptionalBreaking from "../../withOptionalBreaking";

export interface StairProps {
  position: [number, number, number];
  width?: number;
  height?: number;
  depth?: number;
  material?: "stone" | "wood" | "metal" | "marble" | "concrete";
  style?: "solid" | "open" | "spiral" | "floating";
  color?: string;
  rotation?: [number, number, number];
  isCollidable?: boolean;
  hasRailing?: boolean;
  railingHeight?: number;
  hasTreads?: boolean;
  treadDepth?: number;
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

const Stair: React.FC<StairProps> = ({
  position,
  width = 1,
  height = 0.2,
  depth = 0.5,
  material = "stone",
  style = "solid",
  color,
  rotation = [0, 0, 0],
  isCollidable = true,
  hasRailing = false,
  railingHeight = 0.8,
  hasTreads = true,
  treadDepth = 0.05,
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
      case "stone":
        return "#A0A0A0";
      case "wood":
        return "#D2B48C";
      case "metal":
        return "#C0C0C0";
      case "marble":
        return "#F5F5F5";
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
      roughness: material === "metal" ? 0.2 : material === "marble" ? 0.1 : 0.6,
      metalness: material === "metal" ? 0.8 : 0.1,
    };
  };

  const stairContent = (
    <group position={position} rotation={rotation}>
      {/* Main stair body */}
      {style === "solid" && (
        <Box args={[width, height, depth]}>
          <meshStandardMaterial {...getMaterialProps()} />
        </Box>
      )}

      {style === "open" && (
        <group>
          {/* Open stair with visible structure */}
          <Box args={[width, height, depth]}>
            <meshStandardMaterial {...getMaterialProps()} />
          </Box>
          {/* Support beams */}
          <Box args={[0.1, height, depth]} position={[-width * 0.4, 0, 0]}>
            <meshStandardMaterial color="#8B4513" />
          </Box>
          <Box args={[0.1, height, depth]} position={[width * 0.4, 0, 0]}>
            <meshStandardMaterial color="#8B4513" />
          </Box>
        </group>
      )}

      {style === "floating" && (
        <group>
          {/* Floating stair with minimal support */}
          <Box args={[width, height, depth]}>
            <meshStandardMaterial {...getMaterialProps()} />
          </Box>
          {/* Minimal support */}
          <Box
            args={[0.05, height * 0.8, 0.05]}
            position={[0, -height * 0.1, 0]}
          >
            <meshStandardMaterial color="#8B4513" />
          </Box>
        </group>
      )}

      {/* Treads for better grip */}
      {hasTreads && (
        <Box
          args={[width * 0.9, treadDepth, depth * 0.9]}
          position={[0, height / 2 + treadDepth / 2, 0]}
        >
          <meshStandardMaterial
            color={material === "wood" ? "#654321" : "#000000"}
            roughness={0.9}
          />
        </Box>
      )}

      {/* Railing */}
      {hasRailing && (
        <group>
          {/* Left railing */}
          <Box
            args={[0.05, railingHeight, depth]}
            position={[-width * 0.45, height / 2 + railingHeight / 2, 0]}
          >
            <meshStandardMaterial color="#8B4513" />
          </Box>
          {/* Right railing */}
          <Box
            args={[0.05, railingHeight, depth]}
            position={[width * 0.45, height / 2 + railingHeight / 2, 0]}
          >
            <meshStandardMaterial color="#8B4513" />
          </Box>
          {/* Top rail */}
          <Box
            args={[width * 0.9, 0.05, 0.05]}
            position={[0, height / 2 + railingHeight, 0]}
          >
            <meshStandardMaterial color="#8B4513" />
          </Box>
        </group>
      )}

      {/* Material-specific details */}
      {material === "wood" && (
        <group>
          {/* Wood grain lines */}
          {Array.from({ length: 3 }).map((_, i) => (
            <Box
              key={`grain-${i}`}
              args={[width * 0.8, 0.01, 0.01]}
              position={[0, height / 2 + 0.01, (i - 1) * (depth / 3)]}
            >
              <meshStandardMaterial color="#654321" transparent opacity={0.3} />
            </Box>
          ))}
        </group>
      )}

      {material === "marble" && (
        <group>
          {/* Marble veining */}
          {Array.from({ length: 2 }).map((_, i) => (
            <Box
              key={`vein-${i}`}
              args={[0.02, 0.01, depth * 0.8]}
              position={[(i - 0.5) * (width / 2), height / 2 + 0.01, 0]}
            >
              <meshStandardMaterial color="#E0E0E0" transparent opacity={0.4} />
            </Box>
          ))}
        </group>
      )}

      {/* Spiral stair special case */}
      {style === "spiral" && (
        <group>
          {/* Central column */}
          <Box args={[0.2, height, 0.2]} position={[0, 0, 0]}>
            <meshStandardMaterial color="#8B4513" />
          </Box>
          {/* Spiral treads */}
          {Array.from({ length: 8 }).map((_, i) => {
            const angle = (i / 8) * Math.PI * 2;
            const radius = 0.8;
            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;

            return (
              <Box
                key={`spiral-tread-${i}`}
                args={[0.3, height * 0.1, 0.2]}
                position={[x, height * 0.45, z]}
                rotation={[0, angle, 0]}
              >
                <meshStandardMaterial {...getMaterialProps()} />
              </Box>
            );
          })}
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
          {stairContent}
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
      {stairContent}
    </mesh>
  );
};

// Create breakable version using HOC
const BreakableStair = withOptionalBreaking(Stair, {
  breakingOptions: {
    fragmentCount: 5,
    fractureImpulse: 0.8,
    minSizeForFracture: 0.4,
    maxSizeForFracture: 1.0,
  },
});

export default BreakableStair;
