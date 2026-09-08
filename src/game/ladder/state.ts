import { bus } from "../events";
import type { ReceiverId } from "../din/susceptibility";
import { CAPS } from "./caps";
import { engaged, fresh, step, type AlertCap, type Awareness } from "./awareness";
import { RUNG_NAME, type Rung } from "./rungs";

/**
 * Where every creature on the floor currently is on the ladder.
 *
 * One owner, several informants. A creature's awareness is fed from two
 * places that know different halves of the world - the floor-level driver,
 * which knows what the Din is delivering into its room, and the mounted
 * component, which is the only thing that knows where it is actually
 * standing and which way it is facing. Both `report` what they can see
 * justifying, the strongest report of the frame wins, and `advance` steps
 * the machine exactly once per frame.
 *
 * The alternative - each informant stepping the machine itself - was the
 * obvious shape and it is wrong: two callers stepping the same capacitor
 * means the one with the weaker view slides the creature back down between
 * the frames of the one with the stronger, and the result is a guard that
 * flickers. Accumulate, then step.
 *
 * Not in the store, for the reason none of the frame-loop state is: this
 * changes continuously, is read from `useFrame`, and must survive a
 * component unmounting when the player walks into the next room.
 */

interface Report {
  target: Rung;
  close: boolean;
  strong: boolean;
  markRoomId: string | null;
}

const state = new Map<ReceiverId, Awareness>();
const pending = new Map<ReceiverId, Report>();
/**
 * A ceiling below the creature's own cap, raised during the floor.
 *
 * The cap table says what a creature is CAPABLE of; this says what the
 * floor is currently letting it do, and it is the hinge the Coefficient
 * pulls. The Warden starts every floor at `searching`: it investigates
 * noises, walks to them and calls out, and does not beeline for the player
 * until the floor's heat has bought the rung.
 *
 * That is the same content trick the cap table uses to turn one
 * implementation into a rat and a Reaper, applied to the main threat over
 * TIME rather than across creatures - and it is what stops the first
 * minute of a floor and the fifth feeling like the same minute.
 */
const ceiling = new Map<ReceiverId, Rung>();

/** What a floor starts each creature at, where that is below its own cap. */
const OPENS_AT: Partial<Record<ReceiverId, Rung>> = { warden: 2 };

/** Everything forgets everything when a floor does. */
export function reset(): void {
  state.clear();
  pending.clear();
  ceiling.clear();
}

/** The floor's heat has bought this creature a rung. */
export function setCeiling(who: ReceiverId, rung: Rung): void {
  ceiling.set(who, rung);
}

/** The cap in force right now: the creature's own, or the floor's if lower. */
const capOf = (who: ReceiverId): AlertCap => {
  const base = CAPS[who];
  const lid = ceiling.get(who) ?? OPENS_AT[who];
  if (lid === undefined || lid >= base.max) return base;
  return { ...base, max: lid, min: Math.min(base.min, lid) as Rung };
};

export function awarenessOf(who: ReceiverId): Awareness {
  let a = state.get(who);
  if (!a) {
    // Pinned creatures start where they are pinned, which is how the
    // Reaper arrives already hunting rather than climbing to it.
    a = fresh(capOf(who).min);
    state.set(who, a);
  }
  return a;
}

/** The rung a creature is on, which is the only thing most callers want. */
export const rungOf = (who: ReceiverId): Rung => awarenessOf(who).rung;

/** Whether it will actually commit. Reads the cap, so a capped creature never does. */
export const commits = (who: ReceiverId): boolean => engaged(awarenessOf(who), capOf(who));

/** The room it last had the player in - what "searching" is searching. */
export const markOf = (who: ReceiverId): string | null => awarenessOf(who).markRoomId;

/**
 * An informant's view this frame. The strongest wins; a weaker report
 * never pulls a creature down, because "I cannot see them from here" is
 * not evidence that nobody can.
 */
export function report(
  who: ReceiverId,
  target: Rung,
  close = false,
  strong = false,
  markRoomId: string | null = null
): void {
  const held = pending.get(who);
  if (!held || target > held.target) {
    pending.set(who, { target, close, strong, markRoomId });
    return;
  }
  if (target === held.target) {
    held.close = held.close || close;
    held.strong = held.strong || strong;
    held.markRoomId = held.markRoomId ?? markRoomId;
  }
}

/**
 * Step every creature once, and say out loud what changed.
 *
 * The saying is not decoration. A range of internal states is meaningless
 * if the player cannot perceive it, and the game this is taken from
 * resolved that entirely through barks - sound was the primary medium
 * through which the creatures communicated both their location and their
 * internal state. Our Warden already has directional audio and has never
 * had a state to communicate through it.
 */
export function advance(now: number): void {
  for (const [who, a] of state) {
    const cap = capOf(who);
    const said = pending.get(who) ?? { target: cap.min, close: false, strong: false, markRoomId: null };
    const next = step(a, cap, said.target, now, said.close, said.strong, said.markRoomId);
    if (next.rung !== a.rung) {
      bus.emit("rungChanged", {
        who,
        rung: next.rung,
        rose: next.rung > a.rung,
        name: RUNG_NAME[next.rung],
      });
    }
    state.set(who, next);
  }
  pending.clear();
}

/** Make sure a creature is on the floor and being stepped. */
export function wake(who: ReceiverId): void {
  awarenessOf(who);
}

/** Everything currently on the floor, for the checks and the debug overlay. */
export const snapshot = (): { who: ReceiverId; rung: Rung; peak: Rung }[] =>
  [...state].map(([who, a]) => ({ who, rung: a.rung, peak: a.peak }));
