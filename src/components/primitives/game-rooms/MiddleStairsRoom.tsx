import React, { useState } from "react";
import { Text, Box, Cylinder, Sphere, Html } from "@react-three/drei";
import { RigidBody } from "@react-three/rapier";
import * as THREE from "three";
import RoomActionCards, { type ActionCard } from "../../RoomActionCards";
import { Tile, Stair, Handrail } from "../elements";

interface MiddleStairsRoomProps {
  position?: "middle" | "top" | "bottom";
  roomWidth?: number;
  roomHeight?: number;
  minWidth?: number;
  minHeight?: number;
  tileSize?: number;
  showCustomTiles?: boolean;
  onClimb?: () => void;
  onDescend?: () => void;
}

const MiddleStairsRoom: React.FC<MiddleStairsRoomProps> = ({
  position = "middle",
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
    const coneBaseRadius = spiralRadius + stepWidth * 0.5;
    const coneTopRadius = coneBaseRadius + totalHeight * 0.2;
    const coneHeight = totalHeight + 1;

    return {
      stepHeight,
      stepWidth,
      stepCount,
      spiralRadius,
      totalHeight,
      coneBaseRadius,
      coneTopRadius,
      coneHeight,
      roomWidth: actualWidth,
      roomHeight: actualHeight,
      roomDepth: actualWidth,
    };
  };

  const staircase = generateStaircase();
  const roomDims = {
    width: staircase.roomWidth,
    height: staircase.roomHeight,
    depth: staircase.roomDepth,
  };

  // Action cards based on position
  const cards: ActionCard[] = [
    {
      id: "climb",
      title: "Climb Up",
      description: "Ascend to the next level",
      icon: "⬆️",
    },
    {
      id: "descend",
      title: "Go Down",
      description: "Descend to the previous level",
      icon: "⬇️",
    },
    {
      id: "examine",
      title: "Examine Stairs",
      description: "Study the connecting staircase",
      icon: "🔍",
    },
  ];

  // Materials
  const stoneMaterial = {
    color: "#8B8B8B",
    roughness: 0.8,
    metalness: 0.1,
  };

  const darkStoneMaterial = {
    color: "#5A5A5A",
    roughness: 0.9,
    metalness: 0.05,
  };

  // Render procedural triangular steps
  const renderStairs = () => {
    const steps = [];
    const startY = 0; // Always start at floor level for middle stairs

    for (let i = 0; i < staircase.stepCount; i++) {
      const angle = (i / staircase.stepCount) * Math.PI * 2 * 1.5; // 1.5 rotations
      const y = startY + i * staircase.stepHeight;

      // Calculate radius based on cone shape at this height
      const heightRatio = (y - startY) / staircase.coneHeight;
      const currentConeRadius =
        staircase.coneBaseRadius +
        (staircase.coneTopRadius - staircase.coneBaseRadius) * heightRatio;
      const radius = Math.min(
        staircase.spiralRadius * 0.8,
        currentConeRadius - staircase.stepWidth * 1.5
      );

      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;

      // Create triangular step
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

      // Add connecting step
      if (i < staircase.stepCount - 1) {
        const nextAngle = ((i + 1) / staircase.stepCount) * Math.PI * 2 * 1.5;
        const nextY = startY + (i + 1) * staircase.stepHeight;
        const nextHeightRatio = (nextY - startY) / staircase.coneHeight;
        const nextConeRadius =
          staircase.coneBaseRadius +
          (staircase.coneTopRadius - staircase.coneBaseRadius) *
            nextHeightRatio;
        const nextRadius = Math.min(
          staircase.spiralRadius * 0.8,
          nextConeRadius - staircase.stepWidth * 1.5
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

  // Render handrail
  const renderHandrail = () => {
    const handrailPieces = [];
    const handrailHeight = 0.8;
    const handrailRadius = 0.05;

    for (let i = 0; i < staircase.stepCount; i++) {
      const angle = (i / staircase.stepCount) * Math.PI * 2 * 1.5;
      const y = i * staircase.stepHeight + handrailHeight;

      const heightRatio = (y - 0) / staircase.coneHeight;
      const currentConeRadius =
        staircase.coneBaseRadius +
        (staircase.coneTopRadius - staircase.coneBaseRadius) * heightRatio;
      const radius = Math.min(
        staircase.spiralRadius * 0.8,
        currentConeRadius - staircase.stepWidth * 1.5
      );

      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;

      handrailPieces.push(
        <RigidBody key={`handrail-${i}`} type="fixed" position={[x, y, z]}>
          <Cylinder args={[handrailRadius, handrailRadius, 0.3]}>
            <meshStandardMaterial {...darkStoneMaterial} />
          </Cylinder>
        </RigidBody>
      );
    }

    return handrailPieces;
  };

  // Render custom floor tiles
  const renderFloorTiles = () => {
    if (!showCustomTiles) {
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

        const withinRoomBounds =
          Math.abs(tileX) <= roomDims.width / 2 &&
          Math.abs(tileZ) <= roomDims.depth / 2;

        if (withinRoomBounds && distanceFromCenter >= openingRadius) {
          let tileType = "normal";
          let tileHeight = 0.1;
          let tileColor = "#5A5A5A";

          if (distanceFromCenter < openingRadius + 0.5) {
            tileType = "opening_edge";
            tileHeight = 0.15;
            tileColor = "#8B8B8B";
          } else if (distanceFromCenter < openingRadius + 1.5) {
            tileType = "inner_ring";
            tileHeight = 0.12;
            tileColor = "#6B6B6B";
          } else if (distanceFromCenter < roomRadius - 1) {
            tileType = "middle_ring";
            tileHeight = 0.1;
            tileColor = "#5A5A5A";
          } else {
            tileType = "outer_ring";
            tileHeight = 0.08;
            tileColor = "#4A4A4A";
          }

          const angle = Math.atan2(tileZ, tileX);

          if (tileType === "opening_edge") {
            const triangleGeometry = new THREE.ConeGeometry(
              tileSize * 0.4,
              tileHeight,
              3
            );
            tiles.push(
              <RigidBody
                key={`floor-${x}-${z}`}
                type="fixed"
                position={[tileX, -0.05, tileZ]}
              >
                <mesh geometry={triangleGeometry} rotation={[0, angle, 0]}>
                  <meshStandardMaterial
                    color={tileColor}
                    roughness={0.8}
                    metalness={0.1}
                  />
                </mesh>
              </RigidBody>
            );
          } else {
            tiles.push(
              <RigidBody
                key={`floor-${x}-${z}`}
                type="fixed"
                position={[tileX, -0.05, tileZ]}
              >
                <Box args={[tileSize * 0.9, tileHeight, tileSize * 0.9]}>
                  <meshStandardMaterial
                    color={tileColor}
                    roughness={0.8}
                    metalness={0.1}
                  />
                </Box>
              </RigidBody>
            );
          }
        }
      }
    }

    return tiles;
  };

  // Render custom ceiling tiles with position-based openings
  const renderCeilingTiles = () => {
    if (!showCustomTiles) {
      const topRadius = roomDims.width / 2;
      return (
        <>
          <RigidBody type="fixed" position={[0, roomDims.height + 0.5, 0]}>
            <Box args={[roomDims.width, 1, roomDims.depth]}>
              <meshStandardMaterial color="#1a1a1a" roughness={0.9} />
            </Box>
          </RigidBody>
          {/* Top opening - only for middle and bottom positions */}
          {(position === "middle" || position === "bottom") && (
            <Cylinder
              args={[staircase.coneTopRadius, staircase.coneTopRadius, 1.2]}
              position={[0, roomDims.height + 0.1, 0]}
            >
              <meshStandardMaterial
                color="#000000"
                transparent={true}
                opacity={0}
              />
            </Cylinder>
          )}
        </>
      );
    }

    const tiles = [];
    const gridSize = Math.ceil(roomDims.width / tileSize);
    const centerX = 0;
    const centerZ = 0;
    const ceilingY = roomDims.height - 0.1;
    const roomRadius = roomDims.width / 2;

    // Calculate opening radius at ceiling level
    const heightRatio = (ceilingY - 0) / staircase.coneHeight;
    const openingRadius =
      staircase.coneBaseRadius +
      (staircase.coneTopRadius - staircase.coneBaseRadius) * heightRatio;

    for (let x = -gridSize; x <= gridSize; x++) {
      for (let z = -gridSize; z <= gridSize; z++) {
        const tileX = centerX + x * tileSize;
        const tileZ = centerZ + z * tileSize;
        const distanceFromCenter = Math.sqrt(tileX * tileX + tileZ * tileZ);

        const withinRoomBounds =
          Math.abs(tileX) <= roomDims.width / 2 &&
          Math.abs(tileZ) <= roomDims.depth / 2;

        // Only create opening for middle and bottom positions
        const shouldHaveOpening =
          position === "middle" || position === "bottom";
        const isInOpening =
          shouldHaveOpening && distanceFromCenter < openingRadius;

        if (withinRoomBounds && !isInOpening) {
          let tileType = "normal";
          let tileHeight = 0.1;
          let tileColor = "#4A4A4A";

          if (shouldHaveOpening && distanceFromCenter < openingRadius + 0.5) {
            tileType = "opening_edge";
            tileHeight = 0.15;
            tileColor = "#6B6B6B";
          } else if (
            shouldHaveOpening &&
            distanceFromCenter < openingRadius + 1.5
          ) {
            tileType = "inner_ring";
            tileHeight = 0.12;
            tileColor = "#5B5B5B";
          } else if (distanceFromCenter < roomRadius - 1) {
            tileType = "middle_ring";
            tileHeight = 0.1;
            tileColor = "#4A4A4A";
          } else {
            tileType = "outer_ring";
            tileHeight = 0.08;
            tileColor = "#3A3A3A";
          }

          const angle = Math.atan2(tileZ, tileX);

          if (tileType === "opening_edge") {
            const triangleGeometry = new THREE.ConeGeometry(
              tileSize * 0.4,
              tileHeight,
              3
            );
            tiles.push(
              <RigidBody
                key={`ceiling-${x}-${z}`}
                type="fixed"
                position={[tileX, ceilingY, tileZ]}
              >
                <mesh geometry={triangleGeometry} rotation={[0, angle, 0]}>
                  <meshStandardMaterial
                    color={tileColor}
                    roughness={0.9}
                    metalness={0.05}
                  />
                </mesh>
              </RigidBody>
            );
          } else {
            tiles.push(
              <RigidBody
                key={`ceiling-${x}-${z}`}
                type="fixed"
                position={[tileX, ceilingY, tileZ]}
              >
                <Box args={[tileSize * 0.9, tileHeight, tileSize * 0.9]}>
                  <meshStandardMaterial
                    color={tileColor}
                    roughness={0.9}
                    metalness={0.05}
                  />
                </Box>
              </RigidBody>
            );
          }
        }
      }
    }

    return tiles;
  };

  // Render floor opening for top and middle positions
  const renderFloorOpening = () => {
    if (position === "top") return null; // Top position has no floor opening

    return (
      <Cylinder
        args={[staircase.coneBaseRadius, staircase.coneBaseRadius, 0.1]}
        position={[0, 0, 0]}
      >
        <meshStandardMaterial color="#000000" transparent={true} opacity={0} />
      </Cylinder>
    );
  };

  return (
    <group>
      {renderFloorTiles()}

      {/* Floor Opening - only for middle and top positions */}
      {renderFloorOpening()}

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
        intensity={0.4}
        color="#ffaa00"
      />
      <pointLight
        position={[roomDims.width / 3, roomDims.height / 2, roomDims.depth / 3]}
        intensity={0.4}
        color="#ffaa00"
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
        🪜 {position.toUpperCase()} STAIRS 🪜
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
        {position === "top"
          ? "Top level - descend to continue"
          : position === "bottom"
          ? "Bottom level - climb to continue"
          : "Middle level - climb up or descend down"}
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
        {position} staircase: {staircase.stepCount} steps,{" "}
        {roomDims.width.toFixed(1)}x{roomDims.height.toFixed(1)} room
      </Text>

      {/* Render the spiral staircase */}
      {renderStairs()}

      {/* Render handrail */}
      {renderHandrail()}

      {/* Decorations */}
      <>
        {/* Torches around the room */}
        {Array.from({ length: 4 }).map((_, i) => {
          const angle = (i / 4) * Math.PI * 2;
          const radius = staircase.spiralRadius + 2;
          const x = Math.cos(angle) * radius;
          const z = Math.sin(angle) * radius;
          const y = 2;
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
      </>

      {/* Action Cards */}
      <Html
        position={[0, 0, 0]}
        center
        style={{
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            position: "absolute",
            bottom: "-200px",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 1000,
            pointerEvents: "auto",
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

export default MiddleStairsRoom;
