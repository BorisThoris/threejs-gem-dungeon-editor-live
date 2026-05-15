import React, { useState } from "react";
import { Text } from "@react-three/drei";
import RoomActionCards from "../../RoomActionCards";
import { useRoomActions } from "../../../hooks/useRoomActions";

interface ChallengeBiomeProps {
  onChallengeStart?: () => void;
}

const ChallengeBiome: React.FC<ChallengeBiomeProps> = ({ onChallengeStart }) => {
  const [challengeActive, setChallengeActive] = useState(false);
  const [challengeCompleted, setChallengeCompleted] = useState(false);

  const { cards, isVisible, showCards, hideCards } = useRoomActions({
    roomType: "challenge",
    onChallengeStart: () => {
      setChallengeActive(true);
      onChallengeStart?.();
    },
  });

  return (
    <group>
      <mesh position={[0, -0.5, 0]} receiveShadow>
        <boxGeometry args={[8, 1, 8]} />
        <meshStandardMaterial color="#2F2F2F" />
      </mesh>

      {/* Challenge Platform */}
      <group position={[0, 0, 0]}>
        <mesh position={[0, 0.1, 0]} castShadow>
          <cylinderGeometry args={[3, 3, 0.2]} />
          <meshStandardMaterial color="#444444" />
        </mesh>

        {/* Challenge Area */}
        <mesh position={[0, 0.2, 0]}>
          <cylinderGeometry args={[3.2, 3.2, 0.4]} />
          <meshStandardMaterial
            color={
              challengeCompleted
                ? "#4CAF50"
                : challengeActive
                ? "#FF5722"
                : "#666666"
            }
            emissive={
              challengeCompleted
                ? "#4CAF50"
                : challengeActive
                ? "#FF5722"
                : "#000000"
            }
            emissiveIntensity={challengeCompleted || challengeActive ? 0.3 : 0}
            transparent
            opacity={0.3}
          />
        </mesh>
      </group>

      {/* Challenge Symbols */}
      <group position={[-2, 1, -2]}>
        <mesh position={[0, 0, 0]} castShadow>
          <octahedronGeometry args={[0.5]} />
          <meshStandardMaterial color="#FF5722" />
        </mesh>
      </group>
      <group position={[2, 1, -2]}>
        <mesh position={[0, 0, 0]} castShadow>
          <octahedronGeometry args={[0.5]} />
          <meshStandardMaterial color="#FF5722" />
        </mesh>
      </group>
      <group position={[-2, 1, 2]}>
        <mesh position={[0, 0, 0]} castShadow>
          <octahedronGeometry args={[0.5]} />
          <meshStandardMaterial color="#FF5722" />
        </mesh>
      </group>
      <group position={[2, 1, 2]}>
        <mesh position={[0, 0, 0]} castShadow>
          <octahedronGeometry args={[0.5]} />
          <meshStandardMaterial color="#FF5722" />
        </mesh>
      </group>

      {/* Challenge Status Indicator */}
      <group position={[0, 2, 0]}>
        <mesh position={[0, 0, 0]} castShadow>
          <sphereGeometry args={[0.3]} />
          <meshStandardMaterial
            color={
              challengeCompleted
                ? "#4CAF50"
                : challengeActive
                ? "#FF5722"
                : "#666666"
            }
            emissive={
              challengeCompleted
                ? "#4CAF50"
                : challengeActive
                ? "#FF5722"
                : "#000000"
            }
            emissiveIntensity={0.5}
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
        ⚔️ CHALLENGE ROOM ⚔️
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
        {challengeCompleted
          ? "Challenge completed!"
          : challengeActive
          ? "Challenge in progress!"
          : "Use action cards below to see options!"}
      </Text>

      {/* Challenge Info */}
      <Text
        position={[0, 1.8, 0]}
        fontSize={0.3}
        color="#00ff00"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.02}
        outlineColor="#000000"
      >
        {challengeCompleted
          ? "Great rewards earned!"
          : challengeActive
          ? "Test your skills!"
          : "Face the ultimate test!"}
      </Text>

      {/* Action Cards */}
      <RoomActionCards
        cards={cards}
        isVisible={isVisible}
        onCardClick={(card) => {
          if (card.id === "accept_challenge") {
            setChallengeActive(true);
            hideCards();
          } else if (card.id === "skip") {
            setChallengeCompleted(true);
            hideCards();
          }
        }}
      />
    </group>
  );
};

export default ChallengeBiome;
