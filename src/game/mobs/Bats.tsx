import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Group } from "three";

import { bus } from "../events";
import { canControl, runClock, useRun } from "../state/run";
import type { Room } from "../dungeon/types";
import { WALL_HEIGHT } from "../world";
import type { Spot } from "./ambient";

const FLOCK = 7;

/**
 * The room's roost. A dark cluster on the ceiling until something
 * startles it - a dash beneath it, or a blast in the room - and then a
 * wheeling flock, and a noise that carries twice as far as the ground
 * alone would carry a dash. The room says it has a roost on the HUD's
 * GROUND line, so the risk is read before it is taken.
 */
export function Bats({ room, at }: { room: Room; at: Spot }) {
  const group = useRef<Group>(null);
  /** The player's own noise deadline as last seen, so a fresh dash is told from a held one. */
  const seen = useRef(-1);

  useEffect(
    () =>
      bus.on("bombBurst", ({ roomId }) => {
        if (roomId === room.id) useRun.getState().rouseBats();
      }),
    [room.id]
  );

  useFrame((state) => {
    const g = group.current;
    if (!g) return;
    const run = useRun.getState();
    const now = runClock(run);
    const roused = now < run.batsRousedUntil;
    if (canControl(run)) {
      if (seen.current < 0) seen.current = run.noisyUntil;
      if (run.noisyUntil > seen.current + 0.01) {
        seen.current = run.noisyUntil;
        if (!roused && now < run.noisyUntil) run.rouseBats();
      }
    }
    const t = state.clock.elapsedTime;
    g.children.forEach((c, i) => {
      if (roused) {
        const a = t * 5 + i * 1.1;
        c.position.set(Math.cos(a) * (1.5 + i * 0.2), Math.sin(t * 7 + i) * 0.4, Math.sin(a) * (1.5 + i * 0.2));
        c.rotation.z = Math.sin(t * 30 + i) * 0.6;
      } else {
        c.position.set(Math.cos(i) * 0.25, -0.1 * (i % 3), Math.sin(i) * 0.25);
        c.rotation.z = 0;
      }
    });
    if (import.meta.env.DEV) {
      (window as unknown as { __bats?: { room: string; roused: boolean } }).__bats = { room: room.id, roused };
    }
  });

  return (
    <group ref={group} position={[at.x, WALL_HEIGHT - 0.6, at.z]}>
      {Array.from({ length: FLOCK }, (_, i) => (
        <mesh key={i}>
          <coneGeometry args={[0.12, 0.28, 3]} />
          <meshStandardMaterial color="#14101a" roughness={1} />
        </mesh>
      ))}
    </group>
  );
}
