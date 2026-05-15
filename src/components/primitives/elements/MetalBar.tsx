import React, { useMemo, useState, useEffect } from "react";
import { RigidBody } from "@react-three/rapier";
import { loadTextureFromImage } from "../../../utils/textureUtils";
import withOptionalBreaking from "../../withOptionalBreaking";

export interface MetalBarProps {
  position?: [number, number, number];
  color?: string;
  scale?: number;
  metalType?: "iron" | "steel" | "copper" | "bronze" | "gold";
  size?: [number, number, number];
  shape?: "round" | "square" | "hexagonal";
}

const MetalBar: React.FC<MetalBarProps> = ({
  position = [0, 0, 0],
  color = "#C0C0C0",
  scale = 1,
  metalType = "iron",
  size = [2, 0.1, 0.1],
  shape = "round",
}) => {
  const getMetalDetails = () => {
    switch (metalType) {
      case "steel":
        return {
          color: "#708090",
          metalness: 0.8,
          roughness: 0.2,
          description: "Strong steel bar",
        };
      case "copper":
        return {
          color: "#B87333",
          metalness: 0.9,
          roughness: 0.1,
          description: "Conductive copper bar",
        };
      case "bronze":
        return {
          color: "#CD7F32",
          metalness: 0.7,
          roughness: 0.3,
          description: "Durable bronze bar",
        };
      case "gold":
        return {
          color: "#FFD700",
          metalness: 0.9,
          roughness: 0.1,
          description: "Precious gold bar",
        };
      default:
        return {
          color: "#C0C0C0",
          metalness: 0.6,
          roughness: 0.4,
          description: "Rusty iron bar",
        };
    }
  };

  const details = getMetalDetails();

  // Load metal texture from image file (using pixel_checkerboard for metallic pattern)
  const [texture, setTexture] = useState(null);

  useEffect(() => {
    loadTextureFromImage("pixel_checkerboard")
      .then(setTexture)
      .catch((error) =>
        console.error("Failed to load pixel_checkerboard texture:", error)
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
        {/* Main metal bar body */}
        <mesh position={[0, size[1] / 2, 0]}>
          {shape === "round" ? (
            <cylinderGeometry args={[size[1] / 2, size[1] / 2, size[0], 8]} />
          ) : shape === "hexagonal" ? (
            <cylinderGeometry args={[size[1] / 2, size[1] / 2, size[0], 6]} />
          ) : (
            <boxGeometry args={size} />
          )}
          <meshLambertMaterial
            color={details.color}
            metalness={details.metalness}
            roughness={details.roughness}
            map={texture}
          />
        </mesh>

        {/* Metal texture details */}
        {metalType === "iron" && (
          <>
            {/* Rust spots */}
            <mesh position={[0.2, size[1] / 2 + 0.01, 0]}>
              <cylinderGeometry args={[0.02, 0.02, size[0] - 0.4, 8]} />
              <meshLambertMaterial
                color="#8B4513"
                metalness={0.3}
                roughness={0.8}
              />
            </mesh>
            <mesh position={[-0.2, size[1] / 2 + 0.01, 0]}>
              <cylinderGeometry args={[0.015, 0.015, size[0] - 0.6, 8]} />
              <meshLambertMaterial
                color="#8B4513"
                metalness={0.3}
                roughness={0.8}
              />
            </mesh>
          </>
        )}

        {metalType === "steel" && (
          <>
            {/* Steel shine lines */}
            <mesh position={[0, size[1] / 2 + 0.01, 0]}>
              <cylinderGeometry
                args={[size[1] / 2 - 0.01, size[1] / 2 - 0.01, size[0], 8]}
              />
              <meshLambertMaterial
                color="#E6E6FA"
                metalness={0.9}
                roughness={0.1}
              />
            </mesh>
          </>
        )}

        {metalType === "copper" && (
          <>
            {/* Copper patina */}
            <mesh position={[0, size[1] / 2 + 0.01, 0]}>
              <cylinderGeometry
                args={[size[1] / 2 - 0.01, size[1] / 2 - 0.01, size[0], 8]}
              />
              <meshLambertMaterial
                color="#4B0082"
                metalness={0.8}
                roughness={0.3}
              />
            </mesh>
          </>
        )}

        {metalType === "gold" && (
          <>
            {/* Gold luster */}
            <mesh position={[0, size[1] / 2 + 0.01, 0]}>
              <cylinderGeometry
                args={[size[1] / 2 - 0.01, size[1] / 2 - 0.01, size[0], 8]}
              />
              <meshLambertMaterial
                color="#FFA500"
                metalness={0.95}
                roughness={0.05}
                emissive="#FFD700"
                emissiveIntensity={0.1}
              />
            </mesh>
          </>
        )}

        {/* Metal end caps */}
        <mesh position={[size[0] / 2, size[1] / 2, 0]}>
          <cylinderGeometry
            args={[size[1] / 2 + 0.01, size[1] / 2 + 0.01, 0.05, 8]}
          />
          <meshLambertMaterial
            color={details.color}
            metalness={details.metalness + 0.1}
            roughness={details.roughness - 0.1}
          />
        </mesh>
        <mesh position={[-size[0] / 2, size[1] / 2, 0]}>
          <cylinderGeometry
            args={[size[1] / 2 + 0.01, size[1] / 2 + 0.01, 0.05, 8]}
          />
          <meshLambertMaterial
            color={details.color}
            metalness={details.metalness + 0.1}
            roughness={details.roughness - 0.1}
          />
        </mesh>
      </group>
    </RigidBody>
  );
};

// Create breakable version using HOC
const BreakableMetalBar = withOptionalBreaking(MetalBar, {
  breakingOptions: {
    fragmentCount: 3,
    fractureImpulse: 1.5,
    minSizeForFracture: 0.4,
    maxSizeForFracture: 1.1,
  },
});

export default BreakableMetalBar;
