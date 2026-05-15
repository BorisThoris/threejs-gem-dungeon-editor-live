import React, { useState } from "react";
import { Text } from "@react-three/drei";
import * as THREE from "three";
import { CrackedBrick } from "../elements";
import { CrackedDestructibleWall } from "../objects";

interface CrackedBrickDemoProps {
  onRoomComplete?: () => void;
}

const CrackedBrickDemo: React.FC<CrackedBrickDemoProps> = ({
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
    setTotalObjects(8); // 6 cracked bricks + 2 destructible walls
  }, []);

  // Keyboard handler for reset and breaking toggle
  React.useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key === "r" || event.key === "R") {
        repairAll();
      } else if (event.key === "b" || event.key === "B") {
        setBreakingEnabled((prev) => !prev);
        // Breaking toggled
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [breakingEnabled]);

  return (
    <group key={resetKey}>
      {/* Floor */}
      <mesh position={[0, -0.5, 0]} receiveShadow>
        <boxGeometry args={[20, 1, 20]} />
        <meshStandardMaterial color="#8B7355" />
      </mesh>

      {/* Ceiling */}
      <mesh position={[0, 4.5, 0]} receiveShadow>
        <boxGeometry args={[20, 1, 20]} />
        <meshStandardMaterial color="#D2B48C" />
      </mesh>

      {/* Walls */}
      <mesh position={[0, 2, -10]} receiveShadow>
        <boxGeometry args={[20, 4, 1]} />
        <meshStandardMaterial color="#A0A0A0" />
      </mesh>
      <mesh position={[0, 2, 10]} receiveShadow>
        <boxGeometry args={[20, 4, 1]} />
        <meshStandardMaterial color="#A0A0A0" />
      </mesh>
      <mesh position={[-10, 2, 0]} receiveShadow>
        <boxGeometry args={[1, 4, 20]} />
        <meshStandardMaterial color="#A0A0A0" />
      </mesh>
      <mesh position={[10, 2, 0]} receiveShadow>
        <boxGeometry args={[1, 4, 20]} />
        <meshStandardMaterial color="#A0A0A0" />
      </mesh>

      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[10, 10, 5]}
        intensity={1}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />

      {/* Cracked Brick Wall 1 - Light cracks */}
      <CrackedDestructibleWall
        position={[-6, 1.5, -8]}
        rotation={[0, 0, 0]}
        health={3}
        bombRequired={false}
        enabled={breakingEnabled}
        breakingOptions={{
          fragmentCount: 8,
          fractureImpulse: 1.0,
          minSizeForFracture: 0.3,
          maxSizeForFracture: 0.8,
          onFragmentCreated: handleFragmentCreated,
        }}
        onBreak={(impactPoint) => {
          handleObjectBreak("wall-1");
          // Fragment clicked"Wall 1 broken at:", impactPoint);
        }}
        onFragmentClick={handleFragmentClick}
        onDestroy={() => {
          handleObjectBreak("wall-1");
          // Fragment clicked"Wall 1 destroyed!");
        }}
      />

      {/* Cracked Brick Wall 2 - Heavy cracks */}
      <CrackedDestructibleWall
        position={[6, 1.5, -8]}
        rotation={[0, 0, 0]}
        health={2}
        bombRequired={true}
        enabled={breakingEnabled}
        breakingOptions={{
          fragmentCount: 10,
          fractureImpulse: 1.2,
          minSizeForFracture: 0.2,
          maxSizeForFracture: 0.6,
          onFragmentCreated: handleFragmentCreated,
        }}
        onBreak={(impactPoint) => {
          handleObjectBreak("wall-2");
          // Fragment clicked"Wall 2 broken at:", impactPoint);
        }}
        onFragmentClick={handleFragmentClick}
        onDestroy={() => {
          handleObjectBreak("wall-2");
          // Fragment clicked"Wall 2 destroyed!");
        }}
      />

      {/* Individual Cracked Bricks scattered around */}
      <CrackedBrick
        position={[-3, 0.5, -5]}
        crackIntensity="light"
        size={[0.8, 0.4, 0.4]}
        enabled={breakingEnabled}
        breakingOptions={{
          fragmentCount: 6,
          fractureImpulse: 0.8,
          minSizeForFracture: 0.2,
          maxSizeForFracture: 0.6,
          onFragmentCreated: handleFragmentCreated,
        }}
        onBreak={(impactPoint) => {
          handleObjectBreak("brick-1");
          // Fragment clicked"Brick 1 broken at:", impactPoint);
        }}
        onFragmentClick={handleFragmentClick}
      />

      <CrackedBrick
        position={[0, 0.5, -5]}
        crackIntensity="medium"
        size={[0.8, 0.4, 0.4]}
        enabled={breakingEnabled}
        breakingOptions={{
          fragmentCount: 8,
          fractureImpulse: 0.8,
          minSizeForFracture: 0.2,
          maxSizeForFracture: 0.6,
          onFragmentCreated: handleFragmentCreated,
        }}
        onBreak={(impactPoint) => {
          handleObjectBreak("brick-2");
          // Fragment clicked"Brick 2 broken at:", impactPoint);
        }}
        onFragmentClick={handleFragmentClick}
      />

      <CrackedBrick
        position={[3, 0.5, -5]}
        crackIntensity="heavy"
        size={[0.8, 0.4, 0.4]}
        enabled={breakingEnabled}
        breakingOptions={{
          fragmentCount: 10,
          fractureImpulse: 0.8,
          minSizeForFracture: 0.2,
          maxSizeForFracture: 0.6,
          onFragmentCreated: handleFragmentCreated,
        }}
        onBreak={(impactPoint) => {
          handleObjectBreak("brick-3");
          // Fragment clicked"Brick 3 broken at:", impactPoint);
        }}
        onFragmentClick={handleFragmentClick}
      />

      <CrackedBrick
        position={[-3, 0.5, 0]}
        crackIntensity="light"
        size={[0.8, 0.4, 0.4]}
        enabled={breakingEnabled}
        breakingOptions={{
          fragmentCount: 6,
          fractureImpulse: 0.8,
          minSizeForFracture: 0.2,
          maxSizeForFracture: 0.6,
          onFragmentCreated: handleFragmentCreated,
        }}
        onBreak={(impactPoint) => {
          handleObjectBreak("brick-4");
          // Fragment clicked"Brick 4 broken at:", impactPoint);
        }}
        onFragmentClick={handleFragmentClick}
      />

      <CrackedBrick
        position={[0, 0.5, 0]}
        crackIntensity="medium"
        size={[0.8, 0.4, 0.4]}
        enabled={breakingEnabled}
        breakingOptions={{
          fragmentCount: 8,
          fractureImpulse: 0.8,
          minSizeForFracture: 0.2,
          maxSizeForFracture: 0.6,
          onFragmentCreated: handleFragmentCreated,
        }}
        onBreak={(impactPoint) => {
          handleObjectBreak("brick-5");
          // Fragment clicked"Brick 5 broken at:", impactPoint);
        }}
        onFragmentClick={handleFragmentClick}
      />

      <CrackedBrick
        position={[3, 0.5, 0]}
        crackIntensity="heavy"
        size={[0.8, 0.4, 0.4]}
        enabled={breakingEnabled}
        breakingOptions={{
          fragmentCount: 10,
          fractureImpulse: 0.8,
          minSizeForFracture: 0.2,
          maxSizeForFracture: 0.6,
          onFragmentCreated: handleFragmentCreated,
        }}
        onBreak={(impactPoint) => {
          handleObjectBreak("brick-6");
          // Fragment clicked"Brick 6 broken at:", impactPoint);
        }}
        onFragmentClick={handleFragmentClick}
      />

      {/* Instructions */}
      <Text
        position={[0, 3.5, 0]}
        fontSize={0.8}
        color="white"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.05}
        outlineColor="#000000"
      >
        🧱 Cracked Brick Demo 🧱
      </Text>

      <Text
        position={[0, 2.8, 0]}
        fontSize={0.4}
        color="white"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.03}
        outlineColor="#000000"
      >
        Click to break cracked bricks and walls!
      </Text>

      <Text
        position={[0, 2.4, 0]}
        fontSize={0.3}
        color="white"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.02}
        outlineColor="#000000"
      >
        R = Reset | B = Toggle Breaking
      </Text>

      {/* Progress indicator */}
      <Text
        position={[0, 2.0, 0]}
        fontSize={0.4}
        color="white"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.03}
        outlineColor="#000000"
      >
        Broken: {brokenObjects.length}/{totalObjects}
      </Text>

      {/* Reset message */}
      {showResetMessage && (
        <Text
          position={[0, 1.6, 0]}
          fontSize={0.5}
          color="#00FF00"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.03}
          outlineColor="#000000"
        >
          Room Reset!
        </Text>
      )}

      {/* Render fragments */}
      {fragments.map((fragment, index) => (
        <primitive
          key={`fragment-${index}`}
          object={fragment}
          onClick={(event: any) => {
            event.stopPropagation();
            handleFragmentClick(`fragment-${index}`);
          }}
        />
      ))}
    </group>
  );
};

export default CrackedBrickDemo;
