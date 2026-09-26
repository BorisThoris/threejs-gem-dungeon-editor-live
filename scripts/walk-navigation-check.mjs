import assert from "node:assert/strict";
import { segmentClearsDisc } from "./walk-navigation.mjs";

// Captured from run seed 404, floor three, room_2 after collecting its gem.
const hazard = { x: 3.95, z: -5.4871486220076084, r: 1.2 };
const start = { x: 5.083146095275879, z: -5.5364670753479 };
const escape = { x: 6, z: -6 };
assert.equal(segmentClearsDisc(start, escape, hazard, 0.12), false, "solid overlap cannot be ignored");
assert.equal(segmentClearsDisc(start, escape, hazard, 0.12, true), true, "a player already in spikes can retreat outward");
assert.equal(segmentClearsDisc(start, { x: 2, z: -6 }, hazard, 0.12, true), false, "escape cannot cross the spike centre");
assert.equal(segmentClearsDisc(start, start, hazard, 0.12, true), false, "escape must end outside the danger margin");
assert.equal(segmentClearsDisc(escape, { x: 2, z: -5 }, hazard, 0.12, true), false, "a clear start cannot enter a hazard");
assert.equal(segmentClearsDisc(escape, { x: 7, z: -7 }, hazard, 0.12), true);
console.log("PASS walker navigation: outward hazard recovery without crossing hazards or ignoring solids");
