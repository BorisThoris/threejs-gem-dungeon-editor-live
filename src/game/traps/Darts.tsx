import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";

import { doorPosition } from "../dungeon/layout";
import type { Room } from "../dungeon/types";
import { canControl, runClock, useRun } from "../state/run";
import { wardenAt } from "../warden/position";
import { DART_FLIGHT_S, GROUND_Y } from "../world";
import type { Trap } from "./placement";

/** How far along the lane the plate reaches, either side of its centre. */
const PLATE_HALF = 0.6;
const PLATE_ACROSS = 0.7;
const DART_WARNING_S = 0.65;

/**
 * A dart plate off the entrance lanes. Stepping on it lights the plate
 * before a volley crosses it for DART_FLIGHT_S: whoever stays on the
 * visible plate at chest height then is hit - the player, or the Warden,
 * which is the point of knowing where it is. A rat runs under them and a
 * ghost through them, which is what the body table says.
 */
export function Darts({ room, trap }: { room: Room; trap: Trap }) {
  const volley = useRef<number | null>(null);
  const hitPlayer = useRef<number | null>(null);
  const hitWarden = useRef<number | null>(null);
  const shown = useRef(0);
  const [visual, setVisual] = useState(0);
  const [dx, , dz] = doorPosition(room, trap.dir ?? "north");
  const alongX = Math.abs(dx) > Math.abs(dz);

  const onPlate = (x: number, z: number) => {
    const along = alongX ? x - trap.x : z - trap.z;
    const across = alongX ? z - trap.z : x - trap.x;
    return Math.abs(along) < PLATE_HALF && Math.abs(across) < PLATE_ACROSS;
  };

  useFrame((state) => {
    const run = useRun.getState();
    const now = runClock(run);
    let at = run.sprung[trap.key];
    const age = at === undefined ? Infinity : now - at;
    const phase = age < DART_WARNING_S ? 1 : age < DART_WARNING_S + DART_FLIGHT_S ? 2 : 0;
    if (phase !== shown.current) { shown.current = phase; setVisual(phase); }
    if (!canControl(run)) return;
    const cam = state.camera.position;
    const wardenHere = wardenAt.roomId === room.id;
    if (at === undefined || now - at >= DART_WARNING_S + DART_FLIGHT_S) {
      // First the plate lights; a player has time to step off before the volley.
      const playerOn = onPlate(cam.x, cam.z);
      const wardenOn = wardenHere && onPlate(wardenAt.x, wardenAt.z);
      if (!playerOn && !wardenOn) return;
      if (!run.springTrap(trap.key, "darts", playerOn ? "player" : "warden")) return;
      at = useRun.getState().sprung[trap.key];
    }
    if (at === undefined || now - at < DART_WARNING_S || now - at >= DART_WARNING_S + DART_FLIGHT_S) return;
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

  const warning = visual === 1;
  const flying = visual === 2;

  return (
    <group position={[trap.x, GROUND_Y, trap.z]} rotation={[0, alongX ? 0 : Math.PI / 2, 0]}>
      {/* The plate: a worn slab, a shade darker than the floor, and two
          holes in the jambs either side of the lane that say what it is.
          Local x is along the lane and local z across it, which is the
          group unturned for a lane along X - it was turned the other way
          for eight runs, and every plate's holes stood in the lane with
          the darts drawn flying along it. The hit test above never looked
          at these meshes, so nothing noticed until a picture was taken
          from three strides back and one hole filled the frame. */}
      <mesh position={[0, 0.015, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[PLATE_HALF * 2, 1.4]} />
        <meshStandardMaterial color={warning ? "#ffb54a" : "#7e5030"} emissive={warning ? "#c85b16" : "#000000"} roughness={1} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[0, 1.2, side * 1.2]}>
          <boxGeometry args={[0.3, 0.3, 0.12]} />
          <meshStandardMaterial color="#141210" roughness={1} />
        </mesh>
      ))}
      {flying &&
        [-1, 1].map((side) => (
          <mesh key={side} position={[0, 1.2, side * 0.6]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.02, 0.02, 1.2, 4]} />
            <meshBasicMaterial color="#d8d0b0" />
          </mesh>
        ))}
    </group>
  );
}
