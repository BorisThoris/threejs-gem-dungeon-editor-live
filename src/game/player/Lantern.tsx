import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Color, type PointLight } from "three";

import { candelaAt } from "../lantern/glim";
import { modifiers } from "../relics/catalog";
import { lanternBand, lanternLit, useRun } from "../state/run";

/**
 * The light the player carries. The store owns whether it is lit and
 * spends oil when raising it or entering a room; this component draws it.
 *
 * The light is eased rather than switched. A lamp that snapped between
 * fifteen metres and five read as the renderer glitching; over a third of
 * a second it reads as a hand lowering.
 *
 * What it eases TOWARDS is the band, not a raised/lowered pair. The glim
 * has five named steps and each one says how far the delver sees; this
 * used to blend between the first and the third and leave the other three
 * with nothing on screen, so four taps of the lantern key produced two
 * changes in the room. Now every tap is a smaller room.
 *
 */
export function Lantern() {
  const light = useRef<PointLight>(null);
  /**
   * The reach the flame is currently at, in world units - eased towards
   * the band's, so the change reads as a hand moving.
   *
   * Metres rather than a 0-to-1 blend, because the target is now one of
   * five values rather than one of two and a normalised level would have
   * to be un-normalised against whichever pair it sat between.
   */
  const reach = useRef(0);
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
    /**
     * An extinguished lantern reads as the bottom band. An empty flask
     * can still carry a flame paid for when it was raised in this room.
     */
    const band = lanternBand(run);

    const target = lanternLit(run) ? band.sees : 0;
    reach.current += (target - reach.current) * Math.min(1, delta * 3.2);
    l.distance = reach.current;
    // Derived from the reach it actually has this frame rather than from
    // the band it is heading for, so the two ease together instead of the
    // brightness arriving before the reach does.
    l.intensity = lanternLit(run) ? candelaAt(reach.current) : 0;
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
        __lantern?: { intensity: number; distance: number; band: string; tint: string };
      };
      const probe = (w.__lantern ??= { intensity: 0, distance: 0, band: band.id, tint });
      probe.intensity = l.intensity;
      probe.distance = l.distance;
      // Which of the five the flame is heading for, so a check can step the
      // lantern down and read the reach each step arrives at.
      probe.band = band.id;
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

  return <pointLight ref={light} name="carried-lantern" color={tint} intensity={0} decay={1.5} />;
}
