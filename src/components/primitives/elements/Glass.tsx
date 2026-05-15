import React, { useMemo, useState, useEffect } from "react";
import { RigidBody } from "@react-three/rapier";
import { loadTextureFromImage } from "../../../utils/textureUtils";
import withOptionalBreaking from "../../withOptionalBreaking";

export interface GlassProps {
  position?: [number, number, number];
  color?: string;
  scale?: number;
  glassType?: "clear" | "tinted" | "frosted" | "stained" | "safety";
  size?: [number, number, number];
  thickness?: number;
}

const Glass: React.FC<GlassProps> = ({
  position = [0, 0, 0],
  color = "#E6F3FF",
  scale = 1,
  glassType = "clear",
  size = [1, 1, 0.1],
  thickness = 0.1,
}) => {
  const getGlassDetails = () => {
    switch (glassType) {
      case "tinted":
        return {
          color: "#2F4F4F",
          opacity: 0.7,
          description: "Tinted glass panel",
        };
      case "frosted":
        return {
          color: "#F0F8FF",
          opacity: 0.6,
          description: "Frosted glass panel",
        };
      case "stained":
        return {
          color: "#8A2BE2",
          opacity: 0.8,
          description: "Stained glass window",
        };
      case "safety":
        return {
          color: "#E6F3FF",
          opacity: 0.9,
          description: "Safety glass panel",
        };
      default:
        return {
          color: "#E6F3FF",
          opacity: 0.8,
          description: "Clear glass panel",
        };
    }
  };

  const details = getGlassDetails();

  // Load glass texture from image file (using water as base for transparency)
  const [texture, setTexture] = useState(null);

  useEffect(() => {
    loadTextureFromImage("water")
      .then(setTexture)
      .catch((error) => console.error("Failed to load water texture:", error));
  }, []);

  return (
    <RigidBody
      position={position}
      scale={scale}
      type="dynamic"
      colliders="hull"
    >
      <group>
        {/* Main glass panel */}
        <mesh position={[0, size[1] / 2, 0]}>
          <boxGeometry args={[size[0], size[1], thickness]} />
          <meshLambertMaterial
            color={details.color}
            transparent
            opacity={details.opacity}
            roughness={0.1}
            metalness={0.0}
            map={texture}
          />
        </mesh>

        {/* Glass frame/edge */}
        <mesh position={[0, size[1] / 2, 0]}>
          <boxGeometry
            args={[size[0] + 0.02, size[1] + 0.02, thickness + 0.01]}
          />
          <meshLambertMaterial
            color="#C0C0C0"
            metalness={0.8}
            roughness={0.2}
          />
        </mesh>

        {/* Glass texture details */}
        {glassType === "frosted" && (
          <>
            {/* Frosted texture pattern */}
            <mesh position={[0, size[1] / 2 + 0.01, 0]}>
              <boxGeometry args={[size[0] - 0.02, 0.01, thickness - 0.01]} />
              <meshLambertMaterial
                color="#F0F8FF"
                transparent
                opacity={0.3}
                roughness={0.8}
              />
            </mesh>
          </>
        )}

        {glassType === "stained" && (
          <>
            {/* Stained glass patterns */}
            <mesh position={[0, size[1] / 2 + 0.01, 0]}>
              <boxGeometry args={[size[0] - 0.02, 0.01, thickness - 0.01]} />
              <meshLambertMaterial
                color="#FF6347"
                transparent
                opacity={0.6}
                roughness={0.2}
              />
            </mesh>
            <mesh position={[0.1, size[1] / 2 + 0.01, 0]}>
              <boxGeometry args={[0.1, 0.01, thickness - 0.01]} />
              <meshLambertMaterial
                color="#32CD32"
                transparent
                opacity={0.6}
                roughness={0.2}
              />
            </mesh>
            <mesh position={[-0.1, size[1] / 2 + 0.01, 0]}>
              <boxGeometry args={[0.1, 0.01, thickness - 0.01]} />
              <meshLambertMaterial
                color="#FFD700"
                transparent
                opacity={0.6}
                roughness={0.2}
              />
            </mesh>
          </>
        )}

        {glassType === "safety" && (
          <>
            {/* Safety glass wire mesh */}
            <mesh position={[0, size[1] / 2 + 0.01, 0]}>
              <boxGeometry args={[size[0] - 0.02, 0.01, thickness - 0.01]} />
              <meshLambertMaterial
                color="#C0C0C0"
                metalness={0.8}
                roughness={0.3}
              />
            </mesh>
            {/* Wire pattern */}
            <mesh position={[0, size[1] / 2 + 0.01, 0]}>
              <boxGeometry args={[0.01, 0.01, thickness - 0.01]} />
              <meshLambertMaterial
                color="#2F2F2F"
                metalness={0.9}
                roughness={0.1}
              />
            </mesh>
          </>
        )}

        {/* Glass reflections */}
        <mesh position={[0, size[1] / 2, 0]}>
          <boxGeometry
            args={[size[0] - 0.01, size[1] - 0.01, thickness - 0.01]}
          />
          <meshLambertMaterial
            color="#FFFFFF"
            transparent
            opacity={0.1}
            roughness={0.05}
            metalness={0.1}
          />
        </mesh>
      </group>
    </RigidBody>
  );
};

// Create breakable version using HOC
const BreakableGlass = withOptionalBreaking(Glass, {
  breakingOptions: {
    fragmentCount: 12,
    fractureImpulse: 0.5,
    minSizeForFracture: 0.2,
    maxSizeForFracture: 0.8,
  },
});

export default BreakableGlass;
