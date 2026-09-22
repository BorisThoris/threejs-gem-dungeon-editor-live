import { doorReach, insideRoom } from "../dungeon/footprint";
import { DIRS, DIR_STEP, DIR_YAW, type Dir, type Dungeon, type Room } from "../dungeon/types";
import type { CorridorBlock } from "../rooms/corridorPattern";
import { LANDMARKS, type LandmarkId } from "./landmarks";

export interface SecretTrail {
  /** The district landmark where the old route can first be understood. */
  sourceId: string;
  /** Ordinary rooms walked from the landmark to the cracked wall's host. */
  route: string[];
  hostId: string;
  landmark: LandmarkId;
}

/**
 * Join a district's memorable place to its own sealed history through real
 * doors. The vault and descending stair are never part of the expedition.
 * Breadth-first selection makes the clue useful rather than capricious and
 * preserves every generated loop as an optional way back.
 */
export function secretTrailFor(rooms: Room[], vaultId: string | null): SecretTrail | undefined {
  const host = rooms.find(room => room.secret);
  if (!host?.district) return;
  const source = rooms.find(room => room.landmark && room.district === host.district);
  if (!source?.landmark) return;
  const byId = new Map(rooms.map(room => [room.id, room]));
  const paths = new Map<string, string[]>([[source.id, [source.id]]]);
  for (const [id, path] of paths) {
    if (id === host.id) return { sourceId: source.id, route: path, hostId: host.id, landmark: source.landmark };
    const room = byId.get(id);
    if (!room) continue;
    for (const dir of DIRS) {
      const next = room.links[dir];
      const destination = next ? byId.get(next) : undefined;
      if (!next || paths.has(next) || next === vaultId || destination?.kind === "end"
        || destination?.district !== host.district) continue;
      paths.set(next, [...path, next]);
    }
  }
}

export interface SecretTrailStep {
  index: number;
  before?: Dir;
  onward: Dir;
  final: boolean;
}

/** The physical directions the route occupies in this room. */
export function secretTrailStep(dungeon: Dungeon, room: Room): SecretTrailStep | null {
  const trail = dungeon.secretTrail;
  if (!trail) return null;
  const index = trail.route.indexOf(room.id);
  if (index < 0) return null;
  const beforeId = trail.route[index - 1], nextId = trail.route[index + 1];
  const before = beforeId ? DIRS.find(dir => room.links[dir] === beforeId) : undefined;
  const onward = nextId ? DIRS.find(dir => room.links[dir] === nextId) : room.secret?.dir;
  return onward ? { index, before, onward, final: room.id === trail.hostId } : null;
}

export interface SecretTrailPattern {
  base: CorridorBlock[];
  accents: CorridorBlock[];
  colour: string;
  accent: string;
  title: string;
}

/**
 * Paint-depth route marks laid over the true floor. Each room carries the
 * incoming and outgoing strokes, so turns read as turns instead of a symbol
 * floating in the middle. The final stroke points at the actual cracked wall.
 */
export function secretTrailPattern(dungeon: Dungeon, room: Room): SecretTrailPattern | null {
  const trail = dungeon.secretTrail, step = secretTrailStep(dungeon, room);
  if (!trail || !step) return null;
  const identity = LANDMARKS[trail.landmark];
  const base: CorridorBlock[] = [], accents: CorridorBlock[] = [];
  const add = (into: CorridorBlock[], block: CorridorBlock) => {
    const [x, , z] = block.position, [w, , d] = block.size;
    const yaw = block.rotationY ?? 0, c = Math.cos(yaw), s = Math.sin(yaw);
    if ([-1, 1].every(sx => [-1, 1].every(sz => {
      const lx = sx * w / 2, lz = sz * d / 2;
      return insideRoom(room, x + lx * c + lz * s, z + lz * c - lx * s, 0.025);
    }))) into.push(block);
  };
  const arms = [...new Set([step.before, step.onward].filter(Boolean) as Dir[])];
  for (const dir of arms) {
    const vector = DIR_STEP[dir], reach = doorReach(room, dir);
    // The source landmark already owns the middle of its room. Begin at its
    // outer edge so the route visibly departs from the signature instead of
    // painting a second pattern over it.
    const first = step.index === 0 ? 3.15 : 1.05;
    for (let distance = first; distance < reach - 0.45; distance += 1.35) {
      const x = vector.x * distance, z = vector.z * distance;
      add(base, { position: [x, 0.052, z], size: [0.18, 0.024, 0.72], rotationY: DIR_YAW[dir] });
      const ahead = distance + 0.22;
      if (trail.landmark === "rootwell") {
        for (const side of [-1, 1]) add(accents, {
          position: [vector.x * ahead + vector.z * side * 0.18, 0.066,
            vector.z * ahead - vector.x * side * 0.18],
          size: [0.16, 0.025, 0.28], rotationY: DIR_YAW[dir] + side * 0.55,
        });
      } else if (trail.landmark === "hoist") {
        for (const side of [-1, 1]) add(accents, {
          position: [vector.x * ahead + vector.z * side * 0.2, 0.066,
            vector.z * ahead - vector.x * side * 0.2],
          size: [0.11, 0.025, 0.11], rotationY: Math.PI / 4,
        });
      } else {
        add(accents, { position: [vector.x * ahead, 0.066, vector.z * ahead],
          size: [0.25, 0.025, 0.25], rotationY: Math.PI / 4 });
      }
    }
  }
  return { base, accents, colour: identity.color, accent: identity.accent,
    title: `${identity.title} tally` };
}

/** A concise live direction, only while the player is on the learned route. */
export function secretTrailText(dungeon: Dungeon, roomId: string): string {
  const room = dungeon.rooms.find(candidate => candidate.id === roomId);
  const trail = dungeon.secretTrail, step = room && secretTrailStep(dungeon, room);
  if (!trail || !step) return "";
  const opened = !!room?.secret && !!room.links[room.secret.dir];
  if (step.final) return opened
    ? `${LANDMARKS[trail.landmark].title} tally · the sealed way stands open.`
    : `${LANDMARKS[trail.landmark].title} tally · the ${step.onward} wall ends the route.`;
  const left = trail.route.length - step.index - 1;
  return `${LANDMARKS[trail.landmark].title} tally · ${step.onward} · ${left} ${left === 1 ? "door" : "doors"} to the sealed wall.`;
}
