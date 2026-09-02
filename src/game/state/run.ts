import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

import { bus } from "../events";
import { generateDungeon } from "../dungeon/generate";
import { spawnAfterTravel, spawnAtStart } from "../dungeon/layout";
import { roomById, type Dir, type Dungeon, type Room } from "../dungeon/types";
import {
  DAMAGE_COOLDOWN_S,
  STARTING_LIVES,
  TRANSITION_FALLBACK_MS,
} from "../world";

export type Phase = "menu" | "playing" | "won" | "lost";

export interface RunState {
  phase: Phase;
  paused: boolean;
  dungeon: Dungeon | null;
  currentRoomId: string | null;
  /** Room ids in the order first entered. */
  visited: string[];
  lives: number;
  maxLives: number;
  /** Gems in hand. */
  gems: number;
  /** Gems collected over the whole run, for the summary. */
  gemsTotal: number;
  /** Rooms whose gem has been taken. */
  gemRooms: string[];
  /** Rooms whose puzzle or challenge has been completed. */
  cleared: string[];
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
  /** Take a hit. Returns false if inside the invulnerability window. */
  damage: () => boolean;
  gainLife: () => boolean;
  clearRoom: (roomId: string) => void;
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
    currentRoomId: null,
    visited: [],
    lives: STARTING_LIVES,
    maxLives: STARTING_LIVES,
    gems: 0,
    gemsTotal: 0,
    gemRooms: [],
    cleared: [],
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
        currentRoomId: dungeon.startId,
        visited: [dungeon.startId],
        lives: STARTING_LIVES,
        maxLives: STARTING_LIVES,
        gems: 0,
        gemsTotal: 0,
        gemRooms: [],
        cleared: [],
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

      set({
        transitioning: true,
        currentRoomId: toId,
        visited: s.visited.includes(toId) ? s.visited : [...s.visited, toId],
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
      set({ transitioning: false });
      bus.emit("roomEntered", { roomId });
      if (s.dungeon && roomId === s.dungeon.endId && s.phase === "playing") {
        set({ phase: "won", endedAt: performance.now() });
        bus.emit("runWon");
      }
    },

    collectGem: (roomId) => {
      const s = get();
      if (s.gemRooms.includes(roomId)) return false;
      set({
        gems: s.gems + 1,
        gemsTotal: s.gemsTotal + 1,
        gemRooms: [...s.gemRooms, roomId],
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
      const now = performance.now() / 1000;
      if (now - s.lastDamageAt < DAMAGE_COOLDOWN_S) return false;
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

    clearRoom: (roomId) => {
      const s = get();
      if (!s.cleared.includes(roomId)) set({ cleared: [...s.cleared, roomId] });
    },

    lockInput: () => set((s) => ({ inputLocks: s.inputLocks + 1 })),
    unlockInput: () => set((s) => ({ inputLocks: Math.max(0, s.inputLocks - 1) })),
  }))
);

export const useCurrentRoom = (): Room | undefined =>
  useRun((s) => (s.dungeon && s.currentRoomId ? roomById(s.dungeon, s.currentRoomId) : undefined));

// Dev-only handle for the smoke test and the console.
if (import.meta.env.DEV && typeof window !== "undefined") {
  (window as unknown as Record<string, unknown>).__run = useRun;
}
