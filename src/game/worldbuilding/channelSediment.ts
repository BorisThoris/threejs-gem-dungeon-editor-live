import type { Room } from "../dungeon/types";
import type { BuiltinSurface } from "../textures/registry";

const SEDIMENT = {
  gardens: { name: "Garden silt", color: "#756744", surface: "moss" },
  works: { name: "Rust-stained sediment", color: "#735447", surface: "stone" },
  tombs: { name: "Pale mineral sediment", color: "#89816b", surface: "stone" },
} satisfies Record<string, { name: string; color: string; surface: BuiltinSurface }>;

/** One material identity for the physical channel and the atlas preview. */
export const channelSediment = (room: Room) => SEDIMENT[room.district ?? "tombs"];
