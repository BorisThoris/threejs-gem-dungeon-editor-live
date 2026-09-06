import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";

import { DIR_STEP, halfSize, type Room } from "../dungeon/types";
import { bus } from "../events";
import { canControl, useRun } from "../state/run";
import { DRAFT_REACH } from "../world";
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
    if (!canControl(useRun.getState())) return;
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
  });

  return null;
}
