import React, { useState } from "react";
import { Text, Box, Cylinder, Sphere, Html } from "@react-three/drei";
import { RigidBody } from "@react-three/rapier";
import * as THREE from "three";
import RoomActionCards, { type ActionCard } from "../../RoomActionCards";
import { Tile, Stair, Handrail } from "../elements";

interface StairsRoomProps {
  direction?: "up" | "down";
  roomWidth?: number;
  roomHeight?: number;
  minWidth?: number;
  minHeight?: number;
  tileSize?: number;
  showCustomTiles?: boolean;
  onClimb?: () => void;
  onDescend?: () => void;
}

const StairsRoom: React.FC<StairsRoomProps> = ({
  direction = "up",
  roomWidth = 8,
  roomHeight = 6,
  minWidth = 4,
  minHeight = 3,
  tileSize = 0.8,
  showCustomTiles = true,
  onClimb = () => {},
  onDescend = () => {},
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [hasClimbed, setHasClimbed] = useState(false);
  const [hasDescended, setHasDescended] = useState(false);

  const hideCards = () => setIsVisible(false);

  // Procedural staircase generation algorithm
  const generateStaircase = () => {
    // Ensure minimum dimensions
    const actualWidth = Math.max(roomWidth, minWidth);
    const actualHeight = Math.max(roomHeight, minHeight);

    // Calculate step parameters based on room dimensions
    const stepHeight = actualHeight / 20; // 20 steps for full height
    const stepWidth = actualWidth / 8; // 8 steps across the width
    const stepCount = Math.floor(actualHeight / stepHeight);

    // Calculate spiral parameters
    const spiralRadius = Math.min(actualWidth, actualHeight) / 3;
    const totalHeight = stepCount * stepHeight;

    // Calculate opening parameters based on invisible cone
    // Cone starts at floor level and expands upward
    const coneBaseRadius = spiralRadius + stepWidth * 0.5; // Base of cone (floor level) - smaller opening
    const coneTopRadius = coneBaseRadius + totalHeight * 0.2; // Top of cone (expands upward) - less expansion
    const coneHeight = totalHeight + 1; // Height of cone (extends beyond stairs) - shorter cone

    // Opening starts where stairs end
    const openingStartHeight = totalHeight;
    const openingEndHeight = actualHeight; // Use actualHeight instead of roomDims.height

    return {
      stepHeight,
      stepWidth,
      stepCount,
      spiralRadius,
      totalHeight,
      coneBaseRadius,
      coneTopRadius,
      coneHeight,
      openingStartHeight,
      openingEndHeight,
      roomWidth: actualWidth,
      roomHeight: actualHeight,
      roomDepth: actualWidth, // Square room
    };
  };

  const staircase = generateStaircase();
  const roomDims = {
    width: staircase.roomWidth,
    height: staircase.roomHeight,
    depth: staircase.roomDepth,
  };

  // Action cards for the stairs room
  const cards: ActionCard[] = [
    {
      id: direction === "up" ? "climb" : "descend",
      title: direction === "up" ? "Climb Up" : "Go Down",
      description:
        direction === "up"
          ? "Ascend the spiral staircase to reach higher levels"
          : "Descend the spiral staircase to lower levels",
      icon: direction === "up" ? "⬆️" : "⬇️",
      action: () => {
        if (direction === "up") {
          setHasClimbed(true);
          onClimb();
        } else {
          setHasDescended(true);
          onDescend();
        }
        hideCards();
      },
      disabled: direction === "up" ? hasClimbed : hasDescended,
    },
    {
      id: "examine",
      title: "Examine Stairs",
      description: "Study the ancient stone spiral staircase",
      icon: "🔍",
      action: () => {
        console.log(`Examining stone spiral stairs going ${direction}`);
        hideCards();
      },
    },
  ];

  // Stone material properties for the spiral staircase
  const stoneMaterial = {
    color: "#8B7355", // Dark stone color
    roughness: 0.9,
    metalness: 0.1,
  };

  const darkStoneMaterial = {
    color: "#5D4E37", // Darker stone for contrast
    roughness: 0.95,
    metalness: 0.05,
  };

  // Render procedural triangular steps constrained by invisible cone
  const renderStairs = () => {
    const steps = [];
    const startY = direction === "up" ? 0 : -staircase.totalHeight;

    for (let i = 0; i < staircase.stepCount; i++) {
      const angle = (i / staircase.stepCount) * Math.PI * 2 * 1.5; // 1.5 rotations
      const y = startY + i * staircase.stepHeight;

      // Calculate radius based on cone shape at this height
      const heightRatio = (y - startY) / staircase.coneHeight;
      const currentConeRadius =
        staircase.coneBaseRadius +
        (staircase.coneTopRadius - staircase.coneBaseRadius) * heightRatio;
      const radius = Math.min(
        staircase.spiralRadius * 0.8, // Keep stairs closer to center
        currentConeRadius - staircase.stepWidth * 1.5 // More clearance from cone edge
      );

      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;

      // Create triangular step using a custom geometry
      const triangleGeometry = new THREE.ConeGeometry(
        staircase.stepWidth / 2,
        staircase.stepHeight,
        3
      );

      steps.push(
        <RigidBody key={`step-${i}`} type="fixed" position={[x, y, z]}>
          <mesh geometry={triangleGeometry} rotation={[0, angle, 0]}>
            <meshStandardMaterial {...stoneMaterial} />
          </mesh>
        </RigidBody>
      );

      // Add connecting step (rectangular piece)
      if (i < staircase.stepCount - 1) {
        const nextAngle = ((i + 1) / staircase.stepCount) * Math.PI * 2 * 1.5;
        const nextY = startY + (i + 1) * staircase.stepHeight;
        const nextHeightRatio = (nextY - startY) / staircase.coneHeight;
        const nextConeRadius =
          staircase.coneBaseRadius +
          (staircase.coneTopRadius - staircase.coneBaseRadius) *
            nextHeightRatio;
        const nextRadius = Math.min(
          staircase.spiralRadius * 0.8, // Keep stairs closer to center
          nextConeRadius - staircase.stepWidth * 1.5 // More clearance from cone edge
        );

        const nextX = Math.cos(nextAngle) * nextRadius;
        const nextZ = Math.sin(nextAngle) * nextRadius;
        const midX = (x + nextX) / 2;
        const midZ = (z + nextZ) / 2;
        const midAngle = (angle + nextAngle) / 2;

        steps.push(
          <RigidBody
            key={`connector-${i}`}
            type="fixed"
            position={[midX, y + staircase.stepHeight / 2, midZ]}
          >
            <Box
              args={[
                staircase.stepWidth * 0.6,
                staircase.stepHeight * 0.8,
                0.2,
              ]}
              rotation={[0, midAngle, 0]}
            >
              <meshStandardMaterial {...darkStoneMaterial} />
            </Box>
          </RigidBody>
        );
      }
    }

    return steps;
  };

  // Render simple handrail
  const renderHandrail = () => {
    const handrailPieces = [];
    const startY = direction === "up" ? 0 : -staircase.totalHeight;

    for (let i = 0; i < staircase.stepCount; i += 2) {
      // Every other step
      const angle = (i / staircase.stepCount) * Math.PI * 2 * 1.5;
      const radius = staircase.spiralRadius + 1; // Outside the steps
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const y = startY + i * staircase.stepHeight + 1.5; // Height of handrail

      handrailPieces.push(
        <Cylinder
          key={`handrail-${i}`}
          args={[0.1, 0.1, 0.4]}
          position={[x, y, z]}
          rotation={[0, angle, 0]}
        >
          <meshStandardMaterial {...darkStoneMaterial} />
        </Cylinder>
      );
    }

    return handrailPieces;
  };

  // Render custom floor tiles in circular pattern with spiral opening
  const renderFloorTiles = () => {
    if (!showCustomTiles) {
      // Fallback to basic floor
      return (
        <RigidBody type="fixed" position={[0, -0.5, 0]}>
          <Box args={[roomDims.width, 1, roomDims.depth]}>
            <meshStandardMaterial color="#2a2a2a" roughness={0.8} />
          </Box>
        </RigidBody>
      );
    }

    const tiles = [];
    const gridSize = Math.ceil(roomDims.width / tileSize);
    const centerX = 0;
    const centerZ = 0;
    const roomRadius = roomDims.width / 2;
    const openingRadius = staircase.coneBaseRadius;

    for (let x = -gridSize; x <= gridSize; x++) {
      for (let z = -gridSize; z <= gridSize; z++) {
        const tileX = centerX + x * tileSize;
        const tileZ = centerZ + z * tileSize;
        const distanceFromCenter = Math.sqrt(tileX * tileX + tileZ * tileZ);

        // Check if tile is within the square room bounds
        const withinRoomBounds =
          Math.abs(tileX) <= roomDims.width / 2 &&
          Math.abs(tileZ) <= roomDims.depth / 2;

        // Only place tiles within the room bounds and outside the spiral opening
        if (withinRoomBounds && distanceFromCenter >= openingRadius) {
          // Create circular pattern with different zones
          let tileType = "normal";
          let tileHeight = 0.1;
          let tileColor = "#5A5A5A";
          let material = "stone" as const;
          let pattern = "smooth" as const;

          // Define circular zones
          if (distanceFromCenter < openingRadius + 0.5) {
            tileType = "opening_edge";
            tileHeight = 0.15;
            tileColor = "#8B8B8B";
            pattern = "cracked";
          } else if (distanceFromCenter < openingRadius + 1.5) {
            tileType = "inner_ring";
            tileHeight = 0.12;
            tileColor = "#6B6B6B";
            pattern = "tiled";
          } else if (distanceFromCenter < roomRadius - 1) {
            tileType = "middle_ring";
            tileHeight = 0.1;
            tileColor = "#5A5A5A";
            pattern = "smooth";
          } else {
            tileType = "outer_ring";
            tileHeight = 0.08;
            tileColor = "#4A4A4A";
            pattern = "rough";
          }

          // Add some variation based on angle for visual interest
          const angle = Math.atan2(tileZ, tileX);

          // Use custom Tile component
          tiles.push(
            <Tile
              key={`floor-${x}-${z}`}
              position={[tileX, -0.05, tileZ]}
              size={tileSize * 0.9}
              height={tileHeight}
              color={tileColor}
              material={material}
              pattern={pattern}
              rotation={[0, angle, 0]}
              isCollidable={true}
            />
          );
        }
      }
    }

    return tiles;
  };

  return (
    <group>
      {renderFloorTiles()}

      {/* Lighting */}
      <pointLight
        position={[0, roomDims.height - 1, 0]}
        intensity={0.8}
        color="#ffffff"
      />
      <pointLight
        position={[
          -roomDims.width / 3,
          roomDims.height / 2,
          -roomDims.depth / 3,
        ]}
        intensity={0.5}
        color="#87CEEB"
      />
      <pointLight
        position={[roomDims.width / 3, roomDims.height / 2, roomDims.depth / 3]}
        intensity={0.5}
        color="#87CEEB"
      />

      {/* Room Title */}
      <Text
        position={[0, roomDims.height - 1, 0]}
        fontSize={0.8}
        color="white"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.05}
        outlineColor="#000000"
      >
        🪜 SPIRAL STAIRCASE {direction.toUpperCase()} 🪜
      </Text>

      {/* Instructions */}
      <Text
        position={[0, roomDims.height - 1.5, 0]}
        fontSize={0.4}
        color="white"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.03}
        outlineColor="#000000"
      >
        {hasClimbed
          ? "You've reached the top!"
          : hasDescended
          ? "You've reached the bottom!"
          : "Use action cards to navigate the spiral stairs!"}
      </Text>

      {/* Stairs Info */}
      <Text
        position={[0, roomDims.height - 1.8, 0]}
        fontSize={0.3}
        color="#00ff00"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.02}
        outlineColor="#000000"
      >
        Procedural spiral: {staircase.stepCount} steps,{" "}
        {roomDims.width.toFixed(1)}x{roomDims.height.toFixed(1)} room
      </Text>

      {/* Render the spiral staircase */}
      {renderStairs()}

      {/* Render handrail */}
      {renderHandrail()}

      {/* Simple procedural decorations */}
      <>
        {/* Torches around the room */}
        {Array.from({ length: 4 }).map((_, i) => {
          const angle = (i / 4) * Math.PI * 2;
          const radius = staircase.spiralRadius + 2;
          const x = Math.cos(angle) * radius;
          const z = Math.sin(angle) * radius;
          const y = direction === "up" ? 2 : -2;
          return (
            <group key={`torch-${i}`} position={[x, y, z]}>
              <Cylinder args={[0.1, 0.1, 1]} position={[0, 0.5, 0]}>
                <meshStandardMaterial {...darkStoneMaterial} />
              </Cylinder>
              <Sphere args={[0.2]} position={[0, 1.2, 0]}>
                <meshStandardMaterial
                  color="#FF4500"
                  emissive="#FF4500"
                  emissiveIntensity={0.6}
                />
              </Sphere>
            </group>
          );
        })}

        {/* Central support column */}
        <Cylinder
          args={[0.3, 0.3, staircase.totalHeight + 1]}
          position={[0, staircase.totalHeight / 2, 0]}
        >
          <meshStandardMaterial {...darkStoneMaterial} />
        </Cylinder>

        {/* Invisible cone that shapes the stairs and opening */}
        <Cylinder
          args={[
            staircase.coneBaseRadius,
            staircase.coneTopRadius,
            staircase.coneHeight,
          ]}
          position={[0, staircase.coneHeight / 2, 0]}
        >
          <meshStandardMaterial
            color="#000000"
            transparent={true}
            opacity={0}
          />
        </Cylinder>

        {/* Transparent floor opening (only at floor level) */}
        <Cylinder
          args={[staircase.coneBaseRadius, staircase.coneBaseRadius, 0.1]}
          position={[0, 0, 0]}
        >
          <meshStandardMaterial
            color="#000000"
            transparent={true}
            opacity={0}
          />
        </Cylinder>

        {/* Transparent ceiling opening (starts above stairs) */}
        <Cylinder
          args={[staircase.coneTopRadius, staircase.coneTopRadius, 0.1]}
          position={[0, roomDims.height, 0]}
        >
          <meshStandardMaterial
            color="#000000"
            transparent={true}
            opacity={0}
          />
        </Cylinder>
      </>

      {/* Action Cards */}
      <Html
        position={[0, 0, 0]}
        center
        style={{
          pointerEvents: "none", // Let the 3D scene handle interactions
        }}
      >
        <div
          style={{
            position: "absolute",
            bottom: "-200px", // Position below the room
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 1000,
            pointerEvents: "auto", // Re-enable interactions for the cards
          }}
        >
          <RoomActionCards
            cards={cards}
            isVisible={isVisible}
            onCardClick={(card) => {
              if (card.id === "climb") {
                setHasClimbed(true);
                hideCards();
              } else if (card.id === "descend") {
                setHasDescended(true);
                hideCards();
              } else if (card.id === "examine") {
                hideCards();
              }
            }}
          />
        </div>
      </Html>
    </group>
  );
};

export default StairsRoom;
