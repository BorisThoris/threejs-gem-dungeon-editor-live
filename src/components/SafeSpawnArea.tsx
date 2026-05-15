import React from "react";
import { RigidBody } from "@react-three/rapier";
import { Text } from "@react-three/drei";

interface SafeSpawnAreaProps {
  position: [number, number, number];
  size?: number;
}

export function SafeSpawnArea({ position, size = 8 }: SafeSpawnAreaProps) {
  return (
    <group position={position}>
      {/* Safe spawn platform */}
      <RigidBody type="fixed" colliders="cuboid">
        <mesh position={[0, -0.5, 0]} receiveShadow>
          <boxGeometry args={[size, 1, size]} />
          <meshBasicMaterial color="#4a4a4a" transparent opacity={0.8} />
        </mesh>
      </RigidBody>

      {/* Spawn indicator */}
      <mesh position={[0, 0.1, 0]}>
        <cylinderGeometry args={[2, 2, 0.1, 8]} />
        <meshBasicMaterial color="#00ff00" transparent opacity={0.6} />
      </mesh>

      {/* Welcome text */}
      <Text
        position={[0, 2, 0]}
        fontSize={0.5}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.05}
        outlineColor="#000000"
      >
        Safe Spawn Area
      </Text>

      {/* Instructions */}
      <Text
        position={[0, 1.5, 0]}
        fontSize={0.3}
        color="#cccccc"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.03}
        outlineColor="#000000"
      >
        WASD to move, Mouse to look
      </Text>
    </group>
  );
}
