import { useRef } from "react";
import { useFrame } from "@react-three/fiber";

import { doorPosition, LANE_HALF_WIDTH } from "../dungeon/layout";
import type { Room } from "../dungeon/types";
import { canControl, runClock, useRun } from "../state/run";
import { wardenAt } from "../warden/position";
import { DART_FLIGHT_S, GROUND_Y } from "../world";
import type { Trap } from "./placement";

/** How far along the lane the plate reaches, either side of its centre. */
const PLATE_HALF = 0.6;

/**
 * A dart plate a stride inside a doorway. Stepped on by anything with
 * feet, it looses a volley across the lane for DART_FLIGHT_S: whatever is
 * in the lane at chest height then is hit - the player, or the Warden,
 * which is the point of knowing where it is. A rat runs under them and a
 * ghost through them, which is what the body table says.
 */
export function Darts({ room, trap }: { room: Room; trap: Trap }) {
  const volley = useRef<number | null>(null);
  const hitPlayer = useRef<number | null>(null);
  const hitWarden = useRef<number | null>(null);
  const [dx, , dz] = doorPosition(room, trap.dir ?? "north");
  const alongX = Math.abs(dx) > Math.abs(dz);

  const onPlate = (x: number, z: number) => {
    const along = alongX ? x - trap.x : z - trap.z;
    const across = alongX ? z - trap.z : x - trap.x;
    return Math.abs(along) < PLATE_HALF && Math.abs(across) < LANE_HALF_WIDTH;
  };

  useFrame((state) => {
    const run = useRun.getState();
    if (!canControl(run)) return;
    const now = runClock(run);
    const at = run.sprung[trap.key];
    const flying = at !== undefined && now - at < DART_FLIGHT_S;
    const cam = state.camera.position;
    const wardenHere = wardenAt.roomId === room.id;
    if (!flying) {
      if (onPlate(cam.x, cam.z)) run.springTrap(trap.key, "darts", "player");
      else if (wardenHere && onPlate(wardenAt.x, wardenAt.z)) run.springTrap(trap.key, "darts", "warden");
      return;
    }
    if (volley.current !== at) {
      volley.current = at;
      hitPlayer.current = null;
      hitWarden.current = null;
    }
    if (hitPlayer.current !== at && onPlate(cam.x, cam.z)) {
      hitPlayer.current = at;
      run.damage();
    }
    if (hitWarden.current !== at && wardenHere && onPlate(wardenAt.x, wardenAt.z)) {
      hitWarden.current = at;
      run.wardenWounded();
    }
  });

  const flying = useRun((s) => {
    const at = s.sprung[trap.key];
    return at !== undefined && runClock(s) - at < DART_FLIGHT_S;
  });

  return (
    <group position={[trap.x, GROUND_Y, trap.z]} rotation={[0, alongX ? Math.PI / 2 : 0, 0]}>
      {/* The plate: a worn slab, a shade darker than the floor, and two
          holes in the jambs either side of the lane that say what it is. */}
      <mesh position={[0, 0.015, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[PLATE_HALF * 2, 1.4]} />
        <meshStandardMaterial color="#2a2622" roughness={1} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[0, 1.2, side * LANE_HALF_WIDTH]}>
          <boxGeometry args={[0.3, 0.3, 0.12]} />
          <meshStandardMaterial color="#141210" roughness={1} />
        </mesh>
      ))}
      {flying &&
        [-1, 1].map((side) => (
          <mesh key={side} position={[0, 1.2, side * LANE_HALF_WIDTH * 0.5]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.02, 0.02, LANE_HALF_WIDTH, 4]} />
            <meshBasicMaterial color="#d8d0b0" />
          </mesh>
        ))}
    </group>
  );
}
