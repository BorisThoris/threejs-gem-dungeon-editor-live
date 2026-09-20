import type { ComponentType } from "react";

import { gemPosition, keyPosition, type Vec3 } from "../dungeon/layout";
import { corridorOffset, corridorWidth, doorReach } from "../dungeon/footprint";
import { DIRS, DIR_STEP } from "../dungeon/types";
import { createRng } from "../rng";
import { reservedAnchorsFor } from "./anchors";
import { authoredProps } from "./templates";
import { floorRiseAt } from "../worldbuilding/elevation";
import type { Room, RoomKind } from "../dungeon/types";

export interface RoomKindProps {
  room: Room;
}

/**
 * Floor and wall tint per kind: a tint on stone, so the kind reads at a
 * glance without a first-person dungeon floor looking like a lawn.
 */
export const KIND_TITLE: Record<RoomKind, string> = {
  start: "Start",
  end: "Exit",
  normal: "Chamber",
  treasure: "Vault",
  shop: "Shop",
  library: "Library",
  trap: "Trap Room",
  arena: "Arena",
  memory: "Memory Chamber",
  challenge: "Challenge Room",
  shrine: "Shrine",
  secret: "Hidden Room",
};

/**
 * What each kind puts inside the shell, and which anchors that content
 * stands on. Filled in by the rooms and puzzles modules; a kind with no
 * entry is an empty room, which is a legitimate (if dull) room.
 *
 * The reserved anchors are how a kind's content, the seeded dressing and
 * the gem share a room without standing inside each other: the content
 * declares what it takes, and the other two keep clear of it.
 */
export const KIND_CONTENT: Partial<Record<RoomKind, ComponentType<RoomKindProps>>> = {};
export function registerRoomKind(kind: RoomKind, component: ComponentType<RoomKindProps>) {
  KIND_CONTENT[kind] = component;
}

/**
 * The anchors a room's kind has claimed for its own content.
 *
 * Read from the anchors table rather than from whatever was passed in
 * alongside the component: the same fact was being declared next to each
 * component, which put it out of reach of anything that cannot mount one -
 * including the check that validates authored templates.
 */
export const reservedAnchors = (room: Room): Vec3[] => reservedAnchorsFor(room.kind, room);

/**
 * Everything already standing in this room that the gem must not land on:
 * what the kind's content has claimed, and whatever an author placed.
 *
 * An authored template used to be invisible to the gem, and the gem is
 * placed by seed - so on some floors it landed close enough to a template's
 * chest that the chest was filtered out, and a treasure room shipped with
 * three chests showed two. Silently, on some seeds only, which is the worst
 * way for content to go missing.
 */
export function claimedSpots(room: Room): Vec3[] {
  const authored = authoredProps(room).map<Vec3>((p) => [p.x, 0, p.z]);
  return [...reservedAnchors(room), ...authored];
}

/**
 * Where this room's gem is, if the room shell places one.
 *
 * Start and end rooms have none, and the arena places its own on the plinth
 * at its centre, because taking it is what starts the room.
 */
export function gemFor(room: Room, seed: number): Vec3 | null {
  if (room.kind === "start" || room.kind === "end" || room.kind === "arena") return null;
  const gem = gemPosition(room, seed, claimedSpots(room));
  // The wider dead end is an exploration destination. Keep the room's
  // existing reward rather than adding income, and leave authored and trap
  // compositions intact. Travel entrances never hold this reward.
  const gallery = !room.template && (room.kind === "normal" || room.kind === "treasure")
    ? DIRS.find((dir) => (room.wings?.[dir] ?? 0) >= 5 && !room.links[dir] && room.secret?.dir !== dir)
    : undefined;
  if (!gallery) return gem;
  const axis = DIR_STEP[gallery];
  const rng = createRng(`${seed}:${room.id}:gallery-gem`);
  const across = (rng() < 0.5 ? -1 : 1) * corridorWidth(room, gallery) * 0.18;
  const along = doorReach(room, gallery) - 2;
  const shift = corridorOffset(room, gallery);
  const x = axis.x * along + axis.z * across + (axis.x ? 0 : shift);
  const z = axis.z * along + axis.x * across + (axis.x ? shift : 0);
  return [x, gem[1] + floorRiseAt(room, x, z), z];
}

/**
 * Where this room's key lies, if it is the room holding one.
 *
 * The one owner of that, because it was worked out in two places - the room
 * shell and the template checker - and known to nothing else. The key is
 * put at the anchor furthest from what the room's kind has claimed and from
 * the gem, and the furniture is placed afterwards knowing none of it: 65%
 * of keys lay inside a prop and 59% inside a solid one, which is the thing
 * a player is hunting for, under a pillar. A room is assembled gem, key,
 * watcher, furniture, and each step is handed what the ones before took.
 */
export function keyFor(room: Room, seed: number): Vec3 {
  const gem = gemFor(room, seed);
  return keyPosition(room, seed, [...claimedSpots(room), ...(gem ? [gem] : [])]);
}
