import React from "react";
import { Text } from "@react-three/drei";

interface EndBiomeProps {
  onVictory?: () => void;
}

const EndBiome: React.FC<EndBiomeProps> = ({ onVictory }) => {
  return (
    <group>
      <mesh position={[0, -0.5, 0]} receiveShadow>
        <boxGeometry args={[8, 1, 8]} />
        <meshStandardMaterial color="#F44336" />
      </mesh>

      {/* Victory Platform */}
      <group position={[0, 0, 0]}>
        <mesh position={[0, 0.1, 0]} castShadow>
          <cylinderGeometry args={[4, 4, 0.2]} />
          <meshStandardMaterial color="#EF5350" />
        </mesh>
      </group>

      {/* Victory Trophy */}
      <group position={[0, 1.5, 0]}>
        <mesh position={[0, 0, 0]} castShadow>
          <boxGeometry args={[0.5, 1.5, 0.5]} />
          <meshStandardMaterial color="#FFD700" />
        </mesh>
        <mesh position={[0, 1, 0]} castShadow>
          <sphereGeometry args={[0.3]} />
          <meshStandardMaterial color="#FFD700" />
        </mesh>
      </group>

      {/* Victory Glow */}
      <pointLight
        position={[0, 2, 0]}
        color="#FFD700"
        intensity={1.5}
        distance={8}
      />

      {/* Victory Text */}
      <Text
        position={[0, 4, 0]}
        fontSize={1.0}
        color="white"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.05}
        outlineColor="#000000"
      >
        🏆 VICTORY ROOM 🏆
      </Text>

      {/* Instructions */}
      <Text
        position={[0, 3.2, 0]}
        fontSize={0.5}
        color="white"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.03}
        outlineColor="#000000"
      >
        Congratulations! You've completed your journey!
      </Text>
    </group>
  );
};

export default EndBiome;
