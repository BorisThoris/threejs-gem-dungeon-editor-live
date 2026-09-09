import { build } from "esbuild";
import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
// The repo root, from this file rather than from where node was started, so
// the bench works whichever directory you run it in.
const root = new URL("../../", import.meta.url).pathname;
const dir = mkdtempSync(join(tmpdir(), "space-"));
const entry = join(dir, "entry.ts");
writeFileSync(entry, `
export * from "${root}src/game/dungeon/generate";
export * from "${root}src/game/dungeon/types";
export * from "${root}src/game/world";
export * from "${root}src/game/rooms/kinds";
export * from "${root}src/game/rooms/anchors";
export * from "${root}src/game/rooms/validate";
export * from "${root}src/game/rooms/templates";
export * from "${root}src/game/dungeon/layout";
export * from "${root}src/game/props/specs";
export * from "${root}src/game/rooms/placements";
`);
const out = join(dir, "out.mjs");
await build({ entryPoints: [entry], bundle: true, outfile: out, format: "esm", platform: "node", logLevel: "error", define: { "import.meta.env.DEV": "false" } });
export const L = await import(out);

export const GRIDS = [];
for (let x = 0; x < 2; x++) for (let z = 0; z < 2; z++) GRIDS.push({ x, z });
// orientationOf uses grid parity plus more; sample a spread of real grids.
for (let x = 0; x < 4; x++) for (let z = 0; z < 4; z++) GRIDS.push({ x, z });

/** Everything wrong with a template across every orientation and many seeds. */
export function problems(t, seeds = 12) {
  const all = [];
  for (const g of GRIDS) {
    for (const p of L.templateProblems(t, seeds, g)) {
      all.push(`[${g.x},${g.z}] #${p.index} ${t.props[p.index]?.kind ?? "?"} ${p.reason}`);
    }
  }
  return [...new Set(all)];
}

/** Where a single prop of this kind may legally stand, on a grid of candidates. */
export function legalSpots(kind, base, step = 0.5, seeds = 8) {
  const half = base.size / 2;
  const spots = [];
  for (let x = -half; x <= half; x += step) {
    for (let z = -half; z <= half; z += step) {
      const t = { ...base, props: [{ kind, x: +x.toFixed(2), z: +z.toFixed(2), rotation: 0 }] };
      let ok = true;
      for (const g of GRIDS) {
        if (L.templateProblems(t, seeds, g).length) { ok = false; break; }
      }
      if (ok) spots.push([+x.toFixed(2), +z.toFixed(2)]);
    }
  }
  return spots;
}
