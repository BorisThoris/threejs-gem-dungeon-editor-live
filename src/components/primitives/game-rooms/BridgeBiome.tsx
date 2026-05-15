import React from "react";
import { Text } from "@react-three/drei";
import { RigidBody } from "@react-three/rapier";
import useGameStore from "../../../store/gameStore";
import {
  getBridgeDimensions,
  getBiomeScale,
} from "../../../utils/biomeScaling";

interface BridgeBiomeProps {
  size?: number;
  onCross?: () => void;
}

const BridgeBiome: React.FC<BridgeBiomeProps> = ({ size = 20, onCross }) => {
  const playerDimensions = useGameStore(
    (state) => state.playerStats.dimensions
  );

  const bridge = getBridgeDimensions(size, playerDimensions);
  const scale = getBiomeScale(playerDimensions);

  const bridgeLength = bridge.length;
  const bridgeWidth = bridge.width;
  const railHeight = bridge.railHeight;
  const numSupports = Math.floor(bridgeLength / 2);

  return (
    <group>
      {/* Bridge Deck */}
      <RigidBody type="fixed" position={[0, 0.1, 0]}>
        <mesh castShadow>
          <boxGeometry args={[bridgeLength, 0.2, bridgeWidth]} />
          <meshStandardMaterial color="#8D6E63" />
        </mesh>
      </RigidBody>

      {/* Bridge Supports */}
      {Array.from({ length: numSupports }).map((_, i) => {
        const x =
          -bridgeLength / 2 + (i + 1) * (bridgeLength / (numSupports + 1));
        return (
          <RigidBody key={i} type="fixed" position={[x, 0.5, 0]}>
            <mesh castShadow>
              <boxGeometry args={[0.3, 1, 0.3]} />
              <meshStandardMaterial color="#5D4037" />
            </mesh>
          </RigidBody>
        );
      })}

      {/* Bridge Railings */}
      <RigidBody type="fixed" position={[0, railHeight / 2, bridgeWidth / 2]}>
        <mesh castShadow>
          <boxGeometry args={[bridgeLength, railHeight, 0.1]} />
          <meshStandardMaterial color="#8D6E63" />
        </mesh>
      </RigidBody>

      <RigidBody type="fixed" position={[0, railHeight / 2, -bridgeWidth / 2]}>
        <mesh castShadow>
          <boxGeometry args={[bridgeLength, railHeight, 0.1]} />
          <meshStandardMaterial color="#8D6E63" />
        </mesh>
      </RigidBody>

      {/* Railing Posts */}
      {Array.from({ length: numSupports + 2 }).map((_, i) => {
        const x = -bridgeLength / 2 + i * (bridgeLength / (numSupports + 1));
        return (
          <group key={i}>
            <RigidBody
              type="fixed"
              position={[x, railHeight / 2, bridgeWidth / 2]}
            >
              <mesh castShadow>
                <cylinderGeometry args={[0.08, 0.08, railHeight]} />
                <meshStandardMaterial color="#8D6E63" />
              </mesh>
            </RigidBody>
            <RigidBody
              type="fixed"
              position={[x, railHeight / 2, -bridgeWidth / 2]}
            >
              <mesh castShadow>
                <cylinderGeometry args={[0.08, 0.08, railHeight]} />
                <meshStandardMaterial color="#8D6E63" />
              </mesh>
            </RigidBody>
          </group>
        );
      })}

      {/* Water/Gap Below */}
      <mesh position={[0, -1, 0]}>
        <boxGeometry args={[bridgeLength + 4, 1, bridgeWidth + 4]} />
        <meshStandardMaterial color="#2196F3" transparent opacity={0.7} />
      </mesh>

      {/* Bridge Foundations */}
      <RigidBody type="fixed" position={[-bridgeLength / 2, -0.5, 0]}>
        <mesh castShadow>
          <boxGeometry args={[2, 1, bridgeWidth + 2]} />
          <meshStandardMaterial color="#5D4037" />
        </mesh>
      </RigidBody>

      <RigidBody type="fixed" position={[bridgeLength / 2, -0.5, 0]}>
        <mesh castShadow>
          <boxGeometry args={[2, 1, bridgeWidth + 2]} />
          <meshStandardMaterial color="#5D4037" />
        </mesh>
      </RigidBody>

      {/* Bridge Title */}
      <Text
        position={[0, 3, 0]}
        fontSize={0.8}
        color="white"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.05}
        outlineColor="#000000"
      >
        🌉 BRIDGE BIOME 🌉
      </Text>

      {/* Instructions */}
      <Text
        position={[0, 2.3, 0]}
        fontSize={0.4}
        color="white"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.03}
        outlineColor="#000000"
      >
        Cross the bridge to continue your journey
      </Text>
    </group>
  );
};

export default BridgeBiome;
