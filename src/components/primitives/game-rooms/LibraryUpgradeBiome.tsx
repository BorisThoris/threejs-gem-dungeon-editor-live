import React, { useState } from "react";
import { Text } from "@react-three/drei";
import useGameStore from "../../../store/gameStore";
import { Candle, Crystal, PotionBottle } from "../elements";

interface LibraryUpgradeBiomeProps {
  onRewardClaim?: () => void;
}

const LibraryUpgradeBiome: React.FC<LibraryUpgradeBiomeProps> = ({
  onRewardClaim,
}) => {
  const { upgradeLuck, addPoints, addExperience } = useGameStore();
  const [booksRead, setBooksRead] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const maxBooks = 5; // Maximum books per room visit

  const handleReadBook = () => {
    if (booksRead >= maxBooks) return;

    setIsAnimating(true);
    setBooksRead((prev) => prev + 1);

    // Apply luck upgrade
    upgradeLuck(0.1); // Increase luck by 10%
    addPoints(30); // Reward points
    addExperience(20); // Reward experience

    // Call reward callback
    onRewardClaim?.();

    // Stop animation after 1.5 seconds
    setTimeout(() => {
      setIsAnimating(false);
    }, 1500);
  };

  return (
    <group>
      <mesh position={[0, -0.5, 0]} receiveShadow>
        <boxGeometry args={[8, 1, 8]} />
        <meshStandardMaterial color="#2F4F4F" />
      </mesh>

      {/* Bookshelves */}
      {[-3, 0, 3].map((x, shelfIndex) => (
        <group key={shelfIndex} position={[x, 1.5, -3]}>
          {/* Bookshelf Frame */}
          <mesh castShadow>
            <boxGeometry args={[1.5, 3, 0.2]} />
            <meshStandardMaterial color="#8B4513" />
          </mesh>

          {/* Books */}
          {Array.from({ length: 12 }).map((_, bookIndex) => {
            const row = Math.floor(bookIndex / 4);
            const col = bookIndex % 4;
            const colors = [
              "#8B0000",
              "#000080",
              "#006400",
              "#800080",
              "#FF8C00",
              "#2F4F4F",
            ];

            return (
              <mesh
                key={bookIndex}
                position={[(col - 1.5) * 0.3, (row - 1) * 0.4 + 0.2, 0.1]}
                castShadow
              >
                <boxGeometry args={[0.25, 0.35, 0.05]} />
                <meshStandardMaterial
                  color={colors[bookIndex % colors.length]}
                />
              </mesh>
            );
          })}
        </group>
      ))}

      {/* Reading Table */}
      <group position={[0, 0, 1]}>
        <mesh position={[0, 0.3, 0]} castShadow>
          <boxGeometry args={[2, 0.6, 1]} />
          <meshStandardMaterial color="#8B4513" />
        </mesh>

        {/* Open Book on Table */}
        <group position={[0, 0.6, 0]}>
          <mesh position={[-0.3, 0, 0]} castShadow>
            <boxGeometry args={[0.4, 0.05, 0.6]} />
            <meshStandardMaterial color="#F5F5DC" />
          </mesh>
          <mesh position={[0.3, 0, 0]} castShadow>
            <boxGeometry args={[0.4, 0.05, 0.6]} />
            <meshStandardMaterial color="#F5F5DC" />
          </mesh>
        </group>

        {/* Clickable Reading Area */}
        <mesh
          position={[0, 0.3, 0]}
          onClick={handleReadBook}
          onPointerOver={(e) => {
            e.stopPropagation();
            document.body.style.cursor =
              booksRead >= maxBooks ? "not-allowed" : "pointer";
          }}
          onPointerOut={() => {
            document.body.style.cursor = "default";
          }}
        >
          <boxGeometry args={[2.2, 0.8, 1.2]} />
          <meshStandardMaterial
            color={booksRead >= maxBooks ? "#666666" : "#4a4a4a"}
            transparent
            opacity={0.3}
          />
        </mesh>
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
        📚 LIBRARY 📚
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
        {booksRead >= maxBooks ? "No more books!" : "Click to read books!"}
      </Text>

      {/* Book Counter */}
      <Text
        position={[0, 1.8, 0]}
        fontSize={0.3}
        color="#00ff00"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.02}
        outlineColor="#000000"
      >
        {booksRead}/{maxBooks} Books Read
      </Text>

      {/* Luck Upgrade Info */}
      <Text
        position={[0, 1.5, 0]}
        fontSize={0.3}
        color="#FFD700"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.02}
        outlineColor="#000000"
      >
        +10% Luck per Book
      </Text>

      {/* Animation Effect */}
      {isAnimating && (
        <group position={[0, 2.5, 0]}>
          <Text
            position={[0, 0, 0]}
            fontSize={0.6}
            color="#FFD700"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.05}
            outlineColor="#000000"
          >
            📖 READING! 📖
          </Text>
        </group>
      )}

      {/* Decorative Elements */}
      {/* Chandelier */}
      <group position={[0, 2.8, 0]}>
        <mesh position={[0, 0, 0]} castShadow>
          <cylinderGeometry args={[0.1, 0.1, 0.2]} />
          <meshStandardMaterial color="#FFD700" />
        </mesh>
        <mesh position={[0, -0.1, 0]} castShadow>
          <sphereGeometry args={[0.3]} />
          <meshStandardMaterial
            color="#FFD700"
            emissive="#FFD700"
            emissiveIntensity={0.3}
          />
        </mesh>
      </group>

      {/* Scrolls */}
      <group position={[2, 0.5, 2]}>
        <mesh position={[0, 0, 0]} castShadow>
          <cylinderGeometry args={[0.1, 0.1, 0.8]} />
          <meshStandardMaterial color="#F5F5DC" />
        </mesh>
      </group>

      <group position={[-2, 0.5, 2]}>
        <mesh position={[0, 0, 0]} castShadow>
          <cylinderGeometry args={[0.1, 0.1, 0.8]} />
          <meshStandardMaterial color="#F5F5DC" />
        </mesh>
      </group>

      {/* Additional library elements */}
      <Candle position={[-1, 0.4, 0]} />
      <Candle position={[1, 0.4, 0]} />
      <Candle position={[0, 0.4, -1]} />

      {/* Wisdom crystals */}
      <Crystal position={[-1.5, 0.5, 0]} color="#4169E1" />
      <Crystal position={[1.5, 0.5, 0]} color="#4169E1" />

      {/* Intelligence potions */}
      <PotionBottle position={[-0.5, 0.4, 0]} color="#8000ff" />
      <PotionBottle position={[0.5, 0.4, 0]} color="#8000ff" />
    </group>
  );
};

export default LibraryUpgradeBiome;
