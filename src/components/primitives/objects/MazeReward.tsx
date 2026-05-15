import React, { useState } from "react";
import { Text } from "@react-three/drei";
import { RigidBody } from "@react-three/rapier";

interface MazeRewardProps {
  position?: [number, number, number];
  onClaim?: () => void;
  rewardType?: "treasure" | "portal" | "powerup" | "shrine";
}

const MazeReward: React.FC<MazeRewardProps> = ({
  position = [0, 0, 0],
  onClaim,
  rewardType = "treasure",
}) => {
  const [claimed, setClaimed] = useState(false);

  const handleClaim = () => {
    setClaimed(true);
    onClaim?.();
  };

  const getRewardColor = () => {
    switch (rewardType) {
      case "treasure":
        return "#FFD700";
      case "portal":
        return "#9C27B0";
      case "powerup":
        return "#4CAF50";
      case "shrine":
        return "#E3F2FD";
      default:
        return "#FFD700";
    }
  };

  const getRewardEmoji = () => {
    switch (rewardType) {
      case "treasure":
        return "💎";
      case "portal":
        return "🌀";
      case "powerup":
        return "⚡";
      case "shrine":
        return "🕯️";
      default:
        return "💎";
    }
  };

  return (
    <group position={position}>
      {/* Reward Platform */}
      <RigidBody type="fixed" position={[0, 0.1, 0]}>
        <mesh castShadow receiveShadow>
          <cylinderGeometry args={[2, 2, 0.2]} />
          <meshStandardMaterial
            color={getRewardColor()}
            emissive={getRewardColor()}
            emissiveIntensity={claimed ? 0.1 : 0.3}
          />
        </mesh>
      </RigidBody>

      {/* Reward Object */}
      {!claimed && (
        <group position={[0, 1, 0]}>
          {/* Main reward shape */}
          {rewardType === "treasure" && (
            <mesh castShadow>
              <boxGeometry args={[0.8, 0.8, 0.8]} />
              <meshStandardMaterial
                color="#FFD700"
                emissive="#FFD700"
                emissiveIntensity={0.5}
                metalness={0.8}
                roughness={0.2}
              />
            </mesh>
          )}

          {rewardType === "portal" && (
            <mesh castShadow>
              <torusGeometry args={[0.6, 0.3, 16, 32]} />
              <meshStandardMaterial
                color="#9C27B0"
                emissive="#9C27B0"
                emissiveIntensity={0.7}
                transparent
                opacity={0.8}
              />
            </mesh>
          )}

          {rewardType === "powerup" && (
            <mesh castShadow>
              <sphereGeometry args={[0.5, 16, 16]} />
              <meshStandardMaterial
                color="#4CAF50"
                emissive="#4CAF50"
                emissiveIntensity={0.6}
              />
            </mesh>
          )}

          {rewardType === "shrine" && (
            <>
              <mesh castShadow position={[0, 0, 0]}>
                <cylinderGeometry args={[0.3, 0.3, 1]} />
                <meshStandardMaterial color="#E3F2FD" />
              </mesh>
              <mesh castShadow position={[0, 0.6, 0]}>
                <sphereGeometry args={[0.2]} />
                <meshStandardMaterial
                  color="#E3F2FD"
                  emissive="#E3F2FD"
                  emissiveIntensity={0.8}
                />
              </mesh>
            </>
          )}
        </group>
      )}

      {/* Reward Glow */}
      {!claimed && (
        <pointLight
          position={[0, 1.5, 0]}
          color={getRewardColor()}
          intensity={1.5}
          distance={8}
        />
      )}

      {/* Floating particles around reward */}
      {!claimed &&
        Array.from({ length: 6 }).map((_, i) => {
          const angle = (i / 6) * Math.PI * 2;
          const radius = 1.5;
          const x = Math.cos(angle) * radius;
          const z = Math.sin(angle) * radius;
          const y = 1 + Math.sin(Date.now() / 1000 + i) * 0.3;

          return (
            <mesh key={i} position={[x, y, z]}>
              <sphereGeometry args={[0.05]} />
              <meshStandardMaterial
                color={getRewardColor()}
                emissive={getRewardColor()}
                emissiveIntensity={1}
              />
            </mesh>
          );
        })}

      {/* Reward Text */}
      <Text
        position={[0, 2.5, 0]}
        fontSize={0.5}
        color="white"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.03}
        outlineColor="#000000"
      >
        {claimed ? "✓ Claimed" : `${getRewardEmoji()} Maze Reward`}
      </Text>
    </group>
  );
};

export default MazeReward;
