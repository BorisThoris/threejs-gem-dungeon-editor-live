import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { corridorOffset, doorReach } from "../dungeon/footprint";
import { DIR_STEP } from "../dungeon/types";
import type { Room } from "../dungeon/types";
import { bus } from "../events";
import { playerAt } from "../player/where";
import { canControl, useRun } from "../state/run";
import { galleryTerminiFor } from "./galleryTermini";

const RESPONSE_REACH = 1.65;

/**
 * A terminal station answers only after the player walks all the way onto its
 * landing. This component owns no geometry, light or timer: it watches the
 * same room-local position already used by creatures and emits one event per
 * site per visit. A paired secret room therefore rewards exploring both arms
 * without turning the crack into a waypoint.
 */
export function GalleryResponses({ room }: { room: Room }) {
  const pattern = useMemo(() => galleryTerminiFor(room), [room]);
  const heard = useRef(new Set<number>());
  useEffect(() => {
    heard.current.clear();
    if (!import.meta.env.DEV || typeof window === "undefined") return;
    const win = window as unknown as { __galleryResponses?: unknown };
    win.__galleryResponses = { roomId: room.id, reach: RESPONSE_REACH,
      response: pattern.definition.response, sites: pattern.sites };
    return () => { delete win.__galleryResponses; };
  }, [room.id, pattern]);
  useFrame(() => {
    const run = useRun.getState();
    if (!canControl(run)) return;
    pattern.sites.forEach((site, index) => {
      if (heard.current.has(index) || Math.hypot(site.x - playerAt.x, site.z - playerAt.z) > RESPONSE_REACH) return;
      heard.current.add(index);
      const secret = site.secretFlank ? room.secret?.dir : undefined;
      const axis = secret ? DIR_STEP[secret] : null;
      const reach = secret ? doorReach(room, secret) - .25 : 0;
      const shift = secret ? corridorOffset(room, secret) : 0;
      const answerX = axis ? axis.x * reach + (axis.x ? 0 : shift) : site.x;
      const answerZ = axis ? axis.z * reach + (axis.x ? shift : 0) : site.z;
      bus.emit("galleryReached", { roomId: room.id, district: room.district ?? "tombs",
        x: site.x, z: site.z, answerX, answerZ, secretFlank: site.secretFlank });
    });
  });
  return null;
}
