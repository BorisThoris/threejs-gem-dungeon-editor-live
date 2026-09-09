import { writeFileSync } from "node:fs";
import { compose, problems, render } from "./compose.mjs";

const HERE = new URL(".", import.meta.url).pathname;
const OUT = HERE + "authored.json";

const AT = 8; // the half-size these compositions were drawn against
// The four corner blocks solids may stand in, and a handful of named spots
// inside each so a composition reads as a made thing rather than a scatter.
const NW = [-6, -6], NE = [6, -6], SW = [-6, 6], SE = [6, 6];
const p = (kind, x, z, rotation = 0) => ({ kind, x, z, rotation });
/** Scale a composition drawn at eight metres to the room it is actually built at. */
const at = (half) => (q) => ({ ...q, x: +(q.x * (half / AT)).toFixed(2), z: +(q.z * (half / AT)).toFixed(2) });

/**
 * Each composition is a room somebody left behind, and the props say what
 * happened in it. The nudger moves anything a rule forbids to the nearest
 * legal spot, so these are intents rather than coordinates.
 */
const WANTED = [
  {
    id: "hall-collapsed", kind: "normal", size: 20, shape: "square",
    note: "a ceiling came down in one corner and nobody ever cleared it",
    props: [
      p("rubble", -5.5, -5.5), p("rubble", -4.0, -6.5),
      { ...p("crate", -5.0, -4.0, 0.3), slot: "spill" },
      { ...p("crate", -6.5, -5.8, -0.2), slot: "spill" },
      { ...p("barrel", -3.4, -4.6), slot: "spill" },
      { ...p("crate", 5.0, 5.5), slot: "spill" },
      { ...p("urn", 6.5, 4.5), slot: "spill" },
      p("bookshelf", 5.5, -5.5, 1.57), p("skull", -3.0, -3.0),
      p("web", 6.5, -3.8), p("candle", 4.0, 4.0),
    ],
    slots: [{ slot: "spill", op: "nsubst", into: ["urn", "crate"], n: 2 }],
  },
  {
    id: "hall-camp", kind: "normal", size: 18, shape: "square",
    note: "somebody stopped here long enough to sit down, and did not leave",
    props: [
      p("table", -5.5, 4.5), p("chair", -4.0, 5.8, 1.2), p("chair", -6.8, 5.6, -1.2),
      p("candle", -5.5, 3.2), p("potion", -3.2, 6.0),
      { ...p("barrel", 5.0, 5.0), slot: "kit" }, { ...p("crate", 6.4, 6.0, 0.4), slot: "kit" },
      { ...p("urn", 4.0, 6.6), slot: "kit" },
      p("bookshelf", -6.4, -4.2, 1.57), p("web", 5.5, -5.0),
      p("skull", 3.4, -3.4),
    ],
    slots: [{ slot: "kit", op: "nsubst", into: ["urn", "crate"], n: 2 }],
  },
  {
    id: "vault-plundered", kind: "treasure", size: 20, shape: "square",
    note: "the hoard is here and you are not the first to find it",
    props: [
      p("chest", -5.5, -5.0, 0.4), p("chest", -4.0, -6.4, -0.3), p("chest", 5.6, 5.0, 2.6),
      { ...p("crate", -6.6, -3.8), slot: "spoil" }, { ...p("urn", 6.6, 3.8), slot: "spoil" },
      { ...p("urn", 3.2, 4.2), slot: "spoil" },
      p("rubble", 4.0, 6.4), p("web", -5.0, 5.4), p("crystal", 0, 3.0),
      p("pillar", 5.4, -5.4), p("pillar", -5.4, 3.6),
    ],
    slots: [{ slot: "spoil", op: "nsubst", into: ["urn", "crate"], n: 2 }],
  },
  {
    id: "vault-tomb", kind: "treasure", size: 22, shape: "hexagon",
    note: "not a strongroom: a grave somebody buried rich, and somebody else opened",
    props: [
      p("statue", -5.6, -5.6), p("statue", 5.6, -5.6),
      p("chest", -5.4, 5.4, 0.3), p("chest", 5.4, 5.4, -0.3),
      { ...p("urn", -6.6, 3.6), slot: "urns" }, { ...p("urn", 6.6, 3.6), slot: "urns" },
      { ...p("urn", -3.6, 6.6), slot: "urns" }, { ...p("urn", 3.6, 6.6), slot: "urns" },
      p("candle", -2.6, -3.4), p("skull", 0, -4.4), p("crystal", 0, 4.4),
    ],
    slots: [{ slot: "urns", op: "nsubst", into: ["crate", "barrel"], n: 2 }],
  },
  {
    id: "library-stacks", kind: "library", size: 18, shape: "square",
    note: "the reading floor: shelves in two aisles, and a desk that was used",
    props: [
      p("bookshelf", -6.4, -6.2, 0), p("bookshelf", -6.4, -4.2, 0), p("bookshelf", -4.2, -6.2, 0),
      { ...p("bookshelf", 6.4, -6.2, 0), slot: "aisle" }, { ...p("bookshelf", 6.4, -4.2, 0), slot: "aisle" },
      { ...p("bookshelf", 4.2, -6.2, 0), slot: "aisle" },
      p("table", 5.4, 5.2), p("chair", 3.9, 6.4, 1.0), p("candle", 6.6, 6.6),
      p("crate", -5.2, 5.2), p("banner", 0, -6.0),
    ],
    slots: [{ slot: "aisle", op: "nsubst", into: ["crate", "barrel"], n: 1 }],
  },
  {
    id: "shrine-offerings", kind: "shrine", size: 16, shape: "octagon",
    note: "people left things here, and kept leaving them, in a ring",
    props: [
      { ...p("candle", -2.4, -2.4), slot: "offering" }, { ...p("candle", 2.4, -2.4), slot: "offering" },
      { ...p("candle", -2.4, 2.4), slot: "offering" }, { ...p("candle", 2.4, 2.4), slot: "offering" },
      p("statue", -5.6, -5.6), p("statue", 5.6, -5.6),
      p("urn", -5.0, 5.6), p("urn", 5.0, 5.6),
      p("skull", -6.6, 4.2), p("potion", -3.4, 4.6), p("banner", 0, -6.4),
    ],
    slots: [{ slot: "offering", op: "nsubst", into: ["skull", "crystal"], n: 2 }],
  },
  {
    id: "arena-cover", kind: "arena", size: 26, shape: "circle",
    note: "somebody dragged cover onto the open floor, and it did not save them",
    props: [
      { ...p("pillar", -5.6, -5.6), slot: "cover" }, { ...p("pillar", 5.6, -5.6), slot: "cover" },
      { ...p("pillar", -5.6, 5.6), slot: "cover" }, p("pillar", 5.6, 5.6),
      p("crate", -4.0, -6.4), p("barrel", 4.0, 6.4),
      p("rubble", 0, -4.4), p("rubble", 0, 4.4),
      p("skull", -2.6, 2.6), p("skull", 2.6, -2.6), p("web", -6.6, 3.4),
    ],
    slots: [{ slot: "cover", op: "nsubst", into: ["crate", "barrel"], n: 2 }],
  },
  {
    id: "trap-bones", kind: "trap", size: 18, shape: "square",
    note: "this floor has already been paid for, several times",
    props: [
      { ...p("skull", -3.0, -3.0), slot: "bones" }, { ...p("skull", 3.0, -3.2), slot: "bones" },
      { ...p("skull", -3.2, 3.0), slot: "bones" }, { ...p("skull", 2.2, 2.2), slot: "bones" },
      p("rubble", -5.0, 5.0), p("rubble", 5.0, -5.0),
      p("web", -5.4, -5.4), p("web", 5.4, 5.4),
      p("barrel", -6.4, -4.2), p("crate", 6.4, 4.2), p("potion", 6.6, -4.4),
    ],
    slots: [{ slot: "bones", op: "nsubst", into: ["rubble", "web"], n: 2 }],
  },
  {
    id: "secret-hoard", kind: "secret", size: 14, shape: "square",
    note: "what the wall was hiding, and why it was worth hiding",
    props: [
      p("chest", -5.4, -5.4, 0.5), p("chest", 5.4, -5.4, -0.5),
      p("crate", -6.6, -3.6), p("urn", 3.6, -6.6),
      { ...p("crystal", 0, -2.6), slot: "glint" }, { ...p("crystal", -2.2, 3.2), slot: "glint" },
      { ...p("crystal", 2.2, 3.2), slot: "glint" },
      { ...p("candle", -4.6, 4.6), slot: "glint" }, { ...p("candle", 4.6, 4.6), slot: "glint" },
      p("web", -6.4, 5.4), p("skull", 0, 5.0),
    ],
    slots: [{ slot: "glint", op: "nsubst", into: ["candle", "crystal"], n: 2 }],
  },
  {
    id: "shop-stall", kind: "shop", size: 16, shape: "square",
    note: "the stock is stacked on one side and the counter is on the other",
    props: [
      { ...p("crate", -6.4, -6.4), slot: "stock" }, { ...p("crate", -6.4, -4.6), slot: "stock" },
      { ...p("crate", -4.6, -6.4), slot: "stock" },
      { ...p("barrel", 6.4, -6.4), slot: "stock" }, { ...p("barrel", 4.6, -6.4), slot: "stock" },
      p("table", 5.4, 5.4), p("candle", 3.8, 4.0),
      p("bookshelf", -6.4, 5.4, 1.57), p("banner", 0, -6.6),
      p("potion", -3.6, 6.6), p("skull", 6.6, 3.4),
    ],
    slots: [{ slot: "stock", op: "nsubst", into: ["crate", "barrel"], n: 2 }],
  },
  {
    id: "start-threshold", kind: "start", size: 18, shape: "square",
    note: "the last dry room before the floor, and other people used it first",
    props: [
      p("table", -5.4, -5.4), p("chair", -3.8, -6.6, 1.4), p("candle", -5.6, -3.6),
      { ...p("crate", 5.4, -5.4), slot: "left" }, { ...p("barrel", 3.8, -6.6), slot: "left" },
      { ...p("urn", -4.6, 6.6), slot: "left" },
      p("skull", -3.0, 3.0), p("web", -6.4, 5.6), p("web", 6.4, 5.6),
      p("rubble", 0, 4.6), p("potion", 4.6, 6.6),
    ],
    slots: [{ slot: "left", op: "nsubst", into: ["crate", "barrel"], n: 2 }],
  },
  {
    id: "end-stair", kind: "end", size: 24, shape: "octagon",
    note: "the way down, and everything in the room points at it",
    props: [
      { ...p("pillar", -5.4, -5.4), slot: "carved" }, { ...p("pillar", 5.4, -5.4), slot: "carved" },
      { ...p("pillar", -5.4, 5.4), slot: "carved" }, p("pillar", 5.4, 5.4),
      p("crystal", -2.6, -2.6), p("crystal", 2.6, -2.6),
      p("candle", -3.6, 3.6), p("candle", 3.6, 3.6),
      p("banner", 0, -6.6), p("urn", 6.6, 3.6), p("web", -6.6, -3.6),
    ],
    slots: [{ slot: "carved", op: "nsubst", into: ["statue", "pillar"], n: 2 }],
  },
  {
    id: "memory-antechamber", kind: "memory", size: 20, shape: "hexagon",
    note: "a waiting room for a trial: banners, dust, nothing in the way of looking",
    props: [
      p("banner", 0, -6.6), p("banner", -6.6, 0), p("banner", 6.6, 0),
      { ...p("web", -6.4, -6.4), slot: "dust" }, { ...p("web", 6.4, -6.4), slot: "dust" },
      { ...p("web", -6.4, 6.4), slot: "dust" }, { ...p("web", 6.4, 6.4), slot: "dust" },
      p("skull", -4.2, -4.2), p("skull", 4.2, 4.2),
      p("urn", -6.6, -4.4), p("urn", 6.6, 4.4),
    ],
    slots: [{ slot: "dust", op: "nsubst", into: ["rubble", "skull"], n: 2 }],
  },
  {
    id: "challenge-weights", kind: "challenge", size: 22, shape: "square",
    note: "the room says what it wants: things heavy enough to hold a plate down",
    props: [
      { ...p("crate", -6.4, -6.4), slot: "weight" }, { ...p("crate", -4.6, -6.4), slot: "weight" },
      { ...p("crate", -6.4, -4.6), slot: "weight" },
      p("barrel", 6.4, -6.4), p("barrel", 4.6, -6.4),
      p("urn", -6.4, 6.4), p("urn", 6.4, 6.4),
      p("rubble", -3.4, 3.4), p("skull", 3.4, -3.4),
      p("candle", -4.4, 4.4), p("banner", 0, 6.6),
    ],
    slots: [{ slot: "weight", op: "nsubst", into: ["barrel", "urn"], n: 2 }],
  },
];

const out = [];
for (const w of WANTED) {
  const base = { id: w.id, kind: w.kind, size: w.size, shape: w.shape, props: [], slots: w.slots ?? [] };
  const scaled = w.props.map(at(w.size / 2));
  /**
   * Eleven props, and the cap is the draw-call budget rather than taste: a
   * dressed room gets four braziers plus five to eight from its
   * arrangement and up to two from its biome, and reads 51-59 calls
   * against a written budget of 72. An authored room that carried fifteen
   * would be the first room in the game to break it. What makes these read
   * as made is the ARRANGEMENT, not the count.
   */
  const { props, dropped } = compose(base, scaled, 24);
  const t = { id: w.id, kind: w.kind, size: w.size, shape: w.shape, props, ...(w.slots ? { slots: w.slots } : {}) };
  const probs = problems(t, 24);
  console.log(`\n${w.id} (${w.kind})  ${props.length}/${w.props.length} props @${w.size}m ${w.shape}, ${dropped.length} dropped, ${probs.length} problems`);
  if (dropped.length) console.log("  dropped:", dropped.map((d) => d.kind).join(","));
  if (probs.length) console.log("  " + probs.slice(0, 6).join("\n  "));
  out.push(t);
}
writeFileSync(OUT, JSON.stringify(out, null, 1));
console.log(`\nwrote ${OUT}`);
