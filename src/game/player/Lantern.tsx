import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Color, type PointLight } from "three";

import { modifiers } from "../relics/catalog";
import { canControl, lanternLit, useRun } from "../state/run";
import {
  LANTERN_INTENSITY_DOWN,
  LANTERN_INTENSITY_UP,
  LANTERN_RANGE_DOWN,
  LANTERN_RANGE_UP,
} from "../world";

/**
 * The light the player carries, and the clock that burns it.
 *
 * Both in one component because they are one fact: the light is on
 * exactly while the oil is going down, and splitting them would be two
 * places deciding whether the lantern is lit.
 *
 * The light is eased rather than switched. A lamp that snapped between
 * fifteen metres and five read as the renderer glitching; over a third of
 * a second it reads as a hand lowering.
 *
 * The oil is spent in the store, but not every frame - the store's own
 * comment on `makeNoise` says why, and this is the same problem with a
 * tighter loop. Whole seconds are accumulated here and flushed, so a run
 * writes to the store about once a second instead of sixty times, and the
 * number a player sees is the same either way because it is displayed in
 * seconds.
 */
export function Lantern() {
  const light = useRef<PointLight>(null);
  const unflushed = useRef(0);
  // Eased towards the target, so the change reads as a hand moving.
  const level = useRef(1);
  /**
   * The colour of the flame, which is the one thing of the delver's the
   * player sees all run.
   *
   * Relics used to change numbers and nothing else - a Warden's Lantern
   * bought two floors ago left no mark on the screen at all. It is the
   * modifiers that decide which relic wins; this only asks. Subscribed
   * rather than read in the frame loop, because the answer changes about
   * twice a run and comparing two strings sixty times a second to find
   * that out is work for nobody.
   */
  const tint = useRun((s) => modifiers(s.relics).lightTint);
  const colour = useMemo(() => new Color(tint), [tint]);

  useFrame((state, delta) => {
    const l = light.current;
    if (!l) return;
    const run = useRun.getState();
    const lit = lanternLit(run);

    const target = lit ? 1 : 0;
    level.current += Math.max(-1, Math.min(1, target - level.current)) * Math.min(1, delta * 3.2);
    const ease = level.current;
    l.intensity =
      LANTERN_INTENSITY_DOWN + (LANTERN_INTENSITY_UP - LANTERN_INTENSITY_DOWN) * ease;
    l.distance = LANTERN_RANGE_DOWN + (LANTERN_RANGE_UP - LANTERN_RANGE_DOWN) * ease;
    // Slightly ahead of and below the eye, so it lights the floor in front
    // rather than the inside of the player's own head.
    l.position.set(state.camera.position.x, state.camera.position.y - 0.25, state.camera.position.z);
    // Eased like the reach is, so putting a relic on does not switch the
    // room's colour between two frames.
    l.color.lerp(colour, Math.min(1, delta * 2.4));

    if (import.meta.env.DEV) {
      /**
       * What the light in the scene is actually doing.
       *
       * The store knows whether the lantern is raised and how much oil is
       * left, and between those two there was no way to ask whether the
       * room got any darker - which is the entire point of the feature.
       * Written into one object rather than a fresh one, at frame rate.
       */
      const w = window as unknown as {
        __lantern?: { intensity: number; distance: number; ease: number; tint: string };
      };
      const probe = (w.__lantern ??= { intensity: 0, distance: 0, ease: 0, tint });
      probe.intensity = l.intensity;
      probe.distance = l.distance;
      probe.ease = ease;
      // What the modifiers asked for, not what the eased colour has
      // reached: a check about which relic is worn should not also be a
      // check about how fast the ease runs on this machine.
      probe.tint = tint;
    }

    /**
     * Nothing is spent here any more.
     *
     * This used to accumulate seconds and flush them into the store about
     * once a second, and the whole idea was wrong: a wall clock taxes
     * deliberation, careful looking and hiding, which are the three things
     * this game is made of. Oil is now spent walking into a room, once,
     * by the store action the doorway calls - so standing still in the
     * dark with the flame up costs nothing at all, and pushing on into a
     * room nobody has seen costs six times what backtracking does.
     *
     * The light itself is still eased here, because that is what this
     * component is for.
     */
  });

  return <pointLight ref={light} color={tint} intensity={LANTERN_INTENSITY_UP} decay={1.5} />;
}
