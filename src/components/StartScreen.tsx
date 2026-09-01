import React, { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Physics, RigidBody } from "@react-three/rapier";
import { Environment } from "@react-three/drei";
import { useCameraController } from "../hooks/useCameraController";
import { Player } from "./Player";
import { SafeSpawnArea } from "./SafeSpawnArea";
import UnifiedRoomManager from "./UnifiedRoomManager";
import RoomDetection from "./RoomDetection";
import GamepadLook from "./GamepadLook";
import RunManager from "./RunManager";
import RunSummary from "./RunSummary";
import GameAudio from "./GameAudio";
import GameHUD from "./GameHUD";
import MainMenu from "./MainMenu";
import MapUI from "./MapUI";
import Minimap from "./Minimap";
import Cursor from "./Cursor";
import PauseMenu from "./PauseMenu";
import EventDrivenActionCards from "./EventDrivenActionCards";
import SharedNavigation from "./SharedNavigation";
// WallToggleProvider removed - now using Zustand store
import { useConsolidatedGameStore } from "../store/consolidatedGameStore";
import { domUIManager } from "../utils/domUIManager";
import { gameEvents, GAME_EVENTS } from "../utils/gameEvents";
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
        <GamepadLook />
        <RunManager />

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

interface StartScreenContentProps {
  onQuitToMenu: () => void;
}

const StartScreenContent: React.FC<StartScreenContentProps> = ({
  onQuitToMenu,
}) => {
  const [isPaused, setIsPaused] = useState(false);

  // Mirrors `isPaused` for the key handler, so the listener can be registered
  // once instead of being torn down and rebuilt on every pause.
  const pausedRef = useRef(false);
  // Whether movement was the player's to have before the pause. Restoring it
  // blindly would hand control back to a player whose run RunManager has
  // already ended, or who is mid room-transition.
  const movementBeforePause = useRef(true);
  // A finished run owns the screen (RunSummary); pausing on top of it does
  // nothing useful.
  const runOver = useRef(false);

  // Initialize DOM UI manager (mouse-look indicator + controls line)
  useEffect(() => {
    domUIManager.init();
    return () => {
      domUIManager.destroy();
    };
  }, []);

  // Map generation is owned by GameInitializer.

  const pause = useCallback(() => {
    if (pausedRef.current || runOver.current) return;
    pausedRef.current = true;

    const store = useConsolidatedGameStore.getState();
    movementBeforePause.current = store.isMovementEnabled;
    store.disableMovement();
    setIsPaused(true);
  }, []);

  const unpause = useCallback(() => {
    if (!pausedRef.current) return;
    pausedRef.current = false;

    // Only give movement back if the pause is what took it away.
    if (movementBeforePause.current && !runOver.current) {
      useConsolidatedGameStore.getState().enableMovement();
    }
    setIsPaused(false);
  }, []);

  const quitToMenu = useCallback(() => {
    pausedRef.current = false;
    setIsPaused(false);
    useConsolidatedGameStore.getState().enableMovement();
    onQuitToMenu();
  }, [onQuitToMenu]);

  // A run that has already been decided must not be un-frozen by an unpause.
  useEffect(() => {
    const end = () => {
      runOver.current = true;
      pausedRef.current = false;
      setIsPaused(false);
    };
    const start = () => {
      runOver.current = false;
    };

    const offWon = gameEvents.on(GAME_EVENTS.RUN_WON, end);
    const offLost = gameEvents.on(GAME_EVENTS.RUN_LOST, end);
    const offStarted = gameEvents.on(GAME_EVENTS.RUN_STARTED, start);
    return () => {
      offWon();
      offLost();
      offStarted();
    };
  }, []);

  // Escape is what players reach for; X is kept because the old build used it.
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" && event.key !== "x" && event.key !== "X") {
        return;
      }
      // Overlays that own Escape (the fullscreen map, the puzzle screens)
      // call preventDefault on it. They register their window listener after
      // this one, so the flag is only trustworthy once the whole dispatch has
      // finished - hence the deferral. Closing an overlay must not also pause.
      setTimeout(() => {
        if (event.defaultPrevented) return;
        if (pausedRef.current) {
          unpause();
        } else {
          pause();
        }
      }, 0);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [pause, unpause]);

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
      {/*
        The Canvas stays mounted for the whole session. Unmounting it on pause
        - which is what this did - threw away the physics world, the player
        body and every loaded room, so "pause" silently restarted the run at
        the spawn point. Gameplay is frozen through the store instead, and the
        pause menu is drawn over the top.
      */}
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
      >
        <GhostScene />
      </Canvas>

      {/* Heads-up display - lives, gems and the current room, straight from
          the consolidated store. */}
      <GameHUD />

      {/* Sound effects, synthesised - no audio files to ship or license. */}
      <GameAudio />

      {/* Event-Driven Action Cards */}
      <EventDrivenActionCards />

      {/* Map UI Overlay */}
      <MapUI />

      {/* Minimap */}
      <Minimap />

      {/* Cursor - Outside Canvas so it's always visible */}
      {!isPaused && <Cursor />}

      {/* End-of-run screen */}
      <RunSummary />

      {/* Pause Menu */}
      <PauseMenu
        isVisible={isPaused}
        onUnpause={unpause}
        onQuitToMenu={quitToMenu}
      />

      {/* Shared Navigation */}
      {import.meta.env.DEV && <SharedNavigation currentPage="game" />}
    </div>
  );
};

const StartScreen: React.FC = () => {
  const [inMenu, setInMenu] = useState(true);

  if (inMenu) {
    return <MainMenu onStartGame={() => setInMenu(false)} />;
  }

  return (
    <GameInitializer>
      <StartScreenContent onQuitToMenu={() => setInMenu(true)} />
    </GameInitializer>
  );
};

export default StartScreen;
