import React, { useState } from "react";
import { Text } from "@react-three/drei";
import * as THREE from "three";
import AdvancedMinecraftSign from "../elements/AdvancedMinecraftSign";
import {
  BreakableTile,
  BreakableWall,
  BreakableTable,
  BreakableChair,
  BreakableCandle,
  BreakableStair,
  BreakableChest,
  BreakableBarrel,
  BreakableBookshelf,
  BreakableTorch,
  BreakableCrystal,
  BreakableCeiling,
} from "../elements";

interface CleanBreakableRoomProps {
  onRoomComplete?: () => void;
}

const CleanBreakableRoom: React.FC<CleanBreakableRoomProps> = ({
  onRoomComplete,
}) => {
  const [brokenObjects, setBrokenObjects] = useState<string[]>([]);
  const [totalObjects, setTotalObjects] = useState(0);
  const [fragments, setFragments] = useState<THREE.Mesh[]>([]);
  const [resetKey, setResetKey] = useState(0);
  const [showResetMessage, setShowResetMessage] = useState(false);
  const [breakingEnabled, setBreakingEnabled] = useState(true);

  const handleObjectBreak = (objectId: string) => {
    setBrokenObjects((prev) => {
      if (!prev.includes(objectId)) {
        const newBroken = [...prev, objectId];
        // Object broken
        if (newBroken.length >= totalObjects) {
          // All objects broken! Room complete!
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
    // Fragments can be broken further if needed
  };

  const repairAll = () => {
    setBrokenObjects([]);
    setFragments([]);
    setResetKey((prev) => prev + 1); // Force re-render of all BreakableMesh components
    setShowResetMessage(true);
    // Room reset! All objects restored.

    // Hide reset message after 2 seconds
    setTimeout(() => {
      setShowResetMessage(false);
    }, 2000);
  };

  // Initialize room
  React.useEffect(() => {
    setTotalObjects(17); // Updated count: floor + ceiling + 4 walls + stair + table + chair + candle + chest + barrel + bookshelf + 4 torches + crystal
  }, []);

  // Keyboard handler for reset and breaking toggle
  React.useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "r") {
        // R key pressed - resetting room!
        repairAll();
      }
      if (event.key.toLowerCase() === "b") {
        setBreakingEnabled((prev) => !prev);
        // Breaking toggled
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [breakingEnabled]);

  return (
    <group>
      <Text
        position={[0, 7.5, 0]}
        fontSize={0.8}
        color="white"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.05}
        outlineColor="#000000"
      >
        💥 CLEAN BREAKABLE ROOM 💥
      </Text>
      <Text
        position={[0, 6.5, 0]}
        fontSize={0.4}
        color="yellow"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.03}
        outlineColor="#000000"
      >
        Click objects to break them into interactive fragments!
      </Text>
      <Text
        position={[0, 5.5, 0]}
        fontSize={0.3}
        color="white"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.03}
        outlineColor="#000000"
      >
        Broken: {brokenObjects.length}/{totalObjects} | Fragments:{" "}
        {fragments.length}
      </Text>
      <Text
        position={[0, 4.8, 0]}
        fontSize={0.3}
        color="cyan"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.03}
        outlineColor="#000000"
      >
        Breaking: {breakingEnabled ? "ON" : "OFF"} | Press 'B' to toggle
      </Text>

      {/* Floor */}
      <BreakableTile
        key={`floor_${resetKey}`}
        position={[0, -0.5, 0]}
        size={8}
        height={1}
        color="#4CAF50"
        isCollidable={false}
        enabled={breakingEnabled}
        breakingOptions={{
          fragmentCount: 6,
          fractureImpulse: 1.0,
          onFragmentCreated: handleFragmentCreated,
        }}
        onBreak={() => handleObjectBreak("floor")}
        onFragmentClick={handleFragmentClick}
      />

      {/* Ceiling */}
      <BreakableCeiling
        key={`ceiling_${resetKey}`}
        position={[0, 4.5, 0]}
        width={8}
        height={1}
        depth={8}
        color="#8B4513"
        isCollidable={false}
        enabled={breakingEnabled}
        breakingOptions={{
          fragmentCount: 8,
          fractureImpulse: 1.2,
          onFragmentCreated: handleFragmentCreated,
        }}
        onBreak={() => handleObjectBreak("ceiling")}
        onFragmentClick={handleFragmentClick}
      />

      {/* Wall 1 */}
      <BreakableWall
        key={`wall_1_${resetKey}`}
        position={[4, 2, 0]}
        width={1}
        height={4}
        depth={8}
        color="#8B4513"
        isCollidable={false}
        enabled={breakingEnabled}
        breakingOptions={{
          fragmentCount: 4,
          fractureImpulse: 0.8,
          onFragmentCreated: handleFragmentCreated,
        }}
        onBreak={() => handleObjectBreak("wall_1")}
        onFragmentClick={handleFragmentClick}
      />

      {/* Wall 2 */}
      <BreakableWall
        key={`wall_2_${resetKey}`}
        position={[-4, 2, 0]}
        width={1}
        height={4}
        depth={8}
        color="#8B4513"
        isCollidable={false}
        enabled={breakingEnabled}
        breakingOptions={{
          fragmentCount: 4,
          fractureImpulse: 0.8,
          onFragmentCreated: handleFragmentCreated,
        }}
        onBreak={() => handleObjectBreak("wall_2")}
        onFragmentClick={handleFragmentClick}
      />

      {/* Wall 3 (Back) */}
      <BreakableWall
        key={`wall_3_${resetKey}`}
        position={[0, 2, 4]}
        width={8}
        height={4}
        depth={1}
        color="#8B4513"
        isCollidable={false}
        enabled={breakingEnabled}
        breakingOptions={{
          fragmentCount: 4,
          fractureImpulse: 0.8,
          onFragmentCreated: handleFragmentCreated,
        }}
        onBreak={() => handleObjectBreak("wall_3")}
        onFragmentClick={handleFragmentClick}
      />

      {/* Wall 4 (Front) */}
      <BreakableWall
        key={`wall_4_${resetKey}`}
        position={[0, 2, -4]}
        width={8}
        height={4}
        depth={1}
        color="#8B4513"
        isCollidable={false}
        enabled={breakingEnabled}
        breakingOptions={{
          fragmentCount: 4,
          fractureImpulse: 0.8,
          onFragmentCreated: handleFragmentCreated,
        }}
        onBreak={() => handleObjectBreak("wall_4")}
        onFragmentClick={handleFragmentClick}
      />

      {/* Stair */}
      <BreakableStair
        key={`stair_${resetKey}`}
        position={[0, 0.5, 3]}
        width={2}
        height={1}
        depth={2}
        color="#696969"
        enabled={breakingEnabled}
        breakingOptions={{
          fragmentCount: 3,
          fractureImpulse: 0.6,
          onFragmentCreated: handleFragmentCreated,
        }}
        onBreak={() => handleObjectBreak("stair")}
        onFragmentClick={handleFragmentClick}
      />

      {/* Table */}
      <BreakableTable
        key={`table_${resetKey}`}
        position={[-2, 0.5, 0]}
        enabled={breakingEnabled}
        breakingOptions={{
          fragmentCount: 5,
          fractureImpulse: 0.7,
          onFragmentCreated: handleFragmentCreated,
        }}
        onBreak={() => handleObjectBreak("table")}
        onFragmentClick={handleFragmentClick}
      />

      {/* Chair */}
      <BreakableChair
        key={`chair_${resetKey}`}
        position={[-2, 0.2, 1]}
        enabled={breakingEnabled}
        breakingOptions={{
          fragmentCount: 3,
          fractureImpulse: 0.4,
          onFragmentCreated: handleFragmentCreated,
        }}
        onBreak={() => handleObjectBreak("chair")}
        onFragmentClick={handleFragmentClick}
      />

      {/* Candle */}
      <BreakableCandle
        key={`candle_${resetKey}`}
        position={[2, 1, 0]}
        enabled={breakingEnabled}
        breakingOptions={{
          fragmentCount: 2,
          fractureImpulse: 0.3,
          onFragmentCreated: handleFragmentCreated,
        }}
        onBreak={() => handleObjectBreak("candle")}
        onFragmentClick={handleFragmentClick}
      />

      {/* Additional Furniture */}
      <BreakableChest
        key={`chest_${resetKey}`}
        position={[2, 0, -2]}
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
        position={[-2, 0, -2]}
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

      {/* Torches for lighting */}
      <BreakableTorch
        key={`torch_1_${resetKey}`}
        position={[-3, 0, -3]}
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
        position={[3, 0, -3]}
        enabled={breakingEnabled}
        breakingOptions={{
          fragmentCount: 3,
          fractureImpulse: 0.4,
          onFragmentCreated: handleFragmentCreated,
        }}
        onBreak={() => handleObjectBreak("torch_2")}
        onFragmentClick={handleFragmentClick}
      />

      <BreakableTorch
        key={`torch_3_${resetKey}`}
        position={[-3, 0, 3]}
        enabled={breakingEnabled}
        breakingOptions={{
          fragmentCount: 3,
          fractureImpulse: 0.4,
          onFragmentCreated: handleFragmentCreated,
        }}
        onBreak={() => handleObjectBreak("torch_3")}
        onFragmentClick={handleFragmentClick}
      />

      <BreakableTorch
        key={`torch_4_${resetKey}`}
        position={[3, 0, 3]}
        enabled={breakingEnabled}
        breakingOptions={{
          fragmentCount: 3,
          fractureImpulse: 0.4,
          onFragmentCreated: handleFragmentCreated,
        }}
        onBreak={() => handleObjectBreak("torch_4")}
        onFragmentClick={handleFragmentClick}
      />

      {/* Magical crystal in center */}
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

      {/* Instructions - Minecraft Style Signs */}
      <group position={[0, 2, 0]}>
        <AdvancedMinecraftSign
          position={[-3, 0, 0]}
          lines={["CONTROLS:", "Click objects to break", "them into fragments"]}
          textColor="#FFFFFF"
          signColor="#8B4513"
          fontSize={0.2}
          scale={[1, 1, 1]}
        />

        <AdvancedMinecraftSign
          position={[0, 0, 0]}
          lines={["KEYBOARD:", "B: toggle breaking", "R: reset room"]}
          textColor="#00FFFF"
          signColor="#654321"
          fontSize={0.2}
          scale={[1, 1, 1]}
        />

        <AdvancedMinecraftSign
          position={[3, 0, 0]}
          lines={["DEBUG:", "Check console for", "debug information"]}
          textColor="#FFFF00"
          signColor="#8B7355"
          fontSize={0.2}
          scale={[1, 1, 1]}
        />
      </group>

      {brokenObjects.length >= totalObjects && (
        <AdvancedMinecraftSign
          position={[0, 4, 0]}
          lines={["🎉 ROOM COMPLETE! 🎉"]}
          textColor="#FFD700"
          signColor="#8B4513"
          fontSize={0.4}
          scale={[1.5, 1.5, 1.5]}
          glowEffect={true}
        />
      )}

      {showResetMessage && (
        <AdvancedMinecraftSign
          position={[0, 4.5, 0]}
          lines={["🔄 ROOM RESET! 🔄"]}
          textColor="#00FF00"
          signColor="#654321"
          fontSize={0.35}
          scale={[1.3, 1.3, 1.3]}
          glowEffect={true}
        />
      )}

      {/* Reset Button */}
      <group position={[0, 2, 0]}>
        <mesh
          position={[0, 0, 0]}
          onClick={() => {
            // Object broken"Reset button clicked!");
            repairAll();
          }}
          onPointerOver={() => {
            document.body.style.cursor = "pointer";
          }}
          onPointerOut={() => {
            document.body.style.cursor = "default";
          }}
        >
          <boxGeometry args={[1.5, 0.3, 0.1]} />
          <meshStandardMaterial
            color={breakingEnabled ? "#4CAF50" : "#ff4444"}
            transparent
            opacity={0.8}
          />
        </mesh>
        <Text
          position={[0, 0, 0.06]}
          fontSize={0.15}
          color="white"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.02}
          outlineColor="#000000"
        >
          🔄 RESET (R) | B: {breakingEnabled ? "OFF" : "ON"}
        </Text>
      </group>
    </group>
  );
};

export default CleanBreakableRoom;
