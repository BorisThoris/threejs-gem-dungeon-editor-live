import assert from "node:assert/strict";
import { build } from "esbuild";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd().replaceAll("\\", "/"), temp = mkdtempSync(join(tmpdir(), "trap-placement-"));
const entry = join(temp, "entry.ts"), out = join(temp, "bundle.mjs");
writeFileSync(entry, `import '${root}/src/game/rooms/shipped';\n` +
  ["dungeon/runFloor", "dungeon/footprint", "rooms/placements", "rooms/dressingContext", "props/specs", "traps/placement", "traps/geometry", "mobs/body", "world"]
    .map(p => `export * from '${root}/src/game/${p}';`).join("\n"));
await build({ entryPoints: [entry], outfile: out, bundle: true, platform: "node", format: "esm", logLevel: "error",
  define: { "import.meta.env.DEV": "false", "import.meta.env": "{}" } });
const L = await import(pathToFileURL(out).href);
const failures = [], counts = { rooms: 0, pits: 0, darts: 0, grates: 0, hoards: 0 };
for (let seed = 1; seed <= 60; seed++) for (let floor = 1; floor <= 3; floor++) {
  const dungeon = L.generateRunFloor(seed, floor);
  for (const room of dungeon.rooms) {
    counts.rooms++;
    const traps = L.trapsFor(room, dungeon.seed, dungeon.endId), label = `${seed}/${floor}/${room.id}/${room.shape}`;
    if (room.secret) {
      const opened = { ...room, links: { ...room.links, [room.secret.dir]: room.secret.to } };
      if (JSON.stringify(traps) !== JSON.stringify(L.trapsFor(opened, dungeon.seed, dungeon.endId))) failures.push(`${label}: revealing a secret rerolls traps`);
    }
    for (const fullCountFloor of [null, floor]) {
      const options = L.roomDressingOptions({ dungeon, floor, fullCountFloor }, room, dungeon.seed);
      const props = L.placementsFor(room, dungeon.seed, options);
      if (options.brimming) counts.hoards++;
      for (const trap of traps.filter(t => t.kind !== "grate")) {
        const radius = L.TRAP_FOOTPRINT[trap.kind];
        if (!L.insideRoom(room, trap.x, trap.z, radius + L.WALL_THICKNESS / 2)) failures.push(`${label}: ${trap.kind} leaves the floor`);
        if (props.some(p => L.PROP_SPECS[p.kind].solid && Math.hypot(p.x - trap.x, p.z - trap.z) < radius + L.PROP_SPECS[p.kind].radius * (p.scale ?? 1))) {
          failures.push(`${label}: ${trap.kind} buried by ${options.brimming ? "hoard" : "ordinary"} furniture`);
        }
      }
    }
    const pits = traps.filter(t => t.kind === "pit");
    const sprung = Object.fromEntries(pits.map(t => [t.key, 0]));
    const bites = L.bitesFor("ground", room, dungeon.seed, [], sprung);
    for (const pit of pits) if (!bites.some(p => p.x === pit.x && p.z === pit.z && p.r === L.PIT_RADIUS)) {
      failures.push(`${label}: visible open pit missing from creature damage`);
    }
    if (JSON.stringify(pits) !== JSON.stringify(L.trapsFor(room, dungeon.seed, null).filter(t => t.kind === "pit"))) failures.push(`${label}: exit context moves pits`);
    for (const trap of traps) {
      counts[trap.kind === "pit" ? "pits" : trap.kind === "darts" ? "darts" : "grates"]++;
      if (trap.kind === "grate" && room.links[trap.dir] === dungeon.endId) failures.push(`${label}: grate blocks exit`);
    }
  }
}
console.log({ ...counts, failures: failures.length, examples: failures.slice(0, 12) });
assert.ok(counts.pits > 100 && counts.darts > 100 && counts.grates > 30, "all trap types remain represented");
assert.equal(failures.length, 0, "traps must fit the visible floor, stay exposed and share damage geometry");
console.log("PASS generated traps: floor bounds, ordinary and Full Count furniture, open-pit body damage and safe exits");
