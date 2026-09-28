import { secretStoryFor } from "../dungeon/secret";
import type { Dungeon } from "../dungeon/types";
import { roomPlaceName } from "./placeName";
import { waterworkDescription, WATERWAY_NAMES } from "../worldbuilding/watercourse";
import { DISTRICTS } from "./districts";

/** A landmark's name is learned in its room, just like its existing map mark. */
export function rememberedLandmarks(dungeon: Dungeon, visited: readonly string[]) {
  return dungeon.rooms.flatMap(room => {
    if (!room.landmark || !visited.includes(room.id)) return [];
    const district = room.district ? DISTRICTS[room.district].name : "District landmark";
    return [{ roomId: room.id, id: room.landmark, name: roomPlaceName(room, dungeon.seed),
      detail: district + (dungeon.secretTrail?.sourceId === room.id ? " · landmark tally begins here" : "") }];
  });
}

export interface RememberedService {
  roomId: string;
  kind: "shop" | "shrine";
  symbol: "S" | "+";
  name: string;
  detail: string;
}

/** Waterworks are remembered only after entering their room. Opening a valve
 * changes the known circuit, but never reveals its undiscovered endpoint. */
export function rememberedWaterworks(
  dungeon: Dungeon, visited: readonly string[], opened: boolean, drained: boolean, taken: boolean,
) {
  return dungeon.rooms.flatMap(room => {
    const role = room.waterway?.role;
    if (!visited.includes(room.id) || !role || role === "channel") return [];
    return [{ roomId: room.id, role, symbol: role === "sluice" ? "⚙" : "◇",
      name: WATERWAY_NAMES[role], detail: waterworkDescription(role, opened, drained, taken) }];
  });
}

/** Remember places the delver has actually entered. Mapping teaches geometry,
 * not a shop's inventory or what waits inside a sealed room. Stock and font
 * use remain the run store's facts; hidden fonts use the ordinary secret story. */
export function rememberedServices(
  dungeon: Dungeon, visited: readonly string[], cleared: readonly string[], bombBought: boolean, unlocked: readonly string[],
): RememberedService[] {
  return dungeon.rooms.flatMap(room => {
    if (!visited.includes(room.id)) return [];
    const kind = room.kind === "shop" ? "shop"
      : room.kind === "shrine" || (room.kind === "secret" && secretStoryFor(room, dungeon.seed).flavour === "shrine")
        ? "shrine" : null;
    if (!kind) return [];
    const detail = kind === "shop" ? `Oil, lives and relics · bomb ${bombBought ? "sold" : "in stock"}`
      : cleared.includes(room.id) ? "Font used" : "Font unused";
    return [{ roomId: room.id, kind, symbol: kind === "shop" ? "S" : "+",
      name: roomPlaceName(room, dungeon.seed),
      detail: detail + (dungeon.vaultId === room.id && !unlocked.includes(room.id) ? " · vault entry needs unlocking" : "") }];
  });
}
