import { createRng } from "../rng";
import type { Dungeon } from "./types";

/**
 * What is behind the cracked wall.
 *
 * Run 8 hid a room and gave the player a way in; a dressed room with a
 * gem was worth a bomb only just. One of three now, by the run's seed, and
 * one owner of which: a hoard dressed as a vault, a reliquary with one
 * relic on a stand for nothing, or a shrine's font for a floor that had
 * none. The generator does not know - it places a room - and the content
 * asks here.
 */
export type SecretFlavour = "hoard" | "reliquary" | "shrine";

export const SECRET_FLAVOURS: readonly SecretFlavour[] = ["hoard", "reliquary", "shrine"];

export function secretFlavour(d: Dungeon): SecretFlavour | null {
  if (!d.secretId) return null;
  const rng = createRng(`${d.seed}:secret:flavour`);
  return SECRET_FLAVOURS[Math.floor(rng() * SECRET_FLAVOURS.length)];
}
