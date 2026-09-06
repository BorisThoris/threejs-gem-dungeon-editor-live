import { create } from "zustand";

import { bus } from "../events";
import { DEED_IDS, DEEDS, type DeedId } from "../deeds/catalog";

/**
 * Which deeds have been done, and telling Steam about it.
 *
 * Kept beside `records.ts` and read the same defensively-shaped way: a
 * browser in private mode throws on both ends of localStorage, and a build
 * that renames a deed must not make an old save fail to load. Anything in
 * storage that is not a deed this build knows about is dropped on read
 * rather than kept, so the list on screen is always this build's list.
 */

const STORAGE_KEY = "gem-dungeon.deeds";

/**
 * The seam to Steam.
 *
 * This game has no Steamworks binding and cannot have one here: the real
 * API needs an app ID, a partner account and a native module, none of
 * which exist yet. What exists is the one call site, so that wiring it is
 * a five-line change in `electron/preload.cjs` rather than a hunt through
 * the game.
 *
 * The contract: the desktop shell may expose `window.desktop.achievement`,
 * and if it does, it is handed the deed's Steam API name at the moment it
 * is first earned. Anything that throws is swallowed - an achievement that
 * fails to report is a small disappointment, and one that takes the run
 * down with it is a refund. `steam/README.md` says what to put behind it.
 */
function tellSteam(id: DeedId) {
  try {
    const shell = (window as unknown as { desktop?: { achievement?: (name: string) => void } })
      .desktop;
    shell?.achievement?.(DEEDS[id].steam);
  } catch {
    // The shell is not there, or its binding is broken. Neither is worth
    // a run.
  }
}

export interface DeedsStore {
  done: DeedId[];
  /** The ones this run was the first to do, for the summary. Cleared when a run starts. */
  earnedThisRun: DeedId[];
  /** Earn one. Does nothing if it is already done. Returns whether it was new. */
  earn: (id: DeedId) => boolean;
  clear: () => void;
}

function load(): DeedId[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const known = new Set<string>(DEED_IDS);
    return parsed.filter((id): id is DeedId => typeof id === "string" && known.has(id));
  } catch {
    return [];
  }
}

function save(done: DeedId[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(done));
  } catch {
    // Quota or private mode: the deed holds for this session only.
  }
}

export const useDeeds = create<DeedsStore>()((set, get) => ({
  done: load(),
  earnedThisRun: [],

  earn: (id) => {
    if (get().done.includes(id)) return false;
    const done = [...get().done, id];
    set({ done, earnedThisRun: [...get().earnedThisRun, id] });
    save(done);
    tellSteam(id);
    // The toast and the sound hang off the event, so nothing in here has
    // an opinion about how it is announced.
    bus.emit("deedEarned", { id });
    return true;
  },

  clear: () => {
    set({ done: [], earnedThisRun: [] });
    save([]);
  },
}));

// A new run starts with nothing to its name yet.
bus.on("runStarted", () => useDeeds.setState({ earnedThisRun: [] }));
