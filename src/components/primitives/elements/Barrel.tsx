import React, { useState, useEffect } from "react";
import { RigidBody } from "@react-three/rapier";
import { loadTextureFromImage } from "../../../utils/textureUtils";
import withOptionalBreaking from "../../withOptionalBreaking";

export interface BarrelProps {
  position?: [number, number, number];
  color?: string;
  scale?: number;
  health?: number;
  onBreak?: () => void;
}

const Barrel: React.FC<BarrelProps> = ({
  position = [0, 0, 0],
  color = "#8B4513",
  scale = 1,
  health = 3,
  onBreak,
}) => {
  // Load wood texture for barrel
  const [woodTexture, setWoodTexture] = useState(null);

  useEffect(() => {
    loadTextureFromImage("wood")
      .then(setWoodTexture)
      .catch((error) => console.error("Failed to load wood texture:", error));
  }, []);

  return (
    <RigidBody
      position={position}
      scale={scale}
      type="dynamic"
      colliders="hull"
      onCollisionEnter={(other) => {
        if (other.rigidBodyObject?.userData?.damage) {
          const newHealth = health - other.rigidBodyObject.userData.damage;
          if (newHealth <= 0 && onBreak) {
            onBreak();
          }
        }
      }}
    >
      <group>
        {/* Main barrel body */}
        <mesh position={[0, 0.5, 0]}>
          <cylinderGeometry args={[0.4, 0.4, 1, 12]} />
          <meshLambertMaterial color={color} map={woodTexture} />
        </mesh>

        {/* Barrel bands */}
        <mesh position={[0, 0.3, 0]}>
          <cylinderGeometry args={[0.42, 0.42, 0.05, 12]} />
          <meshLambertMaterial color="#C0C0C0" />
        </mesh>
        <mesh position={[0, 0.7, 0]}>
          <cylinderGeometry args={[0.42, 0.42, 0.05, 12]} />
          <meshLambertMaterial color="#C0C0C0" />
        </mesh>

        {/* Barrel top */}
        <mesh position={[0, 1, 0]}>
          <cylinderGeometry args={[0.4, 0.4, 0.1, 12]} />
          <meshLambertMaterial color="#654321" map={woodTexture} />
        </mesh>
      </group>
    </RigidBody>
  );
};

// Create breakable version using HOC
const BreakableBarrel = withOptionalBreaking(Barrel, {
  breakingOptions: {
    fragmentCount: 6,
    fractureImpulse: 0.8,
    minSizeForFracture: 0.4,
    maxSizeForFracture: 1.0,
  },
});

export default BreakableBarrel;
