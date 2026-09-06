import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";

import { secretFlavour } from "../dungeon/secret";
import { DIR_STEP, halfSize, type Room } from "../dungeon/types";
import { bus } from "../events";
import { canControl, runClock, useRun } from "../state/run";
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
  /** Run-clock second the wall last let a sound through. */
  const lastSound = useRef(-Infinity);

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

  return null;
}
