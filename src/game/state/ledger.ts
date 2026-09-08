import { create } from "zustand";

import { bus } from "../events";
import { LEDGER_LESSONS, type LessonId } from "../ledger/lessons";

/**
 * What the delver has written down, and it outlives the run.
 *
 * Kept beside `deeds.ts` and shaped the same defensive way: a browser in
 * private mode throws on both ends of localStorage, and a build that
 * renames a lesson must not make an old save fail to load. Anything in
 * storage this build does not know is dropped on read.
 *
 * The difference from deeds, and it is the whole point of the Ledger: a
 * deed is a record of something impressive and changes nothing. A lesson
 * CHANGES THE NEXT RUN - it lets the delver skip a step they have already
 * paid for once. That is the only progression a twenty-minute run can
 * honestly carry, and it is the reason this is a separate store rather
 * than another list inside `deeds.ts`: they are read by different things
 * for different reasons, and a store that mixed them would invite a deed
 * to start paying.
 */

const STORAGE_KEY = "gem-dungeon.ledger";

export interface LedgerStore {
  /** Every lesson ever written down, in the order it was learned. */
  learned: LessonId[];
  /** The ones this run was the first to write, for the summary. */
  learnedThisRun: LessonId[];
  /** Write one down. Does nothing if it is already there. Returns whether it was new. */
  learn: (id: LessonId) => boolean;
  clear: () => void;
}

function load(): LessonId[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const known = new Set<string>(LEDGER_LESSONS.map((l) => l.id));
    return parsed.filter((id): id is LessonId => typeof id === "string" && known.has(id));
  } catch {
    return [];
  }
}

function save(learned: LessonId[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(learned));
  } catch {
    // Quota or private mode: the lesson holds for this session only.
  }
}

export const useLedger = create<LedgerStore>()((set, get) => ({
  learned: load(),
  learnedThisRun: [],

  learn: (id) => {
    if (get().learned.includes(id)) return false;
    const learned = [...get().learned, id];
    set({ learned, learnedThisRun: [...get().learnedThisRun, id] });
    save(learned);
    // The notice and the sound hang off the event, so nothing in here has
    // an opinion about how it is announced.
    bus.emit("lessonLearned", { id });
    return true;
  },

  clear: () => {
    set({ learned: [], learnedThisRun: [] });
    save([]);
  },
}));

/** Whether a lesson has been written down. The one question everything asks. */
export const knows = (id: LessonId): boolean => useLedger.getState().learned.includes(id);

// A new run starts with nothing newly written, but everything already
// written still holds: that is the whole difference between the Ledger and
// the satchel.
bus.on("runStarted", () => useLedger.setState({ learnedThisRun: [] }));
