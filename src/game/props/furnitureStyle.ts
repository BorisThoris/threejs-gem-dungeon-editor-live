/** Shared tints keep room-level instances identical to the editor's props. */
export const WOOD_LIT = "#eff7f9";
export const DARK_WOOD_LIT = "#a5aab9";
export const IRON = "#8d939c";

const BATCHED_FURNITURE_KINDS = ["barrel", "chair", "crate", "table", "urn"] as const;
export type BatchedFurnitureKind = (typeof BATCHED_FURNITURE_KINDS)[number];
export const BATCHED_FURNITURE: ReadonlySet<string> = new Set(BATCHED_FURNITURE_KINDS);
