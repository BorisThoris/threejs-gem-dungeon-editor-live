import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { RigidBody } from "@react-three/rapier";
import * as THREE from "three";

export interface BrazierProps {
  position?: [number, number, number];
  color?: string;
  scale?: number;
  isLit?: boolean;
  flameColor?: string;
  intensity?: number;
}

const Brazier: React.FC<BrazierProps> = ({
  position = [0, 0, 0],
  color = "#8B4513",
  scale = 1,
  isLit = true,
  flameColor = "#ff6b35",
  intensity = 2,
}) => {
  const flameRef = useRef<THREE.Group>(null);
  const lightRef = useRef<THREE.PointLight>(null);

  useFrame((state) => {
    if (isLit && flameRef.current) {
      // Flickering flame animation
      const flicker = Math.sin(state.clock.elapsedTime * 8) * 0.1 + 0.9;
      flameRef.current.scale.setScalar(flicker);

      // Swaying motion
      const sway = Math.sin(state.clock.elapsedTime * 3) * 0.05;
      flameRef.current.rotation.z = sway;
    }

    if (isLit && lightRef.current) {
      // More realistic flickering light intensity
      const flickerIntensity =
        intensity +
        Math.sin(state.clock.elapsedTime * 12) * 0.4 +
        Math.sin(state.clock.elapsedTime * 19) * 0.3 +
        Math.sin(state.clock.elapsedTime * 6) * 0.2;
      lightRef.current.intensity = Math.max(0.1, flickerIntensity);
    }
  });

  return (
    <RigidBody position={position} scale={scale} type="fixed" colliders="hull">
      <group>
        {/* Brazier base */}
        <mesh position={[0, 0.3, 0]}>
          <cylinderGeometry args={[0.4, 0.5, 0.6, 12]} />
          <meshLambertMaterial color={color} />
        </mesh>

        {/* Brazier bowl */}
        <mesh position={[0, 0.8, 0]}>
          <cylinderGeometry args={[0.35, 0.4, 0.2, 12]} />
          <meshLambertMaterial color="#2C2C2C" />
        </mesh>

        {/* Brazier legs */}
        <mesh position={[-0.3, 0.15, -0.3]}>
          <cylinderGeometry args={[0.05, 0.05, 0.3, 8]} />
          <meshLambertMaterial color={color} />
        </mesh>
        <mesh position={[0.3, 0.15, -0.3]}>
          <cylinderGeometry args={[0.05, 0.05, 0.3, 8]} />
          <meshLambertMaterial color={color} />
        </mesh>
        <mesh position={[-0.3, 0.15, 0.3]}>
          <cylinderGeometry args={[0.05, 0.05, 0.3, 8]} />
          <meshLambertMaterial color={color} />
        </mesh>
        <mesh position={[0.3, 0.15, 0.3]}>
          <cylinderGeometry args={[0.05, 0.05, 0.3, 8]} />
          <meshLambertMaterial color={color} />
        </mesh>

        {/* Multi-layer flame for better glow */}
        {isLit && (
          <group ref={flameRef} position={[0, 1, 0]}>
            {/* Inner flame */}
            <mesh>
              <sphereGeometry args={[0.12, 8, 6]} />
              <meshLambertMaterial
                color="#ffaa00"
                emissive="#ffaa00"
                emissiveIntensity={0.9}
                transparent
                opacity={0.95}
              />
            </mesh>

            {/* Middle flame */}
            <mesh position={[0, 0.15, 0]}>
              <coneGeometry args={[0.08, 0.3, 6]} />
              <meshLambertMaterial
                color={flameColor}
                emissive={flameColor}
                emissiveIntensity={0.6}
                transparent
                opacity={0.8}
              />
            </mesh>

            {/* Outer flame */}
            <mesh position={[0, 0.25, 0]}>
              <coneGeometry args={[0.12, 0.4, 6]} />
              <meshLambertMaterial
                color="#ff6600"
                emissive="#ff6600"
                emissiveIntensity={0.4}
                transparent
                opacity={0.6}
              />
            </mesh>

            {/* Flame glow effect */}
            <mesh position={[0, 0.35, 0]}>
              <coneGeometry args={[0.15, 0.5, 6]} />
              <meshLambertMaterial color="#ff4400" transparent opacity={0.3} />
            </mesh>
          </group>
        )}

        {/* Point light for illumination */}
        {isLit && (
          <pointLight
            ref={lightRef}
            position={[0, 1, 0]}
            color={flameColor}
            intensity={intensity}
            distance={10}
            decay={2}
            castShadow
          />
        )}
      </group>
    </RigidBody>
  );
};

export default Brazier;
