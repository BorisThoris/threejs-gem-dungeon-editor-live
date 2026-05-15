import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { RoomInstance, RoomTransition } from '../types/roomInstance';
import type { Room } from '../types/map';
import useMapStore from './mapStore';
import { calculatePlayerSpawnPosition } from '../utils/doorUtils';
import { gameEvents, GAME_EVENTS } from '../utils/gameEvents';
import * as THREE from 'three';

// ============================================================================
// CONSOLIDATED GAME STORE
// ============================================================================
// This store consolidates:
// - roomStore (room state & transitions)
// - roomManagerStore (room instances & loading)
// - playerMovementStore (movement & transitions)
// - breakingStore (breaking toggle)
// - wallToggleStore (wall visibility)
// ============================================================================

export interface PlayerDimensions {
  width: number;
  height: number;
  depth: number;
  capsuleRadius: number;
  capsuleHeight: number;
}

export interface PlayerStats {
  lives: number;
  maxLives: number;
  level: number;
  experience: number;
  points: number;
  keys: number;
  bombs: number;
  streak: number;
  maxStreak: number;
  currentFloor: number;
  roomsCompleted: number;
  // Character upgrades
  size: number;
  speed: number;
  strength: number;
  defense: number;
  luck: number;
  // Physical dimensions
  dimensions: PlayerDimensions;
  // Temporary buffs
  buffs: {
    speedBoost: number;
    strengthBoost: number;
    defenseBoost: number;
    luckBoost: number;
  };
}

export interface GameState {
  // Room Management (from roomStore + roomManagerStore)
  currentRoomId: string | null;
  roomInstances: Map<string, RoomInstance>;
  isTransitioning: boolean;
  transitionProgress: number;
  isLoading: boolean;
  loadingProgress: number;
  transition: RoomTransition | null;
  
  // Room Completion Tracking
  visitedRooms: Set<string>;
  completedRooms: Set<string>;
  
  // Player Movement (from playerMovementStore)
  isMovementEnabled: boolean;
  fromRoomId: string | null;
  toRoomId: string | null;
  
  // Game State (from gameStore)
  playerStats: PlayerStats;
  gamePhase: 'exploration' | 'puzzle' | 'boss';
  
  // UI State (from breakingStore + wallToggleStore)
  globalBreakingEnabled: boolean;
  wallsEnabled: boolean;
  
  // Hand State
  handsOut: boolean;
}

export interface GameActions {
  // Room Management
  loadRoom: (roomId: string) => Promise<void>;
  unloadRoom: (roomId: string) => void;
  setActiveRoom: (roomId: string) => void;
  startTransition: (fromRoomId: string, toRoomId: string, direction: 'north' | 'south' | 'east' | 'west') => Promise<void>;
  completeTransition: () => void;
  updateRoomState: (roomId: string, updates: Partial<RoomInstance>) => void;
  setLoading: (isLoading: boolean, progress?: number) => void;
  
  // Room Completion Tracking
  markRoomVisited: (roomId: string) => void;
  markRoomCompleted: (roomId: string) => void;
  isRoomVisited: (roomId: string) => boolean;
  isRoomCompleted: (roomId: string) => boolean;
  
  // Player Movement
  enableMovement: () => void;
  disableMovement: () => void;
  updateTransitionProgress: (progress: number) => void;
  
  // Player Stats
  updateStats: (stats: Partial<PlayerStats>) => void;
  addExperience: (amount: number) => void;
  addPoints: (amount: number) => void;
  loseLife: () => void;
  gainLife: () => void;
  addKey: () => void;
  useKey: () => boolean;
  addBomb: () => void;
  useBomb: () => boolean;
  updateStreak: (increment: boolean) => void;
  // Individual stat setters for editor
  setHealth: (health: number) => void;
  setLives: (lives: number) => void;
  setExperience: (experience: number) => void;
  setPoints: (points: number) => void;
  setStrength: (strength: number) => void;
  setSpeed: (speed: number) => void;
  setDefense: (defense: number) => void;
  setBombs: (bombs: number) => void;
  resetPlayerStats: () => void;
  
  // Character upgrades
  upgradeSize: (amount: number) => void;
  upgradeSpeed: (amount: number) => void;
  upgradeStrength: (amount: number) => void;
  upgradeDefense: (amount: number) => void;
  upgradeLuck: (amount: number) => void;
  
  // Temporary buffs
  addBuff: (buffType: keyof PlayerStats['buffs'], duration: number) => void;
  updateBuffs: () => void;
  
  // Game Phase
  setGamePhase: (phase: GameState['gamePhase']) => void;
  
  // UI Controls
  toggleBreaking: () => void;
  setBreakingEnabled: (enabled: boolean) => void;
  toggleWalls: () => void;
  setWallsEnabled: (enabled: boolean) => void;
  
  // Hand Controls
  toggleHands: () => void;
  setHandsOut: (handsOut: boolean) => void;
  
  // Cleanup
  cleanup: () => void;
  resetGame: () => void;
}

const initialStats: PlayerStats = {
  lives: 3,
  maxLives: 3,
  level: 1,
  experience: 0,
  points: 100,
  keys: 2,
  bombs: 1,
  streak: 0,
  maxStreak: 0,
  currentFloor: 1,
  roomsCompleted: 0,
  size: 1.0,
  speed: 1.0,
  strength: 1.0,
  defense: 0,
  luck: 0,
  dimensions: {
    width: 0.6,
    height: 1.8,
    depth: 0.6,
    capsuleRadius: 0.3,
    capsuleHeight: 1.4,
  },
  buffs: {
    speedBoost: 0,
    strengthBoost: 0,
    defenseBoost: 0,
    luckBoost: 0,
  },
};

export const useConsolidatedGameStore = create<GameState & GameActions>()(
  subscribeWithSelector((set, get) => ({
    // Initial State
    currentRoomId: null,
    roomInstances: new Map(),
    isTransitioning: false,
    transitionProgress: 0,
    isLoading: false,
    loadingProgress: 0,
    transition: null,
    visitedRooms: new Set(),
    completedRooms: new Set(),
    isMovementEnabled: true,
    fromRoomId: null,
    toRoomId: null,
    playerStats: initialStats,
    gamePhase: 'exploration',
    globalBreakingEnabled: true,
    wallsEnabled: true,
    handsOut: true,

    // Room Management Actions
    loadRoom: async (roomId: string) => {
      const { currentMap } = useMapStore.getState();
      if (!currentMap) return;

      const room = currentMap.rooms.find(r => r.id === roomId);
      if (!room) return;

      // Check if room is already loaded
      const existingInstance = get().roomInstances.get(roomId);
      if (existingInstance?.isLoaded) return;

      set({ isLoading: true, loadingProgress: 0 });

      // Simulate loading progress
      const progressInterval = setInterval(() => {
        const currentProgress = get().loadingProgress;
        if (currentProgress < 0.9) {
          set({ loadingProgress: currentProgress + 0.1 });
        }
      }, 100);

      try {
        const roomInstance: RoomInstance = {
          id: roomId,
          room,
          isLoaded: false,
          isActive: false,
          enemies: [],
          items: [],
          puzzles: [],
          isTransitioning: false,
        };

        await new Promise(resolve => setTimeout(resolve, 1000));

        roomInstance.isLoaded = true;
        roomInstance.loadedAt = Date.now();

        const newInstances = new Map(get().roomInstances);
        newInstances.set(roomId, roomInstance);

        set({ 
          roomInstances: newInstances,
          loadingProgress: 1.0,
          isLoading: false 
        });

        clearInterval(progressInterval);
      } catch (error) {
        clearInterval(progressInterval);
        set({ isLoading: false, loadingProgress: 0 });
      }
    },

    unloadRoom: (roomId: string) => {
      const newInstances = new Map(get().roomInstances);
      newInstances.delete(roomId);
      set({ roomInstances: newInstances });
    },

    setActiveRoom: (roomId: string) => {
      const { roomInstances } = get();
      const roomInstance = roomInstances.get(roomId);
      
      if (!roomInstance || !roomInstance.isLoaded) return;

      const newInstances = new Map(roomInstances);
      newInstances.forEach((instance, id) => {
        instance.isActive = id === roomId;
      });

      // Mark room as visited when entering
      const { visitedRooms } = get();
      const newVisitedRooms = new Set(visitedRooms);
      newVisitedRooms.add(roomId);

      set({ 
        currentRoomId: roomId,
        roomInstances: newInstances,
        visitedRooms: newVisitedRooms
      });

      // Emit room enter event to trigger room cards
      gameEvents.emit(GAME_EVENTS.ROOM_ENTER, roomInstance.room);
    },

    startTransition: async (fromRoomId: string, toRoomId: string, direction: 'north' | 'south' | 'east' | 'west') => {
      const { currentMap } = useMapStore.getState();
      const targetRoom = currentMap?.rooms.find(r => r.id === toRoomId);
      
      if (!targetRoom) return;

      // Start transition and freeze player movement
      set({
        isMovementEnabled: false,
        isTransitioning: true,
        transitionProgress: 0,
        fromRoomId,
        toRoomId,
      });
      
      // Load the target room if not already loaded
      await get().loadRoom(toRoomId);
      
      // Set new active room immediately
      get().setActiveRoom(toRoomId);
      
      // Emit teleportation event for player to listen to; face toward room center
      if (targetRoom) {
        const roomSize = targetRoom.size || 10;
        let { position, rotation } = calculatePlayerSpawnPosition(direction, roomSize);
        const roomHalfSize = roomSize / 2;

        // Allow edge spawns just inside the room perimeter
        const isWithinBounds = 
          Math.abs(position.x) <= roomHalfSize - 1 && 
          Math.abs(position.z) <= roomHalfSize - 1;
        
        if (!isWithinBounds) {
          console.warn('[Transition] Spawn out of bounds, falling back to center:', position.toArray());
          position = new THREE.Vector3(0, 0.5, 0);
          rotation = new THREE.Euler(0, 0, 0);
        }

        // Debug computed spawn for verification
        console.debug('[Transition] direction=', direction, 'spawn=', position.toArray(), 'rotation(y)=', rotation.y);

        window.dispatchEvent(new CustomEvent('playerTeleport', {
          detail: { position: position.toArray(), rotation: rotation.toArray() }
        }));

        // Ensure camera faces center (rotation already points inward per direction)
        // but also broadcast via camera controller in case mouse look state diverged
        gameEvents.emit(GAME_EVENTS.CAMERA_SET_ROTATION, { x: rotation.x, y: rotation.y, z: rotation.z });
      }
      
      // Complete transition and re-enable movement after a delay
      setTimeout(() => {
        set({
          isMovementEnabled: true,
          isTransitioning: false,
          transitionProgress: 1,
          fromRoomId: null,
          toRoomId: null,
        });
        get().unloadRoom(fromRoomId);
      }, 1500);
    },

    completeTransition: () => {
      const { transition } = get();
      if (!transition) return;

      get().setActiveRoom(transition.toRoomId);
      set({ transition: null });
    },

    updateRoomState: (roomId: string, updates: Partial<RoomInstance>) => {
      const { roomInstances } = get();
      const roomInstance = roomInstances.get(roomId);
      
      if (!roomInstance) return;

      const updatedInstance = { ...roomInstance, ...updates };
      const newInstances = new Map(roomInstances);
      newInstances.set(roomId, updatedInstance);
      
      set({ roomInstances: newInstances });
    },

    setLoading: (isLoading: boolean, progress = 0) => {
      set({ isLoading, loadingProgress: progress });
    },

    // Room Completion Tracking Actions
    markRoomVisited: (roomId: string) => {
      const { visitedRooms } = get();
      const newVisitedRooms = new Set(visitedRooms);
      newVisitedRooms.add(roomId);
      set({ visitedRooms: newVisitedRooms });
    },

    markRoomCompleted: (roomId: string) => {
      const { completedRooms, visitedRooms } = get();
      const newCompletedRooms = new Set(completedRooms);
      const newVisitedRooms = new Set(visitedRooms);
      
      newCompletedRooms.add(roomId);
      newVisitedRooms.add(roomId); // Completed rooms are also visited
      
      set({ 
        completedRooms: newCompletedRooms,
        visitedRooms: newVisitedRooms,
        playerStats: {
          ...get().playerStats,
          roomsCompleted: newCompletedRooms.size
        }
      });
    },

    isRoomVisited: (roomId: string) => {
      return get().visitedRooms.has(roomId);
    },

    isRoomCompleted: (roomId: string) => {
      return get().completedRooms.has(roomId);
    },

    // Player Movement Actions
    enableMovement: () => set({ isMovementEnabled: true }),
    disableMovement: () => set({ isMovementEnabled: false }),
    updateTransitionProgress: (progress: number) => set({
      transitionProgress: Math.max(0, Math.min(1, progress)),
    }),

    // Player Stats Actions
    updateStats: (stats) => {
      set((state) => ({
        playerStats: { ...state.playerStats, ...stats }
      }));
    },

    addExperience: (amount) => {
      set((state) => {
        const newExp = state.playerStats.experience + amount;
        const newLevel = Math.floor(newExp / 100) + 1;
        const levelUp = newLevel > state.playerStats.level;
        
        return {
          playerStats: {
            ...state.playerStats,
            experience: newExp,
            level: newLevel,
            maxLives: levelUp ? state.playerStats.maxLives + 1 : state.playerStats.maxLives,
            lives: levelUp ? state.playerStats.maxLives + 1 : state.playerStats.lives,
          }
        };
      });
    },

    addPoints: (amount) => {
      set((state) => ({
        playerStats: {
          ...state.playerStats,
          points: state.playerStats.points + amount
        }
      }));
    },

    loseLife: () => {
      set((state) => ({
        playerStats: {
          ...state.playerStats,
          lives: Math.max(0, state.playerStats.lives - 1),
          streak: 0
        }
      }));
    },

    gainLife: () => {
      set((state) => ({
        playerStats: {
          ...state.playerStats,
          lives: Math.min(state.playerStats.maxLives, state.playerStats.lives + 1)
        }
      }));
    },

    addKey: () => {
      set((state) => ({
        playerStats: {
          ...state.playerStats,
          keys: state.playerStats.keys + 1
        }
      }));
    },

    useKey: () => {
      const state = get();
      if (state.playerStats.keys > 0) {
        set((state) => ({
          playerStats: {
            ...state.playerStats,
            keys: state.playerStats.keys - 1
          }
        }));
        return true;
      }
      return false;
    },

    addBomb: () => {
      set((state) => ({
        playerStats: {
          ...state.playerStats,
          bombs: state.playerStats.bombs + 1
        }
      }));
    },

    useBomb: () => {
      const state = get();
      if (state.playerStats.bombs > 0) {
        set((state) => ({
          playerStats: {
            ...state.playerStats,
            bombs: state.playerStats.bombs - 1
          }
        }));
        return true;
      }
      return false;
    },

    updateStreak: (increment) => {
      set((state) => {
        const newStreak = increment ? state.playerStats.streak + 1 : 0;
        return {
          playerStats: {
            ...state.playerStats,
            streak: newStreak,
            maxStreak: Math.max(state.playerStats.maxStreak, newStreak)
          }
        };
      });
    },

    // Individual stat setters for editor
    setHealth: (health) => {
      set((state) => ({
        playerStats: {
          ...state.playerStats,
          health: Math.max(0, Math.min(100, health))
        }
      }));
    },

    setLives: (lives) => {
      set((state) => ({
        playerStats: {
          ...state.playerStats,
          lives: Math.max(0, Math.min(state.playerStats.maxLives, lives))
        }
      }));
    },

    setExperience: (experience) => {
      set((state) => {
        const newLevel = Math.floor(experience / 100) + 1;
        return {
          playerStats: {
            ...state.playerStats,
            experience: Math.max(0, experience),
            level: newLevel
          }
        };
      });
    },

    setPoints: (points) => {
      set((state) => ({
        playerStats: {
          ...state.playerStats,
          points: Math.max(0, points)
        }
      }));
    },

    setStrength: (strength) => {
      set((state) => ({
        playerStats: {
          ...state.playerStats,
          strength: Math.max(0, Math.min(100, strength))
        }
      }));
    },

    setSpeed: (speed) => {
      set((state) => ({
        playerStats: {
          ...state.playerStats,
          speed: Math.max(0, Math.min(100, speed))
        }
      }));
    },

    setDefense: (defense) => {
      set((state) => ({
        playerStats: {
          ...state.playerStats,
          defense: Math.max(0, Math.min(100, defense))
        }
      }));
    },

    setBombs: (bombs) => {
      set((state) => ({
        playerStats: {
          ...state.playerStats,
          bombs: Math.max(0, Math.min(50, bombs))
        }
      }));
    },

    resetPlayerStats: () => {
      set((state) => ({
        playerStats: {
          ...state.playerStats,
          lives: 3,
          maxLives: 3,
          level: 1,
          experience: 0,
          points: 0,
          keys: 0,
          bombs: 0,
          streak: 0,
          maxStreak: 10,
          currentFloor: 1,
          roomsCompleted: 0,
          size: 1,
          speed: 1,
          strength: 1,
          defense: 1,
          luck: 1,
          health: 100,
          buffs: {
            speed: 0,
            strength: 0,
            defense: 0,
            luck: 0,
          }
        }
      }));
    },

    // Character upgrades
    upgradeSize: (amount) => {
      set((state) => ({
        playerStats: {
          ...state.playerStats,
          size: Math.max(0.5, state.playerStats.size + amount),
          maxLives: Math.max(3, state.playerStats.maxLives + Math.floor(amount * 2))
        }
      }));
    },

    upgradeSpeed: (amount) => {
      set((state) => ({
        playerStats: {
          ...state.playerStats,
          speed: Math.max(0.5, state.playerStats.speed + amount)
        }
      }));
    },

    upgradeStrength: (amount) => {
      set((state) => ({
        playerStats: {
          ...state.playerStats,
          strength: Math.max(0.5, state.playerStats.strength + amount)
        }
      }));
    },

    upgradeDefense: (amount) => {
      set((state) => ({
        playerStats: {
          ...state.playerStats,
          defense: Math.max(0, state.playerStats.defense + amount)
        }
      }));
    },

    upgradeLuck: (amount) => {
      set((state) => ({
        playerStats: {
          ...state.playerStats,
          luck: Math.max(0, state.playerStats.luck + amount)
        }
      }));
    },

    // Temporary buffs
    addBuff: (buffType, duration) => {
      set((state) => ({
        playerStats: {
          ...state.playerStats,
          buffs: {
            ...state.playerStats.buffs,
            [buffType]: Math.max(state.playerStats.buffs[buffType], duration)
          }
        }
      }));
    },

    updateBuffs: () => {
      set((state) => {
        const newBuffs = { ...state.playerStats.buffs };
        let hasChanges = false;

        Object.keys(newBuffs).forEach(key => {
          const buffKey = key as keyof PlayerStats['buffs'];
          if (newBuffs[buffKey] > 0) {
            newBuffs[buffKey] = Math.max(0, newBuffs[buffKey] - 1);
            hasChanges = true;
          }
        });

        return hasChanges ? {
          playerStats: {
            ...state.playerStats,
            buffs: newBuffs
          }
        } : state;
      });
    },

    // Game Phase
    setGamePhase: (phase) => set({ gamePhase: phase }),

    // UI Controls
    toggleBreaking: () => {
      const current = get().globalBreakingEnabled;
      set({ globalBreakingEnabled: !current });
    },

    setBreakingEnabled: (enabled: boolean) => {
      set({ globalBreakingEnabled: enabled });
    },

    toggleWalls: () => {
      set((state) => ({ wallsEnabled: !state.wallsEnabled }));
    },

    setWallsEnabled: (enabled: boolean) => {
      set({ wallsEnabled: enabled });
    },
    
    // Hand Controls
    toggleHands: () => {
      set((state) => ({ handsOut: !state.handsOut }));
    },
    
    setHandsOut: (handsOut: boolean) => {
      set({ handsOut });
    },

    // Cleanup
    cleanup: () => {
      set({
        currentRoomId: null,
        roomInstances: new Map(),
        transition: null,
        isLoading: false,
        loadingProgress: 0,
        isTransitioning: false,
        transitionProgress: 0,
        visitedRooms: new Set(),
        completedRooms: new Set(),
        isMovementEnabled: true,
        fromRoomId: null,
        toRoomId: null,
      });
    },

    resetGame: () => {
      set({
        playerStats: initialStats,
        gamePhase: 'exploration',
        globalBreakingEnabled: true,
        wallsEnabled: true,
      });
      get().cleanup();
    },
  }))
);

// Selector hooks for better performance
export const useCurrentRoomId = () => useConsolidatedGameStore((state) => state.currentRoomId);
export const useRoomInstances = () => useConsolidatedGameStore((state) => state.roomInstances);
export const useIsTransitioning = () => useConsolidatedGameStore((state) => state.isTransitioning);
export const usePlayerStats = () => useConsolidatedGameStore((state) => state.playerStats);
export const useGamePhase = () => useConsolidatedGameStore((state) => state.gamePhase);
export const useBreakingEnabled = () => useConsolidatedGameStore((state) => state.globalBreakingEnabled);
export const useWallsEnabled = () => useConsolidatedGameStore((state) => state.wallsEnabled);
export const useHandsOut = () => useConsolidatedGameStore((state) => state.handsOut);

// Room completion tracking selectors
export const useVisitedRooms = () => useConsolidatedGameStore((state) => state.visitedRooms);
export const useCompletedRooms = () => useConsolidatedGameStore((state) => state.completedRooms);
export const useRoomCompletionActions = () => useConsolidatedGameStore((state) => ({
  markRoomVisited: state.markRoomVisited,
  markRoomCompleted: state.markRoomCompleted,
  isRoomVisited: state.isRoomVisited,
  isRoomCompleted: state.isRoomCompleted,
}));

export default useConsolidatedGameStore;
