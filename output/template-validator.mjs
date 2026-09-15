// src/game/rng.ts
function hashSeed(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function createRng(seed) {
  let a = typeof seed === "string" ? hashSeed(seed) : seed >>> 0;
  return () => {
    a += 1831565813;
    let t = a;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
var shuffle = (rng, items) => {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

// src/game/dungeon/types.ts
var SHAPE_SIDES = {
  square: 4,
  circle: 48,
  hexagon: 6,
  octagon: 8,
  diamond: 4,
  triangle: 3
};
var DIRS = ["north", "south", "east", "west"];
var DIR_STEP = {
  north: { x: 0, z: -1 },
  south: { x: 0, z: 1 },
  east: { x: 1, z: 0 },
  west: { x: -1, z: 0 }
};
var DIR_YAW = {
  north: 0,
  south: Math.PI,
  east: -Math.PI / 2,
  west: Math.PI / 2
};
var halfSize = (room) => room.size / 2;
function inscribedRadius(room) {
  const half = halfSize(room);
  if (room.shape === "square") return half;
  return half * Math.cos(Math.PI / SHAPE_SIDES[room.shape]);
}
function floorReach(room, angle) {
  const half = halfSize(room);
  if (room.shape === "square") {
    return Math.min(
      Math.abs(half / Math.cos(angle)),
      Math.abs(half / Math.sin(angle))
    );
  }
  const step = 2 * Math.PI / SHAPE_SIDES[room.shape];
  const off = (angle % step + step) % step;
  return half * Math.cos(Math.PI / SHAPE_SIDES[room.shape]) / Math.cos(off - step / 2);
}
var diagonalReach = (room) => floorReach(room, Math.PI / 4);

// src/game/dungeon/footprint.ts
var CORRIDOR_WIDTH = 7;
var corridorWidth = (room, dir) => Math.min(room.size, Math.max(CORRIDOR_WIDTH, room.wingWidths?.[dir] ?? CORRIDOR_WIDTH));
var corridorOffset = (room, dir) => room.links[dir] ? 0 : Math.max(
  -halfSize(room) + corridorWidth(room, dir) / 2,
  Math.min(halfSize(room) - corridorWidth(room, dir) / 2, room.wingOffsets?.[dir] ?? 0)
);
var doorReach = (room, dir) => halfSize(room) + (room.wings?.[dir] ?? 0);
function wingCourses(room, dir) {
  const start = halfSize(room), end = doorReach(room, dir), width = corridorWidth(room, dir);
  if (end <= start) return [];
  if (room.wingProfiles?.[dir] !== "apse" || room.links[dir]) return [{ start, end, width }];
  const radius = Math.min(width / 2, end - start - 2), shoulder = end - radius;
  const courses = [];
  for (let low = start; low < end; low += 1) {
    const into = Math.max(0, low - shoulder);
    const halfWidth = Math.min(width / 2, Math.ceil(Math.sqrt(Math.max(0, radius * radius - into * into)) * 2) / 2);
    courses.push({ start: low, end: Math.min(end, low + 1), width: low <= shoulder ? width : halfWidth * 2 });
  }
  return courses;
}

// src/game/world.ts
var GROUND_Y = 0;
var DOOR_WIDTH = 3;
var PLAYER_CAPSULE_HALF_HEIGHT = 0.8;
var PLAYER_CAPSULE_RADIUS = 0.3;
var PLAYER_REST_Y = GROUND_Y + PLAYER_CAPSULE_HALF_HEIGHT + PLAYER_CAPSULE_RADIUS;
var PLAYER_SPAWN_Y = PLAYER_REST_Y + 0.05;
var MAX_FRAME_S = 1 / 20;
var WARDEN_TOUCH_RADIUS = 1.05;
var WARDEN_MAX_STEP = WARDEN_TOUCH_RADIUS / 4;
var REAPER_TOUCH_RADIUS = WARDEN_TOUCH_RADIUS;
var REAPER_MAX_STEP = REAPER_TOUCH_RADIUS / 2;

// src/game/props/specs.ts
var widestFurnishing = () => Math.max(...Object.values(PROP_SPECS).filter((s) => s.solid && !s.authored).map((s) => s.radius));
var PROP_SPECS = {
  banner: { title: "Banner", radius: 0.5, solid: false },
  barrel: { title: "Barrel", radius: 0.45, solid: true, collider: { shape: "cylinder", args: [0.55, 0.42], y: 0.55 } },
  bookshelf: { title: "Bookshelf", radius: 0.8, solid: true, collider: { shape: "cuboid", args: [0.8, 1.1, 0.225], y: 1.1 } },
  candle: { title: "Candle", radius: 0.1, solid: false },
  chair: { title: "Chair", radius: 0.3, solid: true, collider: { shape: "cuboid", args: [0.25, 0.55, 0.25], y: 0.55 } },
  chest: { title: "Chest", radius: 0.5, solid: true, collider: { shape: "cuboid", args: [0.46, 0.37, 0.29], y: 0.37 } },
  crate: { title: "Crate", radius: 0.45, solid: true, collider: { shape: "cuboid", args: [0.42, 0.4, 0.42], y: 0.4 } },
  crystal: { title: "Crystal", radius: 0.35, solid: false },
  pillar: { title: "Pillar", radius: 0.6, solid: true, collider: { shape: "cylinder", args: [2.1, 0.4], y: 2.1 } },
  potion: { title: "Potion", radius: 0.15, solid: false },
  rubble: { title: "Rubble", radius: 0.65, solid: false },
  skull: { title: "Skull", radius: 0.2, solid: false },
  statue: { title: "Statue", radius: 0.55, solid: true, collider: { shape: "cylinder", args: [1.15, 0.5], y: 1.15 } },
  table: { title: "Table", radius: 1, solid: true, collider: { shape: "cuboid", args: [0.9, 0.41, 0.5], y: 0.41 } },
  tile: { title: "Floor inlay", radius: 1, solid: false },
  torch: { title: "Brazier", radius: 0.4, solid: false },
  urn: { title: "Urn", radius: 0.4, solid: true, collider: { shape: "cylinder", args: [0.6, 0.36], y: 0.6 } },
  wall: { title: "Wall segment", radius: 1.5, solid: true, authored: true, collider: { shape: "cuboid", args: [1.5, 1.5, 0.2], y: 1.5 } },
  web: { title: "Cobweb", radius: 0.7, solid: false },
  spikes: { title: "Spikes", radius: 1.2, solid: false }
};

// src/game/dungeon/layout.ts
var LANE_HALF_WIDTH = DOOR_WIDTH / 2 + 1.25;
function laneAxes(room) {
  return {
    x: !!(room.links.north || room.links.south),
    z: !!(room.links.east || room.links.west)
  };
}
var inDoorLane = (x, z, room) => {
  const lanes = room ? laneAxes(room) : { x: true, z: true };
  return lanes.x && Math.abs(x) < LANE_HALF_WIDTH || lanes.z && Math.abs(z) < LANE_HALF_WIDTH;
};
var overhangsLane = (x, z, radius, room) => {
  const lanes = room ? laneAxes(room) : { x: true, z: true };
  return lanes.x && Math.abs(x) - radius < LANE_HALF_WIDTH || lanes.z && Math.abs(z) - radius < LANE_HALF_WIDTH;
};
var QUADRANTS = [
  [1, 1],
  [-1, 1],
  [1, -1],
  [-1, -1]
];
function orientationOf(room) {
  const rng = createRng(`orient:${room.seed}:${room.id}:${room.grid.x},${room.grid.z}`);
  return { turns: Math.floor(rng() * 4), mirror: rng() < 0.5 };
}
function orient(x, z, o) {
  let px = x;
  let pz = z;
  for (let i = 0; i < o.turns; i++) {
    const nx = pz;
    pz = -px;
    px = nx;
  }
  return [o.mirror ? -px : px, pz];
}
var WIDEST = widestFurnishing();
var BRAZIER = PROP_SPECS.torch.radius;
var MARGIN = 0.2;
var INNER = LANE_HALF_WIDTH + WIDEST + MARGIN;
var RING_GAP = 2 * WIDEST / Math.SQRT2;
var CORNER_GAP = (WIDEST + BRAZIER + 0.02) / Math.SQRT2;
var CORNER_INSET = BRAZIER + MARGIN;
function quadrantDistance(room, which) {
  const half = halfSize(room);
  const roof = Math.min(half - WIDEST - MARGIN, half - CORNER_INSET - CORNER_GAP);
  const far = Math.max(INNER + RING_GAP, Math.min(roof, reach(room, WIDEST + 2 * BRAZIER + 2 * MARGIN + 0.04)));
  if (which === "far") return far;
  return Math.max(INNER, Math.min(half * 0.5 / Math.SQRT2, far - RING_GAP));
}
function reach(room, inset) {
  if (room.shape === "square") return Infinity;
  return Math.max(INNER + RING_GAP, (diagonalReach(room) - inset) / Math.SQRT2);
}
function quadrantSpots(room, which) {
  const d = quadrantDistance(room, which);
  const o = orientationOf(room);
  return QUADRANTS.map(([sx, sz]) => {
    const [x, z] = orient(sx * d, sz * d, o);
    return [x, GROUND_Y, z];
  });
}
var MIDDLE_DISTANCE = INNER + 0.6;
function centreSpots(room) {
  const lanes = laneAxes(room);
  if (lanes.x === lanes.z) return [];
  const along = lanes.z ? Math.PI / 2 : 0;
  if (MIDDLE_DISTANCE > Math.min(floorReach(room, along), floorReach(room, along + Math.PI)) - 1) {
    return [];
  }
  const d = MIDDLE_DISTANCE;
  return lanes.z ? [
    [0, GROUND_Y, d],
    [0, GROUND_Y, -d]
  ] : [
    [d, GROUND_Y, 0],
    [-d, GROUND_Y, 0]
  ];
}
function cornerSpots(room) {
  const box = halfSize(room) - CORNER_INSET;
  const onFloor = room.shape === "square" ? box : (diagonalReach(room) - CORNER_INSET) / Math.SQRT2;
  const clearOfFurniture = quadrantDistance(room, "far") + CORNER_GAP;
  const c = Math.min(box, Math.max(onFloor, clearOfFurniture));
  const o = orientationOf(room);
  return QUADRANTS.map(([sx, sz]) => {
    const [x, z] = orient(sx * c, sz * c, o);
    return [x, GROUND_Y, z];
  });
}
function shapeFits(shape, size) {
  if (shape === "square") return true;
  const room = { id: "fit", kind: "normal", seed: 0, grid: { x: 0, z: 0 }, size, shape, links: {} };
  return [
    ...quadrantSpots(room, "far").map((p) => ({ p, radius: WIDEST + MARGIN })),
    ...cornerSpots(room).map((p) => ({ p, radius: BRAZIER + MARGIN }))
  ].every(({ p, radius }) => Math.hypot(p[0], p[2]) + radius <= floorReach(room, Math.atan2(p[2], p[0])) + 1e-8);
}
var GEM_HEIGHT = 0.9;
var dist2 = (a, b) => (a[0] - b[0]) ** 2 + (a[2] - b[2]) ** 2;
function gemPosition(room, seed, reserved = []) {
  return freeAnchor(room, `${seed}:${room.id}:gem`, reserved, GEM_HEIGHT);
}
function keyPosition(room, seed, reserved = []) {
  return freeAnchor(room, `${seed}:${room.id}:key`, reserved, 0.55);
}
function freeAnchor(room, seedKey, reserved, height) {
  const rng = createRng(seedKey);
  const candidates = [...quadrantSpots(room, "far"), ...quadrantSpots(room, "near")];
  const start = Math.floor(rng() * 4);
  let best = candidates[start];
  let bestScore = -Infinity;
  for (let i = 0; i < candidates.length; i++) {
    const family = Math.floor(i / 4) * 4;
    const c = candidates[family + (i + start) % 4];
    const score = reserved.length ? Math.min(...reserved.map((r) => dist2(c, r))) : Infinity;
    const weighted = family === 0 ? score + 1 : score;
    if (weighted > bestScore) {
      bestScore = weighted;
      best = c;
    }
  }
  return [best[0], GROUND_Y + height, best[2]];
}

// src/game/puzzles/anchors.ts
var challengeAnchors = (room) => quadrantSpots(room, "near").slice(0, 3);
var memoryAnchors = (room) => [
  ...quadrantSpots(room, "far"),
  quadrantSpots(room, "near")[3]
];

// src/game/rooms/anchors.ts
var shopAnchors = (room) => [
  quadrantSpots(room, "near")[2],
  quadrantSpots(room, "far")[0],
  quadrantSpots(room, "far")[1],
  quadrantSpots(room, "far")[2]
];
var NEAR_REACH = 1.5;
var GOODS_OUT = 1.8;
var shopOffers = (room) => {
  const [x, , z] = shopAnchors(room)[0];
  const len = Math.hypot(x, z) || 1;
  const away = [x / len, z / len];
  const along = [-away[1], away[0]];
  const at = (out, side) => ({
    x: +(x + away[0] * out + along[0] * side).toFixed(3),
    z: +(z + away[1] * out + along[1] * side).toFixed(3)
  });
  return [
    { id: "life", x, z },
    { id: "naming", ...at(GOODS_OUT, -2.4), reach: NEAR_REACH },
    { id: "blessing", ...at(GOODS_OUT, -0.8), reach: NEAR_REACH },
    { id: "oil", ...at(GOODS_OUT, 0.8), reach: NEAR_REACH },
    { id: "bomb", ...at(GOODS_OUT, 2.4), reach: NEAR_REACH }
  ];
};
var shrineAnchor = (room) => {
  const half = diagonalReach(room);
  for (const spot of [...centreSpots(room), ...quadrantSpots(room, "far"), ...quadrantSpots(room, "near")]) {
    if (Math.hypot(spot[0], spot[2]) > half) continue;
    if (inDoorLane(spot[0], spot[2], room)) continue;
    return spot;
  }
  return quadrantSpots(room, "far")[0];
};
var libraryLectern = (room) => quadrantSpots(room, "near")[3];
var RESERVED_ANCHORS = {
  // The counter, the two pedestals AND the five things laid out on the
  // counter: an offer a barrel is standing on is an offer nobody can take,
  // which is the same bug as two offers at one point and was next.
  shop: (room) => [...shopAnchors(room), ...shopOffers(room).map((o) => [o.x, 0, o.z])],
  library: (room) => [libraryLectern(room)],
  memory: memoryAnchors,
  challenge: challengeAnchors,
  shrine: (room) => [shrineAnchor(room)],
  secret: () => []
};
var reservedAnchorsFor = (kind, room) => RESERVED_ANCHORS[kind]?.(room) ?? [];

// src/game/rooms/slots.ts
function resolveSlots(props, rules, seed) {
  const rng = createRng(seed);
  const out = props.map((p) => ({ ...p }));
  for (const rule of rules) {
    const indices = out.map((p, i) => p.slot === rule.slot ? i : -1).filter((i) => i >= 0);
    if (indices.length === 0) continue;
    if (rule.op === "subst") {
      const kind = rule.into[Math.floor(rng() * rule.into.length)];
      for (const i of indices) out[i].kind = kind;
    } else if (rule.op === "nsubst") {
      const n = Math.max(0, Math.min(indices.length, rule.n ?? 1));
      const order = shuffle(rng, indices);
      const [chosen, rest] = [rule.into[0], rule.into[1] ?? rule.into[0]];
      order.forEach((i, at) => {
        out[i].kind = at < n ? chosen : rest;
      });
    } else {
      const kinds = indices.map((i) => out[i].kind);
      const mixed = shuffle(rng, kinds);
      indices.forEach((i, at) => {
        out[i].kind = mixed[at];
      });
    }
  }
  return out.map(({ slot, ...rest }) => {
    return rest;
  });
}
function kindOptions(props, rules) {
  const out = props.map((p) => [p.kind]);
  for (const rule of rules) {
    const indices = props.map((p, i) => p.slot === rule.slot ? i : -1).filter((i) => i >= 0);
    if (indices.length === 0) continue;
    const options = rule.op === "shuffle" ? indices.map((i) => props[i].kind) : rule.op === "nsubst" ? [rule.into[0], rule.into[1] ?? rule.into[0]] : rule.into;
    const unique = [...new Set(options)];
    for (const i of indices) out[i] = unique;
  }
  return out;
}

// src/game/rooms/templates.ts
var TEMPLATES = /* @__PURE__ */ new Map();
var getTemplate = (id) => TEMPLATES.get(id);
function authoredProps(room) {
  const template = room.template ? getTemplate(room.template) : void 0;
  if (!template) return [];
  const props = resolveSlots(
    template.props,
    template.slots ?? [],
    `slots:${room.seed}:${room.id}:${room.grid.x},${room.grid.z}`
  );
  return orientProps(props, orientationOf(room));
}
function orientProps(props, o) {
  return props.map((p) => {
    const [x, z] = orient(p.x, p.z, o);
    const turn = (o.mirror ? -1 : 1) * ((p.rotation ?? 0) + o.turns * (Math.PI / 2));
    return { ...p, x, z, rotation: turn };
  });
}

// src/game/worldbuilding/elevation.ts
var cache = /* @__PURE__ */ new WeakMap();
function terracesFor(room) {
  if (cache.has(room)) return cache.get(room);
  const terraces = [];
  for (const dir of DIRS) {
    const length = room.wings?.[dir] ?? 0;
    if (room.links[dir] || room.secret?.dir === dir || length < 6) continue;
    const width = corridorWidth(room, dir), offset = corridorOffset(room, dir);
    terraces.push({
      dir,
      start: room.size / 2,
      rampEnd: room.size / 2 + 4,
      end: room.size / 2 + length,
      width,
      offset,
      height: length >= 9 ? 1.2 : 0.8,
      courses: wingCourses(room, dir)
    });
  }
  cache.set(room, terraces);
  return terraces;
}
function floorHeightAt(room, x, z) {
  for (const terrace of terracesFor(room)) {
    const axis = DIR_STEP[terrace.dir];
    const along = x * axis.x + z * axis.z;
    const across = (axis.x ? z : x) - terrace.offset;
    if (!terrace.courses.some((c) => along >= c.start && along <= c.end && Math.abs(across) <= c.width / 2)) continue;
    return GROUND_Y + terrace.height * Math.min(1, (along - terrace.start) / (terrace.rampEnd - terrace.start));
  }
  return GROUND_Y;
}
var floorRiseAt = (room, x, z) => floorHeightAt(room, x, z) - GROUND_Y;

// src/game/rooms/kinds.ts
var reservedAnchors = (room) => reservedAnchorsFor(room.kind, room);
function claimedSpots(room) {
  const authored = authoredProps(room).map((p) => [p.x, 0, p.z]);
  return [...reservedAnchors(room), ...authored];
}
function gemFor(room, seed) {
  if (room.kind === "start" || room.kind === "end" || room.kind === "arena") return null;
  const gem = gemPosition(room, seed, claimedSpots(room));
  const gallery = !room.template && (room.kind === "normal" || room.kind === "treasure") ? DIRS.find((dir) => (room.wings?.[dir] ?? 0) >= 5 && !room.links[dir] && room.secret?.dir !== dir) : void 0;
  if (!gallery) return gem;
  const axis = DIR_STEP[gallery];
  const rng = createRng(`${seed}:${room.id}:gallery-gem`);
  const across = (rng() < 0.5 ? -1 : 1) * corridorWidth(room, gallery) * 0.18;
  const along = doorReach(room, gallery) - 2;
  const shift = corridorOffset(room, gallery);
  const x = axis.x * along + axis.z * across + (axis.x ? 0 : shift);
  const z = axis.z * along + axis.x * across + (axis.x ? shift : 0);
  return [x, gem[1] + floorRiseAt(room, x, z), z];
}
function keyFor(room, seed) {
  const gem = gemFor(room, seed);
  return keyPosition(room, seed, [...claimedSpots(room), ...gem ? [gem] : []]);
}

// src/game/rooms/validate.ts
var clearOf = (solid) => solid ? 1.6 : 1;
var CLEAR_OF_CONTENT = 1.2;
function roomForTemplate(t, grid = { x: 0, z: 0 }) {
  return {
    id: "authored",
    kind: t.kind,
    seed: 0,
    grid,
    size: t.size,
    shape: t.shape,
    links: { north: "a", south: "b", east: "c", west: "d" },
    template: t.id
  };
}
function templateProblems(t, seeds = 1, grid = { x: 0, z: 0 }) {
  const problems = [];
  if (!shapeFits(t.shape, t.size)) problems.push({ index: -1, reason: "This shape needs a larger room to keep its furnishings inside the walls." });
  const room = roomForTemplate(t, grid);
  const reserved = reservedAnchorsFor(t.kind, room);
  const corners = cornerSpots(room);
  const reach2 = inscribedRadius(room);
  const half = t.size / 2;
  const oriented = orientProps(t.props, orientationOf(room));
  const options = kindOptions(t.props, t.slots ?? []);
  oriented.forEach((p, index) => {
    const said = /* @__PURE__ */ new Set();
    const say = (title, reason) => {
      const full = `${title}: ${reason}`;
      if (said.has(full)) return;
      said.add(full);
      problems.push({ index, reason: full });
    };
    for (const kind of options[index]) {
      const spec = PROP_SPECS[kind];
      if (!spec) {
        problems.push({ index, reason: `${kind} is not a prop the game has` });
        continue;
      }
      const clear = clearOf(spec.solid);
      if (Math.abs(p.x) + spec.radius > half || Math.abs(p.z) + spec.radius > half) {
        say(spec.title, "reaches through a wall");
      } else if (t.shape !== "square" && Math.hypot(p.x, p.z) + spec.radius > reach2) {
        say(spec.title, "reaches off the drawn floor of this shape");
      }
      if (spec.solid && inDoorLane(p.x, p.z, room)) {
        say(spec.title, "stands in a doorway's path and will be dropped");
      }
      if (spec.solid && overhangsLane(p.x, p.z, spec.radius, room)) {
        say(spec.title, "reaches into a doorway's path");
      }
      if (reserved.some((a) => Math.hypot(a[0] - p.x, a[2] - p.z) < CLEAR_OF_CONTENT)) {
        say(spec.title, "stands where this room's own content stands and will be dropped");
      }
      if (corners.some((c) => Math.hypot(c[0] - p.x, c[2] - p.z) < spec.radius + 0.4)) {
        say(spec.title, "stands inside one of the room's braziers");
      }
      for (let seed = 1; seed <= seeds; seed++) {
        const gem = gemFor(room, seed);
        if (gem && Math.hypot(gem[0] - p.x, gem[2] - p.z) < clear) {
          say(spec.title, "is too close to where the gem can land and will be dropped");
          break;
        }
        const key = keyFor(room, seed);
        if (Math.hypot(key[0] - p.x, key[2] - p.z) < clear) {
          say(spec.title, "is too close to where the floor's key can land and will be dropped");
          break;
        }
      }
      for (let j = 0; j < index; j++) {
        const q = oriented[j];
        const apart = Math.hypot(q.x - p.x, q.z - p.z);
        for (const otherKind of options[j]) {
          const other = PROP_SPECS[otherKind];
          if (!other) continue;
          if (apart < 1e-3 || spec.solid && other.solid && apart < spec.radius + other.radius) {
            say(spec.title, `stands inside the ${other.title}`);
          }
        }
      }
    }
  });
  return problems;
}
export {
  roomForTemplate,
  templateProblems
};
