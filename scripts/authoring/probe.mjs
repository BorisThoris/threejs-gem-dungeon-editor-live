import { L, legalSpots } from "./space.mjs";
const base = { id: "probe", kind: "normal", size: 16, shape: "square", props: [] };
for (const kind of ["pillar", "table", "chest", "skull", "candle", "barrel", "bookshelf", "crate", "urn", "web", "rubble", "chair", "crystal"]) {
  if (!L.PROP_SPECS[kind]) { console.log(kind.padEnd(10), "NO SPEC"); continue; }
  const spots = legalSpots(kind, base, 0.5, 6);
  const xs = spots.map(s => s[0]);
  console.log(kind.padEnd(10), `solid=${L.PROP_SPECS[kind].solid} r=${L.PROP_SPECS[kind].radius}`.padEnd(24), `${spots.length} legal spots`, spots.length ? `x ${Math.min(...xs)}..${Math.max(...xs)}` : "");
}
