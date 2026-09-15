import type { Body, MobId } from "./body";

/**
 * What every creature on the floor must have. The prototype.
 *
 * Ten creatures were built one at a time over thirty runs, and each one
 * was complete in a different way: the Warden had a held voice and no row
 * in the body table for eight runs; the Harrier had a body and a row and
 * four borrowed sounds; the rats had a row nothing read. Nothing said what
 * "a creature" was, so every one was as finished as the run that added
 * it. This table says. A creature is a row here, and the layout suite
 * holds every row to every field: the body it declares is the body in
 * `BODIES`, the row it answers by is in `susceptibility.ts`, the cues it
 * names exist in `audio.ts` and are played by something, the events it
 * announces are declared and emitted, the line that introduces it is a
 * lesson the teacher has, the file that draws it exists and publishes the
 * probe it names, and a creature that can take a life shows the second
 * before it does.
 *
 * Add a creature by adding a row; the suite says what is missing. The
 * fields are the ones the ten creatures already had between them, in one
 * place, rather than an ideal nothing satisfies.
 */
export type Role =
  /** It comes for you, or it costs you something when it reaches you. */
  | "threat"
  /** It lives on the floor and tells you things by what it does. */
  | "ambient"
  /** It helps, and the help has a price. */
  | "helper";

export type Harm =
  /** A touch costs a life. */
  | "life"
  /** It takes what you carry. */
  | "gems"
  /** It tells the floor where you are. */
  | "alarm"
  /** It carries your light where you are not. */
  | "light"
  /** Nothing. It is scenery with a voice, or the voice is the point. */
  | "none";

export interface CreatureSpec {
  /** What the player calls it. */
  readonly name: string;
  readonly role: Role;
  /** What `BODIES` says, repeated here so a reader has the whole creature in one row. */
  readonly body: Body;
  /** Where on the floor it is found, in a sentence. */
  readonly lives: string;
  readonly harm: Harm;
  /** The verbs that answer it. A threat with none is a wall, not a creature. */
  readonly answers: readonly string[];
  /**
   * Its voice. `held` runs while it is in the room and stops when it goes;
   * `moments` are its one-shots. Every name is a cue in `sfx`.
   */
  readonly voice: { readonly held: string | null; readonly moments: readonly string[] };
  /** What it announces over the bus, in `events.ts`. */
  readonly events: readonly string[];
  /** The teacher's lesson that introduces it, by id. */
  readonly lesson: string;
  /** The file that draws it, under `src/game/`. */
  readonly component: string;
  /** The `window.__name` it publishes at frame rate for the checks. */
  readonly probe: string;
  /** For a threat that takes a life: the number the body wears before it strikes. */
  readonly tell: boolean;
}

export const CREATURES: Record<MobId, CreatureSpec> = {
  warden: {
    name: "the Warden",
    role: "threat",
    body: "ground",
    lives: "It walks the whole floor, and comes to a noise or a light it is told about.",
    harm: "life",
    answers: ["shove", "bar the door", "bomb", "snare", "outrun it", "leave the floor"],
    voice: { held: "stalk", moments: ["wardenNear", "wardenHere", "wardenStrike", "wardenWound", "wardenRout", "bark"] },
    events: ["wardenWoke", "wardenNearby", "wardenEntered", "wardenStruck", "wardenWounded", "wardenRouted"],
    lesson: "woke",
    component: "warden/Warden.tsx",
    probe: "__warden",
    tell: true,
  },
  cutpurse: {
    name: "the Cutpurse",
    role: "threat",
    body: "ground",
    lives: "It nests in one room a floor and comes for a full satchel, and for the key most of all.",
    harm: "gems",
    answers: ["shove", "bomb", "ward stone", "the sanctuary", "carry less"],
    voice: { held: "skitter", moments: ["snatch", "thiefFled", "thiefDropped"] },
    events: ["thiefCame", "thiefTook", "thiefFled", "thiefCaught"],
    lesson: "thief",
    component: "thief/Cutpurse.tsx",
    probe: "__thief",
    tell: false,
  },
  reaper: {
    name: "the Reaper",
    role: "threat",
    body: "ghost",
    lives: "Nowhere until the floor's last band, and then always in the room you are in.",
    harm: "life",
    answers: ["bomb", "leave the floor"],
    voice: { held: "reap", moments: ["wardenHere", "wardenStrike", "wardenWound"] },
    events: ["reaperWoke", "reaperStruck", "reaperStalled"],
    lesson: "reaper",
    component: "reaper/Reaper.tsx",
    probe: "__reaper",
    tell: false,
  },
  rat: {
    name: "rats",
    role: "ambient",
    body: "ground",
    lives: "At holes in the corners of the dry, old and wet rooms, never where a puzzle is played.",
    harm: "none",
    answers: ["walk, and they scatter", "a snare across their run"],
    voice: { held: null, moments: ["skitter", "scurry", "clatter"] },
    events: ["snareSprung"],
    lesson: "rat",
    component: "mobs/Rats.tsx",
    probe: "__rats",
    tell: false,
  },
  moth: {
    name: "the moth",
    role: "ambient",
    body: "flying",
    lives: "One room a floor, on a perch, until there is a light in the room.",
    harm: "light",
    answers: ["lantern down", "let the wisp have it"],
    voice: { held: "flutter", moments: ["named", "take"] },
    events: ["mothLanded", "mothLeft"],
    lesson: "moth",
    component: "mobs/Moth.tsx",
    probe: "__moth",
    tell: false,
  },
  bat: {
    name: "bats",
    role: "ambient",
    body: "flying",
    lives: "A roost on the ceiling of the big rooms of the biomes that keep them.",
    harm: "alarm",
    answers: ["walk beneath it", "move clear when they stir"],
    voice: { held: "flock", moments: ["batsStir", "batsBurst"] },
    events: ["batsRoused"],
    lesson: "bats",
    component: "mobs/Bats.tsx",
    probe: "__bats",
    tell: false,
  },
  wisp: {
    name: "the wisp",
    role: "helper",
    body: "ghost",
    lives: "At your raised lantern, and ahead of you towards the crack, or the exit.",
    harm: "alarm",
    answers: ["lantern down"],
    voice: { held: "wispHum", moments: ["named", "lanternOut"] },
    events: ["wispCame", "wispLeft"],
    lesson: "wisp",
    component: "mobs/Wisp.tsx",
    probe: "__wisp",
    tell: false,
  },
  harrier: {
    name: "the Harrier",
    role: "threat",
    body: "flying",
    lives: "A roost on every floor from the second down; it comes for you wherever you are once it wakes.",
    harm: "life",
    answers: ["shove", "bomb", "bar the door", "spikes, once it is down"],
    voice: { held: "wingbeat", moments: ["harrierCry", "harrierWind", "harrierSwoop", "harrierAway", "harrierFall", "harrierDie"] },
    events: ["harrierWoke", "harrierStruck", "harrierDowned", "harrierSlain"],
    lesson: "harrier",
    component: "mobs/Harrier.tsx",
    probe: "__harrier",
    tell: true,
  },
  keeper: {
    name: "the Keeper",
    role: "threat",
    body: "ground",
    lives: "At every doorway into the last floor's exit, and nowhere else.",
    harm: "life",
    answers: ["bomb, in its room", "pay the toll while it kneels"],
    voice: { held: null, moments: ["keeperClank", "keeperSwing", "wardenStrike", "grind", "barDoor"] },
    events: ["keeperBars", "keeperStruck", "keeperKnelt", "keeperRose"],
    lesson: "keeper",
    component: "keeper/Keeper.tsx",
    probe: "__keeper",
    tell: true,
  },
  croaker: {
    name: "toads",
    role: "ambient",
    body: "ground",
    lives: "At the water's edge of the flooded and fungal rooms, never where a puzzle is played.",
    harm: "none",
    answers: ["stand over them and they hush", "anything loud, and they are under"],
    voice: { held: "chorus", moments: ["splash"] },
    events: ["croakersDove"],
    lesson: "croaker",
    component: "mobs/Croakers.tsx",
    probe: "__croakers",
    tell: false,
  },
};

export const CREATURE_IDS = Object.keys(CREATURES) as MobId[];
