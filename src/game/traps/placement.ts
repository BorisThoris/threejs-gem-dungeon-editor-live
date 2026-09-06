import { doorPosition, HAZARD_RADIUS, LANE_HALF_WIDTH } from "../dungeon/layout";
import { DIRS, halfSize, type Dir, type Room, type RoomKind } from "../dungeon/types";
import type { Body } from "../mobs/body";
import { PROP_SPECS } from "../props/specs";
import { createRng } from "../rng";
import { placementsFor } from "../rooms/placements";
import { gemFor, keyFor } from "../rooms/kinds";
import { PIT_RADIUS } from "../world";

/**
 * Where the floor's traps are, and what each one is to a body.
 *
 * One owner, derived from the room and the seed the way the furniture and
 * the rats are. A trap declares which bodies spring it and which it hurts
 * in the body table's own terms, so the floor never grows a rule about a
 * creature that the creature does not also read.
 */
export type TrapKind = "darts" | "pit" | "grate";

export interface Trap {
  key: string;
  kind: TrapKind;
  x: number;
  z: number;
  /** The doorway a dart plate guards or a grate hangs over. */
  dir?: Dir;
}

export const TRAPS: Record<TrapKind, { springs: readonly Body[]; hurts: readonly Body[] }> = {
  // Darts fly at chest height: a rat runs under them, a ghost through them.
  darts: { springs: ["ground"], hurts: ["ground", "flying"] },
  pit: { springs: ["ground"], hurts: ["ground"] },
  // A grate is sprung by the one body that comes in through doorways.
  grate: { springs: ["ground"], hurts: [] },
};

const TRAP_KINDS: ReadonlySet<RoomKind> = new Set<RoomKind>(["normal", "treasure", "trap", "arena", "shrine"]);
/** How far inside the doorway a dart plate sits, as a share of the door's distance from the middle. */
const PLATE_INSET = 0.55;

const inLane = (x: number, z: number, room: Room): boolean =>
  DIRS.some((d) => {
    if (!room.links[d]) return false;
    const [dx, , dz] = doorPosition(room, d);
    // The lane runs from the middle to that door: the axis the door is on.
    return Math.abs(dx) > Math.abs(dz)
      ? Math.abs(z) < LANE_HALF_WIDTH + PIT_RADIUS && Math.sign(x) === Math.sign(dx)
      : Math.abs(x) < LANE_HALF_WIDTH + PIT_RADIUS && Math.sign(z) === Math.sign(dz);
  });

/** The room's traps: none in the start, the exit, a shop or a puzzle, and at most two. */
export function trapsFor(room: Room, seed: number, endId: string | null): Trap[] {
  if (!TRAP_KINDS.has(room.kind)) return [];
  const rng = createRng(`${seed}:${room.id}:traps`);
  const roll = rng();
  const count = roll < 0.4 ? 0 : roll < 0.8 ? 1 : 2;
  if (!count) return [];
  const doors = DIRS.filter((d) => room.links[d] && room.links[d] !== endId);
  const half = halfSize(room);
  const solid = placementsFor(room, seed).filter((p) => PROP_SPECS[p.kind].solid);
  const gem = gemFor(room, seed);
  const key = keyFor(room, seed);
  const out: Trap[] = [];
  const kinds: TrapKind[] = ["darts", "pit", "grate"];
  for (let i = kinds.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [kinds[i], kinds[j]] = [kinds[j], kinds[i]];
  }
  for (const kind of kinds) {
    if (out.length >= count) break;
    if (kind === "darts" && doors.length) {
      const dir = doors[Math.floor(rng() * doors.length)];
      const [dx, , dz] = doorPosition(room, dir);
      out.push({ key: `${room.id}:darts:${dir}`, kind, x: dx * PLATE_INSET, z: dz * PLATE_INSET, dir });
    } else if (kind === "grate" && doors.length >= 2) {
      const dir = doors[Math.floor(rng() * doors.length)];
      const [dx, , dz] = doorPosition(room, dir);
      out.push({ key: `${room.id}:grate:${dir}`, kind, x: dx, z: dz, dir });
    } else if (kind === "pit") {
      // A spot off every lane, clear of the furniture, and never on what
      // the room is for.
      for (let tries = 0; tries < 12; tries++) {
        const x = (rng() * 2 - 1) * (half - 1.5);
        const z = (rng() * 2 - 1) * (half - 1.5);
        if (inLane(x, z, room)) continue;
        if (solid.some((p) => Math.hypot(x - p.x, z - p.z) < PROP_SPECS[p.kind].radius + PIT_RADIUS + 0.4)) continue;
        if (gem && Math.hypot(x - gem[0], z - gem[2]) < HAZARD_RADIUS + PIT_RADIUS + 0.5) continue;
        if (Math.hypot(x - key[0], z - key[2]) < PIT_RADIUS + 1.2) continue;
        out.push({ key: `${room.id}:pit:${tries}`, kind, x, z });
        break;
      }
    }
  }
  return out;
}
