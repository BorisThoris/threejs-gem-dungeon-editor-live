import { useRef } from "react";
import { useFrame } from "@react-three/fiber";

import { doorPosition } from "../dungeon/layout";
import type { Room } from "../dungeon/types";
import { barredNow, canControl, useRun } from "../state/run";
import { barKey } from "../warden/bars";
import { DOOR_HEIGHT, GROUND_Y } from "../world";
import type { Trap } from "./placement";

/**
 * A portcullis over one doorway. It drops behind a player who comes in
 * under it and bars that doorway, briefly, as a bar they made would -
 * except they did not make it: the Warden behind them has to break it,
 * and they cannot go back that way until it lifts. Coming in under it
 * with the Warden at your heels buys the room; coming in under it with
 * the Warden already inside shuts you in with it.
 */
export function Grate({ room, trap }: { room: Room; trap: Trap }) {
  const outside = useRef<boolean | null>(null);
  const dir = trap.dir ?? "north";
  const [dx, , dz] = doorPosition(room, dir);
  const alongX = Math.abs(dx) > Math.abs(dz);
  const to = room.links[dir];
  const down = useRun((s) => (to ? barredNow(s) === barKey(room.id, to) : false));

  useFrame((state) => {
    const run = useRun.getState();
    if (!canControl(run) || !to) return;
    const cam = state.camera.position;
    // Which side of the grate line the player is on: the doorway's side,
    // or the room's. It drops on the crossing inward.
    const along = alongX ? cam.x / dx : cam.z / dz;
    const isOutside = along > 0.9;
    if (outside.current === null) {
      outside.current = isOutside;
      return;
    }
    if (outside.current && !isOutside) run.dropGrate(to);
    outside.current = isOutside;
  });

  return (
    <group position={[dx * 0.97, GROUND_Y, dz * 0.97]} rotation={[0, alongX ? Math.PI / 2 : 0, 0]}>
      {/* The bars, hanging in the lintel until they drop. */}
      {[-0.9, -0.45, 0, 0.45, 0.9].map((x) => (
        <mesh key={x} position={[x, down ? DOOR_HEIGHT / 2 : DOOR_HEIGHT + 0.9, 0]}>
          <boxGeometry args={[0.08, DOOR_HEIGHT, 0.08]} />
          <meshStandardMaterial color="#2b2b30" metalness={0.6} roughness={0.5} />
        </mesh>
      ))}
    </group>
  );
}
