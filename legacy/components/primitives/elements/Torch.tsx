import React from "react";
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export interface TorchProps {
  position?: [number, number, number];
  color?: string;
  intensity?: number;
  flicker?: boolean;
  scale?: number;
}

const Torch: React.FC<TorchProps> = ({
  position = [0, 0, 0],
  color = "#ff6b35",
  intensity = 2,
  flicker = true,
  scale = 1,
}) => {
  const torchRef = useRef<THREE.Group>(null);
  const lightRef = useRef<THREE.PointLight>(null);

  useFrame((state) => {
    if (flicker && lightRef.current) {
      // More realistic flickering effect
      const flickerIntensity =
        intensity +
        Math.sin(state.clock.elapsedTime * 15) * 0.3 +
        Math.sin(state.clock.elapsedTime * 23) * 0.2 +
        Math.sin(state.clock.elapsedTime * 7) * 0.1;
      lightRef.current.intensity = Math.max(0.1, flickerIntensity);
    }
  });

  return (
    <group ref={torchRef} position={position} scale={scale}>
      {/* Torch pole */}
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 1, 8]} />
        <meshLambertMaterial color="#8B4513" />
      </mesh>

      {/* Torch head */}
      <mesh position={[0, 1.1, 0]}>
        <sphereGeometry args={[0.15, 8, 6]} />
        <meshLambertMaterial
          color="#ff6b35"
          emissive="#ff4500"
          emissiveIntensity={0.3}
        />
      </mesh>

      {/* Multi-layer flame for better glow */}
      <mesh position={[0, 1.3, 0]}>
        <coneGeometry args={[0.08, 0.25, 6]} />
        <meshLambertMaterial
          color="#ffaa00"
          emissive="#ffaa00"
          emissiveIntensity={0.8}
          transparent
          opacity={0.9}
        />
      </mesh>

      <mesh position={[0, 1.35, 0]}>
        <coneGeometry args={[0.12, 0.3, 6]} />
        <meshLambertMaterial
          color="#ff6600"
          emissive="#ff6600"
          emissiveIntensity={0.4}
          transparent
          opacity={0.6}
        />
      </mesh>

      <mesh position={[0, 1.4, 0]}>
        <coneGeometry args={[0.15, 0.4, 6]} />
        <meshLambertMaterial color="#ff4400" transparent opacity={0.3} />
      </mesh>

      {/* Point light for illumination */}
      <pointLight
        ref={lightRef}
        position={[0, 1.2, 0]}
        color={color}
        intensity={intensity}
        distance={8}
        decay={2}
        castShadow
      />
    </group>
  );
};

export default Torch;
