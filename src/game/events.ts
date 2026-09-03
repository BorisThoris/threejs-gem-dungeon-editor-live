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
  /** The floor's Warden has woken, in this room. */
  wardenWoke: { roomId: string };
  /** It has walked into the room the player is standing in. */
  wardenEntered: { roomId: string };
  /** It has stepped into a room next door: heard, not seen. */
  wardenNearby: { roomId: string };
  /** It reached the player. */
  wardenStruck: undefined;
  /** A sprint gave the player away: it knows which room they are in. */
  wardenHeard: undefined;
  /** A thrown sound has sent it somewhere that is not where the player is. */
  wardenLured: { roomId: string };
  /** The Bone Charm ate a hit. */
  charmSpent: undefined;
  /** A gem was taken and the floor is that much more awake. */
  alarmRaised: { alarm: number };
  /** A relic was taken. */
  relicTaken: { id: string };
  /** Something went into the satchel. */
  itemTaken: { id: string };
  /** Something came out of it, and is now known for what it was. */
  itemUsed: { id: string; cruel: boolean };
  /** The shopkeeper put a name to something without it being spent. */
  itemNamed: { id: string };
  /** The arena's arms have started or stopped. */
  arenaRun: { running: boolean };
  /** The floor's key has been picked up. */
  keyTaken: undefined;
  /** A vault has been unlocked. */
  vaultOpened: { roomId: string };
  /** A Sentry held the player in its beam long enough to call out. */
  /** A watcher called out. `pan` is which side of the player it stands on. */
  sentrySaw: { pan: number };
  /**
   * How near the Warden is, 0 (not in the room) to 3 (on top of you).
   * Quantised and emitted only on change, so the DOM can draw from it.
   */
  wardenProximity: { level: number };
  /** The exit was taken and a deeper floor begins. */
  floorDescended: { floor: number };
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
