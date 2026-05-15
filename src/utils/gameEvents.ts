// Event-driven state management for Three.js
// This prevents React re-renders from affecting the game loop

type EventCallback = (...args: any[]) => void;

class GameEventManager {
  private events: Map<string, EventCallback[]> = new Map();

  // Subscribe to an event
  on(event: string, callback: EventCallback) {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event)!.push(callback);
    
    // Return unsubscribe function
    return () => {
      const callbacks = this.events.get(event);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    };
  }

  // Emit an event
  emit(event: string, ...args: any[]) {
    const callbacks = this.events.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(...args);
        } catch (error) {
          console.error(`Error in event callback for ${event}:`, error);
        }
      });
    }
  }

  // Remove all listeners for an event
  off(event: string) {
    this.events.delete(event);
  }

  // Clear all events
  clear() {
    this.events.clear();
  }
}

// Global event manager instance
export const gameEvents = new GameEventManager();

// Event types for type safety
export const GAME_EVENTS = {
  ROOM_ENTER: 'room_enter',
  ROOM_EXIT: 'room_exit',
  GAME_PHASE_CHANGE: 'game_phase_change',
  ACTION_CARD_SHOW: 'action_card_show',
  ACTION_CARD_HIDE: 'action_card_hide',
  PLAYER_MOVEMENT: 'player_movement',
  UI_UPDATE: 'ui_update',
  CAMERA_SET_ROTATION: 'camera_set_rotation',
  CAMERA_ROTATION_CHANGE: 'camera_rotation_change',
} as const;

export type GameEventType = typeof GAME_EVENTS[keyof typeof GAME_EVENTS];
