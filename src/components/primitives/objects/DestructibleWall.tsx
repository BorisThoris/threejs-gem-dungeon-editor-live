import React, { useState, useEffect, useMemo } from "react";
import { RigidBody } from "@react-three/rapier";
import { Text } from "@react-three/drei";
import useGameStore from "../../../store/gameStore";

interface DestructibleWallProps {
  position: [number, number, number];
  rotation?: [number, number, number];
  health?: number;
  bombRequired?: boolean;
  onDestroy?: () => void;
  onDamage?: (damage: number) => void;
}

const DestructibleWall: React.FC<DestructibleWallProps> = ({
  position,
  rotation = [0, 0, 0],
  health = 3,
  bombRequired = false,
  onDestroy,
  onDamage: _onDamage,
}) => {
  const { playerStats, inventory } = useGameStore();
  const [currentHealth, setCurrentHealth] = useState(health);
  const [isDestroyed, setIsDestroyed] = useState(false);
  const [canDestroy, setCanDestroy] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isDamaged] = useState(false); // For visual feedback, not fully implemented

  // Check if player can destroy the wall
  useEffect(() => {
    if (bombRequired) {
      const hasBomb =
        playerStats.bombs > 0 ||
        inventory?.some((item: any) => item.id === "bomb");
      setCanDestroy(hasBomb && !isDestroyed);
    } else {
      setCanDestroy(!isDestroyed);
    }
  }, [playerStats.bombs, inventory, bombRequired, isDestroyed]);

  // Create a stable reference for inventory check
  const hasBombItem = useMemo(() => {
    return inventory?.some((item: any) => item.id === "bomb") || false;
  }, [inventory]);

  const handleDestroyWall = () => {
    if (!canDestroy || isDestroyed) return;

    if (bombRequired) {
      // Use a bomb
      if (playerStats.bombs > 0) {
        // This will be handled by the parent component
        // Using bomb from player stats
      } else if (hasBombItem) {
        // This will be handled by the parent component
        // Using bomb item
      }
    }

    // Destroy the wall
    setCurrentHealth(0);
    setIsDestroyed(true);
    onDestroy?.();
  };

  if (isDestroyed) return null; // Don't render if destroyed

  return (
    <group position={position} rotation={rotation}>
      {/* Wall Panel - Clickable */}
      <RigidBody type="fixed" colliders="cuboid">
        <mesh
          onClick={handleDestroyWall}
          onPointerOver={() => setIsHovered(true)}
          onPointerOut={() => setIsHovered(false)}
        >
          <boxGeometry args={[2, 3, 0.5]} />
          <meshLambertMaterial
            color={
              isDamaged
                ? "#FF0000"
                : currentHealth === health
                ? isHovered
                  ? "#A0522D"
                  : "#8B4513"
                : "#A0522D"
            }
          />
        </mesh>
      </RigidBody>

      {/* Interaction Prompt */}
      {isHovered && (
        <Text
          position={[0, 2, 0]}
          fontSize={0.5}
          color="white"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.05}
          outlineColor="#000000"
        >
          {bombRequired
            ? canDestroy
              ? "💣 Click to bomb"
              : "💣 Bomb required"
            : "Cracked wall - click to break"}
        </Text>
      )}

      {/* Health Bar (simple visual) */}
      {isHovered && currentHealth > 0 && (
        <group position={[0, 1.5, 0.3]}>
          {/* Health Bar Background */}
          <mesh>
            <boxGeometry args={[1.6, 0.1, 0.05]} />
            <meshBasicMaterial color="#333333" />
          </mesh>
          {/* Health Bar Fill */}
          <mesh position={[0, 0, 0.05]}>
            <boxGeometry args={[(currentHealth / health) * 1.5, 0.08, 0.05]} />
            <meshBasicMaterial color="#00FF00" />
          </mesh>
        </group>
      )}

      {/* Visual indicator when hovered */}
      {isHovered && (
        <mesh position={[0, 0, 0.3]}>
          <boxGeometry args={[2.3, 3.3, 0.1]} />
          <meshBasicMaterial
            color={bombRequired ? "#FF4500" : "#FFD700"}
            transparent
            opacity={0.25}
          />
        </mesh>
      )}

      {/* Bomb icon tag for bomb-required walls */}
      {bombRequired && !isDestroyed && (
        <group position={[0, 2.6, 0.3]}>
          <mesh>
            <boxGeometry args={[0.8, 0.3, 0.05]} />
            <meshBasicMaterial color="#FF4500" />
          </mesh>
          <Text
            position={[0, 0, 0.06]}
            fontSize={0.25}
            color="#FFFFFF"
            anchorX="center"
            anchorY="middle"
          >
            💣
          </Text>
        </group>
      )}

      {/* Damage Particles (simple visual) */}
      {isDamaged &&
        Array.from({ length: 5 }).map((_, i) => (
          <mesh
            key={i}
            position={[
              Math.random() * 2 - 1,
              Math.random() * 2,
              Math.random() * 0.5,
            ]}
          >
            <sphereGeometry args={[0.1, 4, 4]} />
            <meshBasicMaterial color="#FF4500" transparent opacity={0.8} />
          </mesh>
        ))}
    </group>
  );
};

export default DestructibleWall;
