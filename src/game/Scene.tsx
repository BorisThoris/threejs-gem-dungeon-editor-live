import { Canvas } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";

import { Player } from "./player/Player";
// Registers what each room kind puts inside its shell.
import "./rooms/content";
import "./puzzles/register";
import { GroundPlane } from "./rooms/GroundPlane";
import { Room } from "./rooms/Room";
import { useCurrentRoom, useRun } from "./state/run";
import { CAMERA_FOV, PLAYER_SPAWN_Y } from "./world";

function CurrentRoom() {
  const room = useCurrentRoom();
  const seed = useRun((s) => s.dungeon?.seed ?? 0);
  if (!room) return null;
  // Keyed by id so a new room is a fresh mount, never a patched old one.
  return <Room key={room.id} room={room} seed={seed} />;
}

/**
 * The 3D world. Mounted once per run and left alone: rooms swap inside it.
 *
 * Fixed physics timestep, not "vary": a variable step hands Rapier the whole
 * wall-clock delta after a hitch, which integrates a huge amount of gravity
 * in one step and tunnels the player through the floor.
 */
export function Scene() {
  return (
    <Canvas
      shadows
      dpr={[1, 1.5]}
      camera={{ fov: CAMERA_FOV, near: 0.1, far: 120, position: [0, PLAYER_SPAWN_Y, 0] }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      style={{ position: "absolute", inset: 0, background: "#050608" }}
    >
      <ambientLight intensity={0.55} />
      <hemisphereLight args={["#9fb4d8", "#3a3126", 0.45]} />
      <Physics timeStep={1 / 60} gravity={[0, -9.81, 0]}>
        <GroundPlane />
        <Player />
        <CurrentRoom />
      </Physics>
    </Canvas>
  );
}
