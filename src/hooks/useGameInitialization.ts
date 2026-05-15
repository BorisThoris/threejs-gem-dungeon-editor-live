import { useState, useEffect, useCallback } from 'react';
import useMapStore from '../store/mapStore';
import useRoomManagerStore from '../store/roomManagerStore';
import useGameStore from '../store/gameStore';
import { loadTextureFromImage } from '../utils/textureUtils';

interface InitializationProgress {
  progress: number;
  status: string;
  isComplete: boolean;
}

interface InitializationStep {
  name: string;
  weight: number;
  action: () => Promise<void>;
}

export const useGameInitialization = () => {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('Initializing...');
  const [isComplete, setIsComplete] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  const { generateMap, currentMap } = useMapStore();
  const { loadRoom } = useRoomManagerStore();
  const { initializeGame } = useGameStore();

  // Pre-load textures
  const preloadTextures = useCallback(async () => {
    const textureTypes = ['wood', 'brick', 'cobblestone', 'grass', 'water'];
    const promises = textureTypes.map(async (type) => {
      try {
        await loadTextureFromImage(type);
      } catch (error) {
        // Failed to preload texture
      }
    });
    await Promise.all(promises);
  }, []);

  // Pre-load room assets
  const preloadRoomAssets = useCallback(async () => {
    if (!currentMap) return;
    
    // Pre-load start room
    if (currentMap.startRoomId) {
      await loadRoom(currentMap.startRoomId);
    }
    
    // Pre-load connected rooms (first level)
    const startRoom = currentMap.rooms.find(r => r.id === currentMap.startRoomId);
    if (startRoom && startRoom.connections) {
      const connectedRoomIds = startRoom.connections.slice(0, 3); // Pre-load first 3 connected rooms
      const loadPromises = connectedRoomIds.map(roomId => loadRoom(roomId));
      await Promise.all(loadPromises);
    }
  }, [currentMap, loadRoom]);

  // Initialize game systems
  const initializeGameSystems = useCallback(async () => {
    // Initialize game store
    initializeGame();
    
    // Initialize physics world (simulated)
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Initialize audio system (simulated)
    await new Promise(resolve => setTimeout(resolve, 100));
  }, [initializeGame]);

  // Cache game data
  const cacheGameData = useCallback(async () => {
    // Cache room configurations
    const roomConfigs = currentMap?.rooms.map(room => ({
      id: room.id,
      type: room.type,
      position: room.position,
      connections: room.connections,
    })) || [];
    
    // Store in session storage for quick access
    sessionStorage.setItem('cachedRoomConfigs', JSON.stringify(roomConfigs));
    
    // Cache texture data
    const textureCache = new Map();
    sessionStorage.setItem('textureCache', JSON.stringify(Array.from(textureCache.entries())));
  }, [currentMap]);

  // Main initialization function
  const initialize = useCallback(async () => {
    setIsInitializing(true);
    setProgress(0);
    setStatus('Starting initialization...');

    const steps: InitializationStep[] = [
      {
        name: 'Initializing game systems',
        weight: 0.1,
        action: initializeGameSystems,
      },
      {
        name: 'Generating world map',
        weight: 0.2,
        action: async () => {
          if (!currentMap) {
            generateMap();
            await new Promise(resolve => setTimeout(resolve, 300));
          }
        },
      },
      {
        name: 'Pre-loading textures',
        weight: 0.2,
        action: preloadTextures,
      },
      {
        name: 'Pre-loading room assets',
        weight: 0.3,
        action: preloadRoomAssets,
      },
      {
        name: 'Caching game data',
        weight: 0.1,
        action: cacheGameData,
      },
      {
        name: 'Finalizing initialization',
        weight: 0.1,
        action: async () => {
          await new Promise(resolve => setTimeout(resolve, 200));
        },
      },
    ];

    let totalProgress = 0;
    const totalWeight = steps.reduce((sum, step) => sum + step.weight, 0);

    for (const step of steps) {
      setStatus(step.name);
      
      try {
        await step.action();
        totalProgress += step.weight;
        setProgress(totalProgress / totalWeight);
      } catch (error) {
        // Error in step
        // Continue with next step even if one fails
        totalProgress += step.weight;
        setProgress(totalProgress / totalWeight);
      }
    }

    setProgress(1.0);
    setStatus('Initialization complete!');
    setIsComplete(true);
    setIsInitializing(false);
  }, [
    currentMap,
    generateMap,
    initializeGameSystems,
    preloadTextures,
    preloadRoomAssets,
    cacheGameData,
  ]);

  // Auto-initialize on mount
  useEffect(() => {
    initialize();
  }, [initialize]);

  return {
    progress,
    status,
    isComplete,
    isInitializing,
    initialize,
  };
};
