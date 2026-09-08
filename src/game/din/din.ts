import type { Room } from "../dungeon/types";
import { aged, carriesTo, AUDIBLE } from "./carry";
import { EMISSIONS, HELD, loudnessIn, type EmissionId, type HeldId } from "./emissions";
import { answersTo, SUSCEPTIBILITY, type ReceiverId } from "./susceptibility";
import type { Tag } from "./tags";

/**
 * The floor's shared channel: what is currently being broadcast, and who
 * it reaches.
 *
 * Deliberately not in the Zustand store. The things on this floor ask this
 * question several times a second from inside frame loops, and a store
 * subscription would re-render a component tree for a number that changes
 * continuously and is read by nobody in the DOM. It is also not React
 * state for the same reason the run clock is not: it must keep working
 * while a component is unmounted between rooms.
 *
 * The one performance decision worth writing down: a signal's REACH is
 * computed once, when it is made, and never again. A flood of the room
 * graph is cheap but not free, and doing it per receiver per frame would
 * be the third-worst thing in the game. Loudness decays uniformly with
 * time, so `reach x aged(age)` answers the whole question with an
 * allocation-free map lookup. A doorway barred after a noise was made does
 * not un-hear it, which is also simply true.
 */

interface Live {
  /** Set for sustained sources, so the owner can replace or drop them. */
  key: string | null;
  tags: readonly Tag[];
  magnitude: number;
  roomId: string;
  x: number;
  z: number;
  /** Where it is still audible, and how much of it arrives. */
  reach: Map<string, number>;
  /** The Din's clock when it happened. Sustained sources ignore this. */
  bornAt: number;
  sustained: boolean;
  /** What made it. Carried for the teaching lines and the Ledger, never matched on. */
  source: string;
}

/**
 * What a receiver is currently answering to. Filled into a caller-owned
 * object rather than returned, because the callers are frame loops.
 */
export interface Arrival {
  tag: Tag;
  magnitude: number;
  /** The room it came from, which is where an investigator walks. */
  fromRoomId: string;
  x: number;
  z: number;
  source: string;
}

export const emptyArrival = (): Arrival => ({
  tag: "loud",
  magnitude: 0,
  fromRoomId: "",
  x: 0,
  z: 0,
  source: "",
});

/**
 * How many impulses can be in flight. Well past what a floor ever makes at
 * once; the cap exists so a bug cannot turn the Din into a leak.
 */
const MAX_LIVE = 48;

let live: Live[] = [];
let clock = 0;

/**
 * Advance the Din's clock. Driven from the run's own frame loop and from
 * the same value, so a paused game makes no sound and, more importantly,
 * an eight-second bomb is still eight seconds long across a pause.
 */
export function advance(now: number): void {
  clock = now;
  // Drop what has fallen below hearing. Sustained sources never expire.
  for (let i = live.length - 1; i >= 0; i--) {
    const s = live[i];
    if (!s.sustained && aged(s.magnitude, clock - s.bornAt) < AUDIBLE) live.splice(i, 1);
  }
}

/** The Din's own clock, for the checks and for anything that needs to agree with it. */
export const dinClock = (): number => clock;

/** Everything goes when a floor does. A new floor has heard nothing yet. */
export function reset(): void {
  live = [];
  clock = 0;
}

/**
 * Something happened, here, and this is what it was.
 *
 * The caller names the emission and the room; it does not name an
 * audience, a radius or a reaction, and there is no parameter here that
 * would let it. That constraint is the entire architecture.
 */
export function strike(
  id: EmissionId,
  rooms: readonly Room[],
  room: Room,
  x = 0,
  z = 0,
  bars: ReadonlySet<string> = new Set()
): void {
  const emission = EMISSIONS[id];
  const magnitude = loudnessIn(id, room);
  // Theft is silent, and a silent thing does not take a slot.
  if (magnitude < AUDIBLE || emission.tags.length === 0) return;
  if (live.length >= MAX_LIVE) live.shift();
  live.push({
    key: null,
    tags: emission.tags,
    magnitude,
    roomId: room.id,
    x,
    z,
    reach: carriesTo(rooms, room.id, magnitude, bars),
    bornAt: clock,
    sustained: false,
    source: id,
  });
}

/**
 * A condition that is true until it is not: a raised lantern, a lit
 * brazier, the key in your hands.
 *
 * Keyed, and re-holding the same key replaces the old one, so the thing
 * that follows the player from room to room is one source that moves
 * rather than a trail of them.
 */
export function hold(
  key: string,
  id: HeldId,
  rooms: readonly Room[],
  roomId: string,
  magnitude: number = HELD[id].magnitude,
  x = 0,
  z = 0,
  bars: ReadonlySet<string> = new Set()
): void {
  release(key);
  if (magnitude < AUDIBLE) return;
  live.push({
    key,
    tags: HELD[id].tags,
    magnitude,
    roomId,
    x,
    z,
    reach: carriesTo(rooms, roomId, magnitude, bars),
    bornAt: clock,
    sustained: true,
    source: id,
  });
}

/** The condition ended. */
export function release(key: string): void {
  for (let i = live.length - 1; i >= 0; i--) if (live[i].key === key) live.splice(i, 1);
}

/** Whether a sustained source is currently held. */
export const holding = (key: string): boolean => live.some((s) => s.key === key);

/**
 * How much of `tag` is arriving in this room right now, from anywhere.
 *
 * The scalar question, for receivers that only need to know whether they
 * are over their threshold. No allocation, no flood, no map building.
 */
export function arriving(tag: Tag, roomId: string): number {
  let best = 0;
  for (const s of live) {
    if (!s.tags.includes(tag)) continue;
    const here = s.reach.get(roomId);
    if (here === undefined) continue;
    const now = s.sustained ? here : aged(here, clock - s.bornAt);
    if (now > best) best = now;
  }
  return best;
}

/**
 * The loudest arriving source of `tag`, with where it came from - which is
 * the half a Warden needs, because "there was a noise" is not actionable
 * and "there was a noise in the cistern" is.
 *
 * Returns false and leaves `out` alone when nothing is arriving.
 */
export function strongest(out: Arrival, tag: Tag, roomId: string): boolean {
  let best: Live | null = null;
  let bestAt = 0;
  for (const s of live) {
    if (!s.tags.includes(tag)) continue;
    const here = s.reach.get(roomId);
    if (here === undefined) continue;
    const now = s.sustained ? here : aged(here, clock - s.bornAt);
    if (now > bestAt) {
      bestAt = now;
      best = s;
    }
  }
  if (!best) return false;
  out.tag = tag;
  out.magnitude = bestAt;
  out.fromRoomId = best.roomId;
  out.x = best.x;
  out.z = best.z;
  out.source = best.source;
  return true;
}

/**
 * What this receiver is answering to in this room, strongest first among
 * the tags it declared.
 *
 * The only function in the game that consults a susceptibility block, so
 * the "defaults to answering nothing" rule has exactly one place it could
 * be broken and one place to check.
 */
export function answering(out: Arrival, who: ReceiverId, roomId: string): boolean {
  const sus = SUSCEPTIBILITY[who];
  let found = false;
  let bestAt = 0;
  const probe = SCRATCH;
  for (const tag of Object.keys(sus.answers) as Tag[]) {
    if (!strongest(probe, tag, roomId)) continue;
    if (!answersTo(sus, tag, probe.magnitude)) continue;
    // Compared against the receiver's own threshold, not raw: a Warden a
    // hair over its hearing threshold and well over its fear one is
    // frightened, not curious.
    const over = probe.magnitude / (sus.answers[tag] ?? 1);
    if (over > bestAt) {
      bestAt = over;
      out.tag = probe.tag;
      out.magnitude = probe.magnitude;
      out.fromRoomId = probe.fromRoomId;
      out.x = probe.x;
      out.z = probe.z;
      out.source = probe.source;
      found = true;
    }
  }
  return found;
}

const SCRATCH: Arrival = emptyArrival();

/** How many sources are live. For the checks and the debug overlay. */
export const liveCount = (): number => live.length;

/** Every live source's tags and current magnitude here. Checks only. */
export function snapshot(roomId: string): { source: string; tags: readonly Tag[]; here: number }[] {
  return live.map((s) => {
    const here = s.reach.get(roomId) ?? 0;
    return { source: s.source, tags: s.tags, here: s.sustained ? here : aged(here, clock - s.bornAt) };
  });
}
