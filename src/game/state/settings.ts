import { create } from "zustand";

import {
  DEFAULT_BINDINGS,
  bindTo,
  type Action,
  type Bindings,
} from "../input/bindings";

/**
 * What the player has asked the game to do differently.
 *
 * Separate from the run store on purpose: a run is a thing you lose, and
 * these are not. Kept in localStorage so a choice survives the tab, and
 * read defensively - a browser in private mode throws on both ends of it,
 * and a build that adds a setting must not make an old save fail to load,
 * so every field falls back to its default on its own.
 *
 * This grew from two toggles to a screen's worth, and most of what is here
 * is not a preference: it is the list a Steam release gets judged on and a
 * Deck player cannot play without. Head bob and screen shake make some
 * people ill; a game whose main threat is a sound needs a way to see the
 * sound; the alarm and the item charges were told in hue alone, which is
 * one of the two things a colour-blind player cannot read; and sprint on
 * a held key is a real problem for anyone who cannot hold a key.
 */

const STORAGE_KEY = "gem-dungeon.settings";

export interface Settings extends Stored {
  setCameraBob: (on: boolean) => void;
  setSound: (on: boolean) => void;
  setShake: (on: boolean) => void;
  setVolume: (v: number) => void;
  setSensitivity: (v: number) => void;
  setPadLook: (v: number) => void;
  setInvertY: (on: boolean) => void;
  setToggleSprint: (on: boolean) => void;
  setCaptions: (on: boolean) => void;
  setHighContrast: (on: boolean) => void;
  setUiScale: (v: number) => void;
  setTouchControls: (mode: TouchControls) => void;
  setTouchLook: (v: number) => void;
  setStickSide: (side: StickSide) => void;
  /** Bind an action to a key, taking it off whatever else held it. */
  bind: (action: Action, code: string) => void;
  resetBindings: () => void;
}

/**
 * Whether the on-screen controls are drawn. `auto` is the device's call
 * (`input/device.ts`): a phone or a tablet always, a desktop once its
 * screen has been touched.
 */
export type TouchControls = "auto" | "on" | "off";
/** Which thumb walks. The other one looks and has the buttons. */
export type StickSide = "left" | "right";

interface Stored {
  /** Head bob while walking. Off for anyone it makes ill. */
  cameraBob: boolean;
  /** The knock on the camera when something hits you. Same reason. */
  shake: boolean;
  /** Every sound the game makes. */
  sound: boolean;
  /** How loud, 0 to 1, when sound is on at all. */
  volume: number;
  /** Mouse look, as a multiplier on the game's own figure. */
  sensitivity: number;
  /** The right stick, likewise. */
  padLook: number;
  /** Up is down. */
  invertY: boolean;
  /**
   * Sprint on a press rather than a hold.
   *
   * Holding a key for the length of a chase is a real barrier, and the
   * chase is most of this game. Nothing about the sprint changes - it is
   * still loud, it still costs the same - only how the key is asked for.
   */
  toggleSprint: boolean;
  /**
   * Captions for the sounds that carry information.
   *
   * The Warden is heard before it is seen and its distance is a sound;
   * that is the game's best idea and it is unavailable to a player who
   * cannot hear it. These name the cue and which side it came from.
   */
  captions: boolean;
  /**
   * Do not say anything in colour alone.
   *
   * The floor's alarm was a word in a colour and the item charges were a
   * coloured band; both are readable without the colour now, and this
   * turns on the marks that make them so - a shape beside the alarm and
   * the charge spelled out on every slot.
   */
  highContrast: boolean;
  /** Overlay text and panels, as a multiplier. Bigger for a Deck. */
  uiScale: number;
  touchControls: TouchControls;
  /** The look drag on a touchscreen, as a multiplier on the game's own figure. */
  touchLook: number;
  stickSide: StickSide;
  bindings: Bindings;
}

const DEFAULTS: Stored = {
  cameraBob: true,
  shake: true,
  sound: true,
  volume: 0.8,
  sensitivity: 1,
  padLook: 1,
  invertY: false,
  toggleSprint: false,
  captions: false,
  highContrast: false,
  uiScale: 1,
  touchControls: "auto",
  touchLook: 1,
  stickSide: "left",
  bindings: DEFAULT_BINDINGS,
};

const bool = (v: unknown, fallback: boolean): boolean =>
  typeof v === "boolean" ? v : fallback;
/** A number, in range, or the default. NaN and Infinity are not numbers here. */
const ranged = (v: unknown, lo: number, hi: number, fallback: number): number =>
  typeof v === "number" && Number.isFinite(v) ? Math.max(lo, Math.min(hi, v)) : fallback;
/** One of a fixed set of words, or the default. */
const oneOf = <T extends string>(v: unknown, options: readonly T[], fallback: T): T =>
  typeof v === "string" && (options as readonly string[]).includes(v) ? (v as T) : fallback;

function loadBindings(v: unknown): Bindings {
  const out = { ...DEFAULT_BINDINGS } as Bindings;
  if (!v || typeof v !== "object") return out;
  const stored = v as Record<string, unknown>;
  for (const action of Object.keys(DEFAULT_BINDINGS) as Action[]) {
    const keys = stored[action];
    // An action the stored file does not mention keeps its default, and
    // one it mentions with rubbish in it does too: a saved settings file
    // is the one input to this game that some earlier build wrote.
    if (Array.isArray(keys) && keys.every((k) => typeof k === "string")) {
      out[action] = keys as string[];
    }
  }
  return out;
}

function load(): Stored {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const p = JSON.parse(raw) as Partial<Stored>;
    return {
      cameraBob: bool(p.cameraBob, DEFAULTS.cameraBob),
      shake: bool(p.shake, DEFAULTS.shake),
      sound: bool(p.sound, DEFAULTS.sound),
      volume: ranged(p.volume, 0, 1, DEFAULTS.volume),
      sensitivity: ranged(p.sensitivity, 0.25, 3, DEFAULTS.sensitivity),
      padLook: ranged(p.padLook, 0.25, 3, DEFAULTS.padLook),
      invertY: bool(p.invertY, DEFAULTS.invertY),
      toggleSprint: bool(p.toggleSprint, DEFAULTS.toggleSprint),
      captions: bool(p.captions, DEFAULTS.captions),
      highContrast: bool(p.highContrast, DEFAULTS.highContrast),
      uiScale: ranged(p.uiScale, 0.8, 1.6, DEFAULTS.uiScale),
      touchControls: oneOf(p.touchControls, ["auto", "on", "off"], DEFAULTS.touchControls),
      touchLook: ranged(p.touchLook, 0.25, 3, DEFAULTS.touchLook),
      stickSide: oneOf(p.stickSide, ["left", "right"], DEFAULTS.stickSide),
      bindings: loadBindings(p.bindings),
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

/**
 * One writer. Every setter used to spell out the whole stored object to
 * save it, which meant adding a field meant editing every setter and
 * forgetting one meant a setting that silently did not persist.
 */
const write = (set: (p: Partial<Stored>) => void, get: () => Settings, patch: Partial<Stored>) => {
  set(patch);
  const s = get();
  save({
    cameraBob: s.cameraBob,
    shake: s.shake,
    sound: s.sound,
    volume: s.volume,
    sensitivity: s.sensitivity,
    padLook: s.padLook,
    invertY: s.invertY,
    toggleSprint: s.toggleSprint,
    captions: s.captions,
    highContrast: s.highContrast,
    uiScale: s.uiScale,
    touchControls: s.touchControls,
    touchLook: s.touchLook,
    stickSide: s.stickSide,
    bindings: s.bindings,
  });
};

export const useSettings = create<Settings>()((set, get) => ({
  ...load(),
  setCameraBob: (on) => write(set, get, { cameraBob: on }),
  setSound: (on) => write(set, get, { sound: on }),
  setShake: (on) => write(set, get, { shake: on }),
  setVolume: (v) => write(set, get, { volume: ranged(v, 0, 1, DEFAULTS.volume) }),
  setSensitivity: (v) => write(set, get, { sensitivity: ranged(v, 0.25, 3, 1) }),
  setPadLook: (v) => write(set, get, { padLook: ranged(v, 0.25, 3, 1) }),
  setInvertY: (on) => write(set, get, { invertY: on }),
  setToggleSprint: (on) => write(set, get, { toggleSprint: on }),
  setCaptions: (on) => write(set, get, { captions: on }),
  setHighContrast: (on) => write(set, get, { highContrast: on }),
  setUiScale: (v) => write(set, get, { uiScale: ranged(v, 0.8, 1.6, 1) }),
  setTouchControls: (mode) => write(set, get, { touchControls: mode }),
  setTouchLook: (v) => write(set, get, { touchLook: ranged(v, 0.25, 3, 1) }),
  setStickSide: (side) => write(set, get, { stickSide: side }),
  bind: (action, code) => write(set, get, { bindings: bindTo(get().bindings, action, code) }),
  resetBindings: () => write(set, get, { bindings: DEFAULT_BINDINGS }),
}));

/** The keys bound to an action right now, for the input layer to read. */
export const keysFor = (action: Action): readonly string[] =>
  useSettings.getState().bindings[action];
