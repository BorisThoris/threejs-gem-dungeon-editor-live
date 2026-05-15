import React from "react";
import { Text } from "@react-three/drei";
import { RigidBody } from "@react-three/rapier";
import useGameStore from "../../../store/gameStore";
import { getBiomeScale } from "../../../utils/biomeScaling";

interface BarrierBiomeProps {
  size?: number;
  onOvercome?: () => void;
}

const BarrierBiome: React.FC<BarrierBiomeProps> = ({
  onOvercome,
  size = 10,
}) => {
  const playerDimensions = useGameStore(
    (state) => state.playerStats.dimensions
  );
  const scale = getBiomeScale(playerDimensions);
  const biomeSize = size;

  return (
    <group>
      {/* Main Barrier Wall */}
      <RigidBody type="fixed" position={[0, 1.5, 0]}>
        <mesh castShadow>
          <boxGeometry args={[8, 3, 0.5]} />
          <meshStandardMaterial color="#424242" />
        </mesh>
      </RigidBody>

      {/* Barrier Spikes */}
      {Array.from({ length: 8 }).map((_, i) => (
        <RigidBody key={i} type="fixed" position={[-3.5 + i, 2.5, 0]}>
          <mesh castShadow>
            <coneGeometry args={[0.2, 0.8, 4]} />
            <meshStandardMaterial color="#616161" />
          </mesh>
        </RigidBody>
      ))}

      {/* Side Barriers */}
      <RigidBody type="fixed" position={[-4, 1, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.5, 2, 2]} />
          <meshStandardMaterial color="#424242" />
        </mesh>
      </RigidBody>

      <RigidBody type="fixed" position={[4, 1, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.5, 2, 2]} />
          <meshStandardMaterial color="#424242" />
        </mesh>
      </RigidBody>

      {/* Gate Opening */}
      <group position={[0, 0.5, 0]}>
        <mesh castShadow>
          <boxGeometry args={[2, 1, 0.1]} />
          <meshStandardMaterial color="#8D6E63" />
        </mesh>
      </group>

      {/* Warning Signs */}
      <group position={[-2, 2.5, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.8, 0.6, 0.1]} />
          <meshStandardMaterial color="#F44336" />
        </mesh>
        <Text
          position={[0, 0, 0.1]}
          fontSize={0.2}
          color="white"
          anchorX="center"
          anchorY="middle"
        >
          ⚠️
        </Text>
      </group>

      <group position={[2, 2.5, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.8, 0.6, 0.1]} />
          <meshStandardMaterial color="#F44336" />
        </mesh>
        <Text
          position={[0, 0, 0.1]}
          fontSize={0.2}
          color="white"
          anchorX="center"
          anchorY="middle"
        >
          ⚠️
        </Text>
      </group>

      {/* Floor */}
      <RigidBody type="fixed" position={[0, -0.5, 0]}>
        <mesh receiveShadow>
          <boxGeometry args={[10, 1, 6]} />
          <meshStandardMaterial color="#5D4037" />
        </mesh>
      </RigidBody>

      {/* Barrier Title */}
      <Text
        position={[0, 4.5, 0]}
        fontSize={0.8}
        color="white"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.05}
        outlineColor="#000000"
      >
        🚧 BARRIER BIOME 🚧
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
        Find a way through the barrier
      </Text>
    </group>
  );
};

export default BarrierBiome;
