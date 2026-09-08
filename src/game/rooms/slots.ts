import type { PropKind, PropPlacement } from "../dungeon/types";
import { createRng, shuffle, type Rng } from "../rng";

/**
 * Substitution slots: nine rooms for the price of one.
 *
 * We already have the room-template pipeline and an editor feeding it. What
 * we lack is the thing that makes authored set pieces survive being seen
 * twice.
 *
 * The documentation this comes from endorses authored set pieces inside
 * procedural content - "they can provide challenges random levels would
 * rarely come up with" - and in the same breath names the cost: deja vu,
 * and "a spoiled edge" for veterans. The shipped mitigation is
 * PLACEMENT-TIME REWRITING, resolved per instance before anything reads the
 * layout, under the rule "In order to provide fun and reduce spoiler
 * effects, randomise."
 *
 * Three operations, which is all of them:
 *
 *   SUBST    every placeholder of a kind becomes ONE drawn thing - the
 *            whole room agrees, so a room of urns is urns and a room of
 *            crates is crates rather than a mixture that reads as noise
 *   SHUFFLE  a set of props permute among their own positions - the
 *            composition is preserved exactly and what is where is not
 *   NSUBST   the first N of a placeholder become one thing and the rest
 *            another - "one of these chests is real"
 *
 * The measurement this attacks is ours: a run is 34 rooms and 23 of them
 * look different. Adding props attacks that at the surface; a treasure
 * chamber whose gem, chest and cracked wall each land in one of three
 * authored positions is twenty-seven rooms from one authored room, and it
 * attacks it at the root.
 *
 * Everything here is resolved from the room's own seed, so the same room in
 * the same run is the same room every time it is entered - a set piece that
 * reshuffled while the player walked back through it would be worse than no
 * set piece at all.
 */

/**
 * A placeholder in an authored layout. The editor writes these as ordinary
 * props with a `slot` name; nothing downstream ever sees one, because they
 * are all resolved before the room is read.
 */
export interface SlotRule {
  /** The placeholder these apply to. */
  slot: string;
  op: "subst" | "shuffle" | "nsubst";
  /** What it may become. `subst` and `nsubst` draw from here. */
  into: readonly PropKind[];
  /** `nsubst` only: how many get the first entry; the rest get the second. */
  n?: number;
}

/** A prop in an authored layout, which may be a placeholder. */
export interface SlottedPlacement extends PropPlacement {
  slot?: string;
}

/**
 * How many distinct rooms a set of rules can produce.
 *
 * The number this whole file exists to make large, and it is checked rather
 * than claimed: a template whose slots multiply out to one variant is an
 * authored room with extra ceremony.
 */
export function variantsOf(rules: readonly SlotRule[], counts: Readonly<Record<string, number>>): number {
  let total = 1;
  for (const rule of rules) {
    const here = counts[rule.slot] ?? 0;
    if (here === 0) continue;
    if (rule.op === "subst") total *= Math.max(1, rule.into.length);
    else if (rule.op === "nsubst") total *= Math.max(1, here);
    else {
      // A permutation of `here` positions, capped so a big shuffle does
      // not report an astronomical number nobody could perceive.
      let perms = 1;
      for (let i = 2; i <= Math.min(here, 6); i++) perms *= i;
      total *= perms;
    }
  }
  return total;
}

/**
 * Resolve every placeholder, once, for one instance of a room.
 *
 * Before markers, deliberately: everything downstream - the gem's
 * placement, the dressing, the checks that hold props off the door lanes -
 * reads the resolved list and has no idea slots existed. A system that
 * resolved lazily would let two readers see two different rooms, which is
 * the one bug this codebase keeps naming.
 */
export function resolveSlots(
  props: readonly SlottedPlacement[],
  rules: readonly SlotRule[],
  seed: number | string
): PropPlacement[] {
  const rng: Rng = createRng(seed);
  const out: SlottedPlacement[] = props.map((p) => ({ ...p }));

  for (const rule of rules) {
    const indices = out.map((p, i) => (p.slot === rule.slot ? i : -1)).filter((i) => i >= 0);
    if (indices.length === 0) continue;

    if (rule.op === "subst") {
      // One draw for the whole room, so it reads as a decision rather than
      // as scatter.
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
      // The composition is preserved exactly; what stands where is not.
      const kinds = indices.map((i) => out[i].kind);
      const mixed = shuffle(rng, kinds);
      indices.forEach((i, at) => {
        out[i].kind = mixed[at];
      });
    }
  }

  // Placeholders never leave this function.
  return out.map(({ slot, ...rest }) => {
    void slot;
    return rest;
  });
}

/**
 * The power-spiral guard, as a function rather than as good intentions.
 *
 * The trap named in the same documentation: never make new content both
 * harder and richer than its peers at the same depth, because the two
 * compound and the spiral is very hard to walk back. So a room's reward is
 * benchmarked against what an ordinary room at that depth pays, and a room
 * that is harder may be *no richer than the band allows*.
 *
 * And the cheap trick that goes with it, which is the honest way to make a
 * hoard feel enormous: SHEER VOLUME gives the spectacle of a large reward
 * without the power. A hoard behind a cracked wall should look like a
 * hoard and be worth three gems.
 */
export const RICHER_THAN_PEERS = 1.75;

export const withinBand = (reward: number, peerReward: number): boolean =>
  peerReward <= 0 ? reward === 0 : reward <= peerReward * RICHER_THAN_PEERS;

/** How many things a hoard SHOWS, against how many it is worth. */
export const HOARD_LOOKS = 24;
export const HOARD_PAYS = 3;
