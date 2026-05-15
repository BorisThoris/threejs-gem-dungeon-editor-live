import React, { useState } from "react";
import { Text } from "@react-three/drei";
import { RigidBody } from "@react-three/rapier";
import useGameStore from "../../../store/gameStore";
import { getBiomeScale } from "../../../utils/biomeScaling";
import RoomActionCards from "../../RoomActionCards";
import { useRoomActions } from "../../../hooks/useRoomActions";

interface GardenBiomeProps {
  size?: number;
  onGardenComplete?: () => void;
}

const GardenBiome: React.FC<GardenBiomeProps> = ({
  onGardenComplete,
  size = 10,
}) => {
  const [plantsWatered, setPlantsWatered] = useState(false);
  const [gardenComplete, setGardenComplete] = useState(false);

  const playerDimensions = useGameStore(
    (state) => state.playerStats.dimensions
  );
  const scale = getBiomeScale(playerDimensions);
  const biomeSize = size;

  const { cards, isVisible, showCards, hideCards } = useRoomActions({
    roomType: "garden",
    onGardenComplete: () => {
      setGardenComplete(true);
      onGardenComplete?.();
    },
  });

  return (
    <group>
      {/* Garden Floor */}
      <RigidBody type="fixed" position={[0, -0.5, 0]}>
        <mesh receiveShadow>
          <boxGeometry args={[biomeSize, 1, biomeSize]} />
          <meshStandardMaterial color="#4CAF50" />
        </mesh>
      </RigidBody>

      {/* Garden Beds */}
      {Array.from({ length: Math.floor(biomeSize / 2) }).map((_, i) => {
        const angle = (i / Math.floor(biomeSize / 2)) * Math.PI * 2;
        const radius = biomeSize * 0.3;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;

        return (
          <group key={i} position={[x, 0, z]}>
            {/* Garden Bed */}
            <RigidBody type="fixed" position={[0, 0.1, 0]}>
              <mesh castShadow>
                <boxGeometry args={[1.5, 0.2, 1.5]} />
                <meshStandardMaterial color="#8D6E63" />
              </mesh>
            </RigidBody>

            {/* Plants */}
            <mesh position={[0, 0.3, 0]} castShadow>
              <cylinderGeometry args={[0.1, 0.1, 0.6, 8]} />
              <meshStandardMaterial
                color={plantsWatered ? "#4CAF50" : "#8BC34A"}
              />
            </mesh>

            {/* Flowers */}
            {plantsWatered && (
              <mesh position={[0, 0.7, 0]} castShadow>
                <sphereGeometry args={[0.15, 8, 6]} />
                <meshStandardMaterial color="#E91E63" />
              </mesh>
            )}
          </group>
        );
      })}

      {/* Central Fountain */}
      <group position={[0, 0, 0]}>
        <RigidBody type="fixed" position={[0, 0.2, 0]}>
          <mesh castShadow>
            <cylinderGeometry args={[biomeSize * 0.1, biomeSize * 0.1, 0.4]} />
            <meshStandardMaterial color="#607D8B" />
          </mesh>
        </RigidBody>

        {/* Water */}
        <mesh position={[0, 0.4, 0]}>
          <cylinderGeometry args={[biomeSize * 0.08, biomeSize * 0.08, 0.1]} />
          <meshStandardMaterial color="#2196F3" transparent opacity={0.7} />
        </mesh>

        {/* Fountain Spout */}
        <mesh position={[0, 0.8, 0]} castShadow>
          <cylinderGeometry args={[0.1, 0.1, 0.4]} />
          <meshStandardMaterial color="#607D8B" />
        </mesh>
      </group>

      {/* Garden Title */}
      <Text
        position={[0, 4, 0]}
        fontSize={0.8}
        color="white"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.05}
        outlineColor="#000000"
      >
        🌿 GARDEN BIOME 🌿
      </Text>

      {/* Instructions */}
      <Text
        position={[0, 3.2, 0]}
        fontSize={0.4}
        color="white"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.03}
        outlineColor="#000000"
      >
        {gardenComplete
          ? "Garden is thriving!"
          : "Water the plants to help them grow!"}
      </Text>

      {/* Action Cards */}
      <RoomActionCards
        cards={cards}
        isVisible={isVisible}
        onCardClick={(card) => {
          if (card.id === "water_plants") {
            setPlantsWatered(true);
            hideCards();
          }
        }}
      />
    </group>
  );
};

export default GardenBiome;
