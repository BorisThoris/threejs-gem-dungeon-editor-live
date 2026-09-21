import { createRng } from "../rng";
import type { DistrictId } from "../rooms/districts";
import type { Dungeon, Room } from "./types";

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

export interface SecretStory {
  flavour: SecretFlavour;
  district: DistrictId;
  title: string;
  purpose: string;
  accent: string;
  material: "root" | "iron" | "stone";
}

const STORIES: Record<DistrictId, Record<SecretFlavour, Omit<SecretStory, "district" | "flavour">>> = {
  gardens: {
    hoard: { title: "The sealed seed store", purpose: "Dry seed and winter coin were kept together here.", accent: "#a4b66f", material: "root" },
    reliquary: { title: "The graft-keeper's cell", purpose: "The gardens' oldest cutting was watched in this room.", accent: "#8fc7a0", material: "root" },
    shrine: { title: "The buried spring", purpose: "Water was blessed here before it entered the growing beds.", accent: "#79b8ae", material: "root" },
  },
  works: {
    hoard: { title: "The paymaster's lockroom", purpose: "Wages and stamped ingots waited behind the counting wall.", accent: "#c18c55", material: "iron" },
    reliquary: { title: "The master-tool cabinet", purpose: "One instrument was sealed away when the old works stopped.", accent: "#d1a66a", material: "iron" },
    shrine: { title: "The shiftwarden's font", purpose: "Workers washed soot from their hands before the lower shift.", accent: "#b68158", material: "iron" },
  },
  tombs: {
    hoard: { title: "The funeral treasury", purpose: "Offerings were counted here before the procession descended.", accent: "#c4b786", material: "stone" },
    reliquary: { title: "The cantor's reliquary", purpose: "The buried choir kept one voice apart from all the others.", accent: "#b9a8ca", material: "stone" },
    shrine: { title: "The last-water chapel", purpose: "The dead received their final water in this sealed chapel.", accent: "#9aaeb1", material: "stone" },
  },
};

/** One source for the promise heard through the wall and the place beyond it. */
export function secretStoryFor(room: Room, dungeonSeed: number): SecretStory {
  const district = room.district ?? "tombs";
  const rng = createRng(`${dungeonSeed}:secret:flavour`);
  const flavour = SECRET_FLAVOURS[Math.floor(rng() * SECRET_FLAVOURS.length)];
  return { district, flavour, ...STORIES[district][flavour] };
}

export function secretStory(d: Dungeon): SecretStory | null {
  const room = d.rooms.find(r => r.id === d.secretId);
  return room ? secretStoryFor(room, d.seed) : null;
}

export function secretFlavour(d: Dungeon): SecretFlavour | null {
  return secretStory(d)?.flavour ?? null;
}
