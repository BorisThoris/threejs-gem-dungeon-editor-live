/**
 * What the readout says, in what order, in one voice.
 *
 * The HUD grew a line per run for twenty-five runs and every one of them
 * was appended where the last one ended, so the order on screen was the
 * order the features were built in. That is not what a player reads: with
 * the Reaper in the room, "it is here - the exit, now" sat below what the
 * floor was made of. The grammar drifted the same way - two different
 * lines both labelled FLOOR, one saying which floor you are on and the
 * other how long it will put up with you.
 *
 * So the lines are a list rather than a block of JSX, each with a rank,
 * and this module is the only thing that decides either. The component
 * builds a snapshot, asks for the lines, and draws them in the order it
 * gets back.
 *
 * The ranks, and why:
 *
 *  0  Something is taking a life from you right now, or will if you stand
 *     still. The Reaper in the room, the Keeper across the stairs, the
 *     Harrier in the air. Nothing a player does about anything else
 *     matters while one of these is true.
 *  1  A clock the player is losing: the floor's patience, a barred
 *     doorway, oil, the window while something kneels or is down.
 *  2  What it will cost to leave, and whether you can pay it.
 *  3  What can be spent or lost: lives, what is in the nest.
 *  4  Where you are and what the room is made of. True all the time and
 *     therefore never the thing to read first.
 *
 * Within a rank the order is the order below, which is stable and is not
 * a judgement about anything.
 */

/** One line of the readout. */
export interface HudLine {
  /** Stable name, for the checks and for React's keys. */
  id: string;
  /**
   * The word in front. Every fact has exactly one, and no two lines share
   * one: two lines both saying FLOOR is how a reader learns to skip both.
   */
  label: string;
  /** What it says. Plain words, and never the only place a state is told. */
  body: string;
  /** Nought to four; lower is read first. */
  rank: number;
  /** Which of the palette's colours the body is drawn in. */
  tone: "ink" | "dim" | "gold" | "accent" | "danger";
  /**
   * The high-contrast mark, for a reader who cannot tell the tones apart.
   * Repeated exclamation marks for danger, bars for a level.
   */
  mark?: string;
}

/** Everything the lines are worked out from. Nothing here is decided here. */
export interface HudFacts {
  lives: number;
  maxLives: number;
  freeHit: boolean;
  keys: number;
  gems: number;
  toll: number;
  spare: number;
  owed: number;
  floor: number;
  floors: number;
  roomTitle: string;
  ground: { name: string; says: string; tone: HudLine["tone"] } | null;
  roost: boolean;
  drafty: boolean;
  /**
   * What the floor's heat is CALLED, and the band it is in. Never the
   * number.
   *
   * Run 26 made the readout maximally legible on purpose, and Law 3 says
   * that was half right. Economic facts stay numeric because the player is
   * entitled to plan against them; fear clocks do not, because a player
   * who can count does not hurry - they wait until 3 and then move, which
   * is the opposite of what a countdown is for.
   */
  heatSays: string;
  heatBand: number;
  reaper: boolean;
  wardenAwake: boolean;
  wardenSays: string;
  wardenTone: HudLine["tone"];
  wardenBars: number;
  wary: boolean;
  warded: boolean;
  keeper: "holds" | "kneels" | null;
  keeperUp: number;
  harrier: "roosts" | "hunting" | "away" | "down" | null;
  harrierUp: number;
  lanternLit: boolean;
  wisp: boolean;
  oil: number;
  barSeconds: number;
  nestGems: number;
  relics: readonly string[];
}

/** The separator between a fact and what qualifies it, everywhere. */
const DOT = " · ";

/**
 * How much oil is left, in words.
 *
 * "12s oil" is the third fear clock, and the least defensible of the
 * three: it is a number attached to a resource the player cannot spend
 * deliberately, so all it ever did was tell them precisely when to panic.
 * The flame itself shortens as it burns, which is the physical tell every
 * deleted number is owed.
 */
const oilWord = (oil: number): string =>
  oil <= 0 ? "dry" : oil <= 20 ? "guttering" : oil <= 60 ? "low" : oil <= 110 ? "half" : "full";

/**
 * The readout, most urgent first.
 *
 * Pure, so the checks can read the order without a browser and without
 * the HUD having been drawn.
 */
export function hudLines(f: HudFacts): HudLine[] {
  const out: HudLine[] = [];
  const add = (line: HudLine) => out.push(line);

  // Rank 0: something is taking a life.
  if (f.reaper) {
    add({ id: "reaper", label: "IT IS HERE", body: "the exit, now", rank: 0, tone: "danger", mark: "!!!!" });
  }
  if (f.keeper) {
    add({
      id: "keeper",
      label: "KEEPER",
      body:
        f.keeper === "kneels"
          ? `kneels${DOT}${f.keeperUp}s${DOT}go`
          : `holds the stairs${DOT}a blast makes it kneel`,
      rank: f.keeper === "kneels" ? 1 : 0,
      tone: f.keeper === "kneels" ? "gold" : "danger",
      mark: f.keeper === "kneels" ? undefined : "!!!",
    });
  }
  if (f.harrier === "hunting") {
    add({ id: "harrier", label: "ABOVE", body: `a harrier hunts you${DOT}a blast downs it`, rank: 0, tone: "danger", mark: "!!!" });
  }
  if (f.wardenAwake) {
    add({
      id: "warden",
      label: "WARDEN",
      body:
        f.wardenSays +
        (f.wary ? `${DOT}wary of spikes` : "") +
        (f.warded ? `${DOT}warded out of this room` : ""),
      rank: 0,
      tone: f.wardenTone,
      mark: "|".repeat(Math.max(1, Math.min(4, f.wardenBars))),
    });
  }

  /**
   * Rank 1: the floor's own temper, named and never counted.
   *
   * This line used to read "the floor tires of you - 12s". The words were
   * right and the number was the problem: it turned the one pressure in
   * the game that is supposed to make a player hurry into a thing they
   * could wait out precisely.
   *
   * The names carry no mechanical weight whatsoever and do all of the
   * work: "the floor is looking" and "IT KNOWS WHERE YOU ARE" are not
   * ranks of a variable, they are two different rooms to be standing in.
   */
  if (f.heatBand > 0 && !f.reaper) {
    add({
      id: "heat",
      label: "FLOOR",
      body: f.heatSays,
      rank: f.heatBand >= 3 ? 1 : 4,
      tone: f.heatBand >= 3 ? "danger" : f.heatBand >= 2 ? "gold" : "dim",
      mark: f.heatBand >= 3 ? "!!" : undefined,
    });
  }
  if (f.harrier && f.harrier !== "hunting") {
    add({
      id: "harrier",
      label: "ABOVE",
      body:
        f.harrier === "roosts"
          ? `a harrier roosts here${DOT}quietly`
          : f.harrier === "away"
            ? "the harrier wheels away"
            : `the harrier is down${DOT}spikes would end it`,
      rank: f.harrier === "roosts" ? 4 : 1,
      tone: "gold",
    });
  }
  if (f.barSeconds > 0) {
    /**
     * The bar holds, and how long it has left is not the player's to
     * count either - the hammering they hear go quiet is the tell, and a
     * physical tell is what every deleted number is replaced by.
     */
    add({ id: "barred", label: "BARRED", body: "a doorway", rank: 1, tone: "gold" });
  }

  // Rank 2: what leaving costs.
  add({
    id: "gems",
    label: "GEMS",
    body: `${f.gems}${DOT}toll ${f.toll}${DOT}${f.owed > 0 ? `${f.owed} short` : `${f.spare} spare`}`,
    rank: 2,
    tone: f.owed > 0 ? "danger" : "gold",
    mark: f.owed > 0 ? "!" : undefined,
  });

  // Rank 3: what can be spent or lost.
  add({
    id: "lives",
    label: "LIVES",
    body:
      "♥".repeat(f.lives) +
      (f.freeHit ? `${DOT}charm` : "") +
      (f.keys > 0 ? `${DOT}iron key` : ""),
    rank: 3,
    tone: f.lives <= 1 ? "danger" : "ink",
    mark: f.lives <= 1 ? "!" : undefined,
  });
  add({
    id: "lantern",
    label: "LANTERN",
    body: `${f.lanternLit ? "up" : "down"}${f.wisp ? `${DOT}a wisp` : ""}${DOT}${oilWord(f.oil)}`,
    rank: 3,
    tone: f.oil <= 20 ? "danger" : f.lanternLit ? "gold" : "dim",
    mark: f.oil <= 20 ? "!" : undefined,
  });
  if (f.nestGems > 0) {
    add({ id: "stolen", label: "STOLEN", body: `${f.nestGems}${DOT}in its nest, on the map`, rank: 3, tone: "accent" });
  }

  // Rank 4: where you are.
  add({
    id: "floor",
    label: "FLOOR",
    body: `${f.floor}/${f.floors}${DOT}${f.roomTitle}`,
    rank: 4,
    tone: "ink",
  });
  if (f.ground) {
    add({
      id: "ground",
      label: "GROUND",
      body:
        `${f.ground.name}${DOT}${f.ground.says}` +
        (f.roost ? `${DOT}bats roost here` : "") +
        (f.drafty ? `${DOT}a draft` : ""),
      rank: 4,
      tone: f.ground.tone,
      // Ground that carries is drawn in the danger tone, and until the
      // lines were listed in one place nothing noticed it was the one
      // urgent thing on the readout with no mark beside it: a reader who
      // cannot tell the tones apart saw "standing water · carries" in the
      // same grey as "moss · dead", which is the opposite of what it
      // means. One mark, because it is a warning rather than a level.
      mark: f.ground.tone === "danger" ? "!" : undefined,
    });
  }
  if (f.relics.length) {
    add({ id: "held", label: "HELD", body: f.relics.join(", "), rank: 4, tone: "gold" });
  }

  // Stable within a rank: the order above, which is not a judgement.
  return out
    .map((line, at) => ({ line, at }))
    .sort((a, b) => a.line.rank - b.line.rank || a.at - b.at)
    .map(({ line }) => line);
}
