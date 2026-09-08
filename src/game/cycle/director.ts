/**
 * The Cycle: pressure that oscillates instead of ramping.
 *
 * The single largest omission the research found, and separate from the
 * Coefficient. We had nothing that ever relaxed. Valve's own statement of
 * why that matters:
 *
 *   "Constant, unchanging combat is fatiguing - Long periods of inactivity
 *    are boring - Unpredictable peaks and valleys of intensity create a
 *    powerfully compelling and replayable experience."
 *
 * And the split between this and the Coefficient is their sentence, not an
 * inference: "Algorithm adjusts pacing, not difficulty - Amplitude
 * (difficulty) is not changed, frequency (pacing) is."
 *
 *   THE COEFFICIENT SETS THE AMPLITUDE. THE CYCLE SETS THE FREQUENCY.
 *
 * Four phases, and the asymmetry between them IS the design: the peak is a
 * spike, not a plateau. Three to five seconds at the top against thirty to
 * forty-five at the bottom.
 *
 *   BUILD_UP      at least 15s, then runs until intensity crosses the peak
 *   SUSTAIN_PEAK  3-5s past the peak, and no longer
 *   PEAK_FADE     waits for a natural break, so the relax is not consumed
 *                 by a fight that is still in progress. Population is
 *                 already minimal here; this phase only gates the START of
 *                 the relax clock.
 *   RELAX         30-45s, ended early by forward progress
 *
 * Two mappings we had to make ourselves, both flagged. A solo game
 * collapses a four-player maximum into one much noisier accumulator, so the
 * decay time and the threat radius are widened. And the progress axis has
 * to be OURS and stated - rooms newly entered on this floor - or relax
 * becomes a fixed intermission players learn to wait out.
 *
 * The estimator is deliberately crude, and permission for that is explicit:
 * "Survivor Intensity estimation is crude, yet the resulting pacing works."
 * It does not have to be good. It has to be monotone in the right
 * direction.
 *
 * One number here is NOT evidenced and is marked: any claim about how many
 * cycles a floor should contain was voted down outright, so the ~60-90s
 * period this produces is a tuning start and never a target.
 */

export type Phase = "buildUp" | "sustainPeak" | "peakFade" | "relax";

/** The shipped ConVar defaults, and the two thresholds that are ours. */
export interface Tempo {
  buildUpMinS: number;
  /** Intensity at which the build-up has arrived. */
  peakAt: number;
  sustainMinS: number;
  sustainMaxS: number;
  /** Intensity below which the fight counts as over and the relax may start. */
  breakAt: number;
  relaxMinS: number;
  relaxMaxS: number;
  /** Rooms of forward progress that end a relax early. */
  relaxProgress: number;
}

/**
 * Base pacing: the connective tissue between the set pieces.
 *
 * `relaxProgress` is the piece that stops the valley being a scripted
 * intermission - a player who keeps moving toward the stair leaves it early
 * and one who stops to sweep the floor for gems does not, which is the
 * whole bargain of this game expressed in the pacing rather than in a
 * penalty.
 */
export const BASE: Tempo = {
  buildUpMinS: 15,
  peakAt: 0.8,
  sustainMinS: 3,
  sustainMaxS: 5,
  breakAt: 0.35,
  relaxMinS: 30,
  relaxMaxS: 45,
  relaxProgress: 3,
};

/**
 * A crescendo is the same machine with five numbers swapped: a long hold at
 * the top against almost no valley. Not the normal curve turned up - a
 * preset, used where a set piece wants one, and never by the director on
 * its own.
 */
export const CRESCENDO: Tempo = {
  ...BASE,
  buildUpMinS: 5,
  sustainMinS: 25,
  sustainMaxS: 30,
  relaxMinS: 2,
  relaxMaxS: 5,
  relaxProgress: 99,
};

/**
 * How fast intensity bleeds off when nothing is happening, per second.
 *
 * Widened from the four-player original: one accumulator that is not the
 * maximum of four is a noisier signal, and a noisy signal decayed quickly
 * produces a director that flaps between phases.
 */
export const DECAY_PER_S = 0.10;

/** What each thing that happens to the player is worth, 0..1. */
export const INTENSITY = {
  /** A life. The largest single input there is. */
  damaged: 0.55,
  /** Staggered, snared, knocked off a ledge: forced displacement. */
  displaced: 0.3,
  /** Something that commits is in the room with you, per second. */
  hunted: 0.5,
  /** And something that commits is next door, per second. */
  nearby: 0.15,
  /** A blast, a roost, a collapse: the floor itself being loud, per event. */
  startled: 0.12,
} as const;

export interface Director {
  phase: Phase;
  /** The run clock when this phase began. */
  since: number;
  /** 0..1, crude and monotone in the right direction. */
  intensity: number;
  /** How much forward progress had been made when the relax began. */
  progressAt: number;
  /** The length rolled for this phase, where the phase has a range. */
  holdFor: number;
}

export const start = (now = 0): Director => ({
  phase: "buildUp",
  since: now,
  intensity: 0,
  progressAt: 0,
  holdFor: 0,
});

/** Somewhere in a range, so the player cannot count the valley out. */
const roll = (min: number, max: number, random: number) => min + (max - min) * random;

/**
 * Add to the accumulator. Clamped at 1, because an intensity of 3 takes
 * three times as long to decay and the director stops being able to tell
 * "very bad" from "very bad a while ago".
 */
export const stoke = (d: Director, amount: number): Director => ({
  ...d,
  intensity: Math.min(1, d.intensity + amount),
});

/**
 * Advance the director.
 *
 * @param now       the run clock
 * @param delta     seconds since the last step
 * @param engaged   whether something that commits is currently on the
 *                  player. Intensity does NOT decay while this is true -
 *                  otherwise a long chase reads as calm halfway through it.
 * @param progress  rooms newly entered on this floor. OURS, and the axis
 *                  the early-out reads.
 * @param random    for the phase lengths, 0..1.
 */
export function step(
  d: Director,
  tempo: Tempo,
  now: number,
  delta: number,
  engaged: boolean,
  progress: number,
  random: number
): Director {
  const cooled = engaged
    ? d
    : { ...d, intensity: Math.max(0, d.intensity - DECAY_PER_S * delta) };
  const held = now - cooled.since;

  switch (cooled.phase) {
    case "buildUp":
      // A floor under this and nothing can peak, however bad it gets - so a
      // player who walks into a room and is immediately hit still gets a
      // few seconds before the director agrees that this is the peak.
      if (held < tempo.buildUpMinS || cooled.intensity < tempo.peakAt) return cooled;
      return {
        ...cooled,
        phase: "sustainPeak",
        since: now,
        holdFor: roll(tempo.sustainMinS, tempo.sustainMaxS, random),
      };

    case "sustainPeak":
      // Three to five seconds, and then it is over whatever is happening.
      // The peak is a spike, not a plateau, and this is where that lives.
      if (held < cooled.holdFor) return cooled;
      return { ...cooled, phase: "peakFade", since: now };

    case "peakFade":
      /**
       * Wait for a natural break before starting the relax clock.
       *
       * Without this the valley is spent finishing the fight that caused
       * the peak, and the player gets a relax they never experienced. The
       * population is already minimal from here - this phase adds nothing,
       * it only refuses to start counting.
       */
      if (engaged || cooled.intensity > tempo.breakAt) return cooled;
      return {
        ...cooled,
        phase: "relax",
        since: now,
        progressAt: progress,
        holdFor: roll(tempo.relaxMinS, tempo.relaxMaxS, random),
      };

    case "relax": {
      /**
       * Ended by the clock OR by forward progress, whichever comes first.
       *
       * The second half is what stops the valley being an intermission
       * players learn to wait out: a delver pushing on toward the stair
       * spends it and one standing still does not.
       */
      const walked = progress - cooled.progressAt >= tempo.relaxProgress;
      if (held < cooled.holdFor && !walked) return cooled;
      return { ...cooled, phase: "buildUp", since: now };
    }
  }
}

/**
 * Whether the floor may send anything NEW right now.
 *
 * Minimal Threat, and the precise reading matters: no new threats, but
 * whatever is already in flight keeps acting. That is what stops the valley
 * reading as a scripted intermission - the Warden already in your room does
 * not politely stop walking because the director has decided you have had
 * enough.
 */
export const mayEscalate = (d: Director): boolean => d.phase !== "relax";
