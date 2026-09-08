import {
  DISCHARGE_S,
  ENGAGE,
  IGNORE_DELAY_RANGE,
  REACT_MODERATE_S,
  REACT_STRONG_S,
  RETRIGGER_MODERATE_S,
  RETRIGGER_STRONG_S,
  type Rung,
} from "./rungs";

/**
 * One creature's place on the ladder, and the machine that moves it.
 *
 * Pure, and holding no reference to the world: a driver hands it the rung
 * the pipeline currently justifies and the clock, and gets back the rung
 * the creature is actually on. That keeps the asymmetry - the thing this
 * whole system exists for - in one testable function instead of spread
 * across six frame loops that will drift.
 */

export interface AlertCap {
  /**
   * The highest rung this creature can reach. Below ENGAGE and it can
   * perceive, react and bark but never commit, which is the one-line
   * definition of most of our population.
   */
  max: Rung;
  /** The lowest it ever settles to. A posted guard is never quite still. */
  min: Rung;
  /**
   * Whether having peaked leaves it permanently more suspicious for the
   * rest of the floor.
   *
   * OURS. The engine property that appeared to establish this went 3-0,
   * then 1-2, then 0-3 across three verification passes: the property is
   * documented, the behaviour is not. Kept because a floor that remembers
   * what you did on it is right for this game, and marked because it would
   * otherwise read as borrowed.
   */
  floorAfterPeak: boolean;
}

export interface Awareness {
  rung: Rung;
  /** Where a gated jump is currently waiting, and since when. -1 for none. */
  pendingTo: Rung;
  pendingSince: number;
  /** Until when a rise is instant, with no window to break the stimulus. */
  primedUntil: number;
  /** The highest rung reached, which the floor-after-peak rule reads. */
  peak: Rung;
  /** When the slide last stepped down a rung. */
  slidAt: number;
  /** The room it last had the player in - what "searching" searches. */
  markRoomId: string | null;
}

export const fresh = (rung: Rung = 0): Awareness => ({
  rung,
  pendingTo: rung,
  pendingSince: -1,
  primedUntil: 0,
  peak: rung,
  slidAt: 0,
  markRoomId: null,
});

/** The lowest rung this creature may currently slide to. */
export function floorOf(a: Awareness, cap: AlertCap): Rung {
  if (!cap.floorAfterPeak || a.peak < 2) return cap.min;
  return Math.max(cap.min, 1) as Rung;
}

/**
 * Whether this creature will actually come at you, or run.
 *
 * Two conditions, and the second is the content tool: it has to be on the
 * engage rung AND allowed to reach it at all. A creature capped below the
 * gate is not a weaker threat, it is a different kind of thing - it looks
 * up, it calls out, and it never closes.
 */
export const engaged = (a: Awareness, cap: AlertCap): boolean =>
  a.rung >= ENGAGE && cap.max >= ENGAGE;

/**
 * Advance one creature's awareness.
 *
 * @param target  The rung the analog pipeline currently justifies.
 * @param now     The run clock.
 * @param close   Whether the player is inside `IGNORE_DELAY_RANGE`, which
 *                skips the reaction delay entirely - a window at arm's
 *                length reads as the creature being broken, not as the
 *                player being quick.
 * @param strong  A strong stimulus rather than a moderate one: reacted to
 *                faster, and worth a longer retrigger afterwards.
 * @param markRoomId Where the player is, recorded only on a rise, so what
 *                it searches is where it last HAD you rather than where
 *                you are now.
 */
export function step(
  a: Awareness,
  cap: AlertCap,
  target: Rung,
  now: number,
  close: boolean,
  strong: boolean,
  markRoomId: string | null = null
): Awareness {
  const min = floorOf(a, cap);
  const wants = Math.max(min, Math.min(cap.max, target)) as Rung;

  if (wants > a.rung) {
    /**
     * Up is a gated jump.
     *
     * The delay is a property of the rung it is LEAVING, not the one it is
     * going to, and once it passes the creature arrives at `wants`
     * directly without visiting anything in between. A guard that ratcheted
     * up one rung at a time would give the player a warning the design
     * does not intend to give.
     */
    const delay = close || now < a.primedUntil ? 0 : strong ? REACT_STRONG_S : REACT_MODERATE_S;
    const restarted = a.pendingTo !== wants || a.pendingSince < 0;
    const since = restarted ? now : a.pendingSince;
    if (now - since >= delay) {
      return {
        rung: wants,
        pendingTo: wants,
        pendingSince: -1,
        primedUntil: now + (strong ? RETRIGGER_STRONG_S : RETRIGGER_MODERATE_S),
        peak: Math.max(a.peak, wants) as Rung,
        slidAt: now,
        markRoomId: markRoomId ?? a.markRoomId,
      };
    }
    return { ...a, pendingTo: wants, pendingSince: since };
  }

  /**
   * The stimulus is gone, or weaker than what it is already on.
   *
   * Any pending jump is dropped outright and NOT banked: breaking the
   * stimulus inside the reaction window means there was no alert at all.
   * That is what makes stepping back behind a pillar a real move rather
   * than a way of postponing something already decided.
   */
  const dwell = DISCHARGE_S[a.rung];
  if (a.rung > min && dwell > 0 && now - a.slidAt >= dwell) {
    /**
     * Down is a timed slide, one rung at a time, through every state on
     * the way. Being noticed is sudden; being forgotten is slow, and both
     * shapes are learnable.
     */
    return {
      ...a,
      rung: (a.rung - 1) as Rung,
      pendingTo: (a.rung - 1) as Rung,
      pendingSince: -1,
      slidAt: now,
    };
  }
  return { ...a, pendingTo: a.rung, pendingSince: -1 };
}

/** Whether a distance is close enough to skip the reaction delay. */
export const closeEnough = (distance: number): boolean => distance <= IGNORE_DELAY_RANGE;
