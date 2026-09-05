import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

import { bus } from "../events";
import { generateDungeon } from "../dungeon/generate";
import { spawnAfterTravel, spawnAtStart } from "../dungeon/layout";
import { roomById, type Dir, type Dungeon, type Room } from "../dungeon/types";
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
  SATCHEL_SLOTS,
  SWIFTNESS_S,
  appearancesFor,
  type Appearances,
  type ItemId,
} from "../items/catalog";
import { useRecords } from "./records";
import { modifiers, type RelicId } from "../relics/catalog";
import { paceFor, type Pace, type PaceEffect } from "../systems/pace";
import { banishTo, wakingRoom } from "../warden/roam";
import { behaviourFor } from "../warden/tuning";
import {
  ALARM_PER_GEM,
  DAMAGE_COOLDOWN_S,
  FLOORS,
  NOISE_HOLD_S,
  STARTING_LIVES,
  TRANSITION_FALLBACK_MS,
  WARDEN_BANISH_DISTANCE,
  WARDEN_ROUT_CALM,
  WARDEN_STAGGER_S,
  WARDEN_WOUNDS_TO_ROUT,
  floorRules,
  tollForFloor,
} from "../world";

export type Phase = "menu" | "playing" | "won" | "lost";

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
  /** Relics held. What they do is decided in relics/catalog.ts. */
  relics: RelicId[];
  /** What is in the satchel, oldest first. Four slots, used with 1-4. */
  satchel: ItemId[];
  /** Items whose appearance the player has worked out, this run. */
  identified: ItemId[];
  /** Which look means which item, this run. Fixed when the run starts. */
  appearances: Appearances;
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
  /** Whether a Scroll of Mapping has shown this floor. */
  mapped: boolean;
  /** Chests already emptied, as `roomId:index`. */
  looted: string[];
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

  startRun: (seed?: number) => void;
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
  /** Learn what a slot holds without spending it. The shop charges for this. */
  identifySlot: (slot: number) => boolean;
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
  /** Pick up the floor's key. */
  takeKey: (roomId: string) => void;
  /** Spend a key on a vault. Returns false without one. */
  unlockRoom: (roomId: string) => boolean;
  /** The Warden walks to another room. */
  moveWarden: (roomId: string) => void;
  /** It reached the player: a life, unless the charm pays, and it is thrown back. */
  wardenStrike: () => void;
  /** It walked into a patch of the floor's spikes. */
  wardenWounded: () => void;
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
    appearances: appearancesFor(0),
    effects: { swift: 0, mire: 0, gloom: 0 },
    noisyUntil: 0,
    wardenLure: null,
    lureUntil: 0,
    mapped: false,
    looted: [],
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
    freeHitUsed: false,
    wardenMet: false,
    transitioning: false,
    inputLocks: 0,
    lastDamageAt: -Infinity,
    pausedFor: 0,
    pausedAt: 0,
    startedAt: 0,
    endedAt: 0,

    startRun: (seed) => {
      const floor = 1;
      const rules = floorRules(floor);
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
        appearances: appearancesFor(dungeon.seed),
        effects: { swift: 0, mire: 0, gloom: 0 },
        noisyUntil: 0,
        mapped: false,
        looted: [],
        sealedRoomId: null,
        keys: 0,
        unlocked: [],
        keyTakenIn: null,
        alarm: rules.startingAlarm,
        floorRooms: 1,
        wardenRoomId: null,
        wardenCameFrom: null,
        wardenWounds: 0,
        wardenStaggerUntil: 0,
        wardenWary: false,
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
          mapped: false,
          looted: [],
          sealedRoomId: null,
          // A key is cut for one floor's lock and is no use on the next.
          keys: 0,
          unlocked: [],
          keyTakenIn: null,
          alarm: rules.startingAlarm,
          floorRooms: 1,
          wardenRoomId: null,
          wardenCameFrom: null,
          wardenWounds: 0,
          wardenStaggerUntil: 0,
          wardenWary: false,
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
      const alarm = s.alarm + ALARM_PER_GEM * modifiers(s.relics).alarmPerGem;
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
      if (s.satchel.length >= SATCHEL_SLOTS) {
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
      if (id === "banish" && !s.wardenRoomId && s.alarm <= floorRules(s.floor).startingAlarm) {
        bus.emit("notice", "Nothing walks this floor yet, and it is already as quiet as it gets.");
        return;
      }
      const now = runClock(s);
      const until = (seconds: number) => now + seconds;

      // Whatever it does, it is spent and it is now known.
      set({
        satchel: s.satchel.filter((_, i) => i !== slot),
        identified: s.identified.includes(id) ? s.identified : [...s.identified, id],
      });

      switch (id) {
        case "healing":
          get().gainLife();
          break;
        case "swiftness":
          set({ effects: { ...get().effects, swift: until(SWIFTNESS_S), mire: 0 } });
          break;
        case "mire":
          set({ effects: { ...get().effects, mire: until(MIRE_S), swift: 0 } });
          break;
        case "gloom":
          set({ effects: { ...get().effects, gloom: until(GLOOM_S) } });
          break;
        case "mapping":
          set({ mapped: true });
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
          get().giveAway(DREAD_ALARM);
          break;
        case "avarice":
          set({
            gems: get().gems + AVARICE_GEMS,
            gemsTotal: get().gemsTotal + AVARICE_GEMS,
          });
          get().raiseAlarm(AVARICE_ALARM);
          break;
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
            alarm: Math.max(floorRules(after.floor).startingAlarm, get().alarm - BANISH_CALM),
          });
          break;
        }
      }
      bus.emit("itemUsed", { id, cruel: ITEMS[id].cruel });
    },

    identifySlot: (slot) => {
      const s = get();
      const id = s.satchel[slot];
      if (!id || s.identified.includes(id)) return false;
      set({ identified: [...s.identified, id] });
      bus.emit("itemNamed", { id });
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
      const until = runClock(s) + NOISE_HOLD_S;
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

    wardenWounded: () => {
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
        set({ wardenWounds: wounds, wardenStaggerUntil: now + WARDEN_STAGGER_S });
        bus.emit("wardenWounded", { wounds });
        return;
      }

      // Routed: thrown across the floor, the count reset, and from here on
      // it knows better. The floor calms, but never below its own baseline
      // - the bottom floor is the bottom floor however well you fought on
      // it.
      const away = banishTo(s.dungeon, s.currentRoomId, WARDEN_BANISH_DISTANCE);
      set({
        wardenWounds: 0,
        wardenWary: true,
        wardenStaggerUntil: 0,
        wardenRoomId: away ?? s.wardenRoomId,
        wardenCameFrom: null,
        wardenLure: null,
        lureUntil: 0,
        alarm: Math.max(floorRules(s.floor).startingAlarm, s.alarm - WARDEN_ROUT_CALM),
      });
      bus.emit("wardenWounded", { wounds });
      bus.emit("wardenRouted");
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
export const wardenHears = (s: RunState): boolean => running(s, s.noisyUntil);

/**
 * Whether the Warden is still reeling from the spikes. While it is, it
 * neither walks nor strikes nor steps between rooms - which is the window
 * the player bought, and the only thing in the game that stops it.
 */
export const wardenStaggered = (s: RunState): boolean => running(s, s.wardenStaggerUntil);

/** Whether a Scroll of Gloom is still blacking out the map. */
export const mapIsDark = (s: RunState): boolean => running(s, s.effects.gloom);

/** What the exit charges on this floor, after relics. Never below one. */
export const tollNow = (s: RunState): number =>
  Math.max(1, tollForFloor(s.floor) - modifiers(s.relics).tollDiscount);

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

export const useCurrentRoom = (): Room | undefined =>
  useRun((s) => (s.dungeon && s.currentRoomId ? roomById(s.dungeon, s.currentRoomId) : undefined));

// Dev-only handle for the smoke test and the console. The derived numbers
// go with it: a test that reads the toll off the HUD is really testing
// React's render timing.
if (import.meta.env.DEV && typeof window !== "undefined") {
  const w = window as unknown as Record<string, unknown>;
  w.__run = useRun;
  w.__derived = {
    toll: () => tollNow(useRun.getState()),
    spare: () => spareGems(useRun.getState()),
    walk: () => speedNow(useRun.getState()).walk,
    rules: () => floorRules(useRun.getState().floor),
    hears: () => wardenHears(useRun.getState()),
    lure: () => lureNow(useRun.getState()),
    items: () => ITEM_IDS.slice(),
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
    hunts: () => {
      const s = useRun.getState();
      return behaviourFor(s.alarm, !lureNow(s) && wardenHears(s)).hunts;
    },
  };
}
