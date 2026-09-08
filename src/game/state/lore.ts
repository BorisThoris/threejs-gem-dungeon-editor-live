import { create } from "zustand";

import { bus } from "../events";
import { FRAGMENTS } from "../deepworks/fragments";

/**
 * What the delver has read off the walls.
 *
 * Kept the way the deeds and the Ledger are kept, and for the third of the
 * three reasons this game persists anything: the corpus is forty fragments
 * and a run walks past a handful of them, so a player who only ever saw
 * what one run showed them would be reading the same six lines forever.
 * Across runs it accumulates, which is what makes forty order-independent
 * fragments a place rather than a pamphlet.
 *
 * It buys nothing. Deliberately - it is the one thing this game remembers
 * that changes no rule, because the moment reading the walls paid, reading
 * the walls would be a chore with a reward attached rather than the thing
 * a curious player does.
 */

const STORAGE_KEY = "gem-dungeon.lore";

export interface LoreStore {
  /** Fragment ids ever read, in the order they were first read. */
  read: number[];
  /** The ones this run was the first to read, for the summary. */
  readThisRun: number[];
  /** Read one. Does nothing if it has been read before. Returns whether it was new. */
  markRead: (id: number) => boolean;
  clear: () => void;
}

function load(): number[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const known = new Set(FRAGMENTS.map((f) => f.id));
    return parsed.filter((id): id is number => typeof id === "number" && known.has(id));
  } catch {
    return [];
  }
}

function save(read: number[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(read));
  } catch {
    // Quota or private mode: it holds for this session only.
  }
}

export const useLore = create<LoreStore>()((set, get) => ({
  read: load(),
  readThisRun: [],

  markRead: (id) => {
    if (get().read.includes(id)) return false;
    const read = [...get().read, id];
    set({ read, readThisRun: [...get().readThisRun, id] });
    save(read);
    bus.emit("fragmentRead", { id });
    return true;
  },

  clear: () => {
    set({ read: [], readThisRun: [] });
    save([]);
  },
}));

bus.on("runStarted", () => useLore.setState({ readThisRun: [] }));
