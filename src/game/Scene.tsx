import { Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";

import { readGamepad } from "./input/gamepad";
import { Player } from "./player/Player";
// Registers what each room kind puts inside its shell.
import "./rooms/content";
import "./puzzles/register";
import { GroundPlane } from "./rooms/GroundPlane";
import { Anisotropy } from "./textures/Anisotropy";
import { Room } from "./rooms/Room";
import { useCurrentRoom, useRun } from "./state/run";
import { WardenDriver } from "./warden/WardenDriver";
import { CAMERA_FOV, PLAYER_SPAWN_Y, floorRules } from "./world";

/**
 * Start on a pad toggles pause. Read here, in the frame loop, because the
 * pad's rising edges are computed once per poll: reading it from a timer
 * as well would consume edges the player and the triggers never saw.
 */
function PadPause() {
  useFrame(() => {
    const pad = readGamepad();
    const run = useRun.getState();
    if (pad.slot1Pressed) run.useItem(0);
    if (pad.slot2Pressed) run.useItem(1);
    if (!pad.pausePressed) return;
    if (run.phase !== "playing" || run.inputLocks > 0) return;
    if (run.paused) run.resume();
    else run.pause();
  });
  return null;
}

/**
 * The light the whole floor is seen by, from the floor's own rules.
 *
 * Its own component for the same reason RoomWarden is: subscribing Scene to
 * the floor would re-render the Canvas's children on every descent, and the
 * only things that need the new numbers are three lights and the fog.
 */
function FloorLight() {
  const light = useRun((s) => floorRules(s.floor).light);
  return (
    <>
      {/* Depth cue only: the far wall of the largest room is still visible. */}
      <fog attach="fog" args={["#050608", 10, light.fogFar]} />
      <ambientLight intensity={light.ambient} />
      <hemisphereLight args={[light.sky, "#3a3126", light.ambient * 0.86]} />
    </>
  );
}

function CurrentRoom() {
  const room = useCurrentRoom();
  const seed = useRun((s) => s.dungeon?.seed ?? 0);
  if (!room) return null;
  // Keyed by floor and id so a new room is a fresh mount, never a patched
  // old one - every floor has a room called "start".
  return <Room key={`${seed}:${room.id}`} room={room} seed={seed} />;
}

/**
 * The 3D world. Mounted once per run and left alone: rooms swap inside it.
 *
 * Fixed physics timestep, not "vary": a variable step hands Rapier the whole
 * wall-clock delta after a hitch, which integrates a huge amount of gravity
 * in one step and tunnels the player through the floor.
 *
 * The Suspense boundary is inside the Canvas: Physics suspends while Rapier
 * loads, and a suspension that escapes the Canvas would let a boundary
 * above it hide the Canvas and force-lose its WebGL context.
 *
 * Interpolation is off, and that is the single biggest thing keeping the
 * frame time steady. To interpolate, rapier snapshots a fresh position and
 * rotation object for every body in the world on every physics step, and a
 * fixed timestep runs several steps on a slow frame - so the frames that
 * were already late allocated the most, which is how a hitch becomes a
 * stutter. Nothing here is interpolated anyway: the camera reads the
 * player's body directly in Player.tsx, and every other body is fixed.
 */
export function Scene() {
  const paused = useRun((s) => s.paused);
  return (
    <Canvas
      shadows
      dpr={[1, 1.5]}
      camera={{ fov: CAMERA_FOV, near: 0.1, far: 120, position: [0, PLAYER_SPAWN_Y, 0] }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      style={{ position: "absolute", inset: 0, background: "#050608" }}
    >
      <Anisotropy />
      <FloorLight />
      <PadPause />
      {/* The Warden walks the floor whether or not its room is mounted. */}
      <WardenDriver />
      <Suspense fallback={null}>
        <Physics timeStep={1 / 60} gravity={[0, -9.81, 0]} paused={paused} interpolate={false}>
          <GroundPlane />
          <Player />
          <CurrentRoom />
        </Physics>
      </Suspense>
    </Canvas>
  );
}
