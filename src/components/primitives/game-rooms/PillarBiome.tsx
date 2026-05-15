import React from "react";
import { Text } from "@react-three/drei";
import { RigidBody } from "@react-three/rapier";
import useGameStore from "../../../store/gameStore";
import { getBiomeScale } from "../../../utils/biomeScaling";

interface PillarBiomeProps {
  size?: number;
  onNavigate?: () => void;
}

const PillarBiome: React.FC<PillarBiomeProps> = ({ onNavigate, size = 10 }) => {
  const playerDimensions = useGameStore(
    (state) => state.playerStats.dimensions
  );
  const scale = getBiomeScale(playerDimensions);
  const biomeSize = size;

  return (
    <group>
      {/* Central Pillar */}
      <RigidBody type="fixed" position={[0, 2, 0]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.8, 0.8, 4]} />
          <meshStandardMaterial color="#8D6E63" />
        </mesh>
      </RigidBody>

      {/* Pillar Cap */}
      <RigidBody type="fixed" position={[0, 4.2, 0]}>
        <mesh castShadow>
          <cylinderGeometry args={[1.2, 1.2, 0.4]} />
          <meshStandardMaterial color="#A1887F" />
        </mesh>
      </RigidBody>

      {/* Supporting Pillars */}
      {Array.from({ length: 4 }).map((_, i) => {
        const angle = (i / 4) * Math.PI * 2;
        const radius = biomeSize * 0.3;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;

        return (
          <group key={i} position={[x, 0, z]}>
            <RigidBody type="fixed" position={[0, 1.5, 0]}>
              <mesh castShadow>
                <cylinderGeometry args={[0.4, 0.4, 3]} />
                <meshStandardMaterial color="#8D6E63" />
              </mesh>
            </RigidBody>

            {/* Pillar Base */}
            <RigidBody type="fixed" position={[0, 0.2, 0]}>
              <mesh castShadow>
                <cylinderGeometry args={[0.6, 0.6, 0.4]} />
                <meshStandardMaterial color="#A1887F" />
              </mesh>
            </RigidBody>
          </group>
        );
      })}

      {/* Floor Platform */}
      <RigidBody type="fixed" position={[0, -0.5, 0]}>
        <mesh receiveShadow>
          <cylinderGeometry args={[5, 5, 1]} />
          <meshStandardMaterial color="#5D4037" />
        </mesh>
      </RigidBody>

      {/* Decorative Ring */}
      <mesh position={[0, 1, 0]} castShadow>
        <torusGeometry args={[2.5, 0.2, 8, 16]} />
        <meshStandardMaterial color="#A1887F" />
      </mesh>

      {/* Pillar Title */}
      <Text
        position={[0, 5.5, 0]}
        fontSize={0.8}
        color="white"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.05}
        outlineColor="#000000"
      >
        🏛️ PILLAR BIOME 🏛️
      </Text>

      {/* Instructions */}
      <Text
        position={[0, 4.8, 0]}
        fontSize={0.4}
        color="white"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.03}
        outlineColor="#000000"
      >
        Navigate around the pillars to continue
      </Text>
    </group>
  );
};

export default PillarBiome;
