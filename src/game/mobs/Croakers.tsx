import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Group } from "three";

import * as din from "../din/din";
import type { Room } from "../dungeon/types";
import { bus } from "../events";
import { canControl, runClock, useRun } from "../state/run";
import { sfx } from "../systems/audio";
import { sideOf } from "../systems/bearing";
import { CROAKER_HUSH_RADIUS, CROAKER_UNDER_S, GROUND_Y } from "../world";
import type { Spot } from "./ambient";

interface Croaker {
  x: number;
  z: number;
  /** Under the water until, on the run's clock. */
  underUntil: number;
  /** A phase of its own, so the chorus is a chorus and not a metronome. */
  phase: number;
}

/**
 * The cistern's toads, at the water's edge of the room the player is in.
 *
 * Scenery with a voice, and the voice is the mechanism: they sing until
 * something is loud, then they are under the water for a while and the
 * room is silent. So the sound of a flooded room says whether anything
 * loud has happened in it lately - a Warden breaking a bar, a barrel
 * bursting, your own dash - and a cistern that is already quiet when you
 * walk in was not quiet a moment ago. They hush, without diving, for a
 * player standing over them, because a toad that sang at your feet would
 * be a speaker rather than an animal.
 *
 * The splash they make going under is [loud] at exactly the Warden's
 * threshold, so a noise in a flooded room is answered by a second one that
 * reaches the Warden in that room and no further. That is the row in
 * `susceptibility.ts` and the emission in `emissions.ts`, and this file
 * reads both rather than deciding either.
 */
export function Croakers({ room, spots }: { room: Room; spots: Spot[] }) {
  const groups = useRef<(Group | null)[]>([]);
  const toads = useMemo<Croaker[]>(
    () => spots.map((s, i) => ({ x: s.x, z: s.z, underUntil: 0, phase: i * 1.7 })),
    [spots]
  );
  const heard = useMemo(() => din.emptyArrival(), []);

  useEffect(() => () => sfx.chorusStop(), []);

  useFrame((state) => {
    const run = useRun.getState();
    if (!canControl(run)) {
      sfx.chorusStop();
      return;
    }
    const now = runClock(run);
    const cam = state.camera.position;
    const t = state.clock.elapsedTime;

    // Their row: [loud] at 0.30, [blast] at 0.10. Anything the floor is
    // that loud about puts every one of them under at once.
    const up = toads.filter((c) => now >= c.underUntil);
    if (up.length && din.answering(heard, "croaker", room.id)) {
      for (const c of up) c.underUntil = now + CROAKER_UNDER_S;
      const nearest = up.reduce((a, b) => (Math.hypot(a.x - cam.x, a.z - cam.z) < Math.hypot(b.x - cam.x, b.z - cam.z) ? a : b));
      sfx.splash(sideOf(nearest.x - cam.x, nearest.z - cam.z));
      bus.emit("croakersDove", { roomId: room.id });
    }

    let singing = 0;
    let sx = 0;
    let sz = 0;
    let nearestSinging = Infinity;
    toads.forEach((c, i) => {
      const g = groups.current[i];
      const under = now < c.underUntil;
      const toCam = Math.hypot(cam.x - c.x, cam.z - c.z);
      const hushed = toCam < CROAKER_HUSH_RADIUS;
      if (g) {
        g.visible = !under;
        // The throat, filling and emptying, in its own time.
        const breath = hushed ? 0 : Math.max(0, Math.sin(t * 2.6 + c.phase));
        g.scale.set(1 + breath * 0.25, 1 + breath * 0.45, 1 + breath * 0.25);
        g.position.set(c.x, GROUND_Y + 0.06, c.z);
      }
      if (!under && !hushed) {
        singing++;
        sx += c.x;
        sz += c.z;
        nearestSinging = Math.min(nearestSinging, toCam);
      }
    });

    if (singing) {
      // From wherever the chorus is, at a level that says how much of it
      // is left: three toads and one toad are different rooms.
      const closeness = (0.35 + 0.65 * Math.max(0, 1 - nearestSinging / room.size)) * (0.5 + 0.5 * (singing / toads.length));
      sfx.chorus(closeness, sideOf(sx / singing - cam.x, sz / singing - cam.z));
    } else {
      sfx.chorusStop();
    }

    if (import.meta.env.DEV) {
      (window as unknown as { __croakers?: Record<string, number | string> }).__croakers = {
        room: room.id,
        total: toads.length,
        up: up.length,
        singing,
        under: toads.length - toads.filter((c) => now >= c.underUntil).length,
      };
    }
  });

  return (
    <>
      {spots.map((s, i) => (
        <group
          key={i}
          ref={(el) => {
            groups.current[i] = el;
          }}
          position={[s.x, GROUND_Y + 0.06, s.z]}
        >
          {/* A squat dark-green body and a paler throat, low to the water. */}
          <mesh>
            <sphereGeometry args={[0.13, 8, 6]} />
            <meshStandardMaterial color="#3e5a3a" roughness={1} />
          </mesh>
          <mesh position={[0, -0.03, 0.09]}>
            <sphereGeometry args={[0.08, 8, 6]} />
            <meshStandardMaterial color="#b9c19a" roughness={1} />
          </mesh>
          {[-0.06, 0.06].map((x) => (
            <mesh key={x} position={[x, 0.09, 0.07]}>
              <sphereGeometry args={[0.025, 6, 6]} />
              <meshBasicMaterial color="#e6d27a" />
            </mesh>
          ))}
        </group>
      ))}
    </>
  );
}
