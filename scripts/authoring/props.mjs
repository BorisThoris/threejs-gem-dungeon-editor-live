import { L } from "./space.mjs";
const ks = Object.keys(L.PROP_SPECS);
console.log(ks.length, "kinds");
for (const k of ks) { const s = L.PROP_SPECS[k]; console.log(k.padEnd(12), `solid=${String(s.solid).padEnd(5)} r=${String(s.radius).padEnd(5)} ${s.title}`); }
