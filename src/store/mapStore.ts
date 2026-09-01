import { create } from 'zustand';
import type { MapState, MapActions, GameMap, MapConfig } from '../types/map';
import { SimpleMapGenerator, defaultSimpleConfig } from '../algorithms/simpleMapGenerator';
import { DEMO_ROOM_TYPES } from '../configs/mapGeneration';

const defaultConfig: MapConfig = {
  width: 20,
  height: 20,
  roomSize: 10,
  minRooms: 8,
  maxRooms: 15,
  specialRoomChance: 0.6,
  connectionChance: 0.4,
};

const useMapStore = create<MapState & MapActions>((set, get) => ({
  // State
  currentMap: null,
  currentRoomId: null,
  visitedRooms: new Set(),
  isGenerating: false,
  error: null,

  // Actions
  generateMap: (config = {}, enabledBiomeCategories?: string[]) => {
    // Generating is idempotent per session. Callers guard on `!currentMap`, but
    // that check races: React re-invokes effects in development, and the second
    // invocation ran before the first had stored its map, so two different
    // dungeons were built and the player explored whichever landed last.
    // To deliberately build a new dungeon (starting a new run), call clearMap()
    // first.
    if (get().isGenerating || get().currentMap) return;

    set({ isGenerating: true, error: null });
    
    try {
      const finalConfig = { ...defaultConfig, ...config };
      
      // Use simple generator for enhanced maps
      const generator = new SimpleMapGenerator({
        ...defaultSimpleConfig,
        ...config,
        minRooms: finalConfig.minRooms,
        maxRooms: finalConfig.maxRooms,
        specialRoomChance: finalConfig.specialRoomChance,
        enabledBiomeCategories: enabledBiomeCategories,
        // The demo ships a curated set of finished rooms rather than every
        // biome the generator knows how to emit.
        allowedRoomTypes: DEMO_ROOM_TYPES,
        // Portal rooms are placed by their own path, outside the allow-list,
        // and PortalBiome's destination is not wired to the run - a portal
        // that goes nowhere reads as a bug. Off for the demo.
        usePortals: false,
      });
      
      const result = generator.generateMap();
      
      const map: GameMap = {
        id: `map_${Date.now()}`,
        rooms: result.rooms,
        startRoomId: result.startRoomId,
        endRoomId: result.endRoomId,
        config: finalConfig,
        generatedAt: Date.now(),
      };
      
      
      const startRoom = result.rooms.find(r => r.id === result.startRoomId);
      if (startRoom) {
      }

      // Room bounds are not seeded from map-grid positions any more: rooms are
      // rendered one at a time at the origin, so UnifiedRoomManager registers
      // origin-local bounds for whichever room is active.

      set({
        currentMap: map,
        currentRoomId: map.startRoomId,
        visitedRooms: new Set([map.startRoomId]),
        isGenerating: false,
        error: null,
      });
    } catch (error) {
      set({
        isGenerating: false,
        error: error instanceof Error ? error.message : 'Failed to generate map',
      });
    }
  },

  setCurrentRoom: (roomId: string) => {
    const { currentMap } = get();
    if (currentMap && currentMap.rooms.find(room => room.id === roomId)) {
      set({ currentRoomId: roomId });
    }
  },

  markRoomVisited: (roomId: string) => {
    const { visitedRooms } = get();
    const newVisitedRooms = new Set(visitedRooms);
    newVisitedRooms.add(roomId);
    set({ visitedRooms: newVisitedRooms });
  },

  clearMap: () => {
    set({
      currentMap: null,
      currentRoomId: null,
      visitedRooms: new Set(),
      error: null,
    });
  },

  setError: (error: string | null) => {
    set({ error });
  },
}));

export default useMapStore;
// Dev-only handle, matching consolidatedGameStore, so the dungeon can be
// inspected from the console. Stripped from production.
if (import.meta.env.DEV) {
  (window as unknown as Record<string, unknown>).__mapStore = useMapStore;
}
