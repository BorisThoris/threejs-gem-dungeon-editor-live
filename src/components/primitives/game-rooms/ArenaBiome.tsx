import React, { useState, useRef } from "react";
import { Text } from "@react-three/drei";
import { RigidBody } from "@react-three/rapier";
import { useFrame } from "@react-three/fiber";
import useGameStore from "../../../store/gameStore";
import { getBiomeScale } from "../../../utils/biomeScaling";
import RoomActionCards from "../../RoomActionCards";
import { useRoomActions } from "../../../hooks/useRoomActions";

interface ArenaBiomeProps {
  onRewardClaim?: () => void;
}

const ArenaBiome: React.FC<ArenaBiomeProps> = ({ onRewardClaim }) => {
  const { addPoints, addExperience, addBuff } = useGameStore();
  const [isFighting, setIsFighting] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [roundsWon, setRoundsWon] = useState(0);

  // Refs for animated elements
  const arenaRingRef = useRef<THREE.Mesh>(null);
  const torchRefs = useRef<THREE.Mesh[]>([]);

  const { cards, isVisible, showCards, hideCards } = useRoomActions({
    roomType: "arena",
    onFightStart: () => setIsFighting(true),
  });

  const handleFight = () => {
    if (isFighting) return;

    setIsAnimating(true);
    setIsFighting(true);

    // Arena rewards based on rounds
    const points = 30 + roundsWon * 20;
    const experience = 25 + roundsWon * 15;

    addPoints(points);
    addExperience(experience);
    addBuff("strengthBoost", 120); // 2-minute strength buff
    setRoundsWon((prev) => prev + 1);

    onRewardClaim?.();

    setTimeout(() => {
      setIsAnimating(false);
      setIsFighting(false);
    }, 4000);
  };

  // Animation frame for combat effects
  useFrame((state) => {
    const time = state.clock.getElapsedTime();

    // Animate arena ring glow
    if (arenaRingRef.current && isFighting) {
      const glowIntensity = Math.sin(time * 4) * 0.3 + 0.7;
      arenaRingRef.current.material.emissiveIntensity = glowIntensity;
    }

    // Animate torches flickering
    torchRefs.current.forEach((torchRef, index) => {
      if (torchRef) {
        const flickerIntensity = Math.sin(time * 6 + index) * 0.2 + 0.8;
        torchRef.material.emissiveIntensity = flickerIntensity;
      }
    });
  });

  return (
    <group>
      <mesh position={[0, -0.5, 0]} receiveShadow>
        <boxGeometry args={[12, 1, 12]} />
        <meshStandardMaterial color="#2a2a2a" />
      </mesh>

      {/* Arena Ring */}
      <group position={[0, 0, 0]}>
        {/* Outer Ring */}
        <mesh ref={arenaRingRef} position={[0, 0.1, 0]} castShadow>
          <torusGeometry args={[4, 0.5, 16, 100]} />
          <meshStandardMaterial
            color="#8B4513"
            emissive="#FF4500"
            emissiveIntensity={isFighting ? 0.5 : 0.1}
          />
        </mesh>

        {/* Combat glow aura */}
        {isFighting && (
          <mesh position={[0, 0.1, 0]}>
            <torusGeometry args={[4.2, 0.7, 16, 100]} />
            <meshStandardMaterial
              color="#FF4500"
              transparent
              opacity={0.3}
              emissive="#FF4500"
              emissiveIntensity={0.4}
            />
          </mesh>
        )}

        {/* Inner Ring */}
        <mesh position={[0, 0.1, 0]} castShadow>
          <torusGeometry args={[3.5, 0.3, 16, 100]} />
          <meshStandardMaterial color="#D2691E" />
        </mesh>

        {/* Arena Sand */}
        <mesh position={[0, 0.2, 0]} receiveShadow>
          <cylinderGeometry args={[3.2, 3.2, 0.1, 32]} />
          <meshStandardMaterial color="#F4A460" />
        </mesh>
      </group>

      {/* Arena Seats */}
      {Array.from({ length: 16 }).map((_, i) => {
        const angle = (i / 16) * Math.PI * 2;
        const radius = 6;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;

        return (
          <group
            key={i}
            position={[x, 0, z]}
            rotation={[0, angle + Math.PI, 0]}
          >
            <mesh position={[0, 1, 0]} castShadow>
              <boxGeometry args={[0.8, 2, 0.4]} />
              <meshStandardMaterial color="#654321" />
            </mesh>
            <mesh position={[0, 2.2, 0]} castShadow>
              <boxGeometry args={[1, 0.2, 0.6]} />
              <meshStandardMaterial color="#8B4513" />
            </mesh>
          </group>
        );
      })}

      {/* Arena Pillars */}
      {[-4, 4].map((x, i) => (
        <group key={i} position={[x, 0, 0]}>
          <mesh position={[0, 2.5, 0]} castShadow>
            <cylinderGeometry args={[0.4, 0.4, 5, 8]} />
            <meshStandardMaterial color="#696969" />
          </mesh>
          <mesh position={[0, 5.2, 0]} castShadow>
            <sphereGeometry args={[0.6]} />
            <meshStandardMaterial
              color="#FFD700"
              emissive="#FFD700"
              emissiveIntensity={0.3}
            />
          </mesh>
        </group>
      ))}

      {/* Fighting Area */}
      <group position={[0, 0.3, 0]}>
        <mesh
          position={[0, 0, 0]}
          onClick={handleFight}
          onPointerOver={(e) => {
            e.stopPropagation();
            document.body.style.cursor = isFighting ? "not-allowed" : "pointer";
          }}
          onPointerOut={() => {
            document.body.style.cursor = "default";
          }}
        >
          <cylinderGeometry args={[3, 3, 0.2, 32]} />
          <meshStandardMaterial
            color={isFighting ? "#8B0000" : "#F4A460"}
            transparent
            opacity={0.8}
          />
        </mesh>

        {/* Arena Center Symbol */}
        <mesh position={[0, 0.1, 0]}>
          <cylinderGeometry args={[0.5, 0.5, 0.1, 8]} />
          <meshStandardMaterial
            color="#FFD700"
            emissive="#FFD700"
            emissiveIntensity={0.5}
          />
        </mesh>
      </group>

      {/* Arena Title */}
      <Text
        position={[0, 6, 0]}
        fontSize={1.0}
        color="white"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.05}
        outlineColor="#000000"
      >
        ⚔️ ARENA ROOM ⚔️
      </Text>

      {/* Instructions */}
      <Text
        position={[0, 5.2, 0]}
        fontSize={0.5}
        color="white"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.03}
        outlineColor="#000000"
      >
        {isFighting ? "Fighting in Progress!" : "Click to start battle!"}
      </Text>

      {/* Round Counter */}
      <Text
        position={[0, 4.8, 0]}
        fontSize={0.4}
        color="#FFD700"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.02}
        outlineColor="#000000"
      >
        Rounds Won: {roundsWon}
      </Text>

      {/* Rewards Info */}
      <Text
        position={[0, 4.4, 0]}
        fontSize={0.3}
        color="#00ff00"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.02}
        outlineColor="#000000"
      >
        {isFighting ? "+120s Strength Buff" : "Fight for glory and rewards!"}
      </Text>

      {/* Animation Effect */}
      {isAnimating && (
        <group position={[0, 6.5, 0]}>
          <Text
            position={[0, 0, 0]}
            fontSize={0.7}
            color="#FF0000"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.05}
            outlineColor="#000000"
          >
            ⚔️ FIGHTING! ⚔️
          </Text>
        </group>
      )}

      {/* Combat Effects */}
      {isFighting && (
        <>
          {/* Sword Clash Effects */}
          {Array.from({ length: 8 }).map((_, i) => {
            const angle = (i / 8) * Math.PI * 2;
            const radius = 2 + Math.random() * 2;
            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;

            return (
              <mesh
                key={i}
                position={[x, Math.random() * 2 + 1, z]}
                rotation={[0, angle, 0]}
              >
                <boxGeometry args={[0.1, 0.8, 0.05]} />
                <meshStandardMaterial
                  color="#FFD700"
                  emissive="#FFD700"
                  emissiveIntensity={0.8}
                />
              </mesh>
            );
          })}

          {/* Energy Sparks */}
          {Array.from({ length: 15 }).map((_, i) => (
            <mesh
              key={i}
              position={[
                (Math.random() - 0.5) * 6,
                Math.random() * 3 + 0.5,
                (Math.random() - 0.5) * 6,
              ]}
            >
              <sphereGeometry args={[0.05]} />
              <meshStandardMaterial
                color="#FF4500"
                emissive="#FF4500"
                emissiveIntensity={1.0}
                transparent
                opacity={0.8}
              />
            </mesh>
          ))}
        </>
      )}

      {/* Arena Banners */}
      {[-5, 5].map((x, i) => (
        <group key={i} position={[x, 3, 0]}>
          <mesh position={[0, 0, 0]} castShadow>
            <boxGeometry args={[0.1, 4, 0.1]} />
            <meshStandardMaterial color="#8B4513" />
          </mesh>
          <mesh position={[0, 2, 0]} castShadow>
            <boxGeometry args={[1.5, 1, 0.05]} />
            <meshStandardMaterial color="#8B0000" />
          </mesh>
        </group>
      ))}

      {/* Arena Torches */}
      {Array.from({ length: 8 }).map((_, i) => {
        const angle = (i / 8) * Math.PI * 2;
        const radius = 5.5;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;

        return (
          <group key={i} position={[x, 0, z]}>
            <mesh position={[0, 1, 0]} castShadow>
              <cylinderGeometry args={[0.1, 0.1, 2, 8]} />
              <meshStandardMaterial color="#8B4513" />
            </mesh>
            <mesh
              ref={(el) => {
                if (el) torchRefs.current[i] = el;
              }}
              position={[0, 2.2, 0]}
              castShadow
            >
              <sphereGeometry args={[0.2]} />
              <meshStandardMaterial
                color="#FF4500"
                emissive="#FF4500"
                emissiveIntensity={0.8}
              />
            </mesh>

            {/* Torch flame particles */}
            {Array.from({ length: 3 }).map((_, j) => (
              <mesh
                key={j}
                position={[
                  (Math.random() - 0.5) * 0.3,
                  2.2 + Math.random() * 0.5,
                  (Math.random() - 0.5) * 0.3,
                ]}
              >
                <sphereGeometry args={[0.05]} />
                <meshStandardMaterial
                  color="#FFD700"
                  emissive="#FFD700"
                  emissiveIntensity={0.9}
                  transparent
                  opacity={0.8}
                />
              </mesh>
            ))}
          </group>
        );
      })}
    </group>
  );
};

export default ArenaBiome;
