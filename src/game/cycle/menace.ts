/**
 * The menace gauge: decompression that is SCHEDULED, not earned.
 *
 * The one half of the Cycle that was never built. The director already
 * refuses to send anything NEW during a valley - but the thing already in
 * the room keeps walking, deliberately, and on a floor where the Warden
 * found the player early that is a valley the player never gets to be in.
 * A player being hounded from the second room of a floor has no valley at
 * all until they wound it twice, bomb it, or spend a scroll.
 *
 * Creative Assembly's answer, and the research is unanimous on it:
 *
 *   a meter that pulls the pursuer offstage on a threshold, with a
 *   cooldown, a time-to-peak, and a cap on menace events per appearance -
 *   THE WARDEN SHOULD RETREAT ON A METER EVEN WHEN THE PLAYER HAS DONE
 *   NOTHING RIGHT.
 *
 * And the sentence after it is why this is a separate accumulator from the
 * Cycle's intensity rather than another threshold on it: its inputs measure
 * PRESSURE ON THE PLAYER, not player noise. The Din measures what the
 * player emits. The Cycle's intensity measures how hot the last ten seconds
 * were. This measures how long the player has been leaned on, over a whole
 * floor, and it is the only one of the three with a memory that long.
 *
 * What it is not: mercy that undoes the floor. The withdrawal throws the
 * Warden across the floor and nothing else. It does not calm the alarm, it
 * does not make it wary, it costs it no wounds - a rout is those things,
 * and a rout is earned. This is a breath, and the Warden is already walking
 * back before the player has finished taking it.
 */

/** The gauge, held per floor. */
export interface Menace {
  /** 0..1. Full is a withdrawal, if the other two gates allow one. */
  gauge: number;
  /** Run-clock second of the last withdrawal, or -1 if there has been none. */
  lastAt: number;
  /** Withdrawals already spent on this floor. */
  spent: number;
}

/**
 * Time to peak: the seconds of UNBROKEN worst-case pressure that fill the
 * gauge from empty.
 *
 * Chosen against the floor rather than pulled from the air: a floor's
 * patience is five minutes, and a player who has been hunted for a straight
 * minute of it has been hunted for a fifth of everything they have. That is
 * long enough that it never fires during the ordinary business of being
 * walked past, and short enough to arrive inside a single bad chase.
 */
export const PEAK_S = 60;

/**
 * The gap between two withdrawals, and it is deliberately longer than the
 * time to peak. Otherwise a floor that leans hard the whole way through
 * hands out breaths on a metronome and the Warden stops being a threat -
 * the gauge is a relief valve, not a rhythm section.
 */
export const COOLDOWN_S = 90;

/**
 * And the cap, which is the piece that stops this becoming a strategy.
 *
 * The source says "per appearance"; ours appears once per floor and stays
 * until the stair, so per floor is the honest mapping and is stated here
 * rather than left as a coincidence. Two breaths a floor: the player who is
 * genuinely drowning gets both, and nobody can plan around a third.
 */
export const PER_FLOOR = 2;

/**
 * What presses on the player, per second, 0..1.
 *
 * Only pressure the player is UNDER, which is the whole distinction the
 * research draws. Sprinting is not here. Taking a gem is not here. Being
 * loud is the Din's business and being loud does not entitle anybody to a
 * rest.
 */
export const PRESS = {
  /** Something that commits is in the room and means it. */
  hunted: 1,
  /** It is in the room but has not committed, or it is next door and has. */
  stalked: 0.45,
  /** It is somewhere near and the player knows it. */
  nearby: 0.15,
} as const;

/**
 * How fast the gauge falls when nothing is pressing, as a fraction of the
 * fill rate.
 *
 * Slower than it fills, and that asymmetry is the point: a chase broken by
 * eight seconds behind a door is one chase, not two. A gauge that emptied
 * as fast as it filled would only ever fire during a single unbroken
 * pursuit, which is the one case the player can already answer by running.
 */
export const EASE = 0.4;

export const openMenace = (): Menace => ({ gauge: 0, lastAt: -1, spent: 0 });

/**
 * The pressure the player is under right now, from what the floor's own
 * systems already know.
 *
 * @param inRoom   the Warden is in the room the player is in
 * @param commits  the ladder says it means it - not merely present
 * @param adjacent it is one doorway away
 * @param hunted   something else that commits is on the player (the Reaper
 *                 on an out-of-patience floor, a Harrier that is not
 *                 wheeling away). These do not walk off on a meter, but
 *                 they are pressure, and a player under one of them while
 *                 the Warden closes is under both.
 */
export const pressureOn = (
  inRoom: boolean,
  commits: boolean,
  adjacent: boolean,
  hunted: boolean
): number => {
  const warden = inRoom && commits ? PRESS.hunted : inRoom || (adjacent && commits) ? PRESS.stalked : adjacent ? PRESS.nearby : 0;
  return Math.min(1, Math.max(warden, hunted ? PRESS.hunted : 0));
};

/** Whether the gauge is full and both gates are open. */
export const withdrawsNow = (m: Menace, now: number): boolean =>
  m.gauge >= 1 && m.spent < PER_FLOOR && (m.lastAt < 0 || now - m.lastAt >= COOLDOWN_S);

/**
 * Advance the gauge one step.
 *
 * Returns the same object shape whether or not it fired; `withdrawsNow` on
 * the RESULT is what the caller acts on, so the decision is one function
 * and not two copies of a threshold.
 */
export const stepMenace = (m: Menace, delta: number, pressure: number): Menace => {
  const rate = pressure > 0 ? pressure / PEAK_S : -EASE / PEAK_S;
  const gauge = Math.max(0, Math.min(1, m.gauge + rate * delta));
  // A withdrawal that cannot happen yet does not hold the gauge at full and
  // fire the instant the cooldown lapses - it keeps filling against the
  // clamp, which is the same thing, and the cooldown is checked at the
  // moment of firing rather than at the moment of filling.
  return { ...m, gauge };
};

/** Book a withdrawal: the gauge is spent, and the floor remembers it. */
export const spendMenace = (m: Menace, now: number): Menace => ({
  gauge: 0,
  lastAt: now,
  spent: m.spent + 1,
});
