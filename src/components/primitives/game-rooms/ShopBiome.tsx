import React, { useState } from "react";
import { Text } from "@react-three/drei";
import { RigidBody } from "@react-three/rapier";
import useGameStore from "../../../store/gameStore";
import { getBiomeScale } from "../../../utils/biomeScaling";
import RoomActionCards from "../../RoomActionCards";
import { useRoomActions } from "../../../hooks/useRoomActions";

interface ShopBiomeProps {
  size?: number;
  onShopOpen?: () => void;
}

const ShopBiome: React.FC<ShopBiomeProps> = ({ onShopOpen, size = 10 }) => {
  const playerDimensions = useGameStore(
    (state) => state.playerStats.dimensions
  );
  const scale = getBiomeScale(playerDimensions);
  const biomeSize = size;
  const [shopOpen, setShopOpen] = useState(false);

  const { cards, isVisible, showCards, hideCards } = useRoomActions({
    roomType: "shop",
    onShopOpen: () => {
      setShopOpen(true);
      onShopOpen?.();
    },
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

      {/* Shop Counter */}
      <group position={[0, 0, 0]}>
        <mesh position={[0, 0.5, 0]} castShadow>
          <boxGeometry args={[4, 1, 2]} />
          <meshStandardMaterial color="#654321" />
        </mesh>

        {/* Shop Counter */}
        <mesh position={[0, 1, 0]}>
          <boxGeometry args={[3.5, 0.2, 1.5]} />
          <meshStandardMaterial
            color="#8B4513"
            emissive="#8B4513"
            emissiveIntensity={0.1}
          />
        </mesh>
      </group>

      {/* Shopkeeper */}
      <group position={[0, 1.5, -0.5]}>
        <mesh position={[0, 0, 0]} castShadow>
          <cylinderGeometry args={[0.3, 0.3, 1]} />
          <meshStandardMaterial color="#FFD700" />
        </mesh>
        <mesh position={[0, 0.8, 0]} castShadow>
          <sphereGeometry args={[0.2]} />
          <meshStandardMaterial color="#FFD700" />
        </mesh>
      </group>

      {/* Shop Items Display */}
      {[-2, 0, 2].map((x, index) => (
        <group key={index} position={[x, 1, 2]}>
          <mesh position={[0, 0, 0]} castShadow>
            <boxGeometry args={[0.5, 0.5, 0.5]} />
            <meshStandardMaterial color="#FFD700" />
          </mesh>
        </group>
      ))}

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
        🛒 SHOP ROOM 🛒
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
        {shopOpen ? "Shop is open!" : "Use action cards below to browse items!"}
      </Text>

      {/* Shop Info */}
      <Text
        position={[0, 1.8, 0]}
        fontSize={0.3}
        color="#00ff00"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.02}
        outlineColor="#000000"
      >
        {shopOpen
          ? "Browse and purchase items!"
          : "Buy items to enhance your abilities!"}
      </Text>

      {/* Action Cards */}
      <RoomActionCards
        cards={cards}
        isVisible={isVisible}
        onCardClick={(card) => {
          if (card.id === "browse") {
            setShopOpen(true);
            hideCards();
          }
        }}
      />
    </group>
  );
};

export default ShopBiome;
