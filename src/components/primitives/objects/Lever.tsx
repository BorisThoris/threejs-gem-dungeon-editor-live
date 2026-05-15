import React, { useState, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { RigidBody } from "@react-three/rapier";
import { Text } from "@react-three/drei";
import * as THREE from "three";

export interface LeverProps {
  position?: [number, number, number];
  color?: string;
  scale?: number;
  isActivated?: boolean;
  onToggle?: (activated: boolean) => void;
  label?: string;
}

const Lever: React.FC<LeverProps> = ({
  position = [0, 0, 0],
  color = "#8B4513",
  scale = 1,
  isActivated = false,
  onToggle,
  label = "Lever",
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const leverRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (leverRef.current) {
      // Slight swaying animation
      const sway = Math.sin(state.clock.elapsedTime * 2) * 0.02;
      leverRef.current.rotation.z = sway;
    }
  });

  const handleClick = () => {
    if (onToggle) {
      onToggle(!isActivated);
    }
  };

  return (
    <RigidBody position={position} scale={scale} type="fixed" colliders="hull">
      <group
        onClick={handleClick}
        onPointerOver={() => setIsHovered(true)}
        onPointerOut={() => setIsHovered(false)}
      >
        {/* Lever base */}
        <mesh position={[0, 0.1, 0]}>
          <cylinderGeometry args={[0.1, 0.1, 0.2, 8]} />
          <meshLambertMaterial color="#654321" />
        </mesh>

        {/* Lever handle */}
        <group
          ref={leverRef}
          position={[0, 0.3, 0]}
          rotation={[isActivated ? Math.PI / 4 : -Math.PI / 4, 0, 0]}
        >
          <mesh position={[0, 0.2, 0]}>
            <cylinderGeometry args={[0.02, 0.02, 0.4, 8]} />
            <meshLambertMaterial color={color} />
          </mesh>

          {/* Lever grip */}
          <mesh position={[0, 0.4, 0]}>
            <sphereGeometry args={[0.05, 8, 6]} />
            <meshLambertMaterial color={isActivated ? "#00FF00" : "#C0C0C0"} />
          </mesh>
        </group>

        {/* Activation indicator */}
        <mesh position={[0, 0.05, 0]}>
          <cylinderGeometry args={[0.12, 0.12, 0.05, 8]} />
          <meshLambertMaterial
            color={isActivated ? "#00FF00" : "#FF0000"}
            emissive={isActivated ? "#00FF00" : "#FF0000"}
            emissiveIntensity={0.3}
          />
        </mesh>

        {/* Hover text */}
        {isHovered && (
          <Text
            position={[0, 0.8, 0]}
            fontSize={0.15}
            color="white"
            anchorX="center"
            anchorY="middle"
          >
            {label} - {isActivated ? "ON" : "OFF"}
          </Text>
        )}
      </group>
    </RigidBody>
  );
};

export default Lever;
