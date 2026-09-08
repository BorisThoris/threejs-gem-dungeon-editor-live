import type { MobId } from "../mobs/body";
import type { Tag } from "./tags";

/**
 * What each thing on the floor answers to, and - just as load-bearing -
 * what it pointedly does not.
 *
 * Every receiver here defaults to answering NOTHING. A block lists only
 * the tags this thing reacts to and the least arriving magnitude it reacts
 * at; a tag absent from the block is a tag this thing has never heard of.
 * That is the rule that keeps the table sparse: a bomb declares [blast]
 * [loud] [bright] [hot] and obligates nobody, and adding a new noisy prop
 * next month obligates nobody either.
 *
 * The alternative - a bomb that knows which creatures it affects - is the
 * shape the codebase already had, and it is the shape that made the floor
 * flat. It also gets the ownership backwards: how much a blast matters is
 * a fact about the thing being blasted.
 *
 * `deaf` carries no mechanism at all. It is a written-down claim that a
 * tag's absence is a decision rather than an oversight, and there is a
 * check that holds it to that: nothing may appear in both lists. Two of
 * the entries below are the game's best jokes and would otherwise read as
 * missing rows - the Warden is blind to light because it is carrying the
 * lamp, and the Sentry is deaf because it is a post, not an ear.
 */
export type ReceiverId = MobId | "sentry";

export interface Susceptibility {
  /**
   * Tag to the least arriving magnitude this thing answers to. A signal
   * that gets here quieter than this did not get here.
   */
  readonly answers: Partial<Record<Tag, number>>;
  /** Tags whose absence above is deliberate. Documentation, with a check. */
  readonly deaf?: readonly Tag[];
  /** Why, in the one line the Ledger will show the player once they learn it. */
  readonly tell?: string;
}

export const SUSCEPTIBILITY: Record<ReceiverId, Susceptibility> = {
  /**
   * The foreman. It hears the floor and it fears a blast, and it cannot be
   * dazzled because it has been holding the lamp since the company left.
   */
  warden: {
    answers: { loud: 0.3, blast: 0.25 },
    deaf: ["bright"],
    tell: "It carries its own lamp. Light tells it nothing.",
  },

  /**
   * A post with an eye. Bright things acquire it; the loudest night on the
   * floor goes straight past. Standing still in the dark beside a Sentry
   * is safe, which is the whole of its design and is only true because
   * this row is one word long.
   */
  sentry: {
    answers: { bright: 0.5 },
    deaf: ["loud", "blast"],
    tell: "It is a post, not an ear. It never turns to a sound.",
  },

  /**
   * It wants what you are carrying, and metal most of all - which is what
   * turns the floor's key from a function into bait.
   */
  cutpurse: {
    answers: { carried: 0.1, metal: 0.2 },
    deaf: ["bright"],
    tell: "It comes for what you hold, and it can hear metal.",
  },

  /**
   * Empty, and that is the design rather than an omission.
   *
   * Everything else on this floor can be routed, lured, blinded or bombed.
   * One thing cannot, and it is worth one data row instead of the five
   * files' worth of "except the Reaper" the codebase was accruing. When a
   * player learns that nothing works, they should be learning a rule and
   * not finding a gap.
   */
  reaper: {
    answers: {},
    deaf: ["loud", "bright", "blast", "hot", "metal", "wet", "carried"],
    tell: "It answers to nothing. Nothing you carry is for it.",
  },

  /** Underfoot. Scatters from a blast, and from anything loud enough. */
  rat: {
    answers: { blast: 0.1, loud: 0.45 },
    tell: "They scatter from a noise, and they weigh enough to spring a snare.",
  },

  /** It comes to a light. That is the entire creature, and it gives you away. */
  moth: {
    answers: { bright: 0.35 },
    deaf: ["loud", "blast"],
    tell: "It comes to a raised lantern, and it is easier to see than you are.",
  },

  /** A roost goes up at a noise, and the roost is louder than what roused it. */
  bat: {
    answers: { loud: 0.4, blast: 0.15 },
    tell: "A roost answers a noise with a bigger one.",
  },

  /** It gathers at a raised lantern and lights the way, brightly, for everyone. */
  wisp: {
    answers: { bright: 0.4 },
    deaf: ["loud", "blast"],
    tell: "It follows a raised lantern, and it is the brightest thing on the floor.",
  },

  /**
   * Deaf on purpose: the thing you cannot send away with a thrown noise.
   * A blast still puts it on the ground, so it has an answer - just not
   * the cheap one.
   */
  harrier: {
    answers: { blast: 0.2 },
    deaf: ["loud", "bright"],
    tell: "Noise will not send it anywhere. A blast will put it down.",
  },

  /**
   * It does not wander and it cannot be lured off the stair, because
   * somebody told it nothing leaves until the books balance. A blast makes
   * it kneel; nothing else reaches it.
   */
  keeper: {
    answers: { blast: 0.35 },
    deaf: ["loud", "bright", "metal", "carried"],
    tell: "It will not leave the stair. A blast makes it kneel.",
  },
};

/**
 * Whether a signal of `tag` arriving at `magnitude` reaches this receiver.
 *
 * The whole of the matching rule, and it is one line on purpose: a
 * receiver that has not declared the tag is not slightly affected, it is
 * unaffected, and there is no fallback that quietly makes everything
 * sensitive to everything.
 */
export function answersTo(sus: Susceptibility, tag: Tag, magnitude: number): boolean {
  const threshold = sus.answers[tag];
  return threshold !== undefined && magnitude >= threshold;
}
