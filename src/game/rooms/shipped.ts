import shipped from "../../content/templates.json";
import type { RoomTemplate } from "../dungeon/types";
import { registerTemplate } from "./templates";

/**
 * Room layouts that ship with the game.
 *
 * `src/content/templates.json` is what the Room Builder exports: author a
 * room, mark it live to play it, export it, add it here. The generator then
 * picks from these whenever it places a room of the same kind, in every
 * build, for every player.
 */
for (const template of shipped as RoomTemplate[]) registerTemplate(template);
