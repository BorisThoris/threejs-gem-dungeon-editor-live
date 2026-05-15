import React, { useState, useRef, useEffect, useCallback } from "react";
import * as THREE from "three";
import { Text, Html } from "@react-three/drei";
import { RigidBody } from "@react-three/rapier";
import { useFrame } from "@react-three/fiber";
import { useConsolidatedGameStore } from "../../../store/consolidatedGameStore";
import { getBiomeScale } from "../../../utils/biomeScaling";
// Removed action cards imports
import Table from "../elements/Table";
import EnhancedPressurePlate from "../objects/EnhancedPressurePlate";
import { Candle } from "../elements";

interface PressurePlatePuzzleBiomeProps {
  size?: number;
  onPuzzleComplete?: () => void;
  onRoomComplete?: () => void;
  onDoorsLock?: () => void;
  onDoorsUnlock?: () => void;
  isVisible?: boolean;
  dragMode?: boolean;
}

const PressurePlatePuzzleBiome: React.FC<PressurePlatePuzzleBiomeProps> = ({
  size = 10,
  onPuzzleComplete,
  onRoomComplete,
  onDoorsLock,
  onDoorsUnlock,
  isVisible = true,
  dragMode = false,
}) => {
  const biomeSize = size * 2; // Simple scaling for now
  const { playerStats, loseLife, addPoints, addExperience } =
    useConsolidatedGameStore();

  // Pressure plate puzzle state
  const [pressurePlatePressed, setPressurePlatePressed] = useState(false);
  const [hasAward, setHasAward] = useState(true);
  // Use dragMode prop instead of local state
  const interactionMode = dragMode;

  // Initial candle positions - no longer managed as state
  const initialCandlePositions: [number, number, number][] = [
    [-1.2, 0.5, -0.8], // Left candle
    [1.2, 0.5, -0.8], // Right candle
    [-1.2, 0.5, 0.8], // Back left candle
    [1.2, 0.5, 0.8], // Back right candle
  ];

  const [candlesLit, setCandlesLit] = useState([true, true, true, true]);

  // Debug text animation refs
  const debugTextRefs = useRef<THREE.Group[]>([]);

  // Pressure plate puzzle functions
  const handlePressurePlatePress = () => {
    setPressurePlatePressed(true);
    console.log("Pressure plate pressed!");
  };

  const handlePressurePlateRelease = () => {
    setPressurePlatePressed(false);
    console.log("Pressure plate released!");
  };

  const handleAwardGrabbed = () => {
    if (!pressurePlatePressed) {
      // Player grabbed award without pressing plate - take damage!
      console.log(
        "Player grabbed award without pressing plate - taking damage!"
      );
      loseLife();
    } else {
      // Player grabbed award safely
      console.log("Player grabbed award safely!");
      setHasAward(false);
      addPoints(100);
      addExperience(50);
      onPuzzleComplete?.();
    }
  };

  const handlePlateFullyRaised = () => {
    // Plate reached 100% - damage the player!
    console.log("Plate fully raised - player takes damage!");
    loseLife();
  };

  // Interaction mode is now controlled by the global dragMode prop

  // Animate floating text
  useFrame((state) => {
    const time = state.clock.getElapsedTime();

    // Animate debug text floating
    debugTextRefs.current.forEach((textRef, index) => {
      if (textRef) {
        const floatOffset = Math.sin(time * 1.5 + index * 0.5) * 0.05;
        const baseY = 2.2 - index * 0.3;
        textRef.position.y = baseY + floatOffset;

        // Add subtle rotation
        textRef.rotation.y = Math.sin(time * 0.8 + index) * 0.1;

        // Add gentle pulsing scale
        const pulseScale = 1 + Math.sin(time * 2 + index) * 0.05;
        textRef.scale.setScalar(pulseScale);
      }
    });
  });

  // Action cards removed

  return (
    <group>
      {/* Floor */}
      <RigidBody type="fixed" position={[0, -0.5, 0]}>
        <mesh receiveShadow>
          <boxGeometry args={[biomeSize, 1, biomeSize]} />
          <meshStandardMaterial color="#4a4a4a" />
        </mesh>
      </RigidBody>

      {/* Central Table */}
      <Table
        position={[0, 0, 0]}
        size={[3, 0.1, 2] as [number, number, number]}
        color="#8B4513"
        legColor="#654321"
        castShadow={true}
      />

      {/* Pressure Plate on the table */}
      <EnhancedPressurePlate
        position={[0, 1.0, 0]}
        scale={0.8}
        isPressed={pressurePlatePressed}
        onPress={handlePressurePlatePress}
        onRelease={handlePressurePlateRelease}
        onItemGrabbed={handleAwardGrabbed}
        onPlateFullyRaised={handlePlateFullyRaised}
        hasAward={hasAward}
        awardType="bag"
        canGrabAward={true}
        showAward={hasAward}
        label="Treasure Plate"
        weight={0.5}
      />

      {/* Movable Candles around the table */}
      {initialCandlePositions.map((position, index) => (
        <Candle
          key={index}
          position={position}
          isLit={candlesLit[index]}
          onLight={() => {
            const newCandlesLit = [...candlesLit];
            newCandlesLit[index] = true;
            setCandlesLit(newCandlesLit);
          }}
          onExtinguish={() => {
            const newCandlesLit = [...candlesLit];
            newCandlesLit[index] = false;
            setCandlesLit(newCandlesLit);
          }}
          weight={0.3}
        />
      ))}

      {/* Immersive Game Text Above Table */}
      <group
        ref={(el) => {
          if (el) debugTextRefs.current[0] = el;
        }}
      >
        <Text
          position={[0, 0, 0]}
          fontSize={0.2}
          color="#FFD700"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.02}
          outlineColor="#000000"
        >
          {hasAward
            ? "✨ Ancient treasure awaits... ✨"
            : "🎉 Treasure claimed! The ancient magic is yours! 🎉"}
        </Text>
      </group>

      {/* Pressure Plate Instructions */}
      {hasAward && (
        <group
          ref={(el) => {
            if (el) debugTextRefs.current[1] = el;
          }}
        >
          <Text
            position={[0, 0, 0]}
            fontSize={0.15}
            color="#FF9800"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.02}
            outlineColor="#000000"
          >
            {pressurePlatePressed
              ? "✨ Plate is pressed! Safe to grab the treasure!"
              : "⚠️ Press the plate before grabbing the treasure!"}
          </Text>
        </group>
      )}

      {/* Interaction Mode Toggle */}
      <group
        ref={(el) => {
          if (el) debugTextRefs.current[2] = el;
        }}
      >
        <Text
          position={[0, 0, 0]}
          fontSize={0.12}
          color={interactionMode ? "#4CAF50" : "#9E9E9E"}
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.02}
          outlineColor="#000000"
        >
          🖱️ Use your hand to grab and move candles!
        </Text>
      </group>

      {/* Candle Status */}
      {!candlesLit.every((lit) => lit) && (
        <group
          ref={(el) => {
            if (el) debugTextRefs.current[3] = el;
          }}
        >
          <Text
            position={[0, 0, 0]}
            fontSize={0.12}
            color="#FF6B6B"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.02}
            outlineColor="#000000"
          >
            🔥 Some candles have gone out...
          </Text>
        </group>
      )}

      {/* Action Cards removed */}
    </group>
  );
};

export default PressurePlatePuzzleBiome;
