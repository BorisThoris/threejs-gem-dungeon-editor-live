import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Group } from "three";
import { geo, mat } from "../props/shared";

import { canControl, runClock, useRun } from "../state/run";
import { sfx } from "../systems/audio";
import { sideOf } from "../systems/bearing";
import * as din from "../din/din";
import { SUSCEPTIBILITY } from "../din/susceptibility";
import type { Room } from "../dungeon/types";
import { WALL_HEIGHT } from "../world";
import type { Spot } from "./ambient";
import { bus } from "../events";
import { roomSegmentClear } from "../dungeon/footprint";

const FLOCK = 7;
const STARTLE_WARNING_S = 1.2;

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
  const arrivedAt = useRef<number | null>(null);
  const stirringAt = useRef<number | null>(null);

  // The room changed, or the run ended: a roost that is not drawn is not heard.
  useEffect(() => () => sfx.flockStop(), []);

  useFrame((state) => {
    const g = group.current;
    if (!g) return;
    const run = useRun.getState();
    const now = runClock(run);
    const roused = now < run.batsRousedUntil;
    /**
     * Heard while it is up, from wherever in the room the player stands.
     *
     * The roost going up was a one-shot borrowed from the Cutpurse and
     * then five seconds of a flock wheeling in silence, in a room the
     * player might be facing away from: the noise that carries twice as
     * far as a dash - the whole cost of the thing - was inaudible to the
     * one person paying it. Never quieter than a third in the room, and
     * louder underneath, with the side it is on.
     */
    const cam = state.camera.position;
    const overhead = Math.hypot(cam.x - at.x, cam.z - at.z);
    if (roused && canControl(run)) {
      sfx.flock(Math.max(0.3, 1 - overhead / (room.size * 0.6)), sideOf(at.x - cam.x, at.z - cam.z));
    } else {
      sfx.flockStop();
    }
    if (canControl(run)) {
      if (arrivedAt.current === null) arrivedAt.current = now;
      const settled = now - arrivedAt.current >= 1.8;
      const nearby = Math.hypot(state.camera.position.x - at.x, state.camera.position.z - at.z) < 5
        && roomSegmentClear(room, at.x, at.z, state.camera.position.x, state.camera.position.z);
      let freshDash = false;
      if (seen.current < 0) seen.current = run.noisyUntil;
      if (run.noisyUntil > seen.current + 0.01) {
        seen.current = run.noisyUntil;
        freshDash = now < run.noisyUntil;
      }
      /**
       * And anything else the floor is loud enough about.
       *
       * This used to be one hand-written listener for `bombBurst` in this
       * room, which is the shape the whole codebase had: every creature
       * with its own list of the specific events it had been told to care
       * about. The roost now declares that it answers to [loud] at 0.40
       * and to [blast] at 0.15, and the consequences fall out of the
       * table without another line here - a barrel burst beside it, a
       * grate dropping in the doorway, a bomb in the room next door, and
       * whatever noisy thing gets added next month. It is deliberately
       * jumpier about a blast than about a noise, so a bomb one room away
       * still puts it up when the sound of it alone would not.
       *
       * It cannot rouse itself: a roost going up is [loud] 0.70, which is
       * over its own threshold, but by the time the five seconds are up
       * that has decayed to 0.175 and the noise it made is beneath its
       * notice. Worth checking rather than assuming, because a creature
       * that answers to a tag it also emits is one tuning change away
       * from never settling again.
       */
      if (settled && !roused) {
        const sus = SUSCEPTIBILITY.bat;
        const loud = din.arriving("loud", room.id) >= (sus.answers.loud ?? 1);
        const blast = din.arriving("blast", room.id) >= (sus.answers.blast ?? 1);
        if (blast) {
          stirringAt.current = null;
          run.rouseBats();
        } else if (!nearby) {
          stirringAt.current = null;
        } else {
          if (stirringAt.current === null && (freshDash || loud)) {
            stirringAt.current = now;
            bus.emit("notice", "Bats stir overhead. Move clear of the roost.");
            sfx.batsStir(sideOf(at.x - cam.x, at.z - cam.z));
          }
          if (stirringAt.current !== null && now - stirringAt.current >= STARTLE_WARNING_S) {
            stirringAt.current = null;
            run.rouseBats();
          }
        }
      }
      if (roused) stirringAt.current = null;
    }
    const t = state.clock.elapsedTime;
    g.children.forEach((c, i) => {
      if (roused) {
        const a = t * 5 + i * 1.1;
        c.position.set(Math.cos(a) * (1.5 + i * 0.2), Math.sin(t * 7 + i) * 0.4, Math.sin(a) * (1.5 + i * 0.2));
        c.rotation.z = Math.sin(t * 30 + i) * 0.6;
      } else {
        c.position.set(Math.cos(i) * 0.25, -0.1 * (i % 3), Math.sin(i) * 0.25);
        c.rotation.z = stirringAt.current === null ? 0 : Math.sin(now * 22 + i) * 0.35;
      }
    });
    if (import.meta.env.DEV) {
      (window as unknown as { __bats?: { room: string; roused: boolean; stirring: boolean } }).__bats = {
        room: room.id, roused, stirring: stirringAt.current !== null,
      };
    }
  });

  return (
    <group name="ambient-bats" ref={group} position={[at.x, WALL_HEIGHT - 0.6, at.z]}>
      {Array.from({ length: FLOCK }, (_, i) => (
        <mesh key={i} geometry={geo("cone", 0.12, 0.28, 3)} material={mat({ color: "#14101a", roughness: 1 })} />
      ))}
    </group>
  );
}
