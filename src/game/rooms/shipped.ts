import shipped from "../../content/templates.json";
import type { RoomTemplate } from "../dungeon/types";
import { registerTemplate } from "./templates";

/**
 * Room layouts that ship with the game, and the list of them.
 *
 * `src/content/templates.json` is what the Room Builder exports: author a
 * room, mark it live to play it, export it, add it here. The generator then
 * picks from these whenever it places a room of the same kind, in every
 * build, for every player.
 *
 * The list is exported because it is NOT the registry, and the difference
 * matters to anything holding shipped content to a rule: the Room Builder
 * registers a live draft alongside these, so `allTemplates()` in a dev
 * session is this plus whatever the author is working on. A check that
 * held a draft to what ships would be holding an author to a promise
 * nobody made them.
 */
export const SHIPPED: readonly RoomTemplate[] = shipped as RoomTemplate[];

for (const template of SHIPPED) registerTemplate(template);
