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
  GLOOM_S,
  ITEMS,
  MIRE_S,
  MIRE_MULTIPLIER,
  SATCHEL_SLOTS,
  SWIFTNESS_S,
  SWIFTNESS_MULTIPLIER,
  appearancesFor,
  type Appearances,
  type ItemId,
} from "../items/catalog";
import { modifiers, type RelicId } from "../relics/catalog";
import { banishTo, wakingRoom } from "../warden/roam";
import {
  ALARM_PER_GEM,
  DAMAGE_COOLDOWN_S,
  FLOORS,
  STARTING_LIVES,
  TRANSITION_FALLBACK_MS,
  WARDEN_BANISH_DISTANCE,
  WARDEN_GRACE_ROOMS,
  tollForFloor,
} from "../world";

export type Phase = "menu" | "playing" | "won" | "lost";

export interface RunState {
  phase: Phase;
  paused: boolean;
  dungeon: Dungeon | null;
  /** 1-based; the run is won on leaving floor FLOORS. */
  floor: number;
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
  /** Whether a Scroll of Mapping has shown this floor. */
  mapped: boolean;
  /** Chests already emptied, as `roomId:index`. */
  looted: string[];
  /** A room whose doors are barred while something in it is happening. */
  sealedRoomId: string | null;
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
  /** The Bone Charm's free hit, spent once a floor. */
  freeHitUsed: boolean;
  /** Whether the player has met the Warden yet, for the one-time warning. */
  wardenMet: boolean;
  /** True from leaving one room until the next has mounted. */
  transitioning: boolean;
  /** Counted, not flagged: a puzzle overlay and a menu may both hold it. */
  inputLocks: number;
  lastDamageAt: number;
  /** performance.now() when the run began, for the summary. */
  startedAt: number;
  /** Set when the run is won or lost. */
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
  /** The Warden walks to another room. */
  moveWarden: (roomId: string) => void;
  /** It reached the player: a life, unless the charm pays, and it is thrown back. */
  wardenStrike: () => void;
  /** Take a hit. Returns false if inside the invulnerability window. */
  damage: () => boolean;
  gainLife: () => boolean;
  clearRoom: (roomId: string) => void;
  failRoom: (roomId: string) => void;
  lockInput: () => void;
  unlockInput: () => void;
}

/** The player is in control: not on a menu, not mid-transition, not in a modal. */
export const canControl = (s: RunState): boolean =>
  s.phase === "playing" && !s.paused && !s.transitioning && s.inputLocks === 0;

let transitionFallback: number | null = null;

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
    relics: [],
    satchel: [],
    identified: [],
    appearances: appearancesFor(0),
    effects: { swift: 0, mire: 0, gloom: 0 },
    mapped: false,
    looted: [],
    sealedRoomId: null,
    alarm: 0,
    floorRooms: 1,
    wardenRoomId: null,
    wardenCameFrom: null,
    freeHitUsed: false,
    wardenMet: false,
    transitioning: false,
    inputLocks: 0,
    lastDamageAt: -Infinity,
    startedAt: 0,
    endedAt: 0,

    startRun: (seed) => {
      const dungeon = generateDungeon({ seed });
      if (transitionFallback) window.clearTimeout(transitionFallback);
      set({
        phase: "playing",
        paused: false,
        dungeon,
        floor: 1,
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
        relics: [],
        satchel: [],
        identified: [],
        appearances: appearancesFor(dungeon.seed),
        effects: { swift: 0, mire: 0, gloom: 0 },
        mapped: false,
        looted: [],
        sealedRoomId: null,
        alarm: 0,
        floorRooms: 1,
        wardenRoomId: null,
        wardenCameFrom: null,
        freeHitUsed: false,
        wardenMet: false,
        // The start room has to mount before the player is let go.
        transitioning: true,
        inputLocks: 0,
        lastDamageAt: -Infinity,
        startedAt: performance.now(),
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
      if (get().phase === "playing") set({ paused: true });
    },
    resume: () => set({ paused: false }),

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
          set({ transitioning: false, phase: "won", endedAt: performance.now() });
          bus.emit("runWon");
          return;
        }
        // Down a floor: a fresh dungeon, the same player. The screen is
        // still dark from the door, and stays so until the new start room
        // reports in.
        const floor = s.floor + 1;
        const dungeon = generateDungeon({ seed: (s.dungeon.seed * 7919 + floor) >>> 0 });
        set({
          floor,
          dungeon,
          currentRoomId: dungeon.startId,
          visited: [dungeon.startId],
          roomsSeen: s.roomsSeen + 1,
          gemRooms: [],
          cleared: [],
          failed: [],
          // A new floor is a new Warden, asleep, and a floor that has not
          // been robbed yet. Relics, gems and the satchel carry down; what
          // was drunk on the last floor does not.
          effects: { swift: 0, mire: 0, gloom: 0 },
          mapped: false,
          looted: [],
          sealedRoomId: null,
          alarm: 0,
          floorRooms: 1,
          wardenRoomId: null,
          wardenCameFrom: null,
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
      if (!after.wardenRoomId && after.dungeon && after.floorRooms >= WARDEN_GRACE_ROOMS) {
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
      bus.emit("alarmRaised", { alarm });
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
      const now = performance.now() / 1000;
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
        set({ phase: "lost", endedAt: performance.now() });
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
        bus.emit("hint", "Your satchel is full. Use something first.");
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
      if (!id || s.phase !== "playing" || s.paused || s.inputLocks > 0) return;
      const now = performance.now() / 1000;
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
        case "dread":
          set({ alarm: get().alarm + DREAD_ALARM });
          bus.emit("alarmRaised", { alarm: get().alarm });
          break;
        case "avarice":
          set({
            gems: get().gems + AVARICE_GEMS,
            gemsTotal: get().gemsTotal + AVARICE_GEMS,
            alarm: get().alarm + AVARICE_ALARM,
          });
          bus.emit("alarmRaised", { alarm: get().alarm });
          break;
        case "banish": {
          const after = get();
          if (after.dungeon && after.currentRoomId && after.wardenRoomId) {
            const away = banishTo(after.dungeon, after.currentRoomId, WARDEN_BANISH_DISTANCE);
            if (away) set({ wardenRoomId: away, wardenCameFrom: null });
          }
          set({ alarm: Math.max(0, get().alarm - BANISH_CALM) });
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

    moveWarden: (roomId) => {
      const s = get();
      if (!s.wardenRoomId || s.wardenRoomId === roomId) return;
      set({ wardenRoomId: roomId, wardenCameFrom: s.wardenRoomId });
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
      if (away) set({ wardenRoomId: away, wardenCameFrom: null });
      bus.emit("wardenStruck");
    },

    clearRoom: (roomId) => {
      const s = get();
      if (!s.cleared.includes(roomId)) set({ cleared: [...s.cleared, roomId] });
    },
    failRoom: (roomId) => {
      const s = get();
      if (!s.failed.includes(roomId)) set({ failed: [...s.failed, roomId] });
    },

    lockInput: () => set((s) => ({ inputLocks: s.inputLocks + 1 })),
    unlockInput: () => set((s) => ({ inputLocks: Math.max(0, s.inputLocks - 1) })),
  }))
);

/** True while a timed effect is still running. */
const running = (until: number): boolean => until > performance.now() / 1000;

/**
 * How fast the player moves right now: their relics, then whatever they
 * last drank. One owner for the answer, so the player, the HUD and anything
 * else that cares cannot disagree about it.
 */
export function speedNow(s: RunState): { walk: number; dash: number } {
  const { walkSpeed, dashSpeed } = modifiers(s.relics);
  const factor = running(s.effects.swift)
    ? SWIFTNESS_MULTIPLIER
    : running(s.effects.mire)
      ? MIRE_MULTIPLIER
      : 1;
  return { walk: walkSpeed * factor, dash: dashSpeed * factor };
}

/** Whether a Scroll of Gloom is still blacking out the map. */
export const mapIsDark = (s: RunState): boolean => running(s.effects.gloom);

/** What the exit charges on this floor, after relics. Never below one. */
export const tollNow = (s: RunState): number =>
  Math.max(1, tollForFloor(s.floor) - modifiers(s.relics).tollDiscount);

/** Gems held over what the exit will cost: what the run is actually earning. */
export const spareGems = (s: RunState): number => Math.max(0, s.gems - tollNow(s));

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
  };
}
