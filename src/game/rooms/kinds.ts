import type { ComponentType } from "react";

import { gemPosition, type Vec3 } from "../dungeon/layout";
import { reservedAnchorsFor } from "./anchors";
import { getTemplate } from "./templates";
import type { Room, RoomKind } from "../dungeon/types";

export interface RoomKindProps {
  room: Room;
}

/**
 * Floor and wall tint per kind: a tint on stone, so the kind reads at a
 * glance without a first-person dungeon floor looking like a lawn.
 */
export const KIND_TINT: Record<RoomKind, { floor: string; wall: string; surface: string }> = {
  start: { floor: "#a7b59f", wall: "#6a7167", surface: "moss" },
  end: { floor: "#b59a92", wall: "#6e5f5c", surface: "stone" },
  normal: { floor: "#a9a9b3", wall: "#65656d", surface: "stone" },
  treasure: { floor: "#b8ad92", wall: "#6d6758", surface: "brick" },
  shop: { floor: "#9fb3a8", wall: "#5f6b66", surface: "wood" },
  library: { floor: "#b3a48d", wall: "#6a6256", surface: "wood" },
  trap: { floor: "#b09890", wall: "#6b5d58", surface: "dirt" },
  arena: { floor: "#a8a8a3", wall: "#656563", surface: "stone" },
  memory: { floor: "#a59ebb", wall: "#64606f", surface: "stone" },
  challenge: { floor: "#b3a88f", wall: "#6b6659", surface: "brick" },
};

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
  const template = room.template ? getTemplate(room.template) : undefined;
  const authored = (template?.props ?? []).map<Vec3>((p) => [p.x, 0, p.z]);
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
  return gemPosition(room, seed, claimedSpots(room));
}
