import type { Dungeon, Room } from "../dungeon/types";
import { secretStoryFor } from "../dungeon/secret";
import { sentryFor } from "../sentry/placement";
import { keyFor } from "./kinds";
import type { DressingOptions } from "./placements";
import { trapsFor } from "../traps/placement";
import { TRAP_FOOTPRINT } from "../traps/geometry";

/** Facts that change furniture beyond a room's seeded base layout. */
export interface DressingContext {
  dungeon: Dungeon | null;
  floor: number;
  fullCountFloor?: number | null;
}

/** Shared by rendering, bodies, interactions, the atlas and inspection. */
export function roomDressingOptions(s: DressingContext, room: Room, seed: number): DressingOptions {
  const vault = s.dungeon?.vaultId === room.id;
  const key = s.dungeon?.keyRoomId === room.id ? keyFor(room, seed) : null;
  return {
    asVault: vault || (room.kind === "secret" && secretStoryFor(room, seed).flavour === "hoard"),
    key,
    sentry: sentryFor(room, seed, s.floor, key ? [key] : [])?.at ?? null,
    brimming: vault && s.fullCountFloor === s.floor,
    traps: trapsFor(room, seed, s.dungeon?.endId ?? null).filter(t => t.kind !== "grate")
      .map(t => ({ x: t.x, z: t.z, r: TRAP_FOOTPRINT[t.kind] })),
  };
}
