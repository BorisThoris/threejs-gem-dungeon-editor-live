import React, { useState, useEffect } from "react";
import { RigidBody } from "@react-three/rapier";
import { Text } from "@react-three/drei";
import { loadTextureFromImage } from "../../../utils/textureUtils";
import withOptionalBreaking from "../../withOptionalBreaking";

export interface ChestProps {
  position?: [number, number, number];
  color?: string;
  scale?: number;
  isOpen?: boolean;
  onOpen?: () => void;
  onClose?: () => void;
  treasure?: string;
}

const Chest: React.FC<ChestProps> = ({
  position = [0, 0, 0],
  color = "#8B4513",
  scale = 1,
  isOpen = false,
  onOpen,
  onClose,
  treasure = "Gold",
}) => {
  const [isHovered, setIsHovered] = useState(false);

  // Load wood texture for chest
  const [woodTexture, setWoodTexture] = useState(null);

  useEffect(() => {
    loadTextureFromImage("wood")
      .then(setWoodTexture)
      .catch((error) => console.error("Failed to load wood texture:", error));
  }, []);

  const handleClick = () => {
    if (isOpen && onClose) {
      onClose();
    } else if (!isOpen && onOpen) {
      onOpen();
    }
  };

  return (
    <RigidBody position={position} scale={scale} type="fixed" colliders="hull">
      <group
        onClick={handleClick}
        onPointerOver={() => setIsHovered(true)}
        onPointerOut={() => setIsHovered(false)}
      >
        {/* Chest base */}
        <mesh position={[0, 0.2, 0]}>
          <boxGeometry args={[0.8, 0.4, 0.6]} />
          <meshLambertMaterial color={color} map={woodTexture} />
        </mesh>

        {/* Chest lid */}
        <mesh
          position={[0, 0.6, 0]}
          rotation={[isOpen ? -Math.PI / 3 : 0, 0, 0]}
        >
          <boxGeometry args={[0.8, 0.1, 0.6]} />
          <meshLambertMaterial color={color} map={woodTexture} />
        </mesh>

        {/* Chest lock */}
        <mesh position={[0, 0.65, 0.25]}>
          <cylinderGeometry args={[0.05, 0.05, 0.1, 8]} />
          <meshLambertMaterial color="#FFD700" />
        </mesh>

        {/* Treasure glow when open */}
        {isOpen && (
          <mesh position={[0, 0.3, 0]}>
            <boxGeometry args={[0.6, 0.2, 0.4]} />
            <meshLambertMaterial
              color="#FFD700"
              emissive="#FFD700"
              emissiveIntensity={0.5}
              transparent
              opacity={0.7}
            />
          </mesh>
        )}

        {/* Hover text */}
        {isHovered && (
          <Text
            position={[0, 1.2, 0]}
            fontSize={0.2}
            color="white"
            anchorX="center"
            anchorY="middle"
          >
            {isOpen ? "Close Chest" : "Open Chest"}
          </Text>
        )}

        {/* Treasure text when open */}
        {isOpen && (
          <Text
            position={[0, 0.8, 0]}
            fontSize={0.15}
            color="#FFD700"
            anchorX="center"
            anchorY="middle"
          >
            {treasure}
          </Text>
        )}
      </group>
    </RigidBody>
  );
};

// Create breakable version using HOC
const BreakableChest = withOptionalBreaking(Chest, {
  breakingOptions: {
    fragmentCount: 8,
    fractureImpulse: 1.0,
    minSizeForFracture: 0.6,
    maxSizeForFracture: 1.3,
  },
});

export default BreakableChest;
