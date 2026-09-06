import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

import { bus } from "../events";
import { generateDungeon } from "../dungeon/generate";
import { spawnAfterTravel, spawnAtStart } from "../dungeon/layout";
import { DIR_STEP, OPPOSITE, roomById, type Dir, type Dungeon, type Room } from "../dungeon/types";
import {
  AVARICE_ALARM,
  AVARICE_GEMS,
  BANISH_CALM,
  DREAD_ALARM,
  ECHOES_S,
  GLOOM_S,
  ITEMS,
  MIRE_S,
  ITEM_IDS,
  RATTLE_ALARM,
  SATCHEL_SLOTS,
  SNARE_HOLD_S,
  SNARE_RADIUS,
  SWIFTNESS_S,
  WARD_S,
  appearancesFor,
  isBomb,
  isDevice,
  type Appearances,
  type ItemId,
} from "../items/catalog";
import { chargesFor, inverted, lifted, scaled, type Charge, type Charges } from "../items/charge";
import { DEFAULT_DELVER, DELVERS, delverOr, knownFrom, type DelverId } from "../delvers/catalog";
import { useRecords } from "./records";
import { modifiers, type RelicId } from "../relics/catalog";
import { paceFor, type Pace, type PaceEffect } from "../systems/pace";
import { playerAt } from "../player/where";
import { nestRoom } from "../thief/nest";
import { biomeFor } from "../rooms/biomes";
import { barKey } from "../warden/bars";
import { banishTo, wakingRoom } from "../warden/roam";
import { behaviourFor } from "../warden/tuning";
import {
  ALARM_PER_GEM,
  FLOOR_PATIENCE_S,
  REAPER_STALL_S,
  REAPER_STRIKE_GRACE_S,
  DAMAGE_COOLDOWN_S,
  FLOORS,
  NOISE_HOLD_S,
  STARTING_LIVES,
  TRANSITION_FALLBACK_MS,
  CUTPURSE_FROM_FLOOR,
  BAR_NOISE_S,
  BOMB_FUSE_S,
  BOMB_RADIUS,
  CLOSE_REACH,
  BAR_S,
  LANTERN_FULL_S,
  LANTERN_SEEN_HOLD_S,
  CUTPURSE_GRACE_ROOMS,
  CUTPURSE_REST_S,
  CUTPURSE_SHY_S,
  WARDEN_BANISH_DISTANCE,
  WARDEN_ROUT_CALM,
  WARDEN_STAGGER_S,
  WARDEN_WOUNDS_TO_ROUT,
  floorRules,
  tollForFloor,
} from "../world";

export type Phase = "menu" | "playing" | "won" | "lost";

/**
 * What the Cutpurse is doing. It is only ever in the room the player is
 * standing in - it has no life of its own between visits, because a thief
 * that wanders a floor nobody is watching is just a second Warden with a
 * different model.
 */
export type ThiefPhase = "away" | "stalking" | "fleeing";

/** A device the player has put down, where they put it. */
export interface PlacedDevice {
  /** Unique for the run, so a snare can be sprung by name. */
  key: string;
  id: ItemId;
  roomId: string;
  x: number;
  z: number;
  /** False once a snare has caught something: it stays as wreckage. */
  live: boolean;
  /** A bomb's deadline on the run's clock. Only bombs have one. */
  fuseAt?: number;
}

export interface RunState {
  phase: Phase;
  paused: boolean;
  dungeon: Dungeon | null;
  /** 1-based; the run is won on leaving floor FLOORS. */
  floor: number;
  /**
   * The seed the run started from: the one worth showing and replaying.
   * Each floor's dungeon is generated from a seed derived from it, so
   * `dungeon.seed` is this floor's and parts company with this on the way
   * down. Showing that one meant every "same dungeon again" replayed a
   * floor nobody had played.
   */
  runSeed: number;
  /** Rooms first entered over the whole run, for the summary. */
  roomsSeen: number;
  currentRoomId: string | null;
  /** Room ids in the order first entered. */
  visited: string[];
  lives: number;
  maxLives: number;
  /** Gems in hand: the toll comes out of these, and what is left is the score. */
  gems: number;
  /** Gems collected over the whole run, for the summary. */
  gemsTotal: number;
  /** Rooms whose gem has been taken. */
  gemRooms: string[];
  /** Rooms whose puzzle or challenge has been completed. */
  cleared: string[];
  /** Rooms whose puzzle or challenge has been failed for good. */
  failed: string[];
  /**
   * How far into a room's trial the player is: misses spent in the attempt
   * under way, and attempts spent for good.
   *
   * This is a fact about the run, and it used to be a fact about a
   * component. The memory trial counted both in `useState`, and only the
   * room the player is standing in is mounted - so stepping through a door
   * and back handed you a fresh allowance and the trial's whole cost, a
   * life at two misses and the book burned at two attempts, could be walked
   * away from and never paid.
   */
  trials: Record<string, { attempts: number; misses: number }>;
  /**
   * Who went down. Chosen at the title and fixed for the run: it decides
   * what the first door is walked up to with, and it goes on the summary
   * because "twenty-two gems" means two different things depending on
   * which of these was carrying them.
   */
  delver: DelverId;
  /** Relics held. What they do is decided in relics/catalog.ts. */
  relics: RelicId[];
  /** What is in the satchel, oldest first. Four slots, used with 1-4. */
  satchel: ItemId[];
  /** Items whose appearance the player has worked out, this run. */
  identified: ItemId[];
  /** Which look means which item, this run. Fixed when the run starts. */
  appearances: Appearances;
  /**
   * Which kinds this dungeon has blessed and which it has cursed, this
   * run. Visible on sight, unlike the appearances - see items/charge.ts
   * for why the two hidden axes are one hidden axis.
   *
   * Not readonly: the shop lifts one kind a step, which is the only thing
   * in the game that changes it.
   */
  charges: Charges;
  /** Timed effects, as the wall-clock second each one runs out. */
  effects: { swift: number; mire: number; gloom: number };
  /**
   * The room a thrown sound has sent the Warden to, and when it stops
   * caring. It walks there rather than towards the player, and while it is
   * doing that it is not listening for footsteps - which is what makes a
   * Scroll of Echoes the one thing that buys the right to run.
   */
  wardenLure: string | null;
  lureUntil: number;
  /**
   * Run-clock time until which the player is still being heard. Running is
   * loud: while this is in the future the Warden knows which room they are
   * in. Held here rather than in the player so the HUD, the driver and the
   * tests all read the same fact.
   */
  noisyUntil: number;
  /**
   * The lantern: whether it is up, and how many seconds of oil are left.
   *
   * Oil burns only while it is raised, so a player who keeps it down never
   * runs out and never has to think about it. `litUntil` is the other half
   * - the run-clock second the Warden stops walking towards the light -
   * and is the exact twin of `noisyUntil`, deliberately: the two bargains
   * in this game are shaped the same and are kept the same way.
   */
  lanternRaised: boolean;
  oil: number;
  litUntil: number;
  /** Whether a Scroll of Mapping has shown this floor. */
  mapped: boolean;
  /** Chests already emptied, as `roomId:index`. */
  looted: string[];
  /**
   * Devices set down on this floor, in the room they were set down in.
   *
   * Held on the run rather than in the room, because only one room is
   * mounted at a time and a snare has to still be there when the player
   * comes back through - which is most of the point of setting one. Wiped
   * with the floor, like the key and the lock.
   */
  placed: PlacedDevice[];
  /**
   * The room a ward stone lies in and the run-clock second it stops
   * holding. One at a time: a second stone moves the ward rather than
   * stacking, which is the reading of "while it lies here" that does not
   * need a rule to explain it.
   */
  wardRoomId: string | null;
  wardUntil: number;
  /**
   * The Cutpurse: what it is doing, when it will next try, and how much of
   * yours is in its nest.
   *
   * `nestRoomId` is derived from the floor rather than stored with it, and
   * cached here so the map, the room shell and the driver all read one
   * answer. `nestSeen` is whether the player has been shown where it is,
   * which is what turns a theft from a loss into a walk.
   */
  thiefPhase: ThiefPhase;
  thiefNextAt: number;
  /** Gems it is carrying right now: dropped if it is caught. */
  thiefHolding: number;
  /** Gems already in the nest, waiting to be walked to. */
  nestGems: number;
  nestRoomId: string | null;
  nestSeen: boolean;
  /**
   * The doorway the player has barred, and when it gives way on its own.
   *
   * One at a time: two would let a player wall themselves into a corner
   * and wait, which is a hiding place rather than a decision, and the
   * Warden's whole job is that there is nowhere to wait. Held as an edge
   * key (`warden/bars.ts`) rather than a room and a direction, because
   * barring a doorway from either side is the same act.
   */
  barredDoor: string | null;
  barUntil: number;
  /** A room whose doors are barred while something in it is happening. */
  sealedRoomId: string | null;
  /** Iron keys in hand. One opens one vault. */
  keys: number;
  /** Vaults already opened, so a door stays open once it has been. */
  unlocked: string[];
  /**
   * The room whose key has been picked up. Kept apart from `unlocked`,
   * which the two used to share: it held today only because the generator
   * never puts a key inside the vault, and a second lock on a floor would
   * have made a picked-up key silently open a door.
   */
  keyTakenIn: string | null;
  /**
   * How roused this floor's Warden is. Raised by taking gems, reset on
   * every new floor. This is the whole risk side of the run: the more of a
   * floor you take, the harder it is to leave.
   */
  alarm: number;
  /** Rooms entered on this floor, which is what wakes the Warden. */
  floorRooms: number;
  /** Which room the Warden is in, or null while it still sleeps. */
  wardenRoomId: string | null;
  /** The room it walked in from, so wandering does not just pace a corridor. */
  wardenCameFrom: string | null;
  /**
   * Wounds the Warden has taken from the floor's own spikes since it was
   * last routed, and the run-clock second it stops reeling from the last
   * one. Per floor, like everything else about it.
   */
  wardenWounds: number;
  wardenStaggerUntil: number;
  /**
   * Whether it has learned. Set by a rout and never unset on the floor it
   * happened on: from then on it walks round what bit it, and the trap
   * room is a trap room again rather than the answer to the Warden.
   */
  wardenWary: boolean;
  /**
   * The run-clock second this floor began. The floor's patience runs
   * from it, and a fresh floor is a fresh one: what you spent upstairs is
   * not held against you downstairs.
   */
  floorEnteredAt: number;
  /** The floor's patience ran out and the Reaper is on it. */
  reaperAwake: boolean;
  /** Run-clock second a blast stops holding the Reaper. */
  reaperStalledUntil: number;
  /** Run-clock second of the Reaper's last strike, for the grace between two. */
  reaperLastStrikeAt: number;
  /** The Bone Charm's free hit, spent once a floor. */
  freeHitUsed: boolean;
  /** Whether the player has met the Warden yet, for the one-time warning. */
  wardenMet: boolean;
  /** True from leaving one room until the next has mounted. */
  transitioning: boolean;
  /** Counted, not flagged: a puzzle overlay and a menu may both hold it. */
  inputLocks: number;
  lastDamageAt: number;
  /**
   * Seconds spent in the pause menu. Timed things - a potion, the damage
   * cooldown - are deadlines on `runClock`, which is wall time less this,
   * so a Potion of Swiftness is not burnt by twenty seconds in a menu.
   */
  pausedFor: number;
  /** When the current pause began, in wall seconds, or 0 while running. */
  pausedAt: number;
  /**
   * `runClock` when the run began, in seconds. On the run clock, not the
   * wall clock, so the summary and the records agree with everything else
   * the game times.
   */
  startedAt: number;
  /** The same clock, read when the run is won or lost. */
  endedAt: number;

  startRun: (seed?: number, delver?: DelverId) => void;
  quitToMenu: () => void;
  pause: () => void;
  resume: () => void;
  /** Walk through the doorway on this wall of the current room. */
  travel: (dir: Dir) => void;
  /** The room shell reports that its colliders are mounted. */
  roomReady: (roomId: string) => void;
  collectGem: (roomId: string) => boolean;
  spendGems: (amount: number) => boolean;
  /** Take a relic. Does not charge for it; the shop does that. */
  addRelic: (id: RelicId) => void;
  /** Put an item in the satchel. False when there is no room for it. */
  takeItem: (id: ItemId, from?: string) => boolean;
  /** Drink or read what is in a slot, and learn what it was. */
  useItem: (slot: number) => void;
  /**
   * Put the device in a slot down where the player is standing. Called by
   * `useItem` for anything in the device family, so 1-4 is still the one
   * key that spends a slot however the thing in it works.
   */
  placeDevice: (slot: number) => boolean;
  /** Learn what a slot holds without spending it. The shop charges for this. */
  identifySlot: (slot: number) => boolean;
  /**
   * Lift what is in a slot one step: cursed to plain, plain to blessed.
   * It lifts the whole kind, because a charge is a fact about a kind in
   * this dungeon rather than about one bottle. The shop charges for it.
   */
  blessSlot: (slot: number) => boolean;
  /** A snare caught something and is spent. */
  springSnare: (key: string) => void;
  /** The Cutpurse comes into the room the player is standing in. */
  thiefArrives: () => boolean;
  /** It reached the player and took a gem. False if there was nothing to take. */
  thiefSteals: () => boolean;
  /** It got out of the room with what it was holding. */
  thiefEscapes: () => void;
  /**
   * The player caught it, or something on the floor did. It drops what it
   * has and stays away longer.
   */
  thiefCaught: () => void;
  /** The player walked into the nest and took back what was in it. */
  emptyNest: () => boolean;
  /**
   * Kneel at a floor's shrine: one gem, and the floor forgets you.
   *
   * Returns false, without spending anything, when there is nothing to buy
   * - no gem to pay with, or a floor already as quiet as it starts. The
   * trigger says which before the press.
   */
  kneelAtShrine: (roomId: string) => boolean;
  /** A bomb whose fuse has run out goes off. Called from the frame loop. */
  detonate: (key: string) => void;
  /** The blast opened a cracked wall: the secret becomes a doorway. */
  revealSecret: (hostId: string) => void;
  /**
   * Throw the Warden across the floor and calm the floor, as a second
   * wound does. One owner, because a bomb and the spikes rout it the
   * same way and the difference between them must never be a rule.
   */
  routWarden: () => void;
  /** Bar or unbar a room's doors. */
  sealRoom: (roomId: string | null) => void;
  /** Rouse the floor. The one way the alarm goes up. */
  raiseAlarm: (amount: number) => void;
  /**
   * Something told the Warden where the player is - a watcher calling out,
   * a Potion of Dread. It rouses the floor and, unlike a gem, it ends any
   * noise the Warden was off chasing: being told beats being distracted.
   */
  giveAway: (amount: number) => void;
  /** The player made a noise loud enough to be placed. Sprinting does this. */
  makeNoise: () => void;
  /** Raise or lower the lantern. Raising with no oil left does nothing. */
  toggleLantern: () => void;
  /**
   * Bar the doorway between the room the player is in and `toRoomId`. Loud,
   * and it replaces whatever was barred before. False when it cannot.
   */
  barDoor: (toRoomId: string) => boolean;
  /**
   * The bar is gone: the Warden came through it, or the player lifted it
   * walking out. Two very different events with one piece of state, so the
   * event says which.
   */
  breakBar: (byWarden?: boolean) => void;
  /**
   * Burn `seconds` of oil and keep the light seen.
   *
   * Called from the frame loop, so it must not write on every frame: every
   * write re-runs every selector in the store, and this is the same lesson
   * `makeNoise` above already learned. The driver accumulates and flushes.
   */
  burnOil: (seconds: number) => void;
  /** Fill it from a brazier. Returns false when it is already full. */
  fillLantern: () => boolean;
  /** Pick up the floor's key. */
  takeKey: (roomId: string) => void;
  /** Spend a key on a vault. Returns false without one. */
  unlockRoom: (roomId: string) => boolean;
  /** The Warden walks to another room. */
  moveWarden: (roomId: string) => void;
  /** It reached the player: a life, unless the charm pays, and it is thrown back. */
  wardenStrike: () => void;
  /** The floor's patience ran out. Called from the frame loop. */
  wakeReaper: () => void;
  /** The Reaper reached the player. */
  reaperStrike: () => void;
  /** A blast in the Reaper's room holds it where it stands for a while. */
  stallReaper: () => void;
  /**
   * It walked into something that hurt it: the floor's own spikes, or a
   * snare the player set. `hold` is how long it reels, which is the only
   * thing the two differ in.
   */
  wardenWounded: (hold?: number) => void;
  /** Take a hit. Returns false if inside the invulnerability window. */
  damage: () => boolean;
  gainLife: () => boolean;
  clearRoom: (roomId: string) => void;
  failRoom: (roomId: string) => void;
  /** A wrong answer in a room's trial. Returns the misses now spent in it. */
  trialMiss: (roomId: string) => number;
  /** An attempt spent: the misses go back to none. Returns attempts spent. */
  trialAttempt: (roomId: string) => number;
  lockInput: () => void;
  unlockInput: () => void;
}

/** The player is in control: not on a menu, not mid-transition, not in a modal. */
export const canControl = (s: RunState): boolean =>
  s.phase === "playing" && !s.paused && !s.transitioning && s.inputLocks === 0;

let transitionFallback: number | null = null;

/**
 * How long the run took, in whole seconds.
 *
 * The one place that answers it. This was written out twice - here and in
 * RunSummary - from `endedAt - startedAt` on the wall clock, so both copies
 * counted the time the player spent in the pause menu. Measured: a run of
 * about seven seconds with a five-second pause in it was recorded and shown
 * as 0:11, and `fastestEscape` is a saved personal best sitting on top of
 * that number. Everything else the game times - a potion, the damage
 * cooldown, the arena's fourteen seconds, the watcher's beam - is a
 * deadline on `runClock`; this is the run itself, and it was the one thing
 * not kept on it.
 */
export const runSeconds = (s: RunState): number =>
  Math.max(0, Math.round((s.endedAt > 0 ? s.endedAt : runClock(s)) - s.startedAt));

/**
 * Fold a finished run into the records. Called from the two places a run
 * can end and nowhere else, so a run is never counted twice.
 */
function rememberRun(s: RunState) {
  if (!s.dungeon) return;
  useRecords.getState().record({
    won: s.phase === "won",
    seed: s.runSeed,
    delver: s.delver,
    carried: s.gems,
    gemsFound: s.gemsTotal,
    floor: s.floor,
    seconds: runSeconds(s),
  });
}

const currentRoom = (s: RunState): Room | undefined =>
  s.dungeon && s.currentRoomId ? roomById(s.dungeon, s.currentRoomId) : undefined;

/**
 * The run.
 *
 * One store. The old tree had six, and the two that both claimed to own the
 * player's stats disagreed about them. Everything a run is - where you are,
 * what you hold, whether you are still alive - is here; everything that is
 * not state (a sound, a prompt, a puzzle) goes over the bus.
 */
export const useRun = create<RunState>()(
  subscribeWithSelector((set, get) => ({
    phase: "menu",
    paused: false,
    dungeon: null,
    floor: 1,
    runSeed: 0,
    roomsSeen: 0,
    currentRoomId: null,
    visited: [],
    lives: STARTING_LIVES,
    maxLives: STARTING_LIVES,
    gems: 0,
    gemsTotal: 0,
    gemRooms: [],
    cleared: [],
    failed: [],
    trials: {},
    relics: [],
    satchel: [],
    identified: [],
    delver: DEFAULT_DELVER,
    appearances: appearancesFor(0),
    charges: chargesFor(0),
    effects: { swift: 0, mire: 0, gloom: 0 },
    noisyUntil: 0,
    wardenLure: null,
    lureUntil: 0,
    lanternRaised: false,
    oil: LANTERN_FULL_S,
    litUntil: 0,
    barredDoor: null,
    barUntil: 0,
    mapped: false,
    looted: [],
    placed: [],
    thiefPhase: "away",
    thiefNextAt: 0,
    thiefHolding: 0,
    nestGems: 0,
    nestRoomId: null,
    nestSeen: false,
    wardRoomId: null,
    wardUntil: 0,
    sealedRoomId: null,
    keys: 0,
    unlocked: [],
    keyTakenIn: null,
    alarm: 0,
    floorRooms: 1,
    wardenRoomId: null,
    wardenCameFrom: null,
    wardenWounds: 0,
    wardenStaggerUntil: 0,
    wardenWary: false,
    floorEnteredAt: 0,
    reaperAwake: false,
    reaperStalledUntil: 0,
    reaperLastStrikeAt: 0,
    freeHitUsed: false,
    wardenMet: false,
    transitioning: false,
    inputLocks: 0,
    lastDamageAt: -Infinity,
    pausedFor: 0,
    pausedAt: 0,
    startedAt: 0,
    endedAt: 0,

    startRun: (seed, delverId) => {
      const floor = 1;
      const rules = floorRules(floor);
      // The one they asked for, the one they last used, or the Vagrant.
      // Falling back rather than throwing because this comes off a saved
      // preference, and a build that renames a delver must not make an old
      // save unable to start a run.
      const delver = delverOr(delverId ?? useRecords.getState().lastDelver);
      const dungeon = generateDungeon({
        seed,
        minRooms: rules.minRooms,
        maxRooms: rules.maxRooms,
      });
      if (transitionFallback) window.clearTimeout(transitionFallback);
      set({
        phase: "playing",
        paused: false,
        dungeon,
        floor,
        runSeed: dungeon.seed,
        roomsSeen: 1,
        currentRoomId: dungeon.startId,
        visited: [dungeon.startId],
        delver: delver.id,
        lives: delver.lives,
        maxLives: delver.lives,
        // Gems in hand at the first door count as found: they are part of
        // what this run got out with, and the summary would otherwise show
        // a Tomb Robber carrying two gems it says were never picked up.
        gems: delver.gems,
        gemsTotal: delver.gems,
        gemRooms: [],
        cleared: [],
        failed: [],
        trials: {},
        relics: [...delver.relics],
        satchel: [...delver.satchel],
        identified: knownFrom(delver),
        appearances: appearancesFor(dungeon.seed),
        charges: chargesFor(dungeon.seed),
        effects: { swift: 0, mire: 0, gloom: 0 },
        noisyUntil: 0,
        // Down. See world.ts: up as a default made every run open already
        // seen, which is the bargain removed rather than offered.
        lanternRaised: false,
        oil: LANTERN_FULL_S,
        litUntil: 0,
        barredDoor: null,
        barUntil: 0,
        mapped: false,
        looted: [],
        placed: [],
        thiefPhase: "away",
        thiefNextAt: 0,
        thiefHolding: 0,
        nestGems: 0,
        // The first floor is where the dungeon is learned, and the thief
        // arrives on the second - but this reads the same rule the descent
        // does rather than hard-coding null, so moving CUTPURSE_FROM_FLOOR
        // moves both ends of it.
        nestRoomId: floor >= CUTPURSE_FROM_FLOOR ? nestRoom(dungeon) : null,
        nestSeen: false,
        wardRoomId: null,
        wardUntil: 0,
        sealedRoomId: null,
        keys: 0,
        unlocked: [],
        keyTakenIn: null,
        alarm: alarmFloorOn(floor, delver.id),
        floorRooms: 1,
        wardenRoomId: null,
        wardenCameFrom: null,
        wardenWounds: 0,
        wardenStaggerUntil: 0,
        wardenWary: false,
        // The floor's patience starts with the run. On the same clock as
        // `startedAt`, and cleared with it.
        floorEnteredAt: performance.now() / 1000,
        reaperAwake: false,
        reaperStalledUntil: 0,
        reaperLastStrikeAt: 0,
        wardenLure: null,
        lureUntil: 0,
        freeHitUsed: false,
        wardenMet: false,
        // The start room has to mount before the player is let go.
        transitioning: true,
        inputLocks: 0,
        lastDamageAt: -Infinity,
        pausedFor: 0,
        pausedAt: 0,
        // `pausedFor` and `pausedAt` are cleared in this same write, so the
        // run clock immediately after it is exactly this.
        startedAt: performance.now() / 1000,
        endedAt: 0,
      });
      const spawn = spawnAtStart();
      bus.emit("teleport", { position: spawn.position, yaw: spawn.yaw });
      bus.emit("lookSet", { yaw: spawn.yaw, pitch: 0 });
      bus.emit("runStarted");
      transitionFallback = window.setTimeout(
        () => get().roomReady(dungeon.startId),
        TRANSITION_FALLBACK_MS
      );
    },

    quitToMenu: () => {
      if (transitionFallback) window.clearTimeout(transitionFallback);
      set({ phase: "menu", paused: false, dungeon: null, currentRoomId: null, transitioning: false, inputLocks: 0 });
    },

    pause: () => {
      if (get().phase !== "playing" || get().paused) return;
      set({ paused: true, pausedAt: performance.now() / 1000 });
    },
    resume: () => {
      const s = get();
      if (!s.paused) return;
      const spent = s.pausedAt > 0 ? performance.now() / 1000 - s.pausedAt : 0;
      set({ paused: false, pausedAt: 0, pausedFor: s.pausedFor + spent });
    },

    travel: (dir) => {
      const s = get();
      const room = currentRoom(s);
      const toId = room?.links[dir];
      if (!s.dungeon || !room || !toId || !canControl(s)) return;
      const to = roomById(s.dungeon, toId);
      if (!to) return;

      /**
       * Walking out through your own bar lifts it.
       *
       * A bar the player can pass and the Warden cannot would otherwise be
       * a door that only opens one way for forty-five seconds, and the
       * play it invites is to stand behind it - which is a hiding place,
       * and hiding places are the one thing this dungeon is built not to
       * have. Lifting it means a bar is spent the moment you use the
       * doorway yourself: it buys you the room you are leaving, not a
       * corridor you can pace.
       */
      if (barredNow(s) === barKey(s.currentRoomId!, toId)) get().breakBar(false);

      const seen = s.visited.includes(toId);
      set({
        transitioning: true,
        currentRoomId: toId,
        visited: seen ? s.visited : [...s.visited, toId],
        roomsSeen: seen ? s.roomsSeen : s.roomsSeen + 1,
        floorRooms: s.floorRooms + 1,
      });
      const spawn = spawnAfterTravel(to, dir);
      bus.emit("teleport", { position: spawn.position, yaw: spawn.yaw });
      bus.emit("lookSet", { yaw: spawn.yaw, pitch: 0 });
      bus.emit("doorOpened", { toRoomId: toId });

      // The destination reports itself mounted; if it never does, hand control
      // back anyway rather than leaving the player frozen.
      if (transitionFallback) window.clearTimeout(transitionFallback);
      transitionFallback = window.setTimeout(
        () => get().roomReady(toId),
        TRANSITION_FALLBACK_MS
      );
    },

    roomReady: (roomId) => {
      const s = get();
      if (roomId !== s.currentRoomId || !s.transitioning) return;
      if (transitionFallback) {
        window.clearTimeout(transitionFallback);
        transitionFallback = null;
      }
      if (s.dungeon && roomId === s.dungeon.endId && s.phase === "playing") {
        if (s.floor >= FLOORS) {
          set({ transitioning: false, phase: "won", endedAt: runClock(s) });
          rememberRun(get());
          bus.emit("runWon");
          return;
        }
        // Down a floor: a fresh dungeon, the same player. The screen is
        // still dark from the door, and stays so until the new start room
        // reports in.
        const floor = s.floor + 1;
        const rules = floorRules(floor);
        const dungeon = generateDungeon({
          seed: (s.dungeon.seed * 7919 + floor) >>> 0,
          minRooms: rules.minRooms,
          maxRooms: rules.maxRooms,
        });
        set({
          floor,
          dungeon,
          currentRoomId: dungeon.startId,
          visited: [dungeon.startId],
          roomsSeen: s.roomsSeen + 1,
          gemRooms: [],
          cleared: [],
          failed: [],
          // Room ids repeat from floor to floor, so a trial half spent on
          // the floor above must not follow its name down.
          trials: {},
          // A new floor is a new Warden, asleep, and a floor nobody has
          // robbed yet - though a deep one is already stirring before you
          // touch anything. Relics, gems and the satchel carry down; what
          // was drunk on the last floor does not.
          effects: { swift: 0, mire: 0, gloom: 0 },
          noisyUntil: 0,
          // The oil goes down with you, like the lives and the gems and
          // unlike the alarm. A lantern refilled at every stair would be a
          // per-floor allowance nobody has to think about; carrying it is
          // what makes a room you chose to light up on floor one cost you
          // something on floor three. Only what the last floor knew about
          // you is left behind.
          litUntil: 0,
          // A plank across a doorway on the floor above is on the floor
          // above, like the key and the lock and the snares.
          barredDoor: null,
          barUntil: 0,
          mapped: false,
          looted: [],
          // A snare set on the floor above is on the floor above. Devices
          // go with the room they were set in, like the key and the lock.
          placed: [],
          // A new floor is a new thief with an empty nest. What it stole
          // on the floor above and you did not go back for is gone, which
          // is the whole price of walking on rather than walking back.
          thiefPhase: "away",
          thiefNextAt: 0,
          thiefHolding: 0,
          nestGems: 0,
          nestRoomId: floor >= CUTPURSE_FROM_FLOOR ? nestRoom(dungeon) : null,
          nestSeen: false,
          wardRoomId: null,
          wardUntil: 0,
          sealedRoomId: null,
          // A key is cut for one floor's lock and is no use on the next.
          keys: 0,
          unlocked: [],
          keyTakenIn: null,
          // The delver's bonus is part of every floor's baseline, not a
          // one-off on the first: a Tomb Robber is remembered by the whole
          // dungeon, and `wardenWounded` and a Scroll of Banishment both
          // clamp the alarm to the floor's baseline, so a bonus that only
          // applied on arrival would be scrubbed off by the first rout.
          alarm: alarmFloorOn(floor, get().delver),
          floorRooms: 1,
          wardenRoomId: null,
          wardenCameFrom: null,
          wardenWounds: 0,
          wardenStaggerUntil: 0,
          wardenWary: false,
          // A new floor is patient again, and whatever was hunting you on
          // the last one stays there. Going down is the way out of it.
          floorEnteredAt: runClock(s),
          reaperAwake: false,
          reaperStalledUntil: 0,
          reaperLastStrikeAt: 0,
          wardenLure: null,
          lureUntil: 0,
          freeHitUsed: false,
          transitioning: true,
        });
        const spawn = spawnAtStart();
        bus.emit("teleport", { position: spawn.position, yaw: spawn.yaw });
        bus.emit("lookSet", { yaw: spawn.yaw, pitch: 0 });
        bus.emit("floorDescended", { floor });
        transitionFallback = window.setTimeout(
          () => get().roomReady(dungeon.startId),
          TRANSITION_FALLBACK_MS
        );
        return;
      }
      set({ transitioning: false });
      bus.emit("roomEntered", { roomId });

      // The Warden wakes once the floor has been walked a little, and wakes
      // as far from the player as the floor allows.
      const after = get();
      if (
        !after.wardenRoomId &&
        after.dungeon &&
        after.floorRooms >= floorRules(after.floor).wardenGrace
      ) {
        const wake = wakingRoom(after.dungeon, roomId);
        if (wake) {
          set({ wardenRoomId: wake, wardenCameFrom: null });
          bus.emit("wardenWoke", { roomId: wake });
        }
      }
    },

    collectGem: (roomId) => {
      const s = get();
      if (s.gemRooms.includes(roomId)) return false;
      // Every gem taken rouses the floor. This is the whole bargain: the
      // reward and the danger come from the same act.
      // The delver's multiplier and the relic's, in that order: a Pilgrim
      // with an Ash Censer is back to an ordinary gem, which is exactly
      // what four gems bought them.
      const alarm =
        s.alarm +
        ALARM_PER_GEM * DELVERS[s.delver].alarmFactor * modifiers(s.relics).alarmPerGem;
      set({
        gems: s.gems + 1,
        gemsTotal: s.gemsTotal + 1,
        gemRooms: [...s.gemRooms, roomId],
        alarm,
      });
      bus.emit("gemCollected", { roomId });
      return true;
    },

    spendGems: (amount) => {
      const s = get();
      if (s.gems < amount) return false;
      set({ gems: s.gems - amount });
      return true;
    },

    damage: () => {
      const s = get();
      if (s.phase !== "playing") return false;
      const now = runClock(s);
      if (now - s.lastDamageAt < DAMAGE_COOLDOWN_S) return false;
      // The charm eats the floor's first hit, and still starts the
      // invulnerability window, so it reads as a hit that did not land.
      if (modifiers(s.relics).freeHitPerFloor && !s.freeHitUsed) {
        set({ freeHitUsed: true, lastDamageAt: now });
        bus.emit("charmSpent");
        return true;
      }
      const lives = Math.max(0, s.lives - 1);
      set({ lives, lastDamageAt: now });
      bus.emit("damaged");
      if (lives === 0) {
        set({ phase: "lost", endedAt: now });
        rememberRun(get());
        bus.emit("runLost");
      }
      return true;
    },

    gainLife: () => {
      const s = get();
      if (s.lives >= s.maxLives) return false;
      set({ lives: s.lives + 1 });
      bus.emit("lifeBought");
      return true;
    },

    addRelic: (id) => {
      const s = get();
      if (s.relics.includes(id)) return;
      set({ relics: [...s.relics, id] });
      bus.emit("relicTaken", { id });
    },

    takeItem: (id, from) => {
      const s = get();
      if (s.satchel.length >= satchelSlots(s)) {
        bus.emit("notice", "Your satchel is full. Use something first.");
        return false;
      }
      set({
        satchel: [...s.satchel, id],
        looted: from && !s.looted.includes(from) ? [...s.looted, from] : s.looted,
      });
      bus.emit("itemTaken", { id });
      return true;
    },

    useItem: (slot) => {
      const s = get();
      const id = s.satchel[slot];
      // `canControl`, not a hand-rolled copy of it. This spelled out three
      // of that predicate's four terms and left out `transitioning`, and
      // that is the term this one needed most: a satchel key is live while
      // the screen is black between rooms, and a potion drunk in that
      // window starts its clock on a player who cannot move. Walking into
      // the exit is the worst of it - the descent wipes `effects` a beat
      // later, so a Potion of Swiftness read at the door is spent, gone
      // from the satchel, and worth nothing at all. Measured: swift set to
      // 30.7, floor 2 reached, swift 0, satchel empty.
      if (!id || !canControl(s)) return;
      // Checked before the scroll is spent, not after: throwing a noise
      // down a floor with nothing awake on it would consume the one card
      // that buys a window, and the player could not have known.
      if (id === "echoes" && !s.wardenRoomId) {
        bus.emit("notice", "You could throw it, but nothing down here is listening yet.");
        return;
      }
      // The same guard, for the scroll that promises the same thing twice
      // over. Banishment throws the Warden and calms the floor; on a floor
      // whose Warden has not woken and whose alarm is still its own
      // baseline it does neither, and it was being spent for it - the
      // strongest card in the deck, gone with nothing said. The calm is a
      // real reason to read it early, so this refuses only when both
      // halves are no-ops.
      if (id === "banish" && !s.wardenRoomId && s.alarm <= alarmFloorFor(s)) {
        bus.emit("notice", "Nothing walks this floor yet, and it is already as quiet as it gets.");
        return;
      }
      const now = runClock(s);
      /**
       * What this dungeon has done to this kind of thing.
       *
       * Every number below reads it. Where more is better - how long a
       * potion runs, how far a scroll throws - `scaled` does the work;
       * where more is worse - how much a bad potion rouses the floor -
       * the call site says so itself with `inverted`, because a helper
       * that silently flips its own sign is one that gets used the wrong
       * way round exactly once.
       */
      const charge = s.charges[id];
      const until = (seconds: number) => now + scaled(seconds, charge);

      // A device is not drunk or read: it goes on the floor where the
      // player is standing, and it is still there when they come back.
      if (isDevice(id)) {
        get().placeDevice(slot);
        return;
      }

      // Whatever it does, it is spent and it is now known.
      set({
        satchel: s.satchel.filter((_, i) => i !== slot),
        identified: s.identified.includes(id) ? s.identified : [...s.identified, id],
      });

      switch (id) {
        case "healing":
          get().gainLife();
          // Blessed, it is worth two - if there is room for two. Cursed,
          // it heals and the floor hears you retching, which is the shape
          // every cursed thing here takes: it still does its job, and it
          // costs you something on the way.
          if (charge === "blessed") get().gainLife();
          if (charge === "cursed") get().raiseAlarm(1);
          break;
        case "swiftness":
          set({ effects: { ...get().effects, swift: until(SWIFTNESS_S), mire: 0 } });
          break;
        case "mire":
          // Cruel already, so the charge runs the other way: blessed means
          // a shorter mire, cursed a longer one.
          set({
            effects: {
              ...get().effects,
              mire: now + inverted(MIRE_S, charge),
              swift: 0,
            },
          });
          break;
        case "gloom":
          set({ effects: { ...get().effects, gloom: now + inverted(GLOOM_S, charge) } });
          break;
        case "mapping":
          set({ mapped: true });
          // A cursed map is a map, and then the dark. It still did what it
          // said on the label, which is the rule for every cursed thing
          // here: the trap is the price, never the promise.
          if (charge === "cursed") set({ effects: { ...get().effects, gloom: now + GLOOM_S * 0.5 } });
          break;
        case "echoes": {
          // Thrown as far as the floor goes: the room the Warden would have
          // woken in, which is the one farthest from where the player is
          // standing.
          const after = get();
          const to =
            after.dungeon && after.currentRoomId
              ? wakingRoom(after.dungeon, after.currentRoomId)
              : null;
          if (to) {
            set({ wardenLure: to, lureUntil: until(ECHOES_S) });
            bus.emit("wardenLured", { roomId: to });
          }
          break;
        }
        case "dread":
          // It says on the label that the Warden knows where you are, so a
          // noise it was off chasing stops mattering.
          get().giveAway(inverted(DREAD_ALARM, charge));
          break;
        case "avarice": {
          // Both halves move, in opposite directions: blessed is more gems
          // for less noise, cursed is fewer for more. It is the one item
          // where the charge changes what the trade is rather than how
          // much of it there is.
          const gems = charge === "blessed" ? AVARICE_GEMS + 1 : charge === "cursed" ? 1 : AVARICE_GEMS;
          set({ gems: get().gems + gems, gemsTotal: get().gemsTotal + gems });
          get().raiseAlarm(inverted(AVARICE_ALARM, charge));
          break;
        }
        case "banish": {
          const after = get();
          if (after.dungeon && after.currentRoomId && after.wardenRoomId) {
            const away = banishTo(after.dungeon, after.currentRoomId, WARDEN_BANISH_DISTANCE);
            // Thrown across the floor, it is no longer walking to anything.
            if (away) set({ wardenRoomId: away, wardenCameFrom: null, wardenLure: null, lureUntil: 0 });
          }
          // Never below what the floor itself starts at. A floor's baseline
          // is its character, not just its opening value: letting a scroll
          // take the bottom floor to "Still" made it calmer than the first
          // one, which is the opposite of what the descent claims.
          set({
            alarm: Math.max(alarmFloorFor(after), get().alarm - scaled(BANISH_CALM, charge)),
          });
          break;
        }
      }
      bus.emit("itemUsed", { id, cruel: ITEMS[id].cruel });
    },

    placeDevice: (slot) => {
      const s = get();
      const id = s.satchel[slot];
      if (!id || !(isDevice(id) || isBomb(id)) || !s.currentRoomId || !canControl(s)) return false;
      const now = runClock(s);
      const roomId = s.currentRoomId;
      const key = `${roomId}:${id}:${s.placed.length}:${Math.round(now * 100)}`;
      // Where the player is standing, from the one place that knows.
      const at = { x: playerAt.x, z: playerAt.z };

      set({
        satchel: s.satchel.filter((_, i) => i !== slot),
        identified: s.identified.includes(id) ? s.identified : [...s.identified, id],
        placed: [
          ...s.placed,
          // A knot of iron is spent the moment it lands; the other two are
          // live until something walks into them or their time runs out.
          // It stays on the floor either way, because a player who cannot
          // see where they dropped the loud thing cannot learn to avoid
          // dropping it there.
          {
            key,
            id,
            roomId,
            x: at.x,
            z: at.z,
            live: id !== "rattle",
            ...(isBomb(id) ? { fuseAt: now + BOMB_FUSE_S } : {}),
          },
        ],
      });

      const charge = s.charges[id];
      switch (id) {
        case "rattle":
          get().giveAway(inverted(RATTLE_ALARM, charge));
          break;
        case "wardstone": {
          set({ wardRoomId: roomId, wardUntil: now + scaled(WARD_S, charge) });
          // "It will not come into this room" has to be true of a Warden
          // already standing in it, or the one moment worth spending the
          // stone on is the one moment it does nothing.
          const after = get();
          if (after.wardenRoomId === roomId && after.dungeon) {
            const here = roomById(after.dungeon, roomId);
            const out = here
              ? Object.values(here.links).filter((to): to is string => Boolean(to))
              : [];
            if (out.length) {
              set({ wardenRoomId: out[0], wardenCameFrom: null, wardenLure: null, lureUntil: 0 });
            }
          }
          break;
        }
        case "snare":
          break;
        case "bomb":
          bus.emit("notice", "The fuse is lit.");
          break;
      }
      bus.emit("devicePlaced", { id, cruel: ITEMS[id].cruel });
      bus.emit("itemUsed", { id, cruel: ITEMS[id].cruel });
      return true;
    },

    springSnare: (key) => {
      const s = get();
      const device = s.placed.find((d) => d.key === key);
      if (!device || !device.live) return;
      set({ placed: s.placed.map((d) => (d.key === key ? { ...d, live: false } : d)) });
      // Through the same door the floor's own spikes use, so the wound, the
      // count towards a rout and the reeling all stay in one place - and a
      // snare cannot be a second, quietly different way of hurting it.
      // The charge of the kind that was set, read now rather than stored
      // on the device: the shop can lift a kind after a snare is already
      // on the floor, and the wire in the ground is the same wire.
      get().wardenWounded(scaled(SNARE_HOLD_S, s.charges.snare));
    },

    thiefArrives: () => {
      const s = get();
      if (s.thiefPhase !== "away" || !s.currentRoomId) return false;
      if (s.floor < CUTPURSE_FROM_FLOOR) return false;
      // Nothing to take is nothing to come for. It is a thief, not a
      // threat: turning up empty-handed to be chased would be all of the
      // interruption and none of the decision.
      if (s.gems < 1) return false;
      if (runClock(s) < s.thiefNextAt) return false;
      if (s.floorRooms < CUTPURSE_GRACE_ROOMS) return false;
      // A ward stone keeps everything out, not only the Warden. It is a
      // circle drawn on the floor of a room, and a rule that reads "the
      // Warden will not come in here, but" is a rule nobody remembers.
      if (wardNow(s) === s.currentRoomId) return false;
      set({ thiefPhase: "stalking" });
      bus.emit("thiefCame", { roomId: s.currentRoomId });
      return true;
    },

    thiefSteals: () => {
      const s = get();
      if (s.thiefPhase !== "stalking") return false;
      if (s.gems < 1) {
        // It got to you and there was nothing left. It leaves rather than
        // circling: a thief with nothing to steal is not a chase.
        set({ thiefPhase: "fleeing", thiefHolding: 0 });
        return false;
      }
      set({ gems: s.gems - 1, thiefHolding: s.thiefHolding + 1, thiefPhase: "fleeing" });
      bus.emit("thiefTook", { gems: 1 });
      return true;
    },

    thiefEscapes: () => {
      const s = get();
      if (s.thiefPhase === "away") return;
      const held = s.thiefHolding;
      set({
        thiefPhase: "away",
        thiefHolding: 0,
        nestGems: s.nestGems + held,
        thiefNextAt: runClock(s) + CUTPURSE_REST_S,
        // The nest goes on the map the moment it costs you something. A
        // theft you cannot answer is a punishment; a theft with an address
        // is a decision about how much further you are willing to walk.
        nestSeen: s.nestSeen || held > 0,
      });
      if (held > 0) bus.emit("thiefFled", { gems: held, roomId: s.nestRoomId });
    },

    thiefCaught: () => {
      const s = get();
      if (s.thiefPhase === "away") return;
      const held = s.thiefHolding;
      set({
        thiefPhase: "away",
        thiefHolding: 0,
        gems: s.gems + held,
        thiefNextAt: runClock(s) + CUTPURSE_SHY_S,
      });
      bus.emit("thiefCaught", { gems: held });
    },

    emptyNest: () => {
      const s = get();
      if (s.nestGems < 1) return false;
      set({ gems: s.gems + s.nestGems, nestGems: 0 });
      bus.emit("nestEmptied", { gems: s.nestGems });
      return true;
    },

    blessSlot: (slot) => {
      const s = get();
      const id = s.satchel[slot];
      if (!id || s.charges[id] === "blessed") return false;
      set({ charges: { ...s.charges, [id]: lifted(s.charges[id]) } });
      bus.emit("itemBlessed", { id, charge: get().charges[id] });
      return true;
    },

    identifySlot: (slot) => {
      const s = get();
      const id = s.satchel[slot];
      if (!id || s.identified.includes(id)) return false;
      set({ identified: [...s.identified, id] });
      bus.emit("itemNamed", { id });
      return true;
    },

    /**
     * The shrine.
     *
     * A floor holds between 1.2 and 2.3 times what its exit charges, so a
     * player who takes what is lying about arrives at the door with gems
     * left over and nothing to do with them but bank the score. This is
     * the something: a gem buys the floor's attention back.
     *
     * It never takes the floor below the baseline it arrived at, for the
     * reason the Scroll of Banishment does not either - a floor's opening
     * alarm is its character, and the third floor must not be made calmer
     * than the first by kneeling twice. Once per shrine, and the shrine is
     * a once-per-run room, so this is one gem's worth of quiet a floor.
     */
    kneelAtShrine: (roomId) => {
      const s = get();
      if (!canControl(s) || s.cleared.includes(roomId)) return false;
      // `alarmFloorFor`, not `floorRules(...).startingAlarm`: the delver's
      // own bonus is part of the floor this run cannot go below, and the
      // shrine is the third place that clamps to it.
      const floor = alarmFloorFor(s);
      if (s.gems < 1 || s.alarm <= floor) return false;
      set({
        gems: s.gems - 1,
        alarm: floor,
        cleared: [...s.cleared, roomId],
        // Being forgotten means being forgotten: a noise it was walking
        // towards is no longer worth walking towards.
        wardenLure: null,
        lureUntil: 0,
      });
      bus.emit("shrineKept", { roomId });
      return true;
    },

    sealRoom: (roomId) => set({ sealedRoomId: roomId }),

    raiseAlarm: (amount) => {
      set({ alarm: get().alarm + amount });
    },

    giveAway: (amount) => {
      set({ wardenLure: null, lureUntil: 0 });
      get().raiseAlarm(amount);
    },

    makeNoise: () => {
      const s = get();
      const until = runClock(s) + noiseHoldFor(s);
      // Called from the frame loop while a sprint is held, so it must be
      // cheap and must not write on every frame: every write re-runs every
      // selector in the store. The deadline is seconds long, so refreshing
      // it twice a second costs at most half a second of accuracy on when
      // the Warden stops listening and nothing anyone can see.
      if (until - s.noisyUntil < 0.5) return;
      const heard = wardenHears(s);
      set({ noisyUntil: until });
      if (!heard) bus.emit("wardenHeard");
    },

    toggleLantern: () => {
      const s = get();
      if (!s.lanternRaised && s.oil <= 0) {
        bus.emit("notice", "The lantern is dry. There is fire in the braziers.");
        return;
      }
      const raised = !s.lanternRaised;
      // Seen from the moment it goes up, and for a few seconds after it
      // comes down. Raising used to leave this to `burnOil`, which flushes
      // about once a second - so for that second the brightest thing on
      // the floor was invisible to the thing hunting by light, and a check
      // that raised the lantern and looked immediately saw nothing happen.
      set({ lanternRaised: raised, litUntil: runClock(s) + LANTERN_SEEN_HOLD_S });
      bus.emit("lanternToggled", { raised });
    },

    burnOil: (seconds) => {
      const s = get();
      if (!s.lanternRaised || s.oil <= 0) return;
      const oil = Math.max(0, s.oil - seconds);
      const now = runClock(s);
      if (oil <= 0) {
        // It goes out on its own, and says so: a light that simply stopped
        // reaching would read as the floor getting darker.
        set({ oil: 0, lanternRaised: false, litUntil: now + LANTERN_SEEN_HOLD_S });
        bus.emit("lanternOut");
        return;
      }
      set({ oil, litUntil: now + LANTERN_SEEN_HOLD_S });
    },

    fillLantern: () => {
      const s = get();
      if (s.oil >= LANTERN_FULL_S) return false;
      set({ oil: LANTERN_FULL_S });
      bus.emit("lanternFilled");
      return true;
    },

    barDoor: (toRoomId) => {
      const s = get();
      if (!s.currentRoomId || !s.dungeon || !canControl(s)) return false;
      const here = roomById(s.dungeon, s.currentRoomId);
      if (!here || !Object.values(here.links).includes(toRoomId)) return false;
      const key = barKey(s.currentRoomId, toRoomId);
      if (key === barredNow(s)) return false;
      const now = runClock(s);
      set({
        barredDoor: key,
        barUntil: now + BAR_S,
        // Hammering is the loudest thing in the game, and it is made
        // standing still. What the bar buys is distance; what it spends is
        // any doubt about where you were when you made it.
        noisyUntil: Math.max(s.noisyUntil, now + BAR_NOISE_S),
      });
      bus.emit("doorBarred", { roomId: s.currentRoomId, toRoomId });
      return true;
    },

    breakBar: (byWarden = true) => {
      const s = get();
      if (!s.barredDoor) return;
      set({ barredDoor: null, barUntil: 0 });
      bus.emit("barBroken", { byWarden });
    },

    takeKey: (roomId) => {
      const s = get();
      if (s.keyTakenIn !== null) return;
      set({ keys: s.keys + 1, keyTakenIn: roomId });
      bus.emit("keyTaken");
    },

    unlockRoom: (roomId) => {
      const s = get();
      if (s.keys < 1 || s.unlocked.includes(roomId)) return false;
      set({ keys: s.keys - 1, unlocked: [...s.unlocked, roomId] });
      bus.emit("vaultOpened", { roomId });
      return true;
    },

    moveWarden: (roomId) => {
      const s = get();
      if (!s.wardenRoomId || s.wardenRoomId === roomId) return;
      set({ wardenRoomId: roomId, wardenCameFrom: s.wardenRoomId });
      // It got to the noise and found nothing, so the noise is over. Left
      // set, the lure came back the moment it stepped away again and it
      // walked in circles around an empty room until the timer ran out.
      if (roomId === s.wardenLure) set({ wardenLure: null, lureUntil: 0 });
      if (roomId === s.currentRoomId) {
        if (!s.wardenMet) set({ wardenMet: true });
        bus.emit("wardenEntered", { roomId });
      }
    },

    wardenStrike: () => {
      const s = get();
      if (!s.dungeon || !s.currentRoomId) return;
      // The hit goes through the ordinary damage path, so the charm, the
      // cooldown and the death check all stay in one place.
      if (!get().damage()) return;
      const away = banishTo(s.dungeon, s.currentRoomId, WARDEN_BANISH_DISTANCE);
      if (away) set({ wardenRoomId: away, wardenCameFrom: null, wardenLure: null, lureUntil: 0 });
      bus.emit("wardenStruck");
    },

    wakeReaper: () => {
      const s = get();
      if (s.reaperAwake || s.phase !== "playing") return;
      set({ reaperAwake: true });
      bus.emit("reaperWoke");
      bus.emit("notice", "The floor has had enough of you. The exit, now.");
    },

    reaperStrike: () => {
      const s = get();
      if (!s.reaperAwake) return;
      const now = runClock(s);
      if (now - s.reaperLastStrikeAt < REAPER_STRIKE_GRACE_S) return;
      // The ordinary damage path, as the Warden's strike is: the charm,
      // the cooldown and the death check stay in one place.
      if (!get().damage()) return;
      set({ reaperLastStrikeAt: now });
      bus.emit("reaperStruck");
    },

    stallReaper: () => {
      const s = get();
      if (!s.reaperAwake) return;
      set({ reaperStalledUntil: runClock(s) + REAPER_STALL_S });
      bus.emit("reaperStalled");
    },

    wardenWounded: (hold = WARDEN_STAGGER_S) => {
      const s = get();
      if (!s.wardenRoomId || !s.dungeon || !s.currentRoomId) return;
      const now = runClock(s);
      // One wound per stagger. Without this the patch it is standing in
      // charges it again every frame it reels there, and two wounds - the
      // whole cost of a rout - are spent in a third of a second by a
      // player who did nothing but stand still.
      if (now < s.wardenStaggerUntil) return;

      const wounds = s.wardenWounds + 1;
      if (wounds < WARDEN_WOUNDS_TO_ROUT) {
        set({ wardenWounds: wounds, wardenStaggerUntil: now + hold });
        bus.emit("wardenWounded", { wounds });
        return;
      }

      // Routed: thrown across the floor, the count reset, and from here on
      // it knows better.
      bus.emit("wardenWounded", { wounds });
      get().routWarden();
    },

    routWarden: () => {
      const s = get();
      if (!s.wardenRoomId || !s.dungeon || !s.currentRoomId) return;
      // The floor calms, but never below its own baseline - the bottom
      // floor is the bottom floor however well you fought on it.
      const away = banishTo(s.dungeon, s.currentRoomId, WARDEN_BANISH_DISTANCE);
      set({
        wardenWounds: 0,
        wardenWary: true,
        wardenStaggerUntil: 0,
        wardenRoomId: away ?? s.wardenRoomId,
        wardenCameFrom: null,
        wardenLure: null,
        lureUntil: 0,
        alarm: Math.max(alarmFloorFor(s), s.alarm - WARDEN_ROUT_CALM),
      });
      bus.emit("wardenRouted");
    },

    detonate: (key) => {
      const s = get();
      const bomb = s.placed.find((d) => d.key === key && d.live && isBomb(d.id));
      if (!bomb || !s.dungeon) return;
      // Spent first, so nothing below can go off twice.
      set({ placed: s.placed.filter((d) => d.key !== key) });
      const { roomId, x, z } = bomb;
      const inBlast = (px: number, pz: number) => (px - x) ** 2 + (pz - z) ** 2 <= BOMB_RADIUS * BOMB_RADIUS;
      bus.emit("bombBurst", { roomId, x, z });
      // The player, if they did not walk.
      if (s.currentRoomId === roomId && inBlast(playerAt.x, playerAt.z)) get().damage();
      // The Warden, if it is in the room - whether or not the player is.
      // A bomb left behind in a room the Warden later walks into is a
      // trap, and a trap that only works while you stand in it is a dud.
      if (get().wardenRoomId === roomId) get().routWarden();
      // The Reaper, which is always in the room the player is in: a blast
      // there is the one thing on the floor that holds it.
      if (get().reaperAwake && get().currentRoomId === roomId) get().stallReaper();
      // The thief, likewise: it drops what it holds. It is only ever in the
      // room the player is in - it comes for them and runs from them - so
      // "in this room" is "the player is".
      if (get().currentRoomId === roomId && get().thiefPhase !== "away") get().thiefCaught();
      // The wall, if this room has a crack in one and the blast reached it.
      const host = roomById(s.dungeon, roomId);
      if (host?.secret) {
        const half = host.size / 2;
        const step = DIR_STEP[host.secret.dir];
        const wx = step.x * half;
        const wz = step.z * half;
        if (inBlast(wx, wz)) get().revealSecret(roomId);
      }
    },

    revealSecret: (hostId) => {
      const s = get();
      if (!s.dungeon) return;
      const host = roomById(s.dungeon, hostId);
      if (!host?.secret || host.links[host.secret.dir]) return;
      const { dir, to } = host.secret;
      // New room objects, not mutated ones: the walls and the map are
      // rendered from these and have to see the change.
      const rooms = s.dungeon.rooms.map((r) => {
        if (r.id === hostId) return { ...r, links: { ...r.links, [dir]: to } };
        if (r.id === to) return { ...r, links: { ...r.links, [OPPOSITE[dir]]: hostId } };
        return r;
      });
      set({ dungeon: { ...s.dungeon, rooms } });
      bus.emit("secretRevealed", { roomId: hostId, to });
      bus.emit("notice", "The wall gives. There is a room behind it.");
    },

    clearRoom: (roomId) => {
      const s = get();
      if (!s.cleared.includes(roomId)) set({ cleared: [...s.cleared, roomId] });
    },
    failRoom: (roomId) => {
      const s = get();
      if (!s.failed.includes(roomId)) set({ failed: [...s.failed, roomId] });
    },

    trialMiss: (roomId) => {
      const at = get().trials[roomId] ?? { attempts: 0, misses: 0 };
      const next = { attempts: at.attempts, misses: at.misses + 1 };
      set((s) => ({ trials: { ...s.trials, [roomId]: next } }));
      return next.misses;
    },
    trialAttempt: (roomId) => {
      const at = get().trials[roomId] ?? { attempts: 0, misses: 0 };
      const next = { attempts: at.attempts + 1, misses: 0 };
      set((s) => ({ trials: { ...s.trials, [roomId]: next } }));
      return next.attempts;
    },

    lockInput: () => set((s) => ({ inputLocks: s.inputLocks + 1 })),
    unlockInput: () => set((s) => ({ inputLocks: Math.max(0, s.inputLocks - 1) })),
  }))
);

/**
 * The run's own clock, in seconds: wall time less whatever was spent in the
 * pause menu. Everything timed measures against this, so pausing does not
 * quietly spend a potion.
 */
export const runClock = (s: RunState): number =>
  performance.now() / 1000 - s.pausedFor - (s.paused && s.pausedAt > 0 ? performance.now() / 1000 - s.pausedAt : 0);

/** True while a timed effect is still running. */
const running = (s: RunState, until: number): boolean => until > runClock(s);

/** Seconds of patience the floor has left for the player, on the run's clock. */
export const patienceLeft = (s: RunState): number =>
  FLOOR_PATIENCE_S - (runClock(s) - s.floorEnteredAt);

/** True while a blast is holding the Reaper where it stands. */
export const reaperStalled = (s: RunState): boolean =>
  s.reaperAwake && running(s, s.reaperStalledUntil);

/** Which timed potion is running, if either. */
export const paceEffect = (s: RunState): PaceEffect =>
  running(s, s.effects.swift) ? "swift" : running(s, s.effects.mire) ? "mire" : "none";

/**
 * How fast the player moves right now: their relics, then whatever they
 * last drank. One owner for the answer, so the player, the HUD and anything
 * else that cares cannot disagree about it.
 *
 * The arithmetic itself lives in pace.ts, with the Warden's side of it, so
 * that the promise the two of them make together - a sprint always gets
 * away, a walk does not - can be checked over the whole matrix of relics,
 * potions and alarm levels rather than trusted.
 */
export const speedNow = (s: RunState): Pace => paceFor(s.relics, paceEffect(s));

/**
 * The room the Warden is currently walking to instead of the player's, or
 * null. It stops caring when the sound goes cold or when it gets there and
 * finds nothing.
 */
export function lureNow(s: RunState): string | null {
  if (!s.wardenLure || !running(s, s.lureUntil)) return null;
  return s.wardenRoomId === s.wardenLure ? null : s.wardenLure;
}

/**
 * Whether the Warden currently knows where the player is by sound. A gem
 * taken rouses the floor for good; a sprint only gives you away while it
 * lasts, which is what makes the two different costs.
 */
/**
 * The room the player is standing in, or undefined between floors.
 *
 * Asked here rather than through `useCurrentRoom`, which is a hook: the
 * store has to answer this from inside `makeNoise`, on the frame loop.
 */
const roomNow = (s: RunState): Room | undefined =>
  s.dungeon && s.currentRoomId ? roomById(s.dungeon, s.currentRoomId) : undefined;

/**
 * How long a sprint keeps the Warden coming, in this room.
 *
 * `NOISE_HOLD_S` is the bare-stone figure; the biome scales it. Standing
 * water throws a footfall down every corridor and moss swallows it, so
 * the same dash is a seven-second confession in one room and a
 * two-second one in another. Between floors, where there is no room to
 * stand in, it is the bare figure - a noise made through a black screen
 * is one the game should not be inventing a floor for.
 */
export const noiseHoldFor = (s: RunState): number => {
  const room = roomNow(s);
  if (!room || !s.dungeon) return NOISE_HOLD_S;
  return NOISE_HOLD_S * biomeFor(room.kind, room.id, s.dungeon.seed).carry;
};

export const wardenHears = (s: RunState): boolean => running(s, s.noisyUntil);

/** Whether the lantern is up and still has oil in it. */
export const lanternLit = (s: RunState): boolean => s.lanternRaised && s.oil > 0;

/**
 * Whether the Warden is currently walking to a light it can see. The exact
 * twin of `wardenHears`, and for the same reason: the two bargains this
 * game makes with the player - fast or unnoticed, seeing or unseen - are
 * the same shape and are kept the same way.
 */
export const wardenSeesLight = (s: RunState): boolean => running(s, s.litUntil);

/**
 * Whether it knows where the player is at all, by either sense.
 *
 * One owner. The driver, the HUD and the tuning all used to ask
 * `wardenHears`, and adding a second way of being given away without this
 * would have meant three places each deciding for themselves whether
 * light counts - which is exactly the class of bug the rebuild was for.
 */
export const wardenSenses = (s: RunState): boolean => wardenHears(s) || wardenSeesLight(s);

/**
 * Whether the Warden is still reeling from the spikes. While it is, it
 * neither walks nor strikes nor steps between rooms - which is the window
 * the player bought, and the only thing in the game that stops it.
 */
export const wardenStaggered = (s: RunState): boolean => running(s, s.wardenStaggerUntil);

/**
 * The room a ward stone is still holding, or null. Read by the Warden's
 * driver, which will not step into it, and by the HUD, which says so.
 */
export const wardNow = (s: RunState): string | null =>
  s.wardRoomId && running(s, s.wardUntil) ? s.wardRoomId : null;

/**
 * The snares still set in a room. Takes the list rather than the whole
 * run, so a component can subscribe to just that slice of the store and
 * not re-render on every gem.
 */
export const snaresIn = (placed: readonly PlacedDevice[], roomId: string): PlacedDevice[] =>
  placed.filter((d) => d.live && d.id === "snare" && d.roomId === roomId);

/**
 * The lowest this floor's alarm can be brought, for this delver.
 *
 * Two places calm the floor - a Scroll of Banishment and a rout - and both
 * clamp to a baseline. That baseline was `floorRules(floor).startingAlarm`
 * written out twice, which was right until a delver could add to it: a
 * Tomb Robber's floor starts at 2 and either of those would have taken it
 * to 1, quietly making the run easier than the character it chose.
 */
export const alarmFloorOn = (floor: number, delver: DelverId): number =>
  floorRules(floor).startingAlarm + DELVERS[delver].alarmBonus;

/** The same question asked of the run as it stands. */
export const alarmFloorFor = (s: RunState): number => alarmFloorOn(s.floor, s.delver);

/**
 * The doorway currently barred, or null. A bar is a deadline like every
 * other timed thing in the run, so whether one is standing is asked here
 * rather than remembered anywhere else.
 */
export const barredNow = (s: RunState): string | null =>
  s.barredDoor && running(s, s.barUntil) ? s.barredDoor : null;

/** The bars the Warden's pathing has to work around: none, or the one. */
export const barsNow = (s: RunState): Set<string> => {
  const bar = barredNow(s);
  return bar ? new Set([bar]) : EMPTY_BARS;
};

/**
 * One empty set rather than a fresh one per call. This is read from the
 * frame loop, and a new Set every frame is garbage the collector has to
 * come back for - which on this project is not a theoretical cost: a
 * forced collection mid-sprint is one of the things `yarn test:perf`
 * measures, and the Warden's own step cap exists because of what a long
 * frame does to it.
 */
const EMPTY_BARS: Set<string> = new Set();

/** Whether a Scroll of Gloom is still blacking out the map. */
export const mapIsDark = (s: RunState): boolean => running(s, s.effects.gloom);

/**
 * What the exit charges on this floor, after relics. Never below one.
 *
 * Not after the delver: a delver was going to be able to raise this, and
 * the economy check found in one run that the floors do not hold a gem of
 * slack to spend on it. What a delver changes is the alarm, which does.
 */
export const tollNow = (s: RunState): number =>
  Math.max(1, tollForFloor(s.floor) - modifiers(s.relics).tollDiscount);

/**
 * How many slots this run's satchel has. Four for everyone but the
 * Courier, who trades two of them for the boots.
 */
export const satchelSlots = (s: RunState): number => DELVERS[s.delver].slots;

/** Gems held over what the exit will cost: what the run is actually earning. */
export const spareGems = (s: RunState): number => Math.max(0, s.gems - tollNow(s));

/**
 * Whether something on sale can be bought without stranding the player.
 *
 * The shop is the only place gems are spent on anything but the exit, and
 * the exit is the only thing a player must be able to afford: a floor can
 * hold as few as one gem more than its toll, so a single purchase can leave
 * a run unable to leave the floor by any route it is guaranteed to have.
 *
 * The rule existed and was applied to one of the three things the shop
 * sells. Buying a life asked; asking the shopkeeper what a potion is, and
 * buying a relic for several gems, did not.
 */
export const canSpend = (s: RunState, price: number): boolean =>
  s.gems >= price && s.gems - price >= tollNow(s);

export const useCurrentRoom = (): Room | undefined => useRun(roomNow);

// Dev-only handle for the smoke test and the console. The derived numbers
// go with it: a test that reads the toll off the HUD is really testing
// React's render timing.
if (import.meta.env.DEV && typeof window !== "undefined") {
  const w = window as unknown as Record<string, unknown>;
  // Built first, published last, and only by the copy of this module that
  // gets here first.
  //
  // A dev server can serve this file twice - the app's copy carrying an
  // HMR query, a bare `import("/src/game/state/run.ts")` from a test not -
  // and the second copy's store is one nothing renders from. Assigning
  // over the handle pointed every later write at that store: the screen
  // froze on its last painted frame while the run went on being played
  // where nobody could see it, and forty checks failed for reasons that
  // were not their own. The app's copy loads first, and it keeps them.
  const derived = {
    toll: () => tollNow(useRun.getState()),
    spare: () => spareGems(useRun.getState()),
    walk: () => speedNow(useRun.getState()).walk,
    slots: () => satchelSlots(useRun.getState()),
    rules: () => floorRules(useRun.getState().floor),
    // The floor's own lowest alarm, delver bonus included - `rules()`
    // alone is half the fact, and a probe that reads half of it agrees
    // with the game only for the delver whose bonus is zero.
    alarmFloor: () => alarmFloorFor(useRun.getState()),
    // Asked here rather than imported by a test: a bare import of this
    // module from the page is a second copy of it.
    canSpend: (price: number) => canSpend(useRun.getState(), price),
    hears: () => wardenHears(useRun.getState()),
    // Where to stand to set a bomb against this room's cracked wall: at
    // arm's length from the middle of that wall, inside the room.
    crackSpot: () => {
      const s = useRun.getState();
      const room = roomNow(s);
      if (!room?.secret) return null;
      const half = room.size / 2;
      const step = DIR_STEP[room.secret.dir];
      return [step.x * (half - CLOSE_REACH * 0.7), 0, step.z * (half - CLOSE_REACH * 0.7)];
    },
    bombs: () => useRun.getState().placed.filter((d) => isBomb(d.id)),
    // How long the floor will put up with the player, and what woke when it
    // stopped. On the run's clock, like every deadline in here.
    patienceLeft: () => patienceLeft(useRun.getState()),
    reaper: () => {
      const s = useRun.getState();
      return { awake: s.reaperAwake, stalled: reaperStalled(s), enteredAt: s.floorEnteredAt };
    },
    // How long a sprint in this room keeps the Warden coming.
    noiseHold: () => noiseHoldFor(useRun.getState()),
    // The run's own clock, which every deadline in the store is kept on.
    // A probe that reads a deadline needs the clock it was set against;
    // `performance.now()` is not it once the pause menu has been opened.
    clock: () => runClock(useRun.getState()),
    bars: () => barsNow(useRun.getState()),
    lantern: () => {
      const s = useRun.getState();
      return { raised: s.lanternRaised, lit: lanternLit(s), oil: s.oil, seen: wardenSeesLight(s) };
    },
    lure: () => lureNow(useRun.getState()),
    items: () => ITEM_IDS.slice(),
    charges: () => ({ ...useRun.getState().charges }),
    warden: () => {
      const s = useRun.getState();
      return {
        room: s.wardenRoomId,
        wounds: s.wardenWounds,
        wary: s.wardenWary,
        staggered: wardenStaggered(s),
        alarm: s.alarm,
      };
    },
    thief: () => {
      const s = useRun.getState();
      return {
        phase: s.thiefPhase,
        holding: s.thiefHolding,
        nest: s.nestRoomId,
        nestGems: s.nestGems,
        nestSeen: s.nestSeen,
        nextIn: Math.max(0, s.thiefNextAt - runClock(s)),
      };
    },
    hunts: () => {
      const s = useRun.getState();
      return behaviourFor(s.alarm, !lureNow(s) && wardenSenses(s)).hunts;
    },
  };
  if (w.__run) {
    console.warn("[run] a second copy of the run store loaded; the first keeps __run");
  } else {
    w.__run = useRun;
    w.__derived = derived;
  }
}
