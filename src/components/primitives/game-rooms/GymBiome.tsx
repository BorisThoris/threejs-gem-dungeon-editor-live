import React, { useState } from "react";
import { Text } from "@react-three/drei";
import useGameStore from "../../../store/gameStore";
import OptimizedPuzzleRouter from "../../OptimizedPuzzleRouter";
import RoomActionCards from "../../RoomActionCards";
import { useRoomActions } from "../../../hooks/useRoomActions";

// All interactions handled through card system
type BenchPressRoomProps = Record<string, never>;

const GymBiome: React.FC<BenchPressRoomProps> = () => {
  const { upgradeStrength, addPoints, addExperience, addBuff } = useGameStore();
  const [hasLifted, setHasLifted] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showPuzzle, setShowPuzzle] = useState(false);
  const [puzzleCompleted, setPuzzleCompleted] = useState(false);

  const { cards, isVisible, hideCards } = useRoomActions({
    roomType: "benchpress",
    onPuzzleStart: () => setShowPuzzle(true),
  });

  const handlePuzzleComplete = () => {
    setPuzzleCompleted(true);
    setHasLifted(true);
    setIsAnimating(true);

    // Permanent upgrade + temporary buff + rewards
    upgradeStrength(0.2); // +20% strength
    addBuff("strengthBoost", 60); // 60s buff
    addPoints(40);
    addExperience(30);

    // Reward handled through card system

    setTimeout(() => setIsAnimating(false), 2000);
  };

  return (
    <group>
      <mesh position={[0, -0.5, 0]} receiveShadow>
        <boxGeometry args={[8, 1, 8]} />
        <meshStandardMaterial color="#303030" />
      </mesh>

      {/* Bench - simple model */}
      <group position={[0, 0, 0]}>
        {/* Bench top */}
        <mesh position={[0, 0.6, 0]} castShadow>
          <boxGeometry args={[2.2, 0.2, 0.6]} />
          <meshStandardMaterial color="#222222" />
        </mesh>
        {/* Bench legs */}
        {[-0.9, 0.9].map((x, i) => (
          <mesh key={i} position={[x, 0.3, 0]} castShadow>
            <boxGeometry args={[0.1, 0.5, 0.5]} />
            <meshStandardMaterial color="#555555" />
          </mesh>
        ))}
      </group>

      {/* Barbell + rack */}
      <group position={[0, 0, 0]}>
        {/* Uprights */}
        {[-0.9, 0.9].map((x, i) => (
          <mesh key={i} position={[x, 1.1, -0.1]} castShadow>
            <boxGeometry args={[0.1, 1.2, 0.1]} />
            <meshStandardMaterial color="#666666" />
          </mesh>
        ))}
        {/* Crossbar holder */}
        <mesh position={[0, 1.4, -0.1]} castShadow>
          <boxGeometry args={[2.0, 0.1, 0.1]} />
          <meshStandardMaterial color="#777777" />
        </mesh>

        {/* Barbell */}
        <group position={[0, 1.4, -0.1]}>
          {/* Bar */}
          <mesh>
            <cylinderGeometry args={[0.05, 0.05, 2.2, 12]} />
            <meshStandardMaterial color={hasLifted ? "#777777" : "#CCCCCC"} />
          </mesh>
          {/* Plates */}
          {[-0.95, 0.95].map((x, i) => (
            <mesh key={i} position={[x, 0, 0]} castShadow>
              <cylinderGeometry args={[0.25, 0.25, 0.15, 12]} />
              <meshStandardMaterial color="#AA0000" />
            </mesh>
          ))}
        </group>
      </group>

      {/* Title */}
      <Text
        position={[0, 3, 0]}
        fontSize={0.8}
        color="white"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.05}
        outlineColor="#000000"
      >
        💪 BENCH PRESS ROOM 💪
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
        {hasLifted
          ? "Already Lifted!"
          : puzzleCompleted
          ? "Strength Training Complete!"
          : "Use action cards below to train!"}
      </Text>

      {/* Reward info */}
      <Text
        position={[0, 1.8, 0]}
        fontSize={0.3}
        color="#00ff00"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.02}
        outlineColor="#000000"
      >
        {hasLifted ? "+20% Strength, +60s Buff" : "Gain strength and rewards!"}
      </Text>

      {/* Simple feedback animation */}
      {isAnimating && (
        <group position={[0, 2.6, 0]}>
          <Text
            position={[0, 0, 0]}
            fontSize={0.6}
            color="#FFD700"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.05}
            outlineColor="#000000"
          >
            LIFTING...
          </Text>
        </group>
      )}

      {/* Optimized Puzzle Overlay */}
      <OptimizedPuzzleRouter
        isVisible={showPuzzle}
        onComplete={handlePuzzleComplete}
        onExit={() => setShowPuzzle(false)}
        puzzleType="number"
        difficulty="medium"
      />

      {/* Action Cards */}
      <RoomActionCards
        cards={cards}
        isVisible={isVisible}
        onCardClick={(card) => {
          if (card.id === "lift") {
            setShowPuzzle(true);
            hideCards();
          }
        }}
      />
    </group>
  );
};

export default GymBiome;
