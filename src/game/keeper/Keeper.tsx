import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Group } from "three";

import { doorPosition } from "../dungeon/layout";
import type { Dir, Room } from "../dungeon/types";
import { bus } from "../events";
import { canControl, keeperStalled, useRun } from "../state/run";
import { GROUND_Y, KEEPER_REACH } from "../world";

/**
 * The Keeper, at one of its posts, in the room the player is in.
 *
 * It does not move. It turns to face the player, strikes anyone within
 * KEEPER_REACH of its post, and kneels while a blast holds it - eyes out,
 * half its height - which is the only time the doorway behind it is
 * open. The store owns whether it holds the stairs; this draws it and
 * asks for the strike.
 */
export function Keeper({ room, dir }: { room: Room; dir: Dir }) {
  const group = useRef<Group>(null);
  const halberd = useRef<Group>(null);
  const [dx, , dz] = doorPosition(room, dir);
  const post = { x: dx * 0.72, z: dz * 0.72 };
  const knelt = useRun(keeperStalled);

  useEffect(() => {
    bus.emit("keeperBars");
  }, []);

  useFrame((state) => {
    const g = group.current;
    const arm = halberd.current;
    if (!g) return;
    const run = useRun.getState();
    const cam = state.camera.position;
    const dxp = cam.x - post.x;
    const dzp = cam.z - post.z;
    const distance = Math.hypot(dxp, dzp);
    const t = state.clock.elapsedTime;
    const down = keeperStalled(run);
    /**
     * The halberd comes down as the player closes.
     *
     * Nought a reach outside its reach and all the way at the edge of it,
     * so the swing has begun before the step that costs a life - and a
     * player who backs off sees it go up again. Planted while it kneels.
     */
    const tell = down ? 0 : Math.max(0, Math.min(1, 1 - (distance - KEEPER_REACH) / KEEPER_REACH));
    if (arm) arm.rotation.z = -tell * 0.9;
    g.rotation.y = Math.atan2(dxp, dzp);
    g.scale.y = down ? 0.55 : 1;
    g.position.set(post.x, GROUND_Y + (down ? 0 : Math.sin(t * 1.3) * 0.02), post.z);
    if (import.meta.env.DEV) {
      (window as unknown as { __keeper?: Record<string, unknown> }).__keeper = { room: room.id, dir, x: post.x, z: post.z, distance, knelt: down, tell };
    }
    if (!canControl(run) || down) return;
    if (distance <= KEEPER_REACH) run.keeperStrike();
  });

  return (
    <group ref={group}>
      {/* A broad iron figure, taller than the doorway is wide, with a
          visor that glows while it stands and goes dark when it kneels. */}
      <mesh position={[0, 1.4, 0]} castShadow>
        <cylinderGeometry args={[0.45, 0.6, 2.8, 10]} />
        <meshStandardMaterial color="#2e2c33" metalness={0.7} roughness={0.5} />
      </mesh>
      <mesh position={[0, 3.05, 0]} castShadow>
        <sphereGeometry args={[0.42, 12, 10]} />
        <meshStandardMaterial color="#26242b" metalness={0.7} roughness={0.5} />
      </mesh>
      <mesh position={[0, 3.05, 0.34]}>
        <boxGeometry args={[0.5, 0.08, 0.12]} />
        <meshBasicMaterial color={knelt ? "#3a1a1a" : "#ff3b2a"} />
      </mesh>
      {!knelt && <pointLight position={[0, 3, 0.5]} color="#ff4a30" intensity={2.2} distance={6} decay={1.8} />}
      {/* The halberd, planted: the thing that says "not past here" - and
          the thing that comes down when someone tries. */}
      <group ref={halberd} position={[0.7, 1.6, 0]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.04, 0.04, 3.2, 6]} />
          <meshStandardMaterial color="#4a4038" roughness={0.8} />
        </mesh>
        <mesh position={[0, 1.65, 0]} rotation={[0, 0, 0.3]}>
          <boxGeometry args={[0.5, 0.35, 0.05]} />
          <meshStandardMaterial color="#8a8f96" metalness={0.8} roughness={0.35} />
        </mesh>
      </group>
    </group>
  );
}
