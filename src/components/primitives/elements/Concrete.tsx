import React, { useMemo, useState, useEffect } from "react";
import { RigidBody } from "@react-three/rapier";
import { loadTextureFromImage } from "../../../../utils/textureUtils";

export interface ConcreteProps {
  position?: [number, number, number];
  color?: string;
  scale?: number;
  concreteType?: "standard" | "reinforced" | "precast" | "exposed" | "polished";
  size?: [number, number, number];
  condition?: "new" | "cracked" | "weathered" | "damaged";
}

const Concrete: React.FC<ConcreteProps> = ({
  position = [0, 0, 0],
  color = "#A9A9A9",
  scale = 1,
  concreteType = "standard",
  size = [1, 0.5, 1],
  condition = "new",
}) => {
  const getConcreteDetails = () => {
    switch (concreteType) {
      case "reinforced":
        return {
          color: "#696969",
          roughness: 0.6,
          description: "Reinforced concrete with steel bars",
        };
      case "precast":
        return {
          color: "#D3D3D3",
          roughness: 0.4,
          description: "Precast concrete block",
        };
      case "exposed":
        return {
          color: "#B0C4DE",
          roughness: 0.8,
          description: "Exposed aggregate concrete",
        };
      case "polished":
        return {
          color: "#F5F5F5",
          roughness: 0.1,
          description: "Polished concrete surface",
        };
      default:
        return {
          color: "#A9A9A9",
          roughness: 0.5,
          description: "Standard concrete block",
        };
    }
  };

  const details = getConcreteDetails();

  // Load concrete texture from image file (using cobblestone as base)
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
        {/* Main concrete body */}
        <mesh position={[0, size[1] / 2, 0]}>
          <boxGeometry args={size} />
          <meshLambertMaterial
            color={details.color}
            roughness={details.roughness}
            map={texture}
          />
        </mesh>

        {/* Concrete texture details */}
        {concreteType === "reinforced" && (
          <>
            {/* Steel reinforcement bars */}
            <mesh position={[0, size[1] / 2 + 0.01, 0]}>
              <boxGeometry args={[size[0] - 0.1, 0.02, 0.02]} />
              <meshLambertMaterial
                color="#C0C0C0"
                metalness={0.8}
                roughness={0.2}
              />
            </mesh>
            <mesh position={[0, size[1] / 2 + 0.01, 0]}>
              <boxGeometry args={[0.02, 0.02, size[2] - 0.1]} />
              <meshLambertMaterial
                color="#C0C0C0"
                metalness={0.8}
                roughness={0.2}
              />
            </mesh>
          </>
        )}

        {concreteType === "exposed" && (
          <>
            {/* Exposed aggregate texture */}
            <mesh position={[0, size[1] / 2 + 0.01, 0]}>
              <boxGeometry args={[size[0] - 0.02, 0.01, size[2] - 0.02]} />
              <meshLambertMaterial color="#8B7D6B" roughness={0.9} />
            </mesh>
            {/* Random aggregate pieces */}
            <mesh position={[0.1, size[1] / 2 + 0.01, 0.1]}>
              <boxGeometry args={[0.03, 0.01, 0.03]} />
              <meshLambertMaterial color="#696969" roughness={0.8} />
            </mesh>
            <mesh position={[-0.1, size[1] / 2 + 0.01, -0.1]}>
              <boxGeometry args={[0.02, 0.01, 0.02]} />
              <meshLambertMaterial color="#696969" roughness={0.8} />
            </mesh>
          </>
        )}

        {concreteType === "polished" && (
          <>
            {/* Smooth polished surface */}
            <mesh position={[0, size[1] / 2 + 0.01, 0]}>
              <boxGeometry args={[size[0] - 0.01, 0.01, size[2] - 0.01]} />
              <meshLambertMaterial
                color="#FFFFFF"
                roughness={0.05}
                metalness={0.1}
              />
            </mesh>
          </>
        )}

        {/* Condition-based details */}
        {condition === "cracked" && (
          <>
            {/* Cracks */}
            <mesh position={[0, size[1] / 2 + 0.01, 0]}>
              <boxGeometry args={[0.01, 0.01, size[2] - 0.2]} />
              <meshLambertMaterial color="#2F2F2F" />
            </mesh>
            <mesh position={[0, size[1] / 2 + 0.01, 0]}>
              <boxGeometry args={[size[0] - 0.2, 0.01, 0.01]} />
              <meshLambertMaterial color="#2F2F2F" />
            </mesh>
          </>
        )}

        {condition === "weathered" && (
          <>
            {/* Weathering stains */}
            <mesh position={[0.1, size[1] / 2 + 0.01, 0.1]}>
              <boxGeometry args={[0.1, 0.01, 0.1]} />
              <meshLambertMaterial color="#8B7D6B" roughness={0.8} />
            </mesh>
            <mesh position={[-0.1, size[1] / 2 + 0.01, -0.1]}>
              <boxGeometry args={[0.08, 0.01, 0.08]} />
              <meshLambertMaterial color="#8B7D6B" roughness={0.8} />
            </mesh>
          </>
        )}

        {condition === "damaged" && (
          <>
            {/* Chipped edges */}
            <mesh position={[size[0] / 2 - 0.05, size[1] / 2 + 0.01, 0]}>
              <boxGeometry args={[0.05, 0.01, size[2] - 0.1]} />
              <meshLambertMaterial color="#696969" roughness={0.9} />
            </mesh>
            <mesh position={[-size[0] / 2 + 0.05, size[1] / 2 + 0.01, 0]}>
              <boxGeometry args={[0.05, 0.01, size[2] - 0.1]} />
              <meshLambertMaterial color="#696969" roughness={0.9} />
            </mesh>
          </>
        )}
      </group>
    </RigidBody>
  );
};

export default Concrete;
