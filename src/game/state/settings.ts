import { create } from "zustand";

/**
 * What the player has asked the game to do differently.
 *
 * Separate from the run store on purpose: a run is a thing you lose, and
 * these are not. Kept in localStorage so a choice survives the tab, and
 * read defensively - a browser in private mode throws on both ends of it.
 */

const STORAGE_KEY = "gem-dungeon.settings";

export interface Settings {
  /** Head bob while walking. Off for anyone it makes ill. */
  cameraBob: boolean;
  /** Every sound the game makes. */
  sound: boolean;
  setCameraBob: (on: boolean) => void;
  setSound: (on: boolean) => void;
}

interface Stored {
  cameraBob: boolean;
  sound: boolean;
}

const DEFAULTS: Stored = { cameraBob: true, sound: true };

function load(): Stored {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<Stored>;
    return {
      cameraBob: typeof parsed.cameraBob === "boolean" ? parsed.cameraBob : DEFAULTS.cameraBob,
      sound: typeof parsed.sound === "boolean" ? parsed.sound : DEFAULTS.sound,
    };
  } catch {
    return DEFAULTS;
  }
}

function save(next: Stored) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Quota or private mode: the choice still holds for this session.
  }
}

export const useSettings = create<Settings>()((set, get) => ({
  ...load(),
  setCameraBob: (on) => {
    set({ cameraBob: on });
    save({ cameraBob: on, sound: get().sound });
  },
  setSound: (on) => {
    set({ sound: on });
    save({ cameraBob: get().cameraBob, sound: on });
  },
}));
