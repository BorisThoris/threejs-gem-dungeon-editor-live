import React, { useMemo, useState, useEffect } from "react";
import { RigidBody } from "@react-three/rapier";
import { loadTextureFromImage } from "../../../utils/textureUtils";
import withOptionalBreaking from "../../withOptionalBreaking";

export interface WoodPlankProps {
  position?: [number, number, number];
  color?: string;
  scale?: number;
  woodType?: "oak" | "pine" | "mahogany" | "cedar" | "birch";
  size?: [number, number, number];
  grainDirection?: "horizontal" | "vertical";
}

const WoodPlank: React.FC<WoodPlankProps> = ({
  position = [0, 0, 0],
  color = "#8B4513",
  scale = 1,
  woodType = "oak",
  size = [2, 0.2, 0.5],
  grainDirection = "horizontal",
}) => {
  const getWoodDetails = () => {
    switch (woodType) {
      case "pine":
        return {
          color: "#DEB887",
          grainColor: "#D2B48C",
          roughness: 0.6,
          description: "Light pine wood",
        };
      case "mahogany":
        return {
          color: "#8B4513",
          grainColor: "#654321",
          roughness: 0.4,
          description: "Rich mahogany wood",
        };
      case "cedar":
        return {
          color: "#A0522D",
          grainColor: "#8B4513",
          roughness: 0.5,
          description: "Aromatic cedar wood",
        };
      case "birch":
        return {
          color: "#F5DEB3",
          grainColor: "#D2B48C",
          roughness: 0.3,
          description: "Smooth birch wood",
        };
      default:
        return {
          color: "#8B4513",
          grainColor: "#654321",
          roughness: 0.5,
          description: "Sturdy oak wood",
        };
    }
  };

  const details = getWoodDetails();

  // Load wood texture from image file
  const [texture, setTexture] = useState(null);

  useEffect(() => {
    loadTextureFromImage("wood")
      .then(setTexture)
      .catch((error) => console.error("Failed to load wood texture:", error));
  }, []);

  return (
    <RigidBody
      position={position}
      scale={scale}
      type="dynamic"
      colliders="hull"
    >
      <group>
        {/* Main plank body */}
        <mesh position={[0, size[1] / 2, 0]}>
          <boxGeometry args={size} />
          <meshLambertMaterial
            color={details.color}
            roughness={details.roughness}
            map={texture}
          />
        </mesh>

        {/* Wood grain texture */}
        {grainDirection === "horizontal" ? (
          <>
            {/* Horizontal grain lines */}
            {Array.from({ length: Math.floor(size[0] * 2) }, (_, i) => (
              <mesh
                key={i}
                position={[i * 0.5 - size[0] / 2, size[1] / 2 + 0.01, 0]}
              >
                <boxGeometry args={[0.02, 0.01, size[2] - 0.02]} />
                <meshLambertMaterial
                  color={details.grainColor}
                  roughness={details.roughness + 0.2}
                />
              </mesh>
            ))}
          </>
        ) : (
          <>
            {/* Vertical grain lines */}
            {Array.from({ length: Math.floor(size[2] * 2) }, (_, i) => (
              <mesh
                key={i}
                position={[0, size[1] / 2 + 0.01, i * 0.5 - size[2] / 2]}
              >
                <boxGeometry args={[size[0] - 0.02, 0.01, 0.02]} />
                <meshLambertMaterial
                  color={details.grainColor}
                  roughness={details.roughness + 0.2}
                />
              </mesh>
            ))}
          </>
        )}

        {/* Wood knots and imperfections */}
        {woodType === "oak" && (
          <>
            <mesh position={[0.3, size[1] / 2 + 0.01, 0.1]}>
              <cylinderGeometry args={[0.05, 0.05, 0.01, 8]} />
              <meshLambertMaterial color="#654321" roughness={0.8} />
            </mesh>
          </>
        )}

        {woodType === "pine" && (
          <>
            <mesh position={[-0.2, size[1] / 2 + 0.01, -0.1]}>
              <cylinderGeometry args={[0.03, 0.03, 0.01, 8]} />
              <meshLambertMaterial color="#D2B48C" roughness={0.7} />
            </mesh>
          </>
        )}

        {/* Wood edges */}
        <mesh position={[0, size[1] / 2, 0]}>
          <boxGeometry
            args={[size[0] - 0.02, size[1] - 0.02, size[2] - 0.02]}
          />
          <meshLambertMaterial
            color={details.grainColor}
            roughness={details.roughness + 0.1}
          />
        </mesh>
      </group>
    </RigidBody>
  );
};

// Create breakable version using HOC
const BreakableWoodPlank = withOptionalBreaking(WoodPlank, {
  breakingOptions: {
    fragmentCount: 4,
    fractureImpulse: 0.8,
    minSizeForFracture: 0.3,
    maxSizeForFracture: 1.0,
  },
});

export default BreakableWoodPlank;
