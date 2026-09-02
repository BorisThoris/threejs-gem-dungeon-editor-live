import type { ComponentType } from "react";

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
 * What each kind puts inside the shell. Filled in by the rooms phase; a kind
 * with no entry is an empty room, which is a legitimate (if dull) room.
 */
export const KIND_CONTENT: Partial<Record<RoomKind, ComponentType<RoomKindProps>>> = {};

export function registerRoomKind(kind: RoomKind, component: ComponentType<RoomKindProps>) {
  KIND_CONTENT[kind] = component;
}
