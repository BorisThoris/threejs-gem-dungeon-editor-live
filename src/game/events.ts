/**
 * The one event bus.
 *
 * The old tree had two (gameEvents and uiEvents) with string names and
 * untyped payloads, plus window CustomEvents for the things that fit neither.
 * Anything that is not state - a sound cue, a prompt, a puzzle request - goes
 * through here, and the payload types are checked.
 */

export interface Prompt {
  key: string;
  text: string;
  enabled: boolean;
}

export interface PuzzleRequest {
  kind: "number";
  difficulty: "easy" | "medium" | "hard";
  /** Which room asked, so it can hear the result. */
  roomId: string;
}

export interface BusEvents {
  runStarted: undefined;
  runWon: undefined;
  runLost: undefined;
  gemCollected: { roomId: string };
  damaged: undefined;
  lifeBought: undefined;
  doorOpened: { toRoomId: string };
  roomEntered: { roomId: string };
  /** Something in reach of the player, or nothing. */
  prompt: Prompt | null;
  /** A line of guidance for the room the player is in, or nothing. */
  hint: string | null;
  puzzleOpen: PuzzleRequest;
  puzzleResult: { roomId: string; completed: boolean };
  /** Snap the camera to a heading, e.g. after travelling. */
  lookSet: { yaw: number; pitch: number };
  /** Move the player body, e.g. after travelling or from a test harness. */
  teleport: { position: [number, number, number]; yaw?: number };
  /** The player stepped on something that hurts. */
  hazard: undefined;
}

type Handler<T> = (payload: T) => void;

const listeners = new Map<keyof BusEvents, Set<Handler<never>>>();

export const bus = {
  on<K extends keyof BusEvents>(event: K, handler: Handler<BusEvents[K]>): () => void {
    let set = listeners.get(event);
    if (!set) {
      set = new Set();
      listeners.set(event, set);
    }
    set.add(handler as Handler<never>);
    return () => {
      set!.delete(handler as Handler<never>);
    };
  },

  emit<K extends keyof BusEvents>(
    event: K,
    ...args: BusEvents[K] extends undefined ? [] : [BusEvents[K]]
  ): void {
    const set = listeners.get(event);
    if (!set) return;
    const payload = args[0] as BusEvents[K];
    // Copy: a handler may unsubscribe itself mid-dispatch.
    for (const handler of [...set]) (handler as Handler<BusEvents[K]>)(payload);
  },
};
