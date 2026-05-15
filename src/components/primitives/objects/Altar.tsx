import React, { useState, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { RigidBody } from "@react-three/rapier";
import { Text } from "@react-three/drei";
import * as THREE from "three";

export interface AltarProps {
  position?: [number, number, number];
  color?: string;
  scale?: number;
  isActivated?: boolean;
  onActivate?: () => void;
  offering?: string;
  glowColor?: string;
}

const Altar: React.FC<AltarProps> = ({
  position = [0, 0, 0],
  color = "#2C2C2C",
  scale = 1,
  isActivated = false,
  onActivate,
  offering = "Soul",
  glowColor = "#8A2BE2",
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const glowRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (glowRef.current && isActivated) {
      // Pulsing glow effect
      const pulse = Math.sin(state.clock.elapsedTime * 3) * 0.1 + 0.9;
      glowRef.current.scale.setScalar(pulse);
    }
  });

  const handleClick = () => {
    if (onActivate) {
      onActivate();
    }
  };

  return (
    <RigidBody position={position} scale={scale} type="fixed" colliders="hull">
      <group
        onClick={handleClick}
        onPointerOver={() => setIsHovered(true)}
        onPointerOut={() => setIsHovered(false)}
      >
        {/* Altar base */}
        <mesh position={[0, 0.3, 0]}>
          <boxGeometry args={[1.2, 0.6, 0.8]} />
          <meshLambertMaterial color={color} />
        </mesh>

        {/* Altar top */}
        <mesh position={[0, 0.8, 0]}>
          <boxGeometry args={[1.4, 0.1, 1]} />
          <meshLambertMaterial color="#1A1A1A" />
        </mesh>

        {/* Altar pillars */}
        <mesh position={[-0.5, 1.1, -0.3]}>
          <cylinderGeometry args={[0.05, 0.05, 0.6, 8]} />
          <meshLambertMaterial color="#654321" />
        </mesh>
        <mesh position={[0.5, 1.1, -0.3]}>
          <cylinderGeometry args={[0.05, 0.05, 0.6, 8]} />
          <meshLambertMaterial color="#654321" />
        </mesh>
        <mesh position={[-0.5, 1.1, 0.3]}>
          <cylinderGeometry args={[0.05, 0.05, 0.6, 8]} />
          <meshLambertMaterial color="#654321" />
        </mesh>
        <mesh position={[0.5, 1.1, 0.3]}>
          <cylinderGeometry args={[0.05, 0.05, 0.6, 8]} />
          <meshLambertMaterial color="#654321" />
        </mesh>

        {/* Offering bowl */}
        <mesh position={[0, 0.9, 0]}>
          <cylinderGeometry args={[0.3, 0.4, 0.2, 12]} />
          <meshLambertMaterial color="#1A1A1A" />
        </mesh>

        {/* Glow effect */}
        <group ref={glowRef}>
          <mesh position={[0, 0.9, 0]}>
            <cylinderGeometry args={[0.35, 0.45, 0.25, 12]} />
            <meshLambertMaterial
              color={glowColor}
              emissive={glowColor}
              emissiveIntensity={isActivated ? 0.8 : 0.2}
              transparent
              opacity={0.6}
            />
          </mesh>
        </group>

        {/* Runes on altar */}
        <Text
          position={[0, 0.95, 0]}
          fontSize={0.1}
          color={isActivated ? glowColor : "#666666"}
          anchorX="center"
          anchorY="middle"
          rotation={[Math.PI / 2, 0, 0]}
        >
          ⚡⚡⚡
        </Text>

        {/* Hover text */}
        {isHovered && (
          <Text
            position={[0, 1.8, 0]}
            fontSize={0.2}
            color="white"
            anchorX="center"
            anchorY="middle"
          >
            {isActivated ? "Altar Activated" : `Offer ${offering}`}
          </Text>
        )}
      </group>
    </RigidBody>
  );
};

export default Altar;
