import React from "react";
import { Text } from "@react-three/drei";
import { RigidBody } from "@react-three/rapier";
import useGameStore from "../../../store/gameStore";
import { getBiomeScale } from "../../../utils/biomeScaling";

interface ArchBiomeProps {
  size?: number;
  onPassThrough?: () => void;
}

const ArchBiome: React.FC<ArchBiomeProps> = ({ onPassThrough, size = 10 }) => {
  const playerDimensions = useGameStore(
    (state) => state.playerStats.dimensions
  );
  const scale = getBiomeScale(playerDimensions);
  const biomeSize = size;

  return (
    <group>
      {/* Arch Structure */}
      <group position={[0, 0, 0]}>
        {/* Left Pillar */}
        <RigidBody type="fixed" position={[-biomeSize * 0.2, 1.5, 0]}>
          <mesh castShadow>
            <boxGeometry args={[0.8, 3, 0.8]} />
            <meshStandardMaterial color="#8D6E63" />
          </mesh>
        </RigidBody>

        {/* Right Pillar */}
        <RigidBody type="fixed" position={[biomeSize * 0.2, 1.5, 0]}>
          <mesh castShadow>
            <boxGeometry args={[0.8, 3, 0.8]} />
            <meshStandardMaterial color="#8D6E63" />
          </mesh>
        </RigidBody>

        {/* Arch Top */}
        <RigidBody type="fixed" position={[0, 3.2, 0]}>
          <mesh castShadow>
            <boxGeometry args={[biomeSize * 0.5, 0.6, 0.8]} />
            <meshStandardMaterial color="#8D6E63" />
          </mesh>
        </RigidBody>

        {/* Arch Curve */}
        <mesh position={[0, 2.8, 0]} castShadow>
          <cylinderGeometry
            args={[
              biomeSize * 0.25,
              biomeSize * 0.25,
              0.8,
              16,
              1,
              false,
              0,
              Math.PI,
            ]}
          />
          <meshStandardMaterial color="#8D6E63" />
        </mesh>
      </group>

      {/* Decorative Elements */}
      <group position={[0, 1, 0]}>
        {/* Left Decorative Column */}
        <mesh position={[-biomeSize * 0.3, 0, 0]} castShadow>
          <cylinderGeometry args={[0.2, 0.2, 2]} />
          <meshStandardMaterial color="#A1887F" />
        </mesh>

        {/* Right Decorative Column */}
        <mesh position={[biomeSize * 0.3, 0, 0]} castShadow>
          <cylinderGeometry args={[0.2, 0.2, 2]} />
          <meshStandardMaterial color="#A1887F" />
        </mesh>
      </group>

      {/* Base Platform */}
      <RigidBody type="fixed" position={[0, -0.5, 0]}>
        <mesh receiveShadow>
          <boxGeometry args={[biomeSize * 0.8, 1, biomeSize * 0.4]} />
          <meshStandardMaterial color="#5D4037" />
        </mesh>
      </RigidBody>

      {/* Arch Title */}
      <Text
        position={[0, 4.5, 0]}
        fontSize={0.8}
        color="white"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.05}
        outlineColor="#000000"
      >
        🏛️ ARCH BIOME 🏛️
      </Text>

      {/* Instructions */}
      <Text
        position={[0, 3.8, 0]}
        fontSize={0.4}
        color="white"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.03}
        outlineColor="#000000"
      >
        Pass through the arch to continue your journey
      </Text>
    </group>
  );
};

export default ArchBiome;
