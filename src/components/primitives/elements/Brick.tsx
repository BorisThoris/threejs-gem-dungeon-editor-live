import React, { useMemo, useState, useEffect } from "react";
import { RigidBody } from "@react-three/rapier";
import { loadTextureFromImage } from "../../../utils/textureUtils";
import withOptionalBreaking from "../../withOptionalBreaking";

export interface BrickProps {
  position?: [number, number, number];
  color?: string;
  scale?: number;
  brickType?: "standard" | "weathered" | "ancient" | "modern";
  size?: [number, number, number];
}

const Brick: React.FC<BrickProps> = ({
  position = [0, 0, 0],
  color = "#8B4513",
  scale = 1,
  brickType = "standard",
  size = [1, 0.5, 0.5],
}) => {
  const getBrickDetails = () => {
    switch (brickType) {
      case "weathered":
        return {
          color: "#A0522D",
          roughness: 0.8,
          description: "Weathered brick with worn edges",
        };
      case "ancient":
        return {
          color: "#654321",
          roughness: 0.9,
          description: "Ancient brick with moss and cracks",
        };
      case "modern":
        return {
          color: "#CD853F",
          roughness: 0.3,
          description: "Modern smooth brick",
        };
      default:
        return {
          color: "#8B4513",
          roughness: 0.6,
          description: "Standard brick",
        };
    }
  };

  const details = getBrickDetails();

  // Load brick texture from image file
  const [texture, setTexture] = useState(null);

  useEffect(() => {
    loadTextureFromImage("brick")
      .then(setTexture)
      .catch((error) => console.error("Failed to load brick texture:", error));
  }, []);

  return (
    <RigidBody
      position={position}
      scale={scale}
      type="dynamic"
      colliders="hull"
    >
      <group>
        {/* Main brick body */}
        <mesh position={[0, size[1] / 2, 0]}>
          <boxGeometry args={size} />
          <meshLambertMaterial
            color={details.color}
            roughness={details.roughness}
            map={texture}
          />
        </mesh>

        {/* Brick texture details */}
        {brickType === "weathered" && (
          <>
            {/* Worn edges */}
            <mesh position={[0, size[1] / 2, 0]}>
              <boxGeometry
                args={[size[0] - 0.05, size[1] - 0.05, size[2] - 0.05]}
              />
              <meshLambertMaterial color="#8B4513" roughness={0.9} />
            </mesh>
          </>
        )}

        {brickType === "ancient" && (
          <>
            {/* Moss patches */}
            <mesh position={[0.2, size[1] / 2, 0.1]}>
              <boxGeometry args={[0.1, 0.1, 0.05]} />
              <meshLambertMaterial color="#228B22" roughness={0.8} />
            </mesh>
            <mesh position={[-0.2, size[1] / 2, -0.1]}>
              <boxGeometry args={[0.08, 0.08, 0.03]} />
              <meshLambertMaterial color="#228B22" roughness={0.8} />
            </mesh>
            {/* Cracks */}
            <mesh position={[0, size[1] / 2, 0]}>
              <boxGeometry args={[0.01, size[1], 0.01]} />
              <meshLambertMaterial color="#2F2F2F" />
            </mesh>
          </>
        )}

        {brickType === "modern" && (
          <>
            {/* Smooth finish */}
            <mesh position={[0, size[1] / 2, 0]}>
              <boxGeometry
                args={[size[0] - 0.02, size[1] - 0.02, size[2] - 0.02]}
              />
              <meshLambertMaterial
                color={details.color}
                roughness={0.1}
                metalness={0.1}
              />
            </mesh>
          </>
        )}
      </group>
    </RigidBody>
  );
};

// Create breakable version using HOC
const BreakableBrick = withOptionalBreaking(Brick, {
  breakingOptions: {
    fragmentCount: 6,
    fractureImpulse: 1.0,
    minSizeForFracture: 0.5,
    maxSizeForFracture: 1.2,
  },
});

export default BreakableBrick;
