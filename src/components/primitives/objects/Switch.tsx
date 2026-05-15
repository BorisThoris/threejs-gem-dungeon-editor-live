import React, { useState, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { RigidBody } from "@react-three/rapier";
import { Text } from "@react-three/drei";
import * as THREE from "three";

export interface SwitchProps {
  position?: [number, number, number];
  color?: string;
  scale?: number;
  isOn?: boolean;
  onToggle?: (isOn: boolean) => void;
  label?: string;
  switchType?: "toggle" | "momentary" | "rotary";
}

const Switch: React.FC<SwitchProps> = ({
  position = [0, 0, 0],
  color = "#8B4513",
  scale = 1,
  isOn = false,
  onToggle,
  label = "Switch",
  switchType = "toggle",
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const switchRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (switchRef.current && switchType === "rotary") {
      // Rotary switch animation
      const rotation = isOn ? Math.PI / 4 : 0;
      switchRef.current.rotation.z = rotation;
    }
  });

  const handleClick = () => {
    if (onToggle) {
      onToggle(!isOn);
    }
  };

  return (
    <RigidBody position={position} scale={scale} type="fixed" colliders="hull">
      <group
        onClick={handleClick}
        onPointerOver={() => setIsHovered(true)}
        onPointerOut={() => setIsHovered(false)}
      >
        {/* Switch base */}
        <mesh position={[0, 0.1, 0]}>
          <boxGeometry args={[0.4, 0.2, 0.2]} />
          <meshLambertMaterial color="#2C2C2C" />
        </mesh>

        {/* Switch mechanism */}
        {switchType === "toggle" && (
          <mesh
            position={[0, 0.25, 0]}
            rotation={[isOn ? Math.PI / 6 : -Math.PI / 6, 0, 0]}
          >
            <boxGeometry args={[0.1, 0.3, 0.05]} />
            <meshLambertMaterial color={color} />
          </mesh>
        )}

        {switchType === "momentary" && (
          <mesh position={[0, isOn ? 0.2 : 0.25, 0]}>
            <cylinderGeometry args={[0.08, 0.08, 0.1, 8]} />
            <meshLambertMaterial color={isOn ? "#00FF00" : color} />
          </mesh>
        )}

        {switchType === "rotary" && (
          <group ref={switchRef}>
            <mesh position={[0, 0.25, 0]}>
              <cylinderGeometry args={[0.1, 0.1, 0.1, 8]} />
              <meshLambertMaterial color={color} />
            </mesh>
            <mesh position={[0.15, 0.25, 0]}>
              <boxGeometry args={[0.1, 0.02, 0.02]} />
              <meshLambertMaterial color={color} />
            </mesh>
          </group>
        )}

        {/* Status indicator */}
        <mesh position={[0, 0.05, 0]}>
          <boxGeometry args={[0.35, 0.05, 0.15]} />
          <meshLambertMaterial
            color={isOn ? "#00FF00" : "#FF0000"}
            emissive={isOn ? "#00FF00" : "#FF0000"}
            emissiveIntensity={0.3}
          />
        </mesh>

        {/* Hover text */}
        {isHovered && (
          <Text
            position={[0, 0.6, 0]}
            fontSize={0.15}
            color="white"
            anchorX="center"
            anchorY="middle"
          >
            {label} - {isOn ? "ON" : "OFF"}
          </Text>
        )}
      </group>
    </RigidBody>
  );
};

export default Switch;
