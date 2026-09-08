/**
 * The vocabulary the floor is written in.
 *
 * Ten systems on this floor and, until now, no channel between them: the
 * Warden, the Sentry, the Cutpurse, the Keeper and the Reaper each ran a
 * frame loop that polled the store for its own private facts, and not one
 * of them subscribed to anything. A bomb could not rout a Warden that had
 * not already decided to be routed, because the bomb had no way to say
 * what it was and the Warden had no way to ask.
 *
 * The fix is not more wires. Wires between n systems cost n^2 and every
 * one of them has to be written, remembered and updated. What is cheap is
 * a shared vocabulary that things *advertise*, and rules that name a tag
 * where a thing would go:
 *
 *   a bomb declares [blast] [loud] [bright] [hot]
 *   and never learns the Warden exists.
 *
 * Two properties make this pay, and both are deliberate:
 *
 *   Silence is the default. No rule means no interaction. A tag on a thing
 *   obligates nobody; a receiver that declares nothing answers nothing.
 *   That is what keeps the rule table sparse instead of pairwise.
 *
 *   The receiver declares susceptibility. A material knows nothing about
 *   creatures. How much a blast matters is a property of the thing being
 *   blasted, which is why the Reaper can be made immune to the entire
 *   floor by giving it an empty block rather than by adding a check to
 *   every emitter.
 *
 * And one improvement on the game this is transplanted from. Noita's
 * receivers match by exact material *name*, so a new material harms nobody
 * until it has been added to every entity that should care. Ours match by
 * TAG - `hears [loud]`, not `hears bombBurst, barrelBurst, grateDrop` - so
 * a new noisy thing is heard by everything that listens for [loud] the day
 * it lands. We are authoring the vocabulary from scratch, so this costs us
 * nothing and it is the whole reason the Din is worth building.
 *
 * The honest cost, which the source file this is modelled on warns about
 * in its own comments: tagging a thing obligates you to author its
 * companion. Budget one companion rule per tag. Tags make *variants* free,
 * not ideas.
 */

/**
 * What a thing broadcasts about itself. These are the only tags that
 * travel: an emission has a magnitude and a place, and it reaches other
 * rooms through the doorway graph.
 */
export const EMITTED = ["loud", "bright", "blast", "hot", "metal", "wet"] as const;
export type Emitted = (typeof EMITTED)[number];

/**
 * How a thing is carried by the floor. Already shipped, and the proof the
 * idea works: "spikes bite ground, not flying" is written once and pays
 * off across traps, snares, pits and furniture with no wiring at all.
 */
export const BORNE = ["ground", "flying", "ghost"] as const;
export type Borne = (typeof BORNE)[number];

/**
 * What the floor of a room is made of, as far as sound is concerned.
 *
 * The biome table already carries a `surface`, in its own richer spelling
 * (brick, iron, wood). These five are the acoustic classes those collapse
 * into: what matters to the Din is not what a floor looks like but whether
 * it swallows a footfall or throws it down every corridor.
 */
export const SURFACES = ["stone", "moss", "tile", "dirt", "water"] as const;
export type Surface = (typeof SURFACES)[number];

/**
 * Conditions a thing can be in that other rules read. These do not
 * propagate - they are true of a thing where it stands - but they are in
 * the same vocabulary so a rule can name one without a special case.
 *
 * `owed` is the toll's tag, and it is here rather than in the economy
 * because the Keeper's whole brief is that somebody decided nothing else
 * leaves until the books balance.
 */
export const STATES = ["lit", "barred", "broken", "snared", "carried", "owed"] as const;
export type State = (typeof STATES)[number];

export type Tag = Emitted | Borne | Surface | State;

/** Every tag there is, for the checks that hold the table to its own size. */
export const TAGS: readonly Tag[] = [...EMITTED, ...BORNE, ...SURFACES, ...STATES];

/** Whether this tag is one that travels through the floor's doorways. */
export const travels = (tag: Tag): tag is Emitted => (EMITTED as readonly string[]).includes(tag);
