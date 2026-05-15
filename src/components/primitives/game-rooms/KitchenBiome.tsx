import React, { useState } from "react";
import { Text } from "@react-three/drei";
import { RigidBody } from "@react-three/rapier";
import useGameStore from "../../../store/gameStore";
import { getBiomeScale } from "../../../utils/biomeScaling";
import RoomActionCards from "../../RoomActionCards";
import { useRoomActions } from "../../../hooks/useRoomActions";

interface KitchenBiomeProps {
  size?: number;
  onCookingComplete?: () => void;
}

const KitchenBiome: React.FC<KitchenBiomeProps> = ({
  onCookingComplete,
  size = 10,
}) => {
  const [cooking, setCooking] = useState(false);
  const [mealReady, setMealReady] = useState(false);

  const playerDimensions = useGameStore(
    (state) => state.playerStats.dimensions
  );
  const scale = getBiomeScale(playerDimensions);
  const biomeSize = size;

  const { cards, isVisible, showCards, hideCards } = useRoomActions({
    roomType: "kitchen",
    onCookingComplete: () => {
      setMealReady(true);
      onCookingComplete?.();
    },
  });

  return (
    <group>
      {/* Kitchen Floor */}
      <RigidBody type="fixed" position={[0, -0.5, 0]}>
        <mesh receiveShadow>
          <boxGeometry args={[biomeSize, 1, biomeSize]} />
          <meshStandardMaterial color="#795548" />
        </mesh>
      </RigidBody>

      {/* Counter */}
      <RigidBody type="fixed" position={[0, 0.4, 0]}>
        <mesh castShadow>
          <boxGeometry args={[biomeSize * 0.8, 0.8, biomeSize * 0.2]} />
          <meshStandardMaterial color="#8D6E63" />
        </mesh>
      </RigidBody>

      {/* Stove */}
      <group position={[-biomeSize * 0.2, 0, 0]}>
        <RigidBody type="fixed" position={[0, 0.5, 0]}>
          <mesh castShadow>
            <boxGeometry args={[biomeSize * 0.15, 0.2, biomeSize * 0.15]} />
            <meshStandardMaterial color="#424242" />
          </mesh>
        </RigidBody>

        {/* Burners */}
        {Array.from({ length: 4 }).map((_, i) => {
          const x = (i % 2) * biomeSize * 0.06 - biomeSize * 0.03;
          const z = Math.floor(i / 2) * biomeSize * 0.06 - biomeSize * 0.03;
          return (
            <mesh key={i} position={[x, 0.6, z]} castShadow>
              <cylinderGeometry
                args={[biomeSize * 0.02, biomeSize * 0.02, 0.05]}
              />
              <meshStandardMaterial color={cooking ? "#FF5722" : "#616161"} />
            </mesh>
          );
        })}
      </group>

      {/* Sink */}
      <group position={[biomeSize * 0.2, 0, 0]}>
        <RigidBody type="fixed" position={[0, 0.5, 0]}>
          <mesh castShadow>
            <boxGeometry args={[biomeSize * 0.15, 0.2, biomeSize * 0.15]} />
            <meshStandardMaterial color="#8D6E63" />
          </mesh>
        </RigidBody>

        {/* Sink Bowl */}
        <mesh position={[0, 0.4, 0]}>
          <cylinderGeometry
            args={[biomeSize * 0.06, biomeSize * 0.06, 0.2, 16]}
          />
          <meshStandardMaterial color="#2196F3" />
        </mesh>
      </group>

      {/* Refrigerator */}
      <RigidBody type="fixed" position={[0, 1.5, -biomeSize * 0.3]}>
        <mesh castShadow>
          <boxGeometry args={[biomeSize * 0.2, 3, biomeSize * 0.1]} />
          <meshStandardMaterial color="#E0E0E0" />
        </mesh>
      </RigidBody>

      {/* Cooking Pot */}
      {cooking && (
        <group position={[0, 0.8, 0]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.4, 0.4, 0.3]} />
            <meshStandardMaterial color="#FFC107" />
          </mesh>
          {/* Steam */}
          <mesh position={[0, 0.3, 0]}>
            <sphereGeometry args={[0.1]} />
            <meshStandardMaterial color="#E0E0E0" transparent opacity={0.5} />
          </mesh>
        </group>
      )}

      {/* Kitchen Title */}
      <Text
        position={[0, 4, 0]}
        fontSize={0.8}
        color="white"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.05}
        outlineColor="#000000"
      >
        🍳 KITCHEN BIOME 🍳
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
        {mealReady ? "Delicious meal prepared!" : "Cook something delicious!"}
      </Text>

      {/* Action Cards */}
      <RoomActionCards
        cards={cards}
        isVisible={isVisible}
        onCardClick={(card) => {
          if (card.id === "start_cooking") {
            setCooking(true);
            hideCards();
          }
        }}
      />
    </group>
  );
};

export default KitchenBiome;
