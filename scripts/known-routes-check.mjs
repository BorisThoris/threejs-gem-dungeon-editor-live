/** node scripts/known-routes-check.mjs — learned topology and return planning. */
import assert from "node:assert/strict";
import { build } from "esbuild";
import { mkdirSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";

const scratch = process.env.AGENT_SCRATCH || (process.platform === "win32"
  ? `D:/agent-work/gem-dungeon/${new Date().toISOString().slice(0, 10)}-known-routes`
  : join(tmpdir(), "gem-dungeon-known-routes"));
mkdirSync(scratch, { recursive: true });
const bundle = join(scratch, `routes-${process.pid}.mjs`);
await build({ stdin: { contents: `import './src/game/rooms/shipped';
  export * from './src/game/dungeon/knownRoutes';
  export * from './src/game/dungeon/runFloor';
  export * from './src/game/dungeon/types';
  export * from './src/game/warden/bars';
  export * from './src/ui/hudLines';
  export { useRun } from './src/game/state/run';
  export { routeTargetLabel } from './src/game/rooms/services';
  export * from './src/game/world';`, resolveDir: process.cwd() },
  define: { "import.meta.env.DEV": "false", "import.meta.env": "{}" },
  bundle: true, platform: "node", format: "esm", outfile: bundle });
try {
  const L = await import(pathToFileURL(bundle));
  const base = L.generateRunFloor(1, 1);
  const shop = base.rooms.find(room => room.kind === "shop");
  assert.equal(L.routeTargetLabel(base, shop.id, shop.id, []), "Stolen loot");
  assert.equal(L.routeTargetLabel(base, shop.id, null, []), "Destination", "an emptied reported nest cannot reveal the unvisited room's kind");
  assert.equal(L.routeTargetLabel(base, shop.id, null, [], true), "Destination");
  assert.equal(L.routeTargetLabel(base, shop.id, null, [shop.id]), "Shop");
  const rooms = ["a", "b", "c", "d", "hidden"].map(id => ({ ...base.rooms[0], id, links: {} }));
  const room = id => rooms.find(room => room.id === id);
  const link = (a, dir, b) => { room(a).links[dir] = b; room(b).links[L.OPPOSITE[dir]] = a; };
  link("a", "east", "b"); link("b", "south", "c"); link("c", "west", "d"); link("d", "north", "a");
  const dungeon = { ...base, rooms, startId: "a", endId: "c", vaultId: null };
  let graph = L.knownFloorGraph(dungeon, ["a"], false, "c");
  assert.equal(graph.length, 4, "a reported nest adds its location");
  assert.equal(L.knownRoute(graph, "a", "c", null, new Set()).status, "unknown",
    "a reported nest cannot teach its unseen connecting edges");
  assert.ok(!graph.some(room => room.id === "hidden"), "sealed secrets stay private");
  graph = L.knownFloorGraph(dungeon, ["a", "b", "d"], false, null);
  const barred = new Set([L.barKey("a", "b")]);
  assert.deepEqual(L.knownRoute(graph, "a", "c", null, barred).rooms, ["a", "d", "c"], "known bypass works");
  assert.equal(L.knownRoute(graph, "a", "c", "d", barred).status, "blocked", "vaults cannot become shortcuts");
  assert.equal(L.knownRoute(graph, "d", "c", "d", barred).status, "follow", "a delver inside a vault can leave");
  assert.equal(L.knownRoute(graph, "c", "c", null, barred).status, "arrived");
  assert.equal(L.knownRoute(graph, "hidden", "hidden", null, barred).status, "unknown");

  // Independent breadth-first oracle operates on the original dungeon and
  // explicit observation rules, rather than trusting the planner's graph.
  let probes = 0;
  for (let seed = 1; seed <= 40; seed++) for (const floor of [1, 2, 3]) {
    const d = L.generateRunFloor(seed, floor);
    for (const mapped of [false, true]) {
      const visited = d.rooms.filter((room, i) => i % 3 !== 2 && room.kind !== "secret").map(room => room.id);
      const seen = new Set(visited), from = d.startId;
      const known = new Set(mapped ? d.rooms.map(room => room.id) : visited);
      for (const room of d.rooms) if (seen.has(room.id)) for (const to of Object.values(room.links)) known.add(to);
      const chart = L.knownFloorGraph(d, visited, mapped, null);
      assert.deepEqual(new Set(chart.map(room => room.id)), known);
      const first = Object.values(d.rooms.find(room => room.id === from).links)[0];
      for (const bars of [new Set(), new Set([L.barKey(from, first)])]) for (const target of d.rooms) {
        const distance = new Map(known.has(from) ? [[from, 0]] : []), queue = [...distance.keys()];
        for (const id of queue) {
          if (id !== from && (id === d.vaultId || d.rooms.find(room => room.id === id).kind === "end")) continue;
          for (const to of Object.values(d.rooms.find(room => room.id === id).links)) {
            if (!known.has(to) || distance.has(to) || bars.has(L.barKey(id, to)) || !(mapped || seen.has(id) || seen.has(to))) continue;
            if (to === d.vaultId && to !== target.id) continue;
            distance.set(to, distance.get(id) + 1); queue.push(to);
          }
        }
        const route = L.knownRoute(chart, from, target.id, d.vaultId, bars);
        const reachable = distance.has(target.id);
        assert.equal(["follow", "arrived"].includes(route.status), reachable, `${seed}/${floor}/${mapped}/${target.id}`);
        if (reachable) {
          assert.equal(route.rooms.length - 1, distance.get(target.id));
          for (let i = 1; i < route.rooms.length; i++) {
            assert.ok(Object.values(d.rooms.find(room => room.id === route.rooms[i - 1]).links).includes(route.rooms[i]));
            assert.ok(!bars.has(L.barKey(route.rooms[i - 1], route.rooms[i])));
          }
        }
        probes++;
      }
    }
  }
  const facts = { owed: 1, spare: 0, nestGems: 2, nestSeen: true, keeper: null };
  assert.match(L.floorNextStep(facts), /recover stolen/);
  assert.match(L.floorNextStep({ ...facts, nestSeen: false }), /explore/);
  const final = { ...facts, owed: 0, keeper: "holds", hasBomb: false, bombPayment: null };
  assert.match(L.floorNextStep(final), new RegExp(`gather ${L.BOMB_PRICE} more`));
  assert.match(L.floorNextStep({ ...final, bombPayment: "key" }), /key trade/);
  assert.match(L.floorNextStep({ ...final, bombPayment: "gems", satchelFull: true }), /free a satchel slot/);
  assert.match(L.floorNextStep({ ...final, bombBought: true }), /search unopened chests/);
  assert.match(L.floorNextStep({ ...final, bombBought: true, bombBurning: true }), /keep clear/);
  assert.match(L.floorNextStep({ ...final, hasBomb: true, mapDark: true }), /Gloom/);
  assert.match(L.floorNextStep({ ...final, hasBomb: true, stairsRoute: { status: "blocked" } }), /route blocked/);
  assert.match(L.floorNextStep({ ...final, hasBomb: true, stairsRoute: { status: "follow", dir: "east", rooms: ["a", "b"] } }), /stairs east/);
  const preparation = overrides => L.hudLines({
    ...final, floor: L.KEEPER_FLOOR - 1, lives: 3, learned: [], relics: [], lanternBand: "Lit", oil: 60,
    ...overrides,
  }).find(line => line.id === "prepare")?.body;
  assert.match(preparation({}), new RegExp(`gather ${L.BOMB_PRICE} more.*beyond the toll`), "preparation quotes the protected bomb budget");
  assert.match(preparation({ spare: 1 }), new RegExp(`gather ${Math.max(0, L.BOMB_PRICE - 1)} more`), "preparation follows the remaining price");
  assert.match(preparation({ bombPayment: "key" }), /key trade available/, "preparation recognizes the real shop payment");
  assert.match(preparation({ bombBought: true }), /shop bomb sold/, "preparation cannot send a player to an empty stand");
  assert.match(preparation({ bombPayment: "gems", satchelFull: true }), /free a satchel slot/, "preparation explains a full satchel");
  assert.match(preparation({ hasBomb: true }), /bomb packed/, "only a carried bomb is ready for descent");
  const run = L.useRun, initial = run.getState();
  try {
    run.setState({ phase: "playing", dungeon: base, currentRoomId: base.startId, visited: [base.startId],
      paused: true, transitioning: false, inputLocks: 0, mapped: true, effects: {}, routeTargetId: null });
    assert.equal(run.getState().trackRoute("missing-room"), false);
    const unvisited = base.rooms.find(room => room.id !== base.startId && room.id !== base.endId).id;
    assert.equal(run.getState().trackRoute(unvisited), false, "Mapping cannot turn an unvisited place into a learned destination");
    assert.equal(run.getState().trackRoute(base.endId), true, "charted stairs are an explicit destination");
    for (const [id, state] of [["playing", { paused: false }], ["transition", { transitioning: true }],
      ["puzzle", { inputLocks: 1 }], ["gloom", { effects: { gloom: 1e9 } }]]) {
      const before = run.getState();
      run.setState(state);
      assert.equal(run.getState().trackRoute(base.startId), false, `${id}: planning guard refuses the change`);
      assert.equal(run.getState().routeTargetId, base.endId);
      run.setState(before, true);
    }
    run.setState({ effects: { gloom: 1e9 } });
    assert.equal(run.getState().trackRoute(null), true, "Gloom cannot prevent cancelling a followed route");
    assert.equal(run.getState().routeTargetId, null);
    run.setState({ phase: "menu" });
    assert.equal(run.getState().trackRoute(base.startId), false);
  } finally { run.setState(initial, true); }
  console.log(`PASS known routes: ${probes} generated oracle comparisons; privacy, detours, vaults and floor objectives`);
} finally { unlinkSync(bundle); }
