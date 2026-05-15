// Ref-based state management that doesn't trigger React re-renders
// This is the key to preventing canvas hanging in Three.js apps

import { useRef, useCallback, useEffect } from 'react';
import { gameEvents, GAME_EVENTS } from '../utils/gameEvents';

interface GameState {
  currentRoomId: string | null;
  gamePhase: 'exploration' | 'puzzle' | 'boss';
  actionCardsVisible: boolean;
  playerPosition: { x: number; y: number; z: number };
  lastUpdateTime: number;
}

export const useGameState = () => {
  // Use refs instead of state to prevent re-renders
  const gameState = useRef<GameState>({
    currentRoomId: null,
    gamePhase: 'exploration',
    actionCardsVisible: false,
    playerPosition: { x: 0, y: 0, z: 0 },
    lastUpdateTime: 0,
  });

  // Throttle updates to prevent excessive calls
  const updateThrottle = useRef(0);
  const THROTTLE_MS = 100; // 10fps max

  // Update room without triggering re-renders
  const updateRoom = useCallback((roomId: string | null) => {
    const now = Date.now();
    if (now - updateThrottle.current < THROTTLE_MS) return;
    
    updateThrottle.current = now;
    
    if (gameState.current.currentRoomId !== roomId) {
      gameState.current.currentRoomId = roomId;
      
      // Emit event for UI components to listen to
      // Note: Other components emit room objects, so we need to be consistent
      // For now, we'll emit the roomId as a string, but RoomManager should handle both cases
      gameEvents.emit(GAME_EVENTS.ROOM_ENTER, roomId);
    }
  }, []);

  // Update game phase without triggering re-renders
  const updateGamePhase = useCallback((phase: 'exploration' | 'puzzle' | 'boss') => {
    if (gameState.current.gamePhase !== phase) {
      gameState.current.gamePhase = phase;
      gameEvents.emit(GAME_EVENTS.GAME_PHASE_CHANGE, phase);
    }
  }, []);

  // Update player position without triggering re-renders
  const updatePlayerPosition = useCallback((position: { x: number; y: number; z: number }) => {
    gameState.current.playerPosition = position;
    gameEvents.emit(GAME_EVENTS.PLAYER_MOVEMENT, position);
  }, []);

  // Show/hide action cards without triggering re-renders
  const setActionCardsVisible = useCallback((visible: boolean) => {
    if (gameState.current.actionCardsVisible !== visible) {
      gameState.current.actionCardsVisible = visible;
      gameEvents.emit(visible ? GAME_EVENTS.ACTION_CARD_SHOW : GAME_EVENTS.ACTION_CARD_HIDE);
    }
  }, []);

  // Get current state (for components that need it)
  const getState = useCallback(() => gameState.current, []);

  // Subscribe to events for external updates
  useEffect(() => {
    const unsubscribeRoomEnter = gameEvents.on(GAME_EVENTS.ROOM_ENTER, (roomId) => {
      // Room entered
    });

    const unsubscribeGamePhase = gameEvents.on(GAME_EVENTS.GAME_PHASE_CHANGE, (phase) => {
      // Game phase changed
    });

    return () => {
      unsubscribeRoomEnter();
      unsubscribeGamePhase();
    };
  }, []);

  return {
    updateRoom,
    updateGamePhase,
    updatePlayerPosition,
    setActionCardsVisible,
    getState,
  };
};
