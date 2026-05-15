import React from "react";
import { Text } from "@react-three/drei";
import { RigidBody } from "@react-three/rapier";
import useGameStore from "../../../store/gameStore";
import { getBiomeScale } from "../../../utils/biomeScaling";

interface StatueBiomeProps {
  size?: number;
  onInteract?: () => void;
}

const StatueBiome: React.FC<StatueBiomeProps> = ({ onInteract, size = 10 }) => {
  const playerDimensions = useGameStore(
    (state) => state.playerStats.dimensions
  );
  const scale = getBiomeScale(playerDimensions);
  const biomeSize = size;

  return (
    <group>
      {/* Central Statue */}
      <group position={[0, 0, 0]}>
        {/* Statue Base */}
        <RigidBody type="fixed" position={[0, 0.3, 0]}>
          <mesh castShadow>
            <cylinderGeometry args={[1.5, 1.5, 0.6]} />
            <meshStandardMaterial color="#8D6E63" />
          </mesh>
        </RigidBody>

        {/* Statue Body */}
        <RigidBody type="fixed" position={[0, 1.5, 0]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.8, 0.6, 2]} />
            <meshStandardMaterial color="#E0E0E0" />
          </mesh>
        </RigidBody>

        {/* Statue Head */}
        <RigidBody type="fixed" position={[0, 2.8, 0]}>
          <mesh castShadow>
            <sphereGeometry args={[0.4]} />
            <meshStandardMaterial color="#E0E0E0" />
          </mesh>
        </RigidBody>

        {/* Statue Arms */}
        <RigidBody type="fixed" position={[-0.6, 2.2, 0]}>
          <mesh castShadow>
            <boxGeometry args={[0.3, 0.3, 1.2]} />
            <meshStandardMaterial color="#E0E0E0" />
          </mesh>
        </RigidBody>

        <RigidBody type="fixed" position={[0.6, 2.2, 0]}>
          <mesh castShadow>
            <boxGeometry args={[0.3, 0.3, 1.2]} />
            <meshStandardMaterial color="#E0E0E0" />
          </mesh>
        </RigidBody>
      </group>

      {/* Surrounding Pillars */}
      {Array.from({ length: 6 }).map((_, i) => {
        const angle = (i / 6) * Math.PI * 2;
        const radius = 3;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;

        return (
          <group key={i} position={[x, 0, z]}>
            <RigidBody type="fixed" position={[0, 1, 0]}>
              <mesh castShadow>
                <cylinderGeometry args={[0.3, 0.3, 2]} />
                <meshStandardMaterial color="#A1887F" />
              </mesh>
            </RigidBody>

            {/* Pillar Cap */}
            <RigidBody type="fixed" position={[0, 2.2, 0]}>
              <mesh castShadow>
                <cylinderGeometry args={[0.4, 0.4, 0.2]} />
                <meshStandardMaterial color="#8D6E63" />
              </mesh>
            </RigidBody>
          </group>
        );
      })}

      {/* Pedestal Platform */}
      <RigidBody type="fixed" position={[0, -0.5, 0]}>
        <mesh receiveShadow>
          <cylinderGeometry args={[5, 5, 1]} />
          <meshStandardMaterial color="#5D4037" />
        </mesh>
      </RigidBody>

      {/* Decorative Ring */}
      <mesh position={[0, 0.1, 0]} castShadow>
        <torusGeometry args={[3.5, 0.3, 8, 16]} />
        <meshStandardMaterial color="#A1887F" />
      </mesh>

      {/* Magical Aura */}
      <pointLight
        position={[0, 3, 0]}
        color="#E3F2FD"
        intensity={0.8}
        distance={6}
      />

      {/* Statue Title */}
      <Text
        position={[0, 4.5, 0]}
        fontSize={0.8}
        color="white"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.05}
        outlineColor="#000000"
      >
        🗿 STATUE BIOME 🗿
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
        Approach the ancient statue with reverence
      </Text>
    </group>
  );
};

export default StatueBiome;
