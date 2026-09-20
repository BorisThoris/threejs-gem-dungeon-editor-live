import type { Room } from "../dungeon/types";
import { identityFor, PLACE_IDENTITIES } from "../worldbuilding/identity";
import { WATERWAY_NAMES } from "../worldbuilding/watercourse";
import { KIND_TITLE } from "./kinds";

/** Clues and arrival readouts must name the same place. Its former purpose
 * remains visible even when the current encounter is a shop, trap or arena. */
export function roomPlaceName(room: Room): string {
  const place = room.waterway ? WATERWAY_NAMES[room.waterway.role] : PLACE_IDENTITIES[identityFor(room)].title;
  return room.kind === "normal" ? place : `${place} (${KIND_TITLE[room.kind]})`;
}
