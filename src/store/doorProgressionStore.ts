import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { DoorState, DoorType } from '../components/doorUtils';
import { canTransition } from '../components/doorUtils';

export interface DoorUnlock {
  doorId: string;
  roomId: string;
  unlockedAt: number;
  method: 'key' | 'puzzle' | 'quest' | 'level' | 'manual';
}

export interface DoorProgression {
  unlockedDoors: Set<string>;
  doorStates: Record<string, DoorState>;
  doorTypes: Record<string, DoorType>;
  unlockHistory: DoorUnlock[];
  totalDoorsUnlocked: number;
  progressionLevel: number;
}

export interface DoorProgressionActions {
  unlockDoor: (doorId: string, roomId: string, method: DoorUnlock['method']) => void;
  lockDoor: (doorId: string) => void;
  setDoorState: (doorId: string, state: DoorState) => void;
  setDoorType: (doorId: string, type: DoorType) => void;
  isDoorUnlocked: (doorId: string) => boolean;
  getDoorState: (doorId: string) => DoorState;
  getDoorType: (doorId: string) => DoorType;
  getUnlockedDoors: () => string[];
  getProgressionStats: () => {
    totalUnlocked: number;
    progressionLevel: number;
    recentUnlocks: DoorUnlock[];
  };
  resetProgression: () => void;
}

export const useDoorProgressionStore = create<DoorProgression & DoorProgressionActions>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    unlockedDoors: new Set(),
    doorStates: {},
    doorTypes: {},
    unlockHistory: [],
    totalDoorsUnlocked: 0,
    progressionLevel: 1,
    
    // Actions
    unlockDoor: (doorId: string, roomId: string, method: DoorUnlock['method']) => {
      const { unlockedDoors, unlockHistory, totalDoorsUnlocked } = get();
      
      if (!unlockedDoors.has(doorId)) {
        const newUnlock: DoorUnlock = {
          doorId,
          roomId,
          unlockedAt: Date.now(),
          method
        };
        
        set({
          unlockedDoors: new Set([...unlockedDoors, doorId]),
          unlockHistory: [...unlockHistory, newUnlock],
          totalDoorsUnlocked: totalDoorsUnlocked + 1,
          doorStates: { ...get().doorStates, [doorId]: 'open' },
          progressionLevel: Math.floor((totalDoorsUnlocked + 1) / 5) + 1 // Level up every 5 doors
        });
        
        console.log(`🚪 Door ${doorId} unlocked via ${method}!`);
      }
    },
    
    lockDoor: (doorId: string) => {
      const { unlockedDoors } = get();
      const newUnlockedDoors = new Set(unlockedDoors);
      newUnlockedDoors.delete(doorId);
      
      set({
        unlockedDoors: newUnlockedDoors,
        doorStates: { ...get().doorStates, [doorId]: 'locked' }
      });
    },
    
    setDoorState: (doorId: string, state: DoorState) => {
      const currentState = get().doorStates[doorId] || 'closed';
      
      // Validate state transition
      if (!canTransition(currentState, state)) {
        console.warn(`Invalid door state transition: ${currentState} -> ${state}`);
        return;
      }
      
      // Add state change timestamp for debugging
      const stateChange = {
        doorId,
        fromState: currentState,
        toState: state,
        timestamp: Date.now()
      };
      
      set({
        doorStates: { ...get().doorStates, [doorId]: state }
      });
      
      // Log state changes in development
      if (import.meta.env?.DEV) {
        console.log('Door state change:', stateChange);
      }
      
      // Handle automatic state transitions with configurable timing
      if (state === "opening") {
        // Auto-transition to open after animation
        setTimeout(() => {
          const currentDoorState = get().doorStates[doorId];
          if (currentDoorState === "opening") {
            get().setDoorState(doorId, "open");
          }
        }, 1000); // 1 second animation
      } else if (state === "closing") {
        // Auto-transition to closed after animation
        setTimeout(() => {
          const currentDoorState = get().doorStates[doorId];
          if (currentDoorState === "closing") {
            get().setDoorState(doorId, "closed");
          }
        }, 1000); // 1 second animation
      }
    },
    
    setDoorType: (doorId: string, type: DoorType) => {
      set({
        doorTypes: { ...get().doorTypes, [doorId]: type }
      });
    },
    
    isDoorUnlocked: (doorId: string) => {
      // All doors are unlocked by default
      return true;
    },
    
    getDoorState: (doorId: string) => {
      return get().doorStates[doorId] || 'closed';
    },
    
    getDoorType: (doorId: string) => {
      return get().doorTypes[doorId] || 'standard';
    },
    
    getUnlockedDoors: () => {
      return Array.from(get().unlockedDoors);
    },
    
    getProgressionStats: () => {
      const { unlockedDoors, unlockHistory, progressionLevel } = get();
      return {
        totalUnlocked: unlockedDoors.size,
        progressionLevel,
        recentUnlocks: unlockHistory.slice(-5) // Last 5 unlocks
      };
    },
    
    resetProgression: () => {
      set({
        unlockedDoors: new Set(),
        doorStates: {},
        doorTypes: {},
        unlockHistory: [],
        totalDoorsUnlocked: 0,
        progressionLevel: 1
      });
    }
  }))
);

// Helper functions
export const isDoorUnlocked = (doorId: string) => useDoorProgressionStore.getState().isDoorUnlocked(doorId);
export const unlockDoor = (doorId: string, roomId: string, method: DoorUnlock['method'] = 'manual') => {
  useDoorProgressionStore.getState().unlockDoor(doorId, roomId, method);
};
