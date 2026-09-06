import { useRef } from "react";
import { useFrame } from "@react-three/fiber";

import { doorPosition } from "../dungeon/layout";
import type { Room } from "../dungeon/types";
import { barredNow, canControl, runClock, useRun } from "../state/run";
import { barKey } from "../warden/bars";
import { DOOR_HEIGHT, GROUND_Y } from "../world";
import type { Trap } from "./placement";

/** How long after coming in under it the grate drops, on the run's clock: behind you, not on you. */
const DROP_AFTER_S = 0.4;

/**
 * A portcullis over one doorway. It drops behind a player who comes in
 * under it and bars that doorway, briefly, as a bar they made would -
 * except they did not make it: the Warden behind them has to break it,
 * and they cannot go back that way until it lifts. Coming in under it
 * with the Warden at your heels buys the room; coming in under it with
 * the Warden already inside shuts you in with it.
 *
 * Which doorway the player came in by is the store's (`enteredBy`),
 * written by `travel`: the arrival spawn is already a stride inside the
 * doorway, so there is no line here for a body to cross.
 */
export function Grate({ room, trap }: { room: Room; trap: Trap }) {
  const arrivedAt = useRef<number | null>(null);
  const dir = trap.dir ?? "north";
  const [dx, , dz] = doorPosition(room, dir);
  const alongX = Math.abs(dx) > Math.abs(dz);
  const to = room.links[dir];
  const cameUnderIt = useRun((s) => s.currentRoomId === room.id && s.enteredBy === dir);
  const down = useRun((s) => (to ? barredNow(s) === barKey(room.id, to) : false));

  useFrame(() => {
    const run = useRun.getState();
    if (!cameUnderIt || !to || down) return;
    if (!canControl(run)) return;
    const now = runClock(run);
    if (arrivedAt.current === null) arrivedAt.current = now;
    if (now - arrivedAt.current >= DROP_AFTER_S) run.dropGrate(to);
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
