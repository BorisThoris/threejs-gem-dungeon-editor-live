import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { RoomInstance, RoomManagerState, RoomManagerActions, RoomTransition } from '../types/roomInstance';
import type { Room } from '../types/map';
import useMapStore from './mapStore';
// Note: playerMovementStore functionality moved to consolidatedGameStore
import { calculatePlayerSpawnPosition } from '../utils/doorUtils';
import * as THREE from 'three';

const useRoomManagerStore = create<RoomManagerState & RoomManagerActions>((set, get) => ({
  // State
  currentRoomId: null,
  roomInstances: new Map(),
  transition: null,
  isLoading: false,
  loadingProgress: 0,

  // Actions
  loadRoom: async (roomId: string) => {
    const { currentMap } = useMapStore.getState();
    if (!currentMap) {
      // No map available for room loading
      return;
    }

    const room = currentMap.rooms.find(r => r.id === roomId);
    if (!room) {
      // Room not found in map
      return;
    }

    // Check if room is already loaded
    const existingInstance = get().roomInstances.get(roomId);
    if (existingInstance?.isLoaded) {
      return;
    }

    
    set({ isLoading: true, loadingProgress: 0 });

    // Simulate loading progress
    const progressInterval = setInterval(() => {
      const currentProgress = get().loadingProgress;
      if (currentProgress < 0.9) {
        set({ loadingProgress: currentProgress + 0.1 });
        // Note: Player movement transition progress is now handled by consolidatedGameStore
      }
    }, 100);

    try {
      // Create room instance
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

      // Simulate room loading time (like loading assets, generating content, etc.)
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Mark as loaded
      roomInstance.isLoaded = true;
      roomInstance.loadedAt = Date.now();

      // Update room instances
      const newInstances = new Map(get().roomInstances);
      newInstances.set(roomId, roomInstance);

      set({ 
        roomInstances: newInstances,
        loadingProgress: 1.0,
        isLoading: false 
      });

      // Update final transition progress
      // Note: Player movement transition progress is now handled by consolidatedGameStore

      clearInterval(progressInterval);
    } catch (error) {
      // Failed to load room
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
    
    if (!roomInstance || !roomInstance.isLoaded) {
      // Cannot set active room
      return;
    }

    // Deactivate all rooms
    const newInstances = new Map(roomInstances);
    newInstances.forEach((instance, id) => {
      instance.isActive = id === roomId;
    });

    set({ 
      currentRoomId: roomId,
      roomInstances: newInstances 
    });

  },

  startTransition: async (fromRoomId: string, toRoomId: string, direction: 'north' | 'south' | 'east' | 'west') => {
    
    // Validate that the target room exists in the map
    const { currentMap } = useMapStore.getState();
    const targetRoom = currentMap?.rooms.find(r => r.id === toRoomId);
    
    if (!targetRoom) {
      // Cannot transition to room
      return;
    }

    // Start transition and freeze player movement
    // Note: Player movement transition is now handled by consolidatedGameStore
    
    // Load the target room if not already loaded
    await get().loadRoom(toRoomId);
    
    // Set new active room immediately
    get().setActiveRoom(toRoomId);
    
    // Emit teleportation event for player to listen to
    if (targetRoom) {
      const roomSize = targetRoom.size || 10;
      
      // Use unified door utilities to calculate spawn position
      let { position, rotation } = calculatePlayerSpawnPosition(direction, roomSize);
      const roomHalfSize = roomSize / 2;

      // Validate spawn position is within room bounds
      const isWithinBounds = 
        Math.abs(position.x) < roomHalfSize - 1 && 
        Math.abs(position.z) < roomHalfSize - 1;
      
      if (!isWithinBounds) {
        // Spawn position is out of bounds
        // Fallback to center of room
        position = new THREE.Vector3(0, 1.6, 0);
        rotation = new THREE.Euler(0, 0, 0);
      }

    // Teleport emission is centralized in consolidatedGameStore.startTransition
    // to avoid duplicate/conflicting spawns.
    }
    
    // Complete transition and re-enable movement after a delay
    setTimeout(() => {
      // Note: Player movement transition completion is now handled by consolidatedGameStore
      get().unloadRoom(fromRoomId);
    }, 1500); // Longer delay to show transition effect
    
  },

  completeTransition: () => {
    const { transition } = get();
    if (!transition) return;

    
    // Set new active room
    get().setActiveRoom(transition.toRoomId);

    // Clear transition
    set({ transition: null });
  },

  updateRoomState: (roomId: string, updates: Partial<RoomInstance>) => {
    const { roomInstances } = get();
    const roomInstance = roomInstances.get(roomId);
    
    if (!roomInstance) {
      // Room not found for state update
      return;
    }

    const updatedInstance = { ...roomInstance, ...updates };
    const newInstances = new Map(roomInstances);
    newInstances.set(roomId, updatedInstance);
    
    set({ roomInstances: newInstances });
  },

  setLoading: (isLoading: boolean, progress = 0) => {
    set({ isLoading, loadingProgress: progress });
  },

  cleanup: () => {
    set({
      currentRoomId: null,
      roomInstances: new Map(),
      transition: null,
      isLoading: false,
      loadingProgress: 0,
    });
  },
}));

export default useRoomManagerStore;
