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
  GAME_PAUSE: "GAME_PAUSE",
  GAME_UNPAUSE: "GAME_UNPAUSE",
};
