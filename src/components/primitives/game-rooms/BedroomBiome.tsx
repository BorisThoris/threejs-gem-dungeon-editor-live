import React, { useState } from "react";
import { Text } from "@react-three/drei";
import { RigidBody } from "@react-three/rapier";
import useGameStore from "../../../store/gameStore";
import { getBiomeScale } from "../../../utils/biomeScaling";
import RoomActionCards from "../../RoomActionCards";
import { useRoomActions } from "../../../hooks/useRoomActions";

interface BedroomBiomeProps {
  size?: number;
  onRestComplete?: () => void;
}

const BedroomBiome: React.FC<BedroomBiomeProps> = ({
  onRestComplete,
  size = 10,
}) => {
  const [resting, setResting] = useState(false);
  const [wellRested, setWellRested] = useState(false);

  const playerDimensions = useGameStore(
    (state) => state.playerStats.dimensions
  );
  const scale = getBiomeScale(playerDimensions);
  const biomeSize = size;

  const { cards, isVisible, showCards, hideCards } = useRoomActions({
    roomType: "bedroom",
    onRestComplete: () => {
      setWellRested(true);
      onRestComplete?.();
    },
  });

  return (
    <group>
      {/* Bedroom Floor */}
      <RigidBody type="fixed" position={[0, -0.5, 0]}>
        <mesh receiveShadow>
          <boxGeometry args={[biomeSize, 1, biomeSize]} />
          <meshStandardMaterial color="#8D6E63" />
        </mesh>
      </RigidBody>

      {/* Bed */}
      <group position={[0, 0, 0]}>
        <RigidBody type="fixed" position={[0, 0.2, 0]}>
          <mesh castShadow>
            <boxGeometry args={[biomeSize * 0.3, 0.4, biomeSize * 0.2]} />
            <meshStandardMaterial color="#795548" />
          </mesh>
        </RigidBody>

        {/* Mattress */}
        <mesh position={[0, 0.5, 0]} castShadow>
          <boxGeometry args={[biomeSize * 0.28, 0.2, biomeSize * 0.18]} />
          <meshStandardMaterial color="#E8F5E8" />
        </mesh>

        {/* Pillow */}
        <mesh position={[0, 0.7, biomeSize * 0.05]} castShadow>
          <boxGeometry args={[biomeSize * 0.08, 0.2, biomeSize * 0.04]} />
          <meshStandardMaterial color="#FFF8E1" />
        </mesh>
      </group>

      {/* Nightstand */}
      <group position={[biomeSize * 0.2, 0, 0]}>
        <RigidBody type="fixed" position={[0, 0.3, 0]}>
          <mesh castShadow>
            <boxGeometry args={[biomeSize * 0.08, 0.6, biomeSize * 0.08]} />
            <meshStandardMaterial color="#8D6E63" />
          </mesh>
        </RigidBody>

        {/* Lamp */}
        <mesh position={[0, 0.8, 0]} castShadow>
          <cylinderGeometry args={[0.1, 0.1, 0.3]} />
          <meshStandardMaterial color="#FFC107" />
        </mesh>

        {/* Lamp Shade */}
        <mesh position={[0, 1.1, 0]} castShadow>
          <cylinderGeometry args={[0.3, 0.3, 0.2]} />
          <meshStandardMaterial color="#FFF8E1" />
        </mesh>
      </group>

      {/* Wardrobe */}
      <RigidBody type="fixed" position={[-3, 1.5, 0]}>
        <mesh castShadow>
          <boxGeometry args={[2, 3, 1]} />
          <meshStandardMaterial color="#5D4037" />
        </mesh>
      </RigidBody>

      {/* Window */}
      <group position={[0, 2, -4]}>
        <mesh castShadow>
          <boxGeometry args={[3, 2, 0.2]} />
          <meshStandardMaterial color="#81C784" />
        </mesh>

        {/* Window Frame */}
        <mesh position={[0, 0, 0.1]} castShadow>
          <boxGeometry args={[3.2, 2.2, 0.1]} />
          <meshStandardMaterial color="#8D6E63" />
        </mesh>
      </group>

      {/* Resting Effect */}
      {resting && (
        <pointLight
          position={[0, 2, 0]}
          color="#E3F2FD"
          intensity={0.5}
          distance={5}
        />
      )}

      {/* Bedroom Title */}
      <Text
        position={[0, 4, 0]}
        fontSize={0.8}
        color="white"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.05}
        outlineColor="#000000"
      >
        🛏️ BEDROOM BIOME 🛏️
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
        {wellRested
          ? "Well rested and energized!"
          : "Rest to restore your energy!"}
      </Text>

      {/* Action Cards */}
      <RoomActionCards
        cards={cards}
        isVisible={isVisible}
        onCardClick={(card) => {
          if (card.id === "rest") {
            setResting(true);
            hideCards();
          }
        }}
      />
    </group>
  );
};

export default BedroomBiome;
