import React, { useState } from "react";
import { Text } from "@react-three/drei";
import useGameStore from "../../../store/gameStore";
import { Candle, Crystal, PotionBottle } from "../elements";
import OptimizedPuzzleRouter from "../../OptimizedPuzzleRouter";
import RoomActionCards from "../../RoomActionCards";
import { useRoomActions } from "../../../hooks/useRoomActions";

// All interactions handled through card system
type MeditationRoomProps = Record<string, never>;

const MeditationBiome: React.FC<MeditationRoomProps> = () => {
  const { upgradeDefense, addPoints, addExperience, addBuff } = useGameStore();
  const [isMeditating, setIsMeditating] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showPuzzle, setShowPuzzle] = useState(false);
  const [puzzleCompleted, setPuzzleCompleted] = useState(false);

  const { cards, isVisible, hideCards } = useRoomActions({
    roomType: "meditation",
    onPuzzleStart: () => setShowPuzzle(true),
  });

  const handlePuzzleComplete = () => {
    setPuzzleCompleted(true);
    setIsAnimating(true);
    setIsMeditating(true);

    // Apply defense upgrade
    upgradeDefense(0.15); // Increase defense by 15%
    addBuff("defenseBoost", 60); // 60-second defense buff
    addPoints(40); // Reward points
    addExperience(30); // Reward experience

    // Reward handled through card system

    // Stop animation after 3 seconds
    setTimeout(() => {
      setIsAnimating(false);
    }, 3000);
  };

  return (
    <group>
      <mesh position={[0, -0.5, 0]} receiveShadow>
        <boxGeometry args={[8, 1, 8]} />
        <meshStandardMaterial color="#2F4F4F" />
      </mesh>

      {/* Meditation Cushion */}
      <group position={[0, 0, 0]}>
        {/* Cushion */}
        <mesh position={[0, 0.1, 0]} castShadow>
          <cylinderGeometry args={[1, 1, 0.2]} />
          <meshStandardMaterial color="#8B0000" />
        </mesh>

        {/* Meditation Area */}
        <mesh position={[0, 0.1, 0]}>
          <cylinderGeometry args={[1.2, 1.2, 0.3]} />
          <meshStandardMaterial
            color={isMeditating ? "#666666" : "#4a4a4a"}
            transparent
            opacity={0.3}
          />
        </mesh>
      </group>

      {/* Incense Burner */}
      <group position={[-1, 0.5, -1]}>
        <mesh position={[0, 0, 0]} castShadow>
          <cylinderGeometry args={[0.2, 0.2, 0.4]} />
          <meshStandardMaterial color="#8B4513" />
        </mesh>
        <mesh position={[0, 0.3, 0]} castShadow>
          <sphereGeometry args={[0.15]} />
          <meshStandardMaterial
            color="#FFD700"
            emissive="#FFD700"
            emissiveIntensity={0.2}
          />
        </mesh>
      </group>

      {/* Candles */}
      {[-2, 2].map((x, index) => (
        <group key={index} position={[x, 0.5, -2]}>
          <mesh position={[0, 0, 0]} castShadow>
            <cylinderGeometry args={[0.05, 0.05, 0.3]} />
            <meshStandardMaterial color="#8B4513" />
          </mesh>
          <mesh position={[0, 0.2, 0]} castShadow>
            <sphereGeometry args={[0.08]} />
            <meshStandardMaterial
              color="#FFD700"
              emissive="#FFD700"
              emissiveIntensity={0.3}
            />
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
        🧘 MEDITATION ROOM 🧘
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
        {isMeditating
          ? "Already Meditated!"
          : puzzleCompleted
          ? "Meditation Complete!"
          : "Use action cards below to meditate!"}
      </Text>

      {/* Defense Info */}
      <Text
        position={[0, 1.8, 0]}
        fontSize={0.3}
        color="#00ff00"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.02}
        outlineColor="#000000"
      >
        {isMeditating
          ? "+15% Defense, +60s Buff"
          : "Gain defense and protection!"}
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
            🧘 MEDITATING... 🧘
          </Text>
        </group>
      )}

      {/* Decorative Elements */}
      {/* Zen Garden */}
      <group position={[2, 0.1, 2]}>
        <mesh position={[0, 0, 0]} castShadow>
          <boxGeometry args={[1.5, 0.2, 1.5]} />
          <meshStandardMaterial color="#F5F5DC" />
        </mesh>

        {/* Sand patterns */}
        {Array.from({ length: 10 }).map((_, i) => (
          <mesh
            key={i}
            position={[
              (Math.random() - 0.5) * 1.2,
              0.11,
              (Math.random() - 0.5) * 1.2,
            ]}
          >
            <boxGeometry args={[0.05, 0.01, 0.05]} />
            <meshStandardMaterial color="#D2B48C" />
          </mesh>
        ))}
      </group>

      {/* Water Fountain */}
      <group position={[-2, 0, 2]}>
        <mesh position={[0, 0.3, 0]} castShadow>
          <cylinderGeometry args={[0.5, 0.5, 0.6]} />
          <meshStandardMaterial color="#C0C0C0" />
        </mesh>
        <mesh position={[0, 0.7, 0]} castShadow>
          <sphereGeometry args={[0.2]} />
          <meshStandardMaterial color="#87CEEB" />
        </mesh>
      </group>

      {/* Floating Particles (spiritual energy) */}
      {isMeditating &&
        Array.from({ length: 8 }).map((_, i) => (
          <mesh
            key={i}
            position={[
              (Math.random() - 0.5) * 4,
              Math.random() * 2 + 1,
              (Math.random() - 0.5) * 4,
            ]}
          >
            <sphereGeometry args={[0.05]} />
            <meshStandardMaterial
              color="#FFD700"
              emissive="#FFD700"
              emissiveIntensity={0.5}
              transparent
              opacity={0.7}
            />
          </mesh>
        ))}

      {/* Additional meditation elements */}
      <Candle position={[-1.5, 0.4, -1.5]} />
      <Candle position={[1.5, 0.4, -1.5]} />
      <Candle position={[-1.5, 0.4, 1.5]} />
      <Candle position={[1.5, 0.4, 1.5]} />

      {/* Zen crystals */}
      <Crystal position={[-2, 0.5, 0]} color="#00ffff" />
      <Crystal position={[2, 0.5, 0]} color="#00ffff" />
      <Crystal position={[0, 0.5, -2]} color="#00ffff" />
      <Crystal position={[0, 0.5, 2]} color="#00ffff" />

      {/* Meditation potions */}
      <PotionBottle position={[-0.8, 0.4, -0.8]} color="#00ff00" />
      <PotionBottle position={[0.8, 0.4, 0.8]} color="#00ff00" />

      {/* Optimized Puzzle Overlay */}
      <OptimizedPuzzleRouter
        isVisible={showPuzzle}
        onComplete={handlePuzzleComplete}
        onExit={() => setShowPuzzle(false)}
        puzzleType="number"
        difficulty="easy"
      />

      {/* Action Cards */}
      <RoomActionCards
        cards={cards}
        isVisible={isVisible}
        onCardClick={(card) => {
          if (card.id === "meditate") {
            setShowPuzzle(true);
            hideCards();
          }
        }}
      />
    </group>
  );
};

export default MeditationBiome;
