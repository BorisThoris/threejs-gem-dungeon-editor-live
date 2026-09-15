import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Group } from "three";
import { geo, mat } from "../props/shared";

import { type Room } from "../dungeon/types";
import { roomStep } from "../dungeon/footprint";
import * as din from "../din/din";
import { canControl, runClock, useRun } from "../state/run";
import { sfx } from "../systems/audio";
import { sideOf } from "../systems/bearing";
import { wardenAt } from "../warden/position";
import { patchAt, steerInRoom, type Patch } from "../warden/steer";
import { groundHeading } from "./groundHeading";
import { RAT_FLEE_RADIUS, RAT_SPEED, RAT_SPOOK_S } from "../world";
import { floorHeightAt } from "../worldbuilding/elevation";
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
  /** Until when it is running from a noise, on the run's clock. */
  spookedUntil: number;
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
    () => holes.map((h) => ({ x: h.x, z: h.z, home: h, fleeing: false, homing: false, dead: false, wander: Math.random() * Math.PI * 2, spookedUntil: 0 })),
    [holes]
  );
  /** What the floor is loud about, filled in place: the frame loop owns no garbage. */
  const heard = useMemo(() => din.emptyArrival(), []);

  useFrame((state, delta) => {
    const run = useRun.getState();
    if (!canControl(run)) return;
    const cam = state.camera.position;
    const now = runClock(run);
    /**
     * Their row: [blast] at 0.10 and [loud] at 0.45. Read once a frame for
     * the room, not once per rat, and it is the same question the roost
     * asks - so a barrel bursting, a grate dropping, a bomb two rooms
     * away and a sprint on tile all scatter them without a line here
     * naming any of those things. They were declared to answer to this
     * and did not; they ran from feet and nothing else.
     */
    const spooked = din.answering(heard, "rat", room.id);
    const sourceHere = spooked && heard.fromRoomId === room.id;
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
      // A noise in this room is a thing to run from, wherever it was;
      // one from another room sends it home.
      if (sourceHere) {
        const sd = Math.hypot(heard.x - rat.x, heard.z - rat.z);
        if (sd < td) {
          tx = heard.x;
          tz = heard.z;
          td = sd;
        }
      }
      if (spooked) rat.spookedUntil = now + RAT_SPOOK_S;
      const startled = now < rat.spookedUntil;
      // Startled inside the radius, and not calm again until well outside
      // it: a rat that stopped at the edge and turned round would dither
      // there, which is neither a scatter nor a tell.
      const threatened = startled || td < RAT_FLEE_RADIUS || (rat.fleeing && td < RAT_FLEE_RADIUS * 2);
      if (threatened && !rat.fleeing) sfx.skitter(0.35, sideOf(rat.x - cam.x, rat.z - cam.z));
      // And feet while it runs, from where it is: a rat scattering from
      // the Warden behind you is the tell, and a silent one is not.
      if (threatened) {
        const toCam = Math.hypot(cam.x - rat.x, cam.z - rat.z);
        sfx.scurry(1 - toCam / (RAT_FLEE_RADIUS * 2.5), sideOf(rat.x - cam.x, rat.z - cam.z));
      }
      rat.fleeing = threatened;
      let dx: number;
      let dz: number;
      let speed: number;
      const hx = rat.home.x - rat.x;
      const hz = rat.home.z - rat.z;
      const hd = Math.hypot(hx, hz);
      if (threatened && startled && !sourceHere && td >= RAT_FLEE_RADIUS) {
        // Bolting for the hole from a noise it cannot place, and staying
        // in it: a rat at its hole with nothing near it has nowhere to run.
        const h = hd > 0.3 ? steerInRoom(room, rat.x, rat.z, rat.home.x, rat.home.z, obstacles, 0, 0.5) : { dx: 0, dz: 0 };
        dx = h.dx;
        dz = h.dz;
        speed = RAT_SPEED;
      } else if (threatened) {
        const ax = rat.x - tx;
        const az = rat.z - tz;
        const len = Math.hypot(ax, az) || 1;
        const h = groundHeading(room, rat.x, rat.z, rat.x + (ax / len) * 3, rat.z + (az / len) * 3, obstacles);
        dx = h.dx;
        dz = h.dz;
        speed = RAT_SPEED;
      } else {
        rat.wander += (Math.random() - 0.5) * delta * 4;
        // Home is the hole itself, not its neighbourhood: it walks all the
        // way back - across whatever was set down there while it was out.
        if (hd > 0.3 && (hd > 1.5 || rat.homing)) {
          rat.homing = hd > 0.3;
          const heading = steerInRoom(room, rat.x, rat.z, rat.home.x, rat.home.z, obstacles, 0, 0.5);
          dx = heading.dx;
          dz = heading.dz;
        } else {
          rat.homing = false;
          const heading = groundHeading(room, rat.x, rat.z, rat.x + Math.cos(rat.wander), rat.z + Math.sin(rat.wander), obstacles);
          dx = heading.dx;
          dz = heading.dz;
        }
        speed = RAT_SPEED * 0.25;
      }
      const step = Math.min(speed * delta, 0.5);
      [rat.x, rat.z] = roomStep(room, rat.x, rat.z, dx * step, dz * step, 0.5);
      g.position.set(rat.x, floorHeightAt(room, rat.x, rat.z) + 0.02 + Math.abs(Math.sin(now * 14 + i)) * (threatened ? 0.04 : 0.01), rat.z);
      if (dx !== 0 || dz !== 0) g.rotation.y = Math.atan2(dx, dz);
      // What it ran into: a snare is sprung for nothing, the spikes are the end of it.
      const standing = patchAt(hazards, rat.x, rat.z);
      if (standing) {
        if (standing.key) run.springSnare(standing.key, "rat");
        else rat.dead = true;
      }
    });
    if (import.meta.env.DEV) {
      (window as unknown as { __rats?: { x: number; z: number; room: string; dead: boolean; startled: boolean; homing: boolean; fleeing: boolean }[] }).__rats = rats.map(
        (r) => ({ x: r.x, z: r.z, room: room.id, dead: r.dead, startled: now < r.spookedUntil, homing: r.homing, fleeing: r.fleeing })
      );
    }
  });

  return (
    <>
      {holes.map((h, i) => (
        <group
          key={i}
          name={`rat-${i}`}
          ref={(el) => {
            groups.current[i] = el;
          }}
          position={[h.x, floorHeightAt(room, h.x, h.z), h.z]}
        >
          <mesh position={[0, 0.08, 0]} rotation={[Math.PI / 2, 0, 0]} geometry={geo("capsule", 0.07, 0.22, 3, 6)} material={mat({ color: "#3a3128", roughness: 1 })} />
          <mesh position={[0, 0.06, -0.28]} rotation={[Math.PI / 2, 0, 0]} geometry={geo("cylinder", 0.008, 0.02, 0.3, 4)} material={mat({ color: "#5a4a3a", roughness: 1 })} />
        </group>
      ))}
    </>
  );
}
