import React, { useState, useEffect } from "react";
import { RigidBody } from "@react-three/rapier";
import { Box } from "@react-three/drei";
import * as THREE from "three";
import { loadTextureFromImage } from "../../../utils/textureUtils";
import withOptionalBreaking from "../../withOptionalBreaking";

/**
 * @emoji 🪵
 * @description Wooden planks with grain patterns and details
 */

export interface PlankProps {
  position: [number, number, number];
  length?: number;
  width?: number;
  height?: number;
  woodType?: "oak" | "pine" | "mahogany" | "birch" | "weathered" | "dark";
  finish?: "rough" | "smooth" | "polished" | "weathered";
  rotation?: [number, number, number];
  isCollidable?: boolean;
  hasNails?: boolean;
  hasGrain?: boolean;
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

const Plank: React.FC<PlankProps> = ({
  position,
  length = 2,
  width = 0.2,
  height = 0.05,
  woodType = "oak",
  finish = "smooth",
  rotation = [0, 0, 0],
  isCollidable = true,
  hasNails = false,
  hasGrain = true,
  onClick,
  onPointerOver,
  onPointerOut,
  prototypeId,
  onPrototypeAction,
}) => {
  // Load wood texture
  const [woodTexture, setWoodTexture] = useState(null);

  useEffect(() => {
    loadTextureFromImage("wood")
      .then(setWoodTexture)
      .catch((error) => console.error("Failed to load wood texture:", error));
  }, []);

  // Wood type color configurations
  const getWoodColor = () => {
    switch (woodType) {
      case "oak":
        return "#D2B48C";
      case "pine":
        return "#F4E4BC";
      case "mahogany":
        return "#8B4513";
      case "birch":
        return "#F5F5DC";
      case "weathered":
        return "#8B7355";
      case "dark":
        return "#654321";
      default:
        return "#D2B48C";
    }
  };

  // Finish configurations
  const getMaterialProps = () => {
    const baseColor = getWoodColor();

    return {
      color: baseColor,
      roughness: finish === "rough" ? 0.9 : finish === "polished" ? 0.1 : 0.4,
      metalness: finish === "polished" ? 0.1 : 0.0,
      map: woodTexture,
    };
  };

  const plankContent = (
    <group position={position} rotation={rotation}>
      {/* Main plank body */}
      <Box args={[length, height, width]}>
        <meshStandardMaterial {...getMaterialProps()} />
      </Box>

      {/* Wood grain pattern */}
      {hasGrain && (
        <group>
          {/* Vertical grain lines */}
          {Array.from({ length: Math.max(3, Math.floor(length * 2)) }).map(
            (_, i) => (
              <Box
                key={`grain-${i}`}
                args={[0.01, height + 0.001, width * 0.8]}
                position={[
                  (i - Math.floor(length)) *
                    (length / Math.max(3, Math.floor(length * 2))),
                  0,
                  0,
                ]}
              >
                <meshStandardMaterial
                  color={woodType === "weathered" ? "#6B5B47" : "#8B4513"}
                  transparent
                  opacity={0.3}
                />
              </Box>
            )
          )}

          {/* Horizontal grain lines for weathered wood */}
          {woodType === "weathered" && (
            <>
              <Box
                args={[length * 0.8, 0.005, 0.01]}
                position={[0, height + 0.001, -width * 0.3]}
              >
                <meshStandardMaterial
                  color="#6B5B47"
                  transparent
                  opacity={0.2}
                />
              </Box>
              <Box
                args={[length * 0.6, 0.005, 0.01]}
                position={[0, height + 0.001, width * 0.3]}
              >
                <meshStandardMaterial
                  color="#6B5B47"
                  transparent
                  opacity={0.2}
                />
              </Box>
            </>
          )}
        </group>
      )}

      {/* Nails */}
      {hasNails && (
        <group>
          {/* Corner nails */}
          {[
            [-length * 0.4, -width * 0.4],
            [length * 0.4, -width * 0.4],
            [-length * 0.4, width * 0.4],
            [length * 0.4, width * 0.4],
          ].map(([x, z], i) => (
            <Box
              key={`nail-${i}`}
              args={[0.02, 0.02, 0.02]}
              position={[x, height + 0.01, z]}
            >
              <meshStandardMaterial
                color="#C0C0C0"
                metalness={0.8}
                roughness={0.2}
              />
            </Box>
          ))}
        </group>
      )}

      {/* Knots for natural wood look */}
      {woodType !== "polished" && Math.random() > 0.7 && (
        <Box
          args={[0.1, 0.01, 0.1]}
          position={[
            (Math.random() - 0.5) * length * 0.6,
            height + 0.001,
            (Math.random() - 0.5) * width * 0.6,
          ]}
        >
          <meshStandardMaterial color="#654321" transparent opacity={0.4} />
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
          {plankContent}
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
      {plankContent}
    </mesh>
  );
};

// Create breakable version using HOC
const BreakablePlank = withOptionalBreaking(Plank, {
  breakingOptions: {
    fragmentCount: 4,
    fractureImpulse: 0.6,
    minSizeForFracture: 0.3,
    maxSizeForFracture: 0.8,
  },
});

export default BreakablePlank;
