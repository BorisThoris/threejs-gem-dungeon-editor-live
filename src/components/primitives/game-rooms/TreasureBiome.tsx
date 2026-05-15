import React, { useState, useRef } from "react";
import { Text } from "@react-three/drei";
import { RigidBody } from "@react-three/rapier";
import { useFrame } from "@react-three/fiber";
import useGameStore from "../../../store/gameStore";
import { getBiomeScale } from "../../../utils/biomeScaling";
import RoomActionCards from "../../RoomActionCards";
import { useRoomActions } from "../../../hooks/useRoomActions";

interface TreasureBiomeProps {
  size?: number;
  onTreasureOpen?: () => void;
}

const TreasureBiome: React.FC<TreasureBiomeProps> = ({
  onTreasureOpen,
  size = 10,
}) => {
  const playerDimensions = useGameStore(
    (state) => state.playerStats.dimensions
  );
  const scale = getBiomeScale(playerDimensions);
  const biomeSize = size;
  const [treasureOpened, setTreasureOpened] = useState(false);

  // Refs for animated elements
  const chestRef = useRef<THREE.Mesh>(null);
  const coinsRefs = useRef<THREE.Mesh[]>([]);

  const { cards, isVisible, showCards, hideCards } = useRoomActions({
    roomType: "treasure",
    onTreasureOpen: () => {
      setTreasureOpened(true);
      onTreasureOpen?.();
    },
  });

  // Animation frame for glowing effects
  useFrame((state) => {
    const time = state.clock.getElapsedTime();

    // Animate coins floating and glowing
    coinsRefs.current.forEach((coinRef, index) => {
      if (coinRef) {
        const floatOffset = Math.sin(time * 2 + index) * 0.1;
        coinRef.position.y = 0.1 + floatOffset;

        // Pulsing glow
        const glowIntensity = Math.sin(time * 3 + index) * 0.2 + 0.5;
        coinRef.material.emissiveIntensity = glowIntensity;
      }
    });

    // Chest glow animation
    if (chestRef.current && treasureOpened) {
      const pulseIntensity = Math.sin(time * 2) * 0.3 + 0.7;
      chestRef.current.material.emissiveIntensity = pulseIntensity;
    }
  });

  return (
    <group>
      {/* Floor */}
      <RigidBody type="fixed" position={[0, -0.5, 0]}>
        <mesh receiveShadow>
          <boxGeometry args={[biomeSize, 1, biomeSize]} />
          <meshStandardMaterial color="#4a4a4a" />
        </mesh>
      </RigidBody>

      {/* Treasure Chest */}
      <group position={[0, 0, 0]}>
        <mesh position={[0, 0.3, 0]} castShadow>
          <boxGeometry args={[2, 0.6, 1.5]} />
          <meshStandardMaterial color="#8B4513" />
        </mesh>

        {/* Chest Lid */}
        <mesh
          position={[0, 0.6, 0]}
          castShadow
          rotation={treasureOpened ? [0, 0, Math.PI * 0.3] : [0, 0, 0]}
        >
          <boxGeometry args={[2, 0.1, 1.5]} />
          <meshStandardMaterial color="#654321" />
        </mesh>

        {/* Chest */}
        <mesh ref={chestRef} position={[0, 0.3, 0]}>
          <boxGeometry args={[2.2, 0.8, 1.7]} />
          <meshStandardMaterial
            color={treasureOpened ? "#4CAF50" : "#8B4513"}
            emissive={treasureOpened ? "#4CAF50" : "#FFD700"}
            emissiveIntensity={treasureOpened ? 0.5 : 0.1}
            transparent
            opacity={0.3}
          />
        </mesh>

        {/* Magical aura around chest */}
        <mesh position={[0, 0.3, 0]}>
          <boxGeometry args={[2.5, 1, 2]} />
          <meshStandardMaterial
            color="#FFD700"
            transparent
            opacity={0.1}
            emissive="#FFD700"
            emissiveIntensity={0.3}
          />
        </mesh>
      </group>

      {/* Treasure Glow */}
      {treasureOpened && (
        <pointLight
          position={[0, 1, 0]}
          color="#FFD700"
          intensity={1}
          distance={5}
        />
      )}

      {/* Treasure Pile */}
      <group position={[0, 0.1, 0]}>
        {Array.from({ length: 12 }).map((_, i) => {
          const angle = (i / 12) * Math.PI * 2;
          const radius = 1.5 + Math.random() * 1;
          const x = Math.cos(angle) * radius;
          const z = Math.sin(angle) * radius;

          return (
            <mesh
              key={i}
              ref={(el) => {
                if (el) coinsRefs.current[i] = el;
              }}
              position={[x, 0.1, z]}
              castShadow
            >
              <boxGeometry args={[0.15, 0.15, 0.15]} />
              <meshStandardMaterial
                color="#FFD700"
                emissive="#FFD700"
                emissiveIntensity={0.4}
              />
            </mesh>
          );
        })}

        {/* Magical gems */}
        {Array.from({ length: 6 }).map((_, i) => {
          const angle = (i / 6) * Math.PI * 2;
          const radius = 2.5;
          const x = Math.cos(angle) * radius;
          const z = Math.sin(angle) * radius;

          return (
            <mesh key={`gem-${i}`} position={[x, 0.2, z]} castShadow>
              <octahedronGeometry args={[0.1]} />
              <meshStandardMaterial
                color={i % 2 === 0 ? "#FF00FF" : "#00FFFF"}
                emissive={i % 2 === 0 ? "#FF00FF" : "#00FFFF"}
                emissiveIntensity={0.6}
              />
            </mesh>
          );
        })}
      </group>

      {/* Room Title */}
      <Text
        position={[0, 3, 0]}
        fontSize={0.8}
        color="white"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.05}
        outlineColor="#000000"
      >
        💎 TREASURE ROOM 💎
      </Text>

      {/* Instructions */}
      <Text
        position={[0, 2.2, 0]}
        fontSize={0.4}
        color="white"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.03}
        outlineColor="#000000"
      >
        {treasureOpened
          ? "Treasure claimed!"
          : "Use action cards below to open it!"}
      </Text>

      {/* Treasure Info */}
      <Text
        position={[0, 1.8, 0]}
        fontSize={0.3}
        color="#00ff00"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.02}
        outlineColor="#000000"
      >
        {treasureOpened ? "Rich rewards await!" : "Valuable treasures inside!"}
      </Text>

      {/* Action Cards */}
      <RoomActionCards
        cards={cards}
        isVisible={isVisible}
        onCardClick={(card) => {
          if (card.id === "open_chest") {
            setTreasureOpened(true);
            hideCards();
          }
        }}
      />
    </group>
  );
};

export default TreasureBiome;
