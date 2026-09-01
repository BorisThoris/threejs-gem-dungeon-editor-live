import React, { Suspense, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Physics, RigidBody } from "@react-three/rapier";
import { Environment } from "@react-three/drei";
import { useCameraController } from "../hooks/useCameraController";
import { Player } from "./Player";
import { SafeSpawnArea } from "./SafeSpawnArea";
import UnifiedRoomManager from "./UnifiedRoomManager";
import RoomDetection from "./RoomDetection";
import MapUI from "./MapUI";
import Minimap from "./Minimap";
import Cursor from "./Cursor";
import PauseMenu from "./PauseMenu";
import EventDrivenActionCards from "./EventDrivenActionCards";
import SharedNavigation from "./SharedNavigation";
// WallToggleProvider removed - now using Zustand store
import useGameStore from "../store/gameStore";
import useMapStore from "../store/mapStore";
import { domUIManager } from "../utils/domUIManager";
import { uiEvents, UI_EVENTS } from "../utils/uiEvents";
import GameInitializer from "./GameInitializer";

// First-person controls handled by FirstPersonPlayer component

// A trimesh built from a plane has zero thickness, so a fast-moving body can
// pass straight through it. Every floor in the game is a solid box instead.
const GROUND_THICKNESS = 1;

// Ground Plane Component
const Ground: React.FC = () => {
  return (
    <RigidBody type="fixed" colliders="cuboid">
      <mesh position={[0, -2 - GROUND_THICKNESS / 2, 0]} receiveShadow>
        <boxGeometry args={[50, GROUND_THICKNESS, 50]} />
        <meshLambertMaterial color="#2d5016" />
      </mesh>
    </RigidBody>
  );
};

// Safety Floor - very large invisible catch plane to prevent falling
const SafetyFloor: React.FC = () => {
  return (
    <RigidBody type="fixed" colliders="cuboid">
      <mesh position={[0, -11, 0]} visible={false}>
        <boxGeometry args={[2000, 2, 2000]} />
        <meshBasicMaterial color="#000000" transparent opacity={0} />
      </mesh>
    </RigidBody>
  );
};

// Main Scene Component
const GhostScene: React.FC = () => {
  // Mount centralized camera controller to handle programmatic rotations
  useCameraController();
  return (
    <>
      {/* Environment. Isolated: if the HDR is slow or missing it must not stop
          the player and floors from mounting. */}
      <Suspense fallback={null}>
        <Environment files="./night.hdr" ground={{ scale: 100 }} />
      </Suspense>

      {/* Lighting */}
      <ambientLight intensity={0.2} />
      <directionalLight
        intensity={0.7}
        castShadow
        shadow-bias={-0.0004}
        position={[-20, 20, 20]}
      >
        <orthographicCamera attach="shadow-camera" args={[-20, 20, 20, -20]} />
      </directionalLight>

      {/* Physics World */}
      {/*
        Fixed timestep, not "vary": a variable timestep hands Rapier the whole
        wall-clock delta after any hitch, which integrates a huge amount of
        gravity in a single step and tunnels the player straight through the
        floor.
      */}
      <Physics timeStep={1 / 60} gravity={[0, -9.81, 0]}>
        {/* The player and the floors mount first and unconditionally. Anything
            that loads an asset goes inside its own Suspense boundary below, so
            a slow font or texture can never leave the player standing in an
            empty world - or, as it did, stop the scene mounting at all. */}
        <Player initialSpawnPosition={[0, 1.5, 0]} showDebugInfo={false} />
        <Ground />
        <SafetyFloor />

        {/* Must stay outside the Suspense boundaries below: when it lived
            inside the room subtree, a suspending texture permanently killed the
            detection loop. */}
        <RoomDetection />

        <Suspense fallback={null}>
          <SafeSpawnArea position={[0, 0, 0]} size={8} />
        </Suspense>

        <Suspense fallback={null}>
          {/* Room Instance Manager - Single room at a time */}
          <UnifiedRoomManager />
        </Suspense>
      </Physics>
    </>
  );
};

const StartScreenContent: React.FC = () => {
  const { inventory, useItem: consumeItem } = useGameStore();
  const [isPaused, setIsPaused] = React.useState(false);

  // Initialize DOM UI manager
  React.useEffect(() => {
    domUIManager.init();

    // Listen for item use events from DOM UI
    const handleItemUse = (event: CustomEvent) => {
      consumeItem(event.detail.id);
    };

    window.addEventListener("itemUse", handleItemUse as EventListener);

    return () => {
      window.removeEventListener("itemUse", handleItemUse as EventListener);
      domUIManager.destroy();
    };
  }, [consumeItem]);

  // Map generation is owned by UnifiedRoomManager. Generating it here too meant
  // two different maps were produced on boot and the one the player ended up in
  // was whichever finished last.

  // Update UI when inventory changes (throttled)
  React.useEffect(() => {
    const timeoutId = setTimeout(() => {
      uiEvents.emit(UI_EVENTS.INVENTORY_UPDATE, inventory);
    }, 100); // Throttle updates

    return () => clearTimeout(timeoutId);
  }, [inventory]);

  // Player stats are now handled by ref-based state (no React re-renders)

  // Item use is now handled by DOM UI manager

  // Handle pause/unpause
  const handlePause = () => {
    setIsPaused(true);
  };

  const handleUnpause = () => {
    setIsPaused(false);
  };

  // Listen for X key to pause/unpause
  React.useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key === "x" || event.key === "X") {
        if (isPaused) {
          handleUnpause();
        } else {
          handlePause();
        }
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [isPaused]);

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        margin: 0,
        padding: 0,
        overflow: "hidden",
        background: "linear-gradient(to bottom, #87CEEB 0%, #98D8E8 100%)",
        position: "fixed",
        top: 0,
        left: 0,
        cursor: "none", // Hide default cursor
      }}
    >
      {!isPaused &&
        (() => {
          return (
            <Canvas
              shadows
              style={{
                width: "100%",
                height: "100%",
                background: "transparent",
                display: "block",
                cursor: "default", // Show default cursor in free hand mode
              }}
              gl={{
                antialias: true,
                alpha: true,
                powerPreference: "high-performance",
                stencil: false,
                depth: true,
              }}
              camera={{
                fov: 95,
                position: [0, 5, 0],
                rotation: [0, -Math.PI / 2, 0], // Look straight ahead
              }}
              dpr={[1, 2]}
              performance={{ min: 0.5 }}
              onCreated={({ gl, scene, camera }) => {
                // Canvas created successfully
              }}
            >
              <GhostScene />
            </Canvas>
          );
        })()}

      {/* Event-Driven Action Cards */}
      <EventDrivenActionCards />

      {/* Map UI Overlay */}
      <MapUI />

      {/* Minimap */}
      <Minimap />

      {/* Cursor - Outside Canvas so it's always visible */}
      {!isPaused && <Cursor />}

      {/* Pause Menu */}
      <PauseMenu isVisible={isPaused} onUnpause={handleUnpause} />

      {/* Shared Navigation */}
      {import.meta.env.DEV && <SharedNavigation currentPage="game" />}

      {/* UI is now handled by DOM UI Manager - no React re-renders */}
    </div>
  );
};

const StartScreen: React.FC = () => {
  return (
    <GameInitializer>
      <StartScreenContent />
    </GameInitializer>
  );
};

export default StartScreen;
