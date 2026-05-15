import React, { useState, useEffect, useMemo } from "react";
import { RigidBody } from "@react-three/rapier";
import { Text } from "@react-three/drei";
import { Box } from "@react-three/drei";
import * as THREE from "three";
import useGameStore from "../../../store/gameStore";
import { loadTextureFromImage } from "../../../utils/textureUtils";
import withOptionalBreaking from "../../withOptionalBreaking";

interface CrackedDestructibleWallProps {
  position: [number, number, number];
  rotation?: [number, number, number];
  health?: number;
  bombRequired?: boolean;
  onDestroy?: () => void;
  onDamage?: (damage: number) => void;
  // Breaking props
  enabled?: boolean;
  breakingOptions?: any;
  onBreak?: (impactPoint: THREE.Vector3) => void;
  onFragmentClick?: (fragmentId: string) => void;
  showHoverEffect?: boolean;
  hoverColor?: string;
}

const CrackedDestructibleWall: React.FC<CrackedDestructibleWallProps> = ({
  position,
  rotation = [0, 0, 0],
  health = 3,
  bombRequired = false,
  onDestroy,
  onDamage: _onDamage,
  enabled = true,
  breakingOptions,
  onBreak,
  onFragmentClick,
  showHoverEffect = true,
  hoverColor = "#ff6b6b",
}) => {
  const { playerStats, inventory } = useGameStore();
  const [currentHealth, setCurrentHealth] = useState(health);
  const [isDestroyed, setIsDestroyed] = useState(false);
  const [canDestroy, setCanDestroy] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isDamaged, setIsDamaged] = useState(false);
  const [brickTexture, setBrickTexture] = useState(null);

  // Load brick texture
  useEffect(() => {
    loadTextureFromImage("brick")
      .then(setBrickTexture)
      .catch((error) => {
        /* Failed to load brick texture */
      });
  }, []);

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

  // Generate cracked brick positions for the wall
  const brickPositions = useMemo(() => {
    const wallWidth = 2;
    const wallHeight = 3;
    const brickWidth = 0.2;
    const brickHeight = 0.15;
    const brickDepth = 0.5;
    const mortarThickness = 0.01;

    const bricks = [];
    const bricksPerRow = Math.floor(wallWidth / (brickWidth + mortarThickness));
    const rows = Math.floor(wallHeight / (brickHeight + mortarThickness));

    for (let row = 0; row < rows; row++) {
      const isOffsetRow = row % 2 === 1; // Offset every other row
      const rowOffset = isOffsetRow ? (brickWidth + mortarThickness) / 2 : 0;

      for (let col = 0; col < bricksPerRow; col++) {
        const x =
          col * (brickWidth + mortarThickness) -
          wallWidth / 2 +
          rowOffset +
          brickWidth / 2;
        const y =
          row * (brickHeight + mortarThickness) -
          wallHeight / 2 +
          brickHeight / 2;
        const z = 0;

        // Determine crack intensity based on health
        let crackIntensity: "light" | "medium" | "heavy" = "light";
        if (currentHealth <= health * 0.3) {
          crackIntensity = "heavy";
        } else if (currentHealth <= health * 0.6) {
          crackIntensity = "medium";
        }

        bricks.push({
          position: [x, y, z] as [number, number, number],
          size: [brickWidth, brickHeight, brickDepth] as [
            number,
            number,
            number
          ],
          id: `brick-${row}-${col}`,
          crackIntensity,
        });
      }
    }

    return bricks;
  }, [currentHealth, health]);

  const handleDestroyWall = () => {
    if (!canDestroy || isDestroyed) return;

    if (bombRequired) {
      // Use a bomb
      if (playerStats.bombs > 0) {
        // Using bomb from player stats
      } else if (hasBombItem) {
        // Using bomb item
      }
    }

    // Destroy the wall
    setCurrentHealth(0);
    setIsDestroyed(true);
    onDestroy?.();
  };

  const handleBreak = (impactPoint: THREE.Vector3) => {
    if (enabled) {
      // Reduce health when broken
      const newHealth = Math.max(0, currentHealth - 1);
      setCurrentHealth(newHealth);
      setIsDamaged(true);

      if (newHealth === 0) {
        setIsDestroyed(true);
        onDestroy?.();
      }

      onBreak?.(impactPoint);
    }
  };

  if (isDestroyed) return null; // Don't render if destroyed

  // Get wall color based on health
  const getWallColor = () => {
    if (isDamaged) {
      if (currentHealth <= health * 0.3) return "#654321"; // Dark brown for heavy damage
      if (currentHealth <= health * 0.6) return "#8B4513"; // Medium brown for medium damage
      return "#A0522D"; // Light brown for light damage
    }
    return isHovered ? "#A0522D" : "#8B4513";
  };

  const wallContent = (
    <group position={position} rotation={rotation}>
      {/* Cracked brick wall */}
      {brickPositions.map((brick) => (
        <Box key={brick.id} args={brick.size} position={brick.position}>
          <meshStandardMaterial
            color={getWallColor()}
            map={brickTexture}
            roughness={0.8}
            metalness={0.0}
            transparent={false}
          />
        </Box>
      ))}

      {/* Mortar lines between bricks */}
      {brickPositions.map((brick) => (
        <Box
          key={`mortar-${brick.id}`}
          args={[brick.size[0] + 0.01, 0.01, brick.size[2]]}
          position={[
            brick.position[0],
            brick.position[1] + brick.size[1] / 2,
            brick.position[2],
          ]}
        >
          <meshStandardMaterial
            color="#F5F5F5"
            roughness={0.9}
            metalness={0.0}
          />
        </Box>
      ))}

      {/* Crack lines for damaged walls */}
      {isDamaged && (
        <group>
          {Array.from({ length: Math.floor(currentHealth === 0 ? 8 : 4) }).map(
            (_, i) => (
              <Box
                key={`crack-${i}`}
                args={[0.02, 3 * (0.3 + Math.random() * 0.4), 0.01]}
                position={[
                  (Math.random() - 0.5) * 1.8,
                  (Math.random() - 0.5) * 2.5,
                  0.26,
                ]}
              >
                <meshStandardMaterial
                  color="#2F2F2F"
                  transparent
                  opacity={0.6}
                />
              </Box>
            )
          )}
        </group>
      )}

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

  return (
    <RigidBody type="fixed" position={position}>
      <mesh
        rotation={rotation}
        onClick={enabled ? handleBreak : handleDestroyWall}
        onPointerOver={() => setIsHovered(true)}
        onPointerOut={() => setIsHovered(false)}
      >
        {wallContent}
      </mesh>
    </RigidBody>
  );
};

// Create breakable version using HOC
const BreakableCrackedDestructibleWall = withOptionalBreaking(
  CrackedDestructibleWall,
  {
    breakingOptions: {
      fragmentCount: 12,
      fractureImpulse: 1.0,
      minSizeForFracture: 0.3,
      maxSizeForFracture: 0.8,
    },
  }
);

export default BreakableCrackedDestructibleWall;
