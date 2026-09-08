import { useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";

import { secretFlavour } from "../dungeon/secret";
import { DIR_STEP, halfSize, type Room } from "../dungeon/types";
import { bus } from "../events";
import { canControl, cracksShowing, runClock, useRun } from "../state/run";
import { InteractTrigger } from "../interact/InteractTrigger";
import { DRAFT_REACH, WALL_SOUND_EVERY_S } from "../world";
import { draft } from "./draftState";

/**
 * The tell. A wall with a room behind it is thin, and thin walls breathe:
 * within DRAFT_REACH of the crack's middle the first time each visit, a
 * caption and a breath of air say so, and the GROUND line says "a draft"
 * for as long as the player stands in it. Never a marker: a player who
 * walks the walls finds it, and one who does not, does not.
 */
export function Draft({ room }: { room: Room }) {
  const felt = useRef(false);
  /**
   * Whether the crack is showing itself, which below the last band it
   * does without a bomb. Polled rather than subscribed because the glim
   * moves with the draft that is standing right here.
   */
  const [showing, setShowing] = useState(false);
  /** Run-clock second the wall last let a sound through. */
  const lastSound = useRef(-Infinity);
  const showsRef = useRef(false);

  useEffect(
    () => () => {
      draft.near = false;
      draft.roomId = null;
    },
    []
  );

  useFrame((state) => {
    const secret = room.secret;
    // Opened: the wall is a doorway now and there is nothing to find.
    if (!secret || room.links[secret.dir]) {
      draft.near = false;
      return;
    }
    const run = useRun.getState();
    if (!canControl(run)) return;
    const half = halfSize(room);
    const step = DIR_STEP[secret.dir];
    const cam = state.camera.position;
    const near = Math.hypot(cam.x - step.x * half, cam.z - step.z * half) < DRAFT_REACH;
    draft.near = near;
    draft.roomId = room.id;
    if (near && !felt.current) {
      felt.current = true;
      bus.emit("draftFelt", { roomId: room.id });
    }
    /**
     * A draft kills the flame - the lantern's one limit, and the joke the
     * whole tell is built on: the draft that says a wall is thin is the
     * same draft that takes away the light you were reading it by. It is
     * checked every frame the player stands in it rather than once on
     * arrival, so backing out and coming back with it raised is the same
     * bargain each time.
     */
    if (near && run.glim > 0) run.snuffLantern();
    // Whether the stone is giving itself up, which it does at the bottom
    // of the bands and nowhere else. Written only on change: it is read
    // to mount a trigger, and a trigger that re-mounts every frame is a
    // prompt that flickers.
    const shows = near && cracksShowing(run);
    if (shows !== showsRef.current) {
      showsRef.current = shows;
      setShowing(shows);
    }
    // And what is behind it, faintly, every few seconds while they stand
    // there: the draft says there is a room, the sound says what is in it.
    if (near && run.dungeon) {
      const now = runClock(run);
      if (now - lastSound.current >= WALL_SOUND_EVERY_S) {
        lastSound.current = now;
        const flavour = secretFlavour(run.dungeon);
        if (flavour) bus.emit("wallSound", { roomId: room.id, flavour });
      }
    }
  });

  const secret = room.secret;
  if (!secret || room.links[secret.dir]) return null;
  const half = halfSize(room);
  const step = DIR_STEP[secret.dir];

  /**
   * The gate's second answer, and the one the table has promised since it
   * was written: a cracked wall is a bomb OR it is simply passable in the
   * dark, with no bomb at all.
   *
   * It composes with the two rules either side of it rather than sitting
   * beside them. The draft that says the wall is thin is the same draft
   * that puts the lantern out, and a lantern that is out is what makes
   * the crack show - so walking up to the tell with the flame up hands
   * the player the way through by taking their light away. None of those
   * three rules was written for the others.
   */
  return showing ? (
    <InteractTrigger
      position={[step.x * half * 0.86, 0, step.z * half * 0.86]}
      label="Feel your way through the crack"
      radius={DRAFT_REACH}
      onInteract={() => useRun.getState().revealSecret(room.id)}
    />
  ) : null;
}
