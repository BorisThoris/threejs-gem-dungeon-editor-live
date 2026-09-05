import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { PointLight } from "three";

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

    if (import.meta.env.DEV) {
      /**
       * What the light in the scene is actually doing.
       *
       * The store knows whether the lantern is raised and how much oil is
       * left, and between those two there was no way to ask whether the
       * room got any darker - which is the entire point of the feature.
       * Written into one object rather than a fresh one, at frame rate.
       */
      const w = window as unknown as { __lantern?: Record<string, number> };
      const probe = (w.__lantern ??= { intensity: 0, distance: 0, ease: 0 });
      probe.intensity = l.intensity;
      probe.distance = l.distance;
      probe.ease = ease;
    }

    // Time only counts while the player is in control: a lantern must not
    // burn through the pause menu or the black frame between two rooms.
    if (!lit || !canControl(run)) return;
    unflushed.current += delta;
    if (unflushed.current < 1) return;
    const spend = unflushed.current;
    unflushed.current = 0;
    useRun.getState().burnOil(spend);
  });

  return <pointLight ref={light} color="#ffd9a0" intensity={LANTERN_INTENSITY_UP} decay={1.5} />;
}
