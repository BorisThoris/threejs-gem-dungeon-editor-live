import React, { useMemo, useState, useEffect } from "react";
import { RigidBody } from "@react-three/rapier";
import { loadTextureFromImage } from "../../../utils/textureUtils";
import withOptionalBreaking from "../../withOptionalBreaking";

export interface StoneProps {
  position?: [number, number, number];
  color?: string;
  scale?: number;
  stoneType?: "cobblestone" | "marble" | "granite" | "limestone" | "sandstone";
  size?: [number, number, number];
  shape?: "cube" | "irregular" | "rounded";
}

const Stone: React.FC<StoneProps> = ({
  position = [0, 0, 0],
  color = "#696969",
  scale = 1,
  stoneType = "cobblestone",
  size = [1, 0.8, 1],
  shape = "cube",
}) => {
  const getStoneDetails = () => {
    switch (stoneType) {
      case "marble":
        return {
          color: "#F5F5DC",
          roughness: 0.1,
          metalness: 0.1,
          description: "Polished marble stone",
        };
      case "granite":
        return {
          color: "#708090",
          roughness: 0.4,
          metalness: 0.05,
          description: "Hard granite stone",
        };
      case "limestone":
        return {
          color: "#F0E68C",
          roughness: 0.6,
          metalness: 0.0,
          description: "Soft limestone stone",
        };
      case "sandstone":
        return {
          color: "#D2B48C",
          roughness: 0.8,
          metalness: 0.0,
          description: "Porous sandstone stone",
        };
      default:
        return {
          color: "#696969",
          roughness: 0.7,
          metalness: 0.0,
          description: "Rough cobblestone",
        };
    }
  };

  const details = getStoneDetails();

  // Load stone texture from image file
  const [texture, setTexture] = useState(null);

  useEffect(() => {
    loadTextureFromImage("cobblestone")
      .then(setTexture)
      .catch((error) =>
        console.error("Failed to load cobblestone texture:", error)
      );
  }, []);

  return (
    <RigidBody
      position={position}
      scale={scale}
      type="dynamic"
      colliders="hull"
    >
      <group>
        {/* Main stone body */}
        <mesh position={[0, size[1] / 2, 0]}>
          {shape === "irregular" ? (
            <boxGeometry args={[size[0] + 0.1, size[1], size[2] + 0.1]} />
          ) : shape === "rounded" ? (
            <sphereGeometry args={[size[0] / 2, 8, 6]} />
          ) : (
            <boxGeometry args={size} />
          )}
          <meshLambertMaterial
            color={details.color}
            roughness={details.roughness}
            metalness={details.metalness}
            map={texture}
          />
        </mesh>

        {/* Stone texture details */}
        {stoneType === "cobblestone" && (
          <>
            {/* Rough surface texture */}
            <mesh position={[0, size[1] / 2 + 0.01, 0]}>
              <boxGeometry args={[size[0] - 0.1, 0.02, size[2] - 0.1]} />
              <meshLambertMaterial color="#2F2F2F" roughness={0.9} />
            </mesh>
          </>
        )}

        {stoneType === "marble" && (
          <>
            {/* Marble veining */}
            <mesh position={[0, size[1] / 2 + 0.01, 0]}>
              <boxGeometry args={[size[0] - 0.05, 0.01, size[2] - 0.05]} />
              <meshLambertMaterial color="#E6E6FA" roughness={0.2} />
            </mesh>
          </>
        )}

        {stoneType === "granite" && (
          <>
            {/* Granite speckles */}
            <mesh position={[0.1, size[1] / 2 + 0.01, 0.1]}>
              <boxGeometry args={[0.05, 0.01, 0.05]} />
              <meshLambertMaterial color="#2F4F4F" roughness={0.5} />
            </mesh>
            <mesh position={[-0.1, size[1] / 2 + 0.01, -0.1]}>
              <boxGeometry args={[0.03, 0.01, 0.03]} />
              <meshLambertMaterial color="#2F4F4F" roughness={0.5} />
            </mesh>
          </>
        )}

        {stoneType === "sandstone" && (
          <>
            {/* Sandstone layers */}
            <mesh position={[0, size[1] / 2 + 0.01, 0]}>
              <boxGeometry args={[size[0] - 0.02, 0.01, size[2] - 0.02]} />
              <meshLambertMaterial color="#DEB887" roughness={0.8} />
            </mesh>
          </>
        )}
      </group>
    </RigidBody>
  );
};

// Create breakable version using HOC
const BreakableStone = withOptionalBreaking(Stone, {
  breakingOptions: {
    fragmentCount: 8,
    fractureImpulse: 1.2,
    minSizeForFracture: 0.6,
    maxSizeForFracture: 1.4,
  },
});

export default BreakableStone;
