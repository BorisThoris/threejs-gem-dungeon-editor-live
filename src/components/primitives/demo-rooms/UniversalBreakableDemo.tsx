import React, { useState } from "react";
import { Text } from "@react-three/drei";
import * as THREE from "three";
import {
  // Structural elements
  BreakableTile,
  BreakableWall,
  BreakableCeiling,
  BreakablePlank,
  BreakableStair,
  BreakableHandrail,
  // Room elements
  BreakableTorch,
  BreakableCandle,
  BreakableBarrel,
  BreakableChest,
  BreakableTable,
  BreakableChair,
  BreakableBookshelf,
  BreakablePotionBottle,
  BreakableCrystal,
  BreakableSkull,
  // Interactive components
  BreakableItemSprite,
  BreakableDestructibleWall,
  BreakableDoor,
} from "../elements";
import { createBreakableComponent } from "../../UniversalBreakableWrapper";

interface UniversalBreakableDemoProps {
  onRoomComplete?: () => void;
}

const UniversalBreakableDemo: React.FC<UniversalBreakableDemoProps> = ({
  onRoomComplete,
}) => {
  const [breakingEnabled, setBreakingEnabled] = useState(false);
  const [brokenObjects, setBrokenObjects] = useState<string[]>([]);
  const [totalObjects, setTotalObjects] = useState(0);
  const [fragments, setFragments] = useState<THREE.Mesh[]>([]);
  const [resetKey, setResetKey] = useState(0);
  const [showResetMessage, setShowResetMessage] = useState(false);

  const handleObjectBreak = (objectId: string) => {
    setBrokenObjects((prev) => {
      if (!prev.includes(objectId)) {
        const newBroken = [...prev, objectId];
        if (newBroken.length >= totalObjects) {
          onRoomComplete?.();
        }
        return newBroken;
      }
      return prev;
    });
  };

  const handleFragmentCreated = (newFragments: any[]) => {
    const meshes = newFragments.map((f) => f.mesh);
    setFragments((prev) => [...prev, ...meshes]);
    // Added new fragments
  };

  const handleFragmentClick = (fragmentId: string) => {
    // Fragment clicked
  };

  const repairAll = () => {
    setBrokenObjects([]);
    setFragments([]);
    setResetKey((prev) => prev + 1);
    setShowResetMessage(true);
    // Room reset! All objects restored.

    setTimeout(() => {
      setShowResetMessage(false);
    }, 2000);
  };

  // Initialize room
  React.useEffect(() => {
    setTotalObjects(25); // Total number of breakable objects in this demo
  }, []);

  // Keyboard handler for toggle breaking and reset
  React.useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "b") {
        setBreakingEnabled((prev) => !prev);
        // Breaking toggled
      }
      if (event.key.toLowerCase() === "r") {
        // R key pressed - resetting room!
        repairAll();
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [breakingEnabled]);

  return (
    <group>
      {/* Info Text */}
      <group position={[0, 8, 0]}>
        <Text
          position={[0, 0, 0]}
          fontSize={0.6}
          color="white"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.05}
          outlineColor="#000000"
        >
          🌍 Universal Breakable Demo
        </Text>
        <Text
          position={[0, -0.8, 0]}
          fontSize={0.3}
          color="white"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.03}
          outlineColor="#000000"
        >
          ALL 3D objects have optional breaking (disabled by default)
        </Text>
        <Text
          position={[0, -1.6, 0]}
          fontSize={0.3}
          color="white"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.03}
          outlineColor="#000000"
        >
          Press 'B' to toggle breaking | Press 'R' to reset
        </Text>
        <Text
          position={[0, -2.4, 0]}
          fontSize={0.4}
          color="cyan"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.05}
          outlineColor="#000000"
        >
          Breaking: {breakingEnabled ? "ON" : "OFF"} | Broken:{" "}
          {brokenObjects.length}/{totalObjects} | Fragments: {fragments.length}
        </Text>
      </group>

      {/* Floor */}
      <BreakableTile
        key={`floor_${resetKey}`}
        position={[0, -0.5, 0]}
        size={10}
        height={1}
        color="#4CAF50"
        enabled={breakingEnabled}
        breakingOptions={{
          fragmentCount: 8,
          fractureImpulse: 1.2,
          onFragmentCreated: handleFragmentCreated,
        }}
        onBreak={() => handleObjectBreak("floor")}
        onFragmentClick={handleFragmentClick}
      />

      {/* Ceiling */}
      <BreakableCeiling
        key={`ceiling_${resetKey}`}
        position={[0, 5, 0]}
        width={10}
        height={1}
        depth={10}
        color="#8B4513"
        enabled={breakingEnabled}
        breakingOptions={{
          fragmentCount: 10,
          fractureImpulse: 1.5,
          onFragmentCreated: handleFragmentCreated,
        }}
        onBreak={() => handleObjectBreak("ceiling")}
        onFragmentClick={handleFragmentClick}
      />

      {/* Walls */}
      <BreakableWall
        key={`wall_1_${resetKey}`}
        position={[5, 2.5, 0]}
        width={1}
        height={5}
        depth={10}
        color="#8B4513"
        enabled={breakingEnabled}
        breakingOptions={{
          fragmentCount: 8,
          fractureImpulse: 1.2,
          onFragmentCreated: handleFragmentCreated,
        }}
        onBreak={() => handleObjectBreak("wall_1")}
        onFragmentClick={handleFragmentClick}
      />

      <BreakableWall
        key={`wall_2_${resetKey}`}
        position={[-5, 2.5, 0]}
        width={1}
        height={5}
        depth={10}
        color="#8B4513"
        enabled={breakingEnabled}
        breakingOptions={{
          fragmentCount: 8,
          fractureImpulse: 1.2,
          onFragmentCreated: handleFragmentCreated,
        }}
        onBreak={() => handleObjectBreak("wall_2")}
        onFragmentClick={handleFragmentClick}
      />

      <BreakableWall
        key={`wall_3_${resetKey}`}
        position={[0, 2.5, 5]}
        width={10}
        height={5}
        depth={1}
        color="#8B4513"
        enabled={breakingEnabled}
        breakingOptions={{
          fragmentCount: 8,
          fractureImpulse: 1.2,
          onFragmentCreated: handleFragmentCreated,
        }}
        onBreak={() => handleObjectBreak("wall_3")}
        onFragmentClick={handleFragmentClick}
      />

      <BreakableWall
        key={`wall_4_${resetKey}`}
        position={[0, 2.5, -5]}
        width={10}
        height={5}
        depth={1}
        color="#8B4513"
        enabled={breakingEnabled}
        breakingOptions={{
          fragmentCount: 8,
          fractureImpulse: 1.2,
          onFragmentCreated: handleFragmentCreated,
        }}
        onBreak={() => handleObjectBreak("wall_4")}
        onFragmentClick={handleFragmentClick}
      />

      {/* Furniture */}
      <BreakableTable
        key={`table_${resetKey}`}
        position={[0, 0, 0]}
        enabled={breakingEnabled}
        breakingOptions={{
          fragmentCount: 6,
          fractureImpulse: 0.6,
          onFragmentCreated: handleFragmentCreated,
        }}
        onBreak={() => handleObjectBreak("table")}
        onFragmentClick={handleFragmentClick}
      />

      <BreakableChair
        key={`chair_1_${resetKey}`}
        position={[-1, 0, 1]}
        enabled={breakingEnabled}
        breakingOptions={{
          fragmentCount: 6,
          fractureImpulse: 0.6,
          onFragmentCreated: handleFragmentCreated,
        }}
        onBreak={() => handleObjectBreak("chair_1")}
        onFragmentClick={handleFragmentClick}
      />

      <BreakableChair
        key={`chair_2_${resetKey}`}
        position={[1, 0, 1]}
        enabled={breakingEnabled}
        breakingOptions={{
          fragmentCount: 6,
          fractureImpulse: 0.6,
          onFragmentCreated: handleFragmentCreated,
        }}
        onBreak={() => handleObjectBreak("chair_2")}
        onFragmentClick={handleFragmentClick}
      />

      <BreakableChest
        key={`chest_${resetKey}`}
        position={[3, 0, 0]}
        enabled={breakingEnabled}
        breakingOptions={{
          fragmentCount: 6,
          fractureImpulse: 0.6,
          onFragmentCreated: handleFragmentCreated,
        }}
        onBreak={() => handleObjectBreak("chest")}
        onFragmentClick={handleFragmentClick}
      />

      <BreakableBarrel
        key={`barrel_${resetKey}`}
        position={[-3, 0, 0]}
        enabled={breakingEnabled}
        breakingOptions={{
          fragmentCount: 6,
          fractureImpulse: 0.6,
          onFragmentCreated: handleFragmentCreated,
        }}
        onBreak={() => handleObjectBreak("barrel")}
        onFragmentClick={handleFragmentClick}
      />

      <BreakableBookshelf
        key={`bookshelf_${resetKey}`}
        position={[0, 0, -3]}
        enabled={breakingEnabled}
        breakingOptions={{
          fragmentCount: 6,
          fractureImpulse: 0.6,
          onFragmentCreated: handleFragmentCreated,
        }}
        onBreak={() => handleObjectBreak("bookshelf")}
        onFragmentClick={handleFragmentClick}
      />

      {/* Small decorative objects */}
      <BreakableTorch
        key={`torch_1_${resetKey}`}
        position={[-4, 0, -4]}
        enabled={breakingEnabled}
        breakingOptions={{
          fragmentCount: 3,
          fractureImpulse: 0.4,
          onFragmentCreated: handleFragmentCreated,
        }}
        onBreak={() => handleObjectBreak("torch_1")}
        onFragmentClick={handleFragmentClick}
      />

      <BreakableTorch
        key={`torch_2_${resetKey}`}
        position={[4, 0, -4]}
        enabled={breakingEnabled}
        breakingOptions={{
          fragmentCount: 3,
          fractureImpulse: 0.4,
          onFragmentCreated: handleFragmentCreated,
        }}
        onBreak={() => handleObjectBreak("torch_2")}
        onFragmentClick={handleFragmentClick}
      />

      <BreakableCandle
        key={`candle_1_${resetKey}`}
        position={[-0.5, 0.4, 0]}
        enabled={breakingEnabled}
        breakingOptions={{
          fragmentCount: 3,
          fractureImpulse: 0.4,
          onFragmentCreated: handleFragmentCreated,
        }}
        onBreak={() => handleObjectBreak("candle_1")}
        onFragmentClick={handleFragmentClick}
      />

      <BreakableCandle
        key={`candle_2_${resetKey}`}
        position={[0.5, 0.4, 0]}
        enabled={breakingEnabled}
        breakingOptions={{
          fragmentCount: 3,
          fractureImpulse: 0.4,
          onFragmentCreated: handleFragmentCreated,
        }}
        onBreak={() => handleObjectBreak("candle_2")}
        onFragmentClick={handleFragmentClick}
      />

      <BreakablePotionBottle
        key={`potion_1_${resetKey}`}
        position={[-0.3, 0.4, -0.3]}
        color="#ff0000"
        enabled={breakingEnabled}
        breakingOptions={{
          fragmentCount: 3,
          fractureImpulse: 0.4,
          onFragmentCreated: handleFragmentCreated,
        }}
        onBreak={() => handleObjectBreak("potion_1")}
        onFragmentClick={handleFragmentClick}
      />

      <BreakablePotionBottle
        key={`potion_2_${resetKey}`}
        position={[0.3, 0.4, -0.3]}
        color="#00ff00"
        enabled={breakingEnabled}
        breakingOptions={{
          fragmentCount: 3,
          fractureImpulse: 0.4,
          onFragmentCreated: handleFragmentCreated,
        }}
        onBreak={() => handleObjectBreak("potion_2")}
        onFragmentClick={handleFragmentClick}
      />

      <BreakableCrystal
        key={`crystal_${resetKey}`}
        position={[0, 1.5, 0]}
        color="#ff00ff"
        enabled={breakingEnabled}
        breakingOptions={{
          fragmentCount: 3,
          fractureImpulse: 0.4,
          onFragmentCreated: handleFragmentCreated,
        }}
        onBreak={() => handleObjectBreak("crystal")}
        onFragmentClick={handleFragmentClick}
      />

      <BreakableSkull
        key={`skull_${resetKey}`}
        position={[0, 0.2, -1.5]}
        enabled={breakingEnabled}
        breakingOptions={{
          fragmentCount: 3,
          fractureImpulse: 0.4,
          onFragmentCreated: handleFragmentCreated,
        }}
        onBreak={() => handleObjectBreak("skull")}
        onFragmentClick={handleFragmentClick}
      />

      {/* Interactive components */}
      <BreakableItemSprite
        key={`item_${resetKey}`}
        item={{
          id: "test-gem",
          name: "Test Gem",
          type: "gem",
          value: 100,
          position: [2, 1, 2],
        }}
        position={[2, 1, 2]}
        enabled={breakingEnabled}
        breakingOptions={{
          fragmentCount: 3,
          fractureImpulse: 0.4,
          onFragmentCreated: handleFragmentCreated,
        }}
        onBreak={() => handleObjectBreak("item")}
        onFragmentClick={handleFragmentClick}
      />

      <BreakableDestructibleWall
        key={`destructible_wall_${resetKey}`}
        position={[0, 1, 3]}
        health={3}
        enabled={breakingEnabled}
        breakingOptions={{
          fragmentCount: 8,
          fractureImpulse: 1.2,
          onFragmentCreated: handleFragmentCreated,
        }}
        onBreak={() => handleObjectBreak("destructible_wall")}
        onFragmentClick={handleFragmentClick}
      />

      <BreakableDoor
        key={`door_${resetKey}`}
        position={[0, 1, -3]}
        enabled={breakingEnabled}
        breakingOptions={{
          fragmentCount: 6,
          fractureImpulse: 1.0,
          onFragmentCreated: handleFragmentCreated,
        }}
        onBreak={() => handleObjectBreak("door")}
        onFragmentClick={handleFragmentClick}
      />

      {/* Reset Button */}
      <group position={[0, 3, 0]}>
        <mesh
          position={[0, 0, 0]}
          onClick={() => {
            // Reset button clicked!
            repairAll();
          }}
          onPointerOver={() => {
            document.body.style.cursor = "pointer";
          }}
          onPointerOut={() => {
            document.body.style.cursor = "default";
          }}
        >
          <boxGeometry args={[2, 0.4, 0.1]} />
          <meshStandardMaterial
            color={breakingEnabled ? "#4CAF50" : "#ff4444"}
            transparent
            opacity={0.8}
          />
        </mesh>
        <Text
          position={[0, 0, 0.06]}
          fontSize={0.2}
          color="white"
          anchorX="center"
          anchorY="middle"
        >
          RESET (R) | B: {breakingEnabled ? "OFF" : "ON"}
        </Text>
      </group>

      {brokenObjects.length >= totalObjects && (
        <Text
          position={[0, 6, 0]}
          fontSize={0.8}
          color="gold"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.05}
          outlineColor="#000000"
        >
          🎉 ALL OBJECTS BROKEN! 🎉
        </Text>
      )}

      {showResetMessage && (
        <Text
          position={[0, 6.8, 0]}
          fontSize={0.6}
          color="lime"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.05}
          outlineColor="#000000"
        >
          🔄 ROOM RESET! 🔄
        </Text>
      )}
    </group>
  );
};

export default UniversalBreakableDemo;
