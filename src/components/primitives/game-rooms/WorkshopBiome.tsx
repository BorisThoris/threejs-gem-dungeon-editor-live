import React, { useState } from "react";
import { Text } from "@react-three/drei";
import { RigidBody } from "@react-three/rapier";
import useGameStore from "../../../store/gameStore";
import { getBiomeScale } from "../../../utils/biomeScaling";
import RoomActionCards from "../../RoomActionCards";
import { useRoomActions } from "../../../hooks/useRoomActions";

interface WorkshopBiomeProps {
  size?: number;
  onCraftComplete?: () => void;
}

const WorkshopBiome: React.FC<WorkshopBiomeProps> = ({
  onCraftComplete,
  size = 10,
}) => {
  const [crafting, setCrafting] = useState(false);
  const [itemCrafted] = useState(false);

  const playerDimensions = useGameStore(
    (state) => state.playerStats.dimensions
  );
  const scale = getBiomeScale(playerDimensions);
  const biomeSize = size;

  const { cards, isVisible, showCards, hideCards } = useRoomActions({
    roomType: "workshop",
    onCraftComplete: () => {
      setItemCrafted(true);
      onCraftComplete?.();
    },
  });

  return (
    <group>
      {/* Workshop Floor */}
      <RigidBody type="fixed" position={[0, -0.5, 0]}>
        <mesh receiveShadow>
          <boxGeometry args={[10, 1, 10]} />
          <meshStandardMaterial color="#8D6E63" />
        </mesh>
      </RigidBody>

      {/* Workbench */}
      <RigidBody type="fixed" position={[0, 0.4, 0]}>
        <mesh castShadow>
          <boxGeometry args={[8, 0.8, 2]} />
          <meshStandardMaterial color="#5D4037" />
        </mesh>
      </RigidBody>

      {/* Tools */}
      {Array.from({ length: 6 }).map((_, i) => {
        const angle = (i / 6) * Math.PI * 2;
        const radius = 2.5;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;

        return (
          <group key={i} position={[x, 0.5, z]}>
            {/* Tool Handle */}
            <mesh castShadow>
              <cylinderGeometry args={[0.05, 0.05, 0.4]} />
              <meshStandardMaterial color="#8D6E63" />
            </mesh>

            {/* Tool Head */}
            <mesh position={[0, 0.3, 0]} castShadow>
              <boxGeometry args={[0.1, 0.1, 0.2]} />
              <meshStandardMaterial color="#607D8B" />
            </mesh>
          </group>
        );
      })}

      {/* Forge */}
      <group position={[-2, 0, 0]}>
        <RigidBody type="fixed" position={[0, 0.3, 0]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.8, 0.8, 0.6]} />
            <meshStandardMaterial color="#424242" />
          </mesh>
        </RigidBody>

        {/* Fire */}
        {crafting && (
          <mesh position={[0, 0.6, 0]}>
            <sphereGeometry args={[0.3]} />
            <meshStandardMaterial color="#FF5722" />
          </mesh>
        )}

        {/* Anvil */}
        <mesh position={[0, 0.8, 0]} castShadow>
          <boxGeometry args={[0.6, 0.2, 0.4]} />
          <meshStandardMaterial color="#37474F" />
        </mesh>
      </group>

      {/* Storage Chests */}
      {Array.from({ length: 3 }).map((_, i) => (
        <group key={i} position={[3, 0.3, -2 + i * 2]}>
          <RigidBody type="fixed" position={[0, 0.3, 0]}>
            <mesh castShadow>
              <boxGeometry args={[1, 0.6, 1]} />
              <meshStandardMaterial color="#5D4037" />
            </mesh>
          </RigidBody>

          {/* Chest Lid */}
          <mesh position={[0, 0.6, 0]} castShadow>
            <boxGeometry args={[1.1, 0.1, 1.1]} />
            <meshStandardMaterial color="#8D6E63" />
          </mesh>
        </group>
      ))}

      {/* Crafted Item */}
      {itemCrafted && (
        <group position={[0, 1, 0]}>
          <mesh castShadow>
            <boxGeometry args={[0.3, 0.3, 0.3]} />
            <meshStandardMaterial color="#FFD700" />
          </mesh>

          {/* Glow Effect */}
          <pointLight
            position={[0, 0.3, 0]}
            color="#FFD700"
            intensity={0.5}
            distance={3}
          />
        </group>
      )}

      {/* Workshop Title */}
      <Text
        position={[0, 4, 0]}
        fontSize={0.8}
        color="white"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.05}
        outlineColor="#000000"
      >
        🔨 WORKSHOP BIOME 🔨
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
        {itemCrafted
          ? "Item successfully crafted!"
          : "Craft useful items and tools!"}
      </Text>

      {/* Action Cards */}
      <RoomActionCards
        cards={cards}
        isVisible={isVisible}
        onCardClick={(card) => {
          if (card.id === "start_crafting") {
            setCrafting(true);
            hideCards();
          }
        }}
      />
    </group>
  );
};

export default WorkshopBiome;
