import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Group } from "three";

import * as din from "../din/din";
import type { Room } from "../dungeon/types";
import { bus } from "../events";
import { canControl, runClock, useRun } from "../state/run";
import { sfx } from "../systems/audio";
import { sideOf } from "../systems/bearing";
import { CROAKER_HUSH_RADIUS, CROAKER_UNDER_S } from "../world";
import type { Spot } from "./ambient";
import { croakerHabitats, croakerMigration } from "./croakerHabitat";
import { waterLevel } from "../worldbuilding/watercourse";
import { floorHeightAt } from "../worldbuilding/elevation";
import { geo, mat } from "../props/shared";

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
export function Croakers({ room, spots, seed }: { room: Room; spots: Spot[]; seed: number }) {
  const groups = useRef<(Group | null)[]>([]);
  const throats = useRef<(Group | null)[]>([]);
  const habitats = useMemo(() => croakerHabitats(room, spots, seed), [room, spots, seed]);
  const toads = useMemo<Croaker[]>(
    () => {
      const run = useRun.getState(), migration = croakerMigration(run.waterOpenedAt, runClock(run));
      return habitats.map((h, i) => ({
        x: h.wet.x + (h.refuge.x - h.wet.x) * migration,
        z: h.wet.z + (h.refuge.z - h.wet.z) * migration,
        underUntil: 0, phase: i * 1.7,
      }));
    },
    [habitats]
  );
  const heard = useMemo(() => din.emptyArrival(), []);

  useEffect(() => () => {
    sfx.chorusStop();
    if (import.meta.env.DEV) {
      const win = window as unknown as { __croakers?: { room?: string } };
      if (win.__croakers?.room === room.id) delete win.__croakers;
    }
  }, [room.id]);

  useFrame((state) => {
    const run = useRun.getState();
    if (!canControl(run)) {
      sfx.chorusStop();
      return;
    }
    const now = runClock(run);
    const cam = state.camera.position;
    const t = now;
    const drained = !!room.waterway && waterLevel(run.waterOpenedAt, now) < 0.2;
    // Migration follows the drain's persistent time, so a revisit shows the
    // same animal locations and pausing cannot advance the retreat.
    const migration = croakerMigration(run.waterOpenedAt, now);
    toads.forEach((c, i) => {
      const habitat = habitats[i];
      c.x = habitat.wet.x + (habitat.refuge.x - habitat.wet.x) * migration;
      c.z = habitat.wet.z + (habitat.refuge.z - habitat.wet.z) * migration;
    });

    // Their row: [loud] at 0.30, [blast] at 0.10. Anything the floor is
    // that loud about puts every one of them under at once.
    const up = toads.filter((c, i) => now >= c.underUntil || drained && habitats[i].followsChannel);
    const canDive = up.filter(c => !drained || !habitats[toads.indexOf(c)].followsChannel);
    if (canDive.length && din.answering(heard, "croaker", room.id)) {
      for (const c of canDive) c.underUntil = now + CROAKER_UNDER_S;
      const nearest = canDive.reduce((a, b) => (Math.hypot(a.x - cam.x, a.z - cam.z) < Math.hypot(b.x - cam.x, b.z - cam.z) ? a : b));
      sfx.splash(sideOf(nearest.x - cam.x, nearest.z - cam.z));
      bus.emit("croakersDove", { roomId: room.id });
    }

    let singing = 0;
    let sx = 0;
    let sz = 0;
    let nearestSinging = Infinity;
    toads.forEach((c, i) => {
      const g = groups.current[i];
      const under = !(drained && habitats[i].followsChannel) && now < c.underUntil;
      const toCam = Math.hypot(cam.x - c.x, cam.z - c.z);
      const hushed = toCam < CROAKER_HUSH_RADIUS;
      if (g) {
        g.visible = !under;
        // The throat, filling and emptying, in its own time.
        const breath = hushed ? 0 : Math.max(0, Math.sin(t * 2.6 + c.phase));
        throats.current[i]?.scale.set(1 + breath * 0.25, 1 + breath * 0.45, 1 + breath * 0.25);
        const hopping = habitats[i].followsChannel && migration > 0 && migration < 1;
        g.position.set(c.x, floorHeightAt(room, c.x, c.z) + 0.045 + (hopping ? Math.abs(Math.sin(now * 8 + c.phase)) * 0.13 : 0), c.z);
      }
      if (!under && !hushed && (!habitats[i].followsChannel || !drained)) {
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
        x: toads[0]?.x ?? 0,
        z: toads[0]?.z ?? 0,
        total: toads.length,
        up: up.length,
        singing,
        migrating: habitats.filter(h => h.followsChannel).length * (migration > 0 && migration < 1 ? 1 : 0),
        sheltered: habitats.filter(h => h.followsChannel).length * (migration === 1 ? 1 : 0),
        under: toads.filter((c, i) => now < c.underUntil && !(drained && habitats[i].followsChannel)).length,
      };
    }
  });

  return (
    <>
      {toads.map((s, i) => (
        <group
          key={i}
          name={`croaker-${i}`}
          ref={(el) => {
            groups.current[i] = el;
          }}
          position={[s.x, floorHeightAt(room, s.x, s.z) + 0.045, s.z]}
          rotation={[0, Math.atan2(-s.x, -s.z), 0]}
        >
          <mesh geometry={geo("croaker")} material={mat({ color: "#70894d", roughness: 1 })} />
          <group ref={el => { throats.current[i] = el; }} position={[0, .16, .245]}>
            <mesh scale={[.23, .14, .09]} geometry={geo("box", 1, 1, 1)} material={mat({ color: "#c5ce91", roughness: 1 })} />
          </group>
          <mesh geometry={geo("croaker-eyes")} material={mat({ color: "#e6d27a", basic: true })} />
        </group>
      ))}
    </>
  );
}
