import { useRef } from "react";
import { useFrame } from "@react-three/fiber";

import type { Room } from "../dungeon/types";
import { canControl, useRun } from "../state/run";
import { wardenAt } from "../warden/position";
import { GROUND_Y, PIT_RADIUS } from "../world";
import type { Trap } from "./placement";

/**
 * A patch of floor that gives way once, under whatever walks on it, and
 * is a spike patch from then on. Before it opens it is only a crack in
 * the flagstones - a tell a player can learn. The player it opens under
 * loses a life here; the Warden is wounded here; once open, the body
 * table lists it and everything with feet takes it from there.
 */
export function Pit({ room, trap }: { room: Room; trap: Trap }) {
  const inside = useRef(false);
  const open = useRun((s) => s.sprung[trap.key] !== undefined);

  useFrame((state) => {
    const run = useRun.getState();
    if (!canControl(run)) return;
    const cam = state.camera.position;
    const within = Math.hypot(cam.x - trap.x, cam.z - trap.z) <= PIT_RADIUS;
    const isOpen = run.sprung[trap.key] !== undefined;
    if (!isOpen) {
      if (within) {
        if (run.springTrap(trap.key, "pit", "player")) run.damage();
      } else if (wardenAt.roomId === room.id && Math.hypot(wardenAt.x - trap.x, wardenAt.z - trap.z) <= PIT_RADIUS) {
        if (run.springTrap(trap.key, "pit", "warden")) run.wardenWounded();
      }
      return;
    }
    // Open: it bites the player on entry, as the spikes do. The Warden's
    // own hazard list has it now, so nothing here charges it twice.
    if (!within) inside.current = false;
    else if (!inside.current && run.damage()) inside.current = true;
  });

  return (
    <group position={[trap.x, GROUND_Y, trap.z]}>
      {open ? (
        <>
          <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[PIT_RADIUS, 18]} />
            <meshBasicMaterial color="#050407" />
          </mesh>
          {[0, 1.3, 2.5, 3.8, 5.1].map((a, i) => (
            <mesh key={i} position={[Math.cos(a) * 0.4, 0.12, Math.sin(a) * 0.4]}>
              <coneGeometry args={[0.07, 0.35, 5]} />
              <meshStandardMaterial color="#9aa3ad" metalness={0.7} roughness={0.4} />
            </mesh>
          ))}
        </>
      ) : (
        <mesh position={[0, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[PIT_RADIUS * 0.55, PIT_RADIUS * 0.95, 7]} />
          <meshBasicMaterial color="#1a1714" transparent opacity={0.55} />
        </mesh>
      )}
    </group>
  );
}
