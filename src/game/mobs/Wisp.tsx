import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Group } from "three";

import type { Room } from "../dungeon/types";
import { canControl, useRun } from "../state/run";
import { WISP_LEAD, WISP_SPEED } from "../world";
import { wispAt, wispTargetFor } from "./lamplighter";

/**
 * The lamplighter wisp, in the room the player is in, while their light
 * can be seen. A ghost body that asks the floor for nothing: it drifts
 * ahead toward the hidden room - or the exit - and waits at the doorway
 * until the player is close, then is in the next room the moment they
 * are. It is a helper that is also the reason the Warden knows where you
 * are, and it does not pretend otherwise.
 */
export function Wisp({ room }: { room: Room }) {
  const group = useRef<Group>(null);
  const pos = useRef({ x: 0, z: 0, placed: false });
  const dungeon = useRun((s) => s.dungeon);
  const target = useMemo(() => (dungeon ? wispTargetFor(dungeon, room.id) : null), [dungeon, room.id]);

  useFrame((state, delta) => {
    const g = group.current;
    if (!g) return;
    const run = useRun.getState();
    if (!canControl(run)) return;
    const cam = state.camera.position;
    const p = pos.current;
    const t = state.clock.elapsedTime;
    if (!p.placed) {
      p.placed = true;
      const tx = target?.x ?? cam.x;
      const tz = target?.z ?? cam.z;
      const len = Math.hypot(tx - cam.x, tz - cam.z) || 1;
      p.x = cam.x + ((tx - cam.x) / len) * 1.5;
      p.z = cam.z + ((tz - cam.z) / len) * 1.5;
    }
    if (target) {
      const dx = target.x - p.x;
      const dz = target.z - p.z;
      const left = Math.hypot(dx, dz);
      // Ahead of the player, never out of their reach: it waits at the
      // doorway rather than going through without them.
      const ahead = Math.hypot(p.x - cam.x, p.z - cam.z);
      if (left > 0.2 && ahead < WISP_LEAD) {
        const step = Math.min(WISP_SPEED * delta, left);
        p.x += (dx / left) * step;
        p.z += (dz / left) * step;
      }
    }
    g.position.set(p.x, 1.6 + Math.sin(t * 2.3) * 0.15, p.z);
    wispAt.x = p.x;
    wispAt.z = p.z;
    wispAt.roomId = room.id;
    wispAt.out = true;
    if (import.meta.env.DEV) {
      (window as unknown as { __wisp?: Record<string, unknown> }).__wisp = {
        x: p.x,
        z: p.z,
        room: room.id,
        goal: target?.roomId ?? null,
        via: target?.via ?? null,
        tx: target?.x ?? null,
        tz: target?.z ?? null,
      };
    }
  });

  return (
    <group ref={group}>
      <mesh>
        <sphereGeometry args={[0.12, 10, 8]} />
        <meshBasicMaterial color="#dff4ff" />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.3, 10, 8]} />
        <meshBasicMaterial color="#8fd0ff" transparent opacity={0.25} depthWrite={false} />
      </mesh>
      <pointLight color="#a8dcff" intensity={2.5} distance={6} decay={1.8} />
    </group>
  );
}
