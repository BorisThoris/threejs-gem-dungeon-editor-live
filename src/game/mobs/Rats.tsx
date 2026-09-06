import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Group } from "three";

import { halfSize, type Room } from "../dungeon/types";
import { canControl, useRun } from "../state/run";
import { sfx } from "../systems/audio";
import { sideOf } from "../systems/bearing";
import { wardenAt } from "../warden/position";
import { patchAt, steerAround, type Patch } from "../warden/steer";
import { GROUND_Y, RAT_FLEE_RADIUS, RAT_SPEED } from "../world";
import type { Spot } from "./ambient";

interface Rat {
  x: number;
  z: number;
  home: Spot;
  fleeing: boolean;
  /** Walking back to the hole, all the way, once it has strayed. */
  homing: boolean;
  dead: boolean;
  wander: number;
}

interface RatsProps {
  room: Room;
  holes: Spot[];
  /** The furniture, from the body table: a rat goes round it. */
  obstacles: readonly Patch[];
  /** What bites a ground body here: a snare it springs, spikes that end it. */
  hazards: readonly Patch[];
}

/**
 * The room's rats. Scenery with feet: they wander near their holes and
 * flee anything that walks - the player, and the Warden when it is in the
 * room, which is the tell. They read the same lists the Warden does, so a
 * rat goes round a table and into a snare exactly as a body should.
 */
export function Rats({ room, holes, obstacles, hazards }: RatsProps) {
  const groups = useRef<(Group | null)[]>([]);
  const rats = useMemo<Rat[]>(
    () => holes.map((h) => ({ x: h.x, z: h.z, home: h, fleeing: false, homing: false, dead: false, wander: Math.random() * Math.PI * 2 })),
    [holes]
  );

  useFrame((state, delta) => {
    const run = useRun.getState();
    if (!canControl(run)) return;
    const cam = state.camera.position;
    const limit = halfSize(room) - 0.5;
    const t = state.clock.elapsedTime;
    rats.forEach((rat, i) => {
      const g = groups.current[i];
      if (!g) return;
      if (rat.dead) {
        g.visible = false;
        return;
      }
      // The nearest thing with feet.
      let tx = cam.x;
      let tz = cam.z;
      let td = Math.hypot(cam.x - rat.x, cam.z - rat.z);
      if (wardenAt.roomId === room.id) {
        const wd = Math.hypot(wardenAt.x - rat.x, wardenAt.z - rat.z);
        if (wd < td) {
          tx = wardenAt.x;
          tz = wardenAt.z;
          td = wd;
        }
      }
      // Startled inside the radius, and not calm again until well outside
      // it: a rat that stopped at the edge and turned round would dither
      // there, which is neither a scatter nor a tell.
      const threatened = td < RAT_FLEE_RADIUS || (rat.fleeing && td < RAT_FLEE_RADIUS * 2);
      if (threatened && !rat.fleeing) sfx.skitter(0.35, sideOf(rat.x - cam.x, rat.z - cam.z));
      rat.fleeing = threatened;
      let dx: number;
      let dz: number;
      let speed: number;
      if (threatened) {
        const ax = rat.x - tx;
        const az = rat.z - tz;
        const len = Math.hypot(ax, az) || 1;
        const h = steerAround(rat.x, rat.z, rat.x + (ax / len) * 3, rat.z + (az / len) * 3, obstacles, 0);
        dx = h.dx;
        dz = h.dz;
        speed = RAT_SPEED;
      } else {
        rat.wander += (Math.random() - 0.5) * delta * 4;
        const hx = rat.home.x - rat.x;
        const hz = rat.home.z - rat.z;
        const hd = Math.hypot(hx, hz);
        // Home is the hole itself, not its neighbourhood: it walks all the
        // way back - across whatever was set down there while it was out.
        if (hd > 0.3 && (hd > 1.5 || rat.homing)) {
          rat.homing = hd > 0.3;
          dx = hx / hd;
          dz = hz / hd;
        } else {
          rat.homing = false;
          dx = Math.cos(rat.wander);
          dz = Math.sin(rat.wander);
        }
        speed = RAT_SPEED * 0.25;
      }
      const step = Math.min(speed * delta, 0.5);
      rat.x = Math.max(-limit, Math.min(limit, rat.x + dx * step));
      rat.z = Math.max(-limit, Math.min(limit, rat.z + dz * step));
      g.position.set(rat.x, GROUND_Y + 0.02 + Math.abs(Math.sin(t * 14 + i)) * (threatened ? 0.04 : 0.01), rat.z);
      g.rotation.y = Math.atan2(dx, dz);
      // What it ran into: a snare is sprung for nothing, the spikes are the end of it.
      const standing = patchAt(hazards, rat.x, rat.z);
      if (standing) {
        if (standing.key) run.springSnare(standing.key, "rat");
        else rat.dead = true;
      }
    });
    if (import.meta.env.DEV) {
      (window as unknown as { __rats?: { x: number; z: number; room: string; dead: boolean }[] }).__rats = rats.map(
        (r) => ({ x: r.x, z: r.z, room: room.id, dead: r.dead })
      );
    }
  });

  return (
    <>
      {holes.map((h, i) => (
        <group
          key={i}
          ref={(el) => {
            groups.current[i] = el;
          }}
          position={[h.x, GROUND_Y, h.z]}
        >
          <mesh position={[0, 0.08, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <capsuleGeometry args={[0.07, 0.22, 3, 6]} />
            <meshStandardMaterial color="#3a3128" roughness={1} />
          </mesh>
          <mesh position={[0, 0.06, -0.28]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.008, 0.02, 0.3, 4]} />
            <meshStandardMaterial color="#5a4a3a" roughness={1} />
          </mesh>
        </group>
      ))}
    </>
  );
}
