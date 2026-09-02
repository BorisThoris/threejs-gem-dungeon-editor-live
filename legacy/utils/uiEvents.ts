// Event-driven UI system to prevent React re-renders
type UIEvent = string;
type UIEventCallback = (...args: any[]) => void;

interface UIEvents {
  on(event: UIEvent, callback: UIEventCallback): () => void;
  emit(event: UIEvent, ...args: any[]): void;
}

const createUIEvents = (): UIEvents => {
  const listeners: { [key: string]: UIEventCallback[] } = {};

  return {
    on: (event, callback) => {
      if (!listeners[event]) {
        listeners[event] = [];
      }
      listeners[event].push(callback);
      return () => {
        listeners[event] = listeners[event].filter((cb) => cb !== callback);
      };
    },
    emit: (event, ...args) => {
      if (listeners[event]) {
        listeners[event].forEach((callback) => callback(...args));
      }
    },
  };
};

export const uiEvents = createUIEvents();

export const UI_EVENTS = {
  MOUSE_LOOK_START: "MOUSE_LOOK_START",
  MOUSE_LOOK_END: "MOUSE_LOOK_END",
  PLAYER_STATS_UPDATE: "PLAYER_STATS_UPDATE",
  INVENTORY_UPDATE: "INVENTORY_UPDATE",
  ROOM_CHANGE: "ROOM_CHANGE",
  // Payload: { key, text, enabled } while a door is in reach, or null.
  DOOR_PROMPT: "DOOR_PROMPT",
  /**
   * Payload: { puzzleType, difficulty } to open a puzzle, or null to close it.
   *
   * Puzzles are full-screen DOM. Rooms live inside the R3F canvas, so a room
   * cannot render one itself - React tries to reconcile <div> as a three.js
   * object. The room asks; the overlay outside the canvas answers, the same
   * way the door prompt works.
   */
  PUZZLE_OPEN: "PUZZLE_OPEN",
  /** Payload: { completed: boolean } once the player finishes or backs out. */
  PUZZLE_RESULT: "PUZZLE_RESULT",
  GAME_PAUSE: "GAME_PAUSE",
  GAME_UNPAUSE: "GAME_UNPAUSE",
};
