import { create } from "zustand";

/**
 * What survives a run.
 *
 * A roguelike where every run vanishes when it ends gives a player nothing
 * to come back for. This is the smallest thing that fixes that: a best
 * haul, the deepest floor anyone reached, the fastest way out, and a count
 * of how runs have ended. Kept in localStorage and read defensively - a
 * browser in private mode throws on both ends of it.
 *
 * Deliberately not a progression system. Nothing here changes what a run
 * is; it only remembers what happened.
 */

const STORAGE_KEY = "gem-dungeon.records";

export interface Records {
  runs: number;
  escapes: number;
  /** Most gems carried out of the dungeon. */
  bestHaul: number;
  /** Deepest floor stood on, won or lost. */
  deepestFloor: number;
  /** Seconds of the quickest escape, or 0 if nobody has got out. */
  fastestEscape: number;
  /** Gems picked up across every run. */
  gemsEverFound: number;
  /** The seed of the best haul, so it can be run again. */
  bestSeed: number | null;
  /**
   * The delver last taken down, so the title screen opens on the one you
   * played rather than making you pick again every time. Held here rather
   * than in the run because it has to outlive one, and this file is
   * already the only thing that does.
   *
   * A string rather than the `DelverId` union on purpose: this is read
   * back off a disk written by some earlier build, and a name that no
   * longer exists must become the Vagrant rather than a type error at the
   * one moment the game is starting.
   */
  lastDelver: string | null;
  /** Which delvers have got out alive at least once. */
  escapedAs: string[];
}

export interface RunOutcome {
  won: boolean;
  seed: number;
  /** Who was carrying it. */
  delver: string;
  /** Gems still held at the end. Only counts as a haul if they got out. */
  carried: number;
  gemsFound: number;
  floor: number;
  seconds: number;
}

export interface Bests {
  haul: boolean;
  depth: boolean;
  speed: boolean;
}

export interface RecordsStore extends Records {
  /** What the run that just ended beat, for the summary to say so. */
  lastBests: Bests | null;
  /** Fold a finished run in. Returns what about it was a personal best. */
  record: (outcome: RunOutcome) => Bests;
  clear: () => void;
}

const EMPTY: Records = {
  runs: 0,
  escapes: 0,
  bestHaul: 0,
  deepestFloor: 0,
  fastestEscape: 0,
  gemsEverFound: 0,
  bestSeed: null,
  lastDelver: null,
  escapedAs: [],
};

const number = (v: unknown, fallback: number): number =>
  typeof v === "number" && Number.isFinite(v) ? v : fallback;

function load(): Records {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const p = JSON.parse(raw) as Partial<Records>;
    return {
      runs: number(p.runs, 0),
      escapes: number(p.escapes, 0),
      bestHaul: number(p.bestHaul, 0),
      deepestFloor: number(p.deepestFloor, 0),
      fastestEscape: number(p.fastestEscape, 0),
      gemsEverFound: number(p.gemsEverFound, 0),
      bestSeed: typeof p.bestSeed === "number" ? p.bestSeed : null,
      lastDelver: typeof p.lastDelver === "string" ? p.lastDelver : null,
      escapedAs: Array.isArray(p.escapedAs) ? p.escapedAs.filter((d) => typeof d === "string") : [],
    };
  } catch {
    return EMPTY;
  }
}

function save(records: Records) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch {
    // Quota or private mode: the record holds for this session only.
  }
}

export const useRecords = create<RecordsStore>()((set, get) => ({
  ...load(),
  lastBests: null,

  record: (outcome) => {
    const before = get();
    // A haul only counts if the player got out with it; dying underground
    // is worth nothing, which is the whole point of the toll.
    const haul = outcome.won && outcome.carried > before.bestHaul;
    const depth = outcome.floor > before.deepestFloor;
    const speed =
      outcome.won && outcome.seconds > 0 && (before.fastestEscape === 0 || outcome.seconds < before.fastestEscape);

    const next: Records = {
      runs: before.runs + 1,
      escapes: before.escapes + (outcome.won ? 1 : 0),
      bestHaul: haul ? outcome.carried : before.bestHaul,
      deepestFloor: depth ? outcome.floor : before.deepestFloor,
      fastestEscape: speed ? outcome.seconds : before.fastestEscape,
      gemsEverFound: before.gemsEverFound + outcome.gemsFound,
      bestSeed: haul ? outcome.seed : before.bestSeed,
      lastDelver: outcome.delver,
      escapedAs:
        outcome.won && !before.escapedAs.includes(outcome.delver)
          ? [...before.escapedAs, outcome.delver]
          : before.escapedAs,
    };
    const bests = { haul, depth, speed };
    set({ ...next, lastBests: bests });
    save(next);
    return bests;
  },

  clear: () => {
    set({ ...EMPTY, lastBests: null });
    save(EMPTY);
  },
}));
