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
  /** The floor's own spikes bit it. `wounds` is how many it has taken. */
  wardenWounded: { wounds: number };
  /**
   * Wounded once too often: thrown across the floor, and from now on it
   * walks round what hurt it.
   */
  wardenRouted: undefined;
  /** A sprint gave the player away: it knows which room they are in. */
  wardenHeard: undefined;
  /**
   * Something on the floor moved up or down the awareness ladder.
   *
   * The ladder's whole point is a wide grey zone between safe and caught,
   * and a range of internal states nobody can perceive is not a range at
   * all - so every rung change says itself, and the audio layer turns it
   * into a bark in a direction. `rose` is here because up and down want
   * opposite sounds: being noticed is a sudden thing and being forgotten
   * is a slow one, and one event carrying both would have to be told
   * apart by whoever listens.
   */
  rungChanged: { who: string; rung: number; rose: boolean; name: string };
  /** The lantern went up or down. */
  lanternToggled: { raised: boolean };
  /** The last of the oil burned away. */
  lanternOut: undefined;
  /** Filled from a brazier. */
  lanternFilled: undefined;
  /** A doorway was barred, from the room the player is standing in. */
  doorBarred: { roomId: string; toRoomId: string };
  /**
   * A bar is gone. `byWarden` is the difference between the two ways that
   * happens - it came through, or the player lifted it walking out - and
   * they want opposite sounds and opposite reactions.
   */
  barBroken: { byWarden: boolean };
  /** A thrown sound has sent it somewhere that is not where the player is. */
  wardenLured: { roomId: string };
  /** The Bone Charm ate a hit. */
  charmSpent: undefined;
  /**
   * A relic was taken, and where from when the thing that took it knew.
   *
   * The place is optional on all three of these because three of the five
   * callers have no place to give: a puzzle's reward is not lying
   * anywhere, it is granted. What has a spot says so, and the flourish
   * plays where the player is when nothing does.
   */
  relicTaken: { id: string; x?: number; z?: number };
  /** Something went into the satchel. */
  itemTaken: { id: string; x?: number; z?: number };
  /** Something came out of it, and is now known for what it was. */
  itemUsed: { id: string; cruel: boolean };
  /** The shopkeeper put a name to something without it being spent. */
  itemNamed: { id: string };
  /** A kind was lifted a step: cursed to plain, or plain to blessed. */
  itemBlessed: { id: string; charge: string };
  /** A device was set down on the floor of the room the player is in. */
  devicePlaced: { id: string; cruel: boolean };
  /** Something small has come into the room, and it wants what you carry. */
  thiefCame: { roomId: string };
  /** It got a gem off you and is running for a doorway. */
  thiefTook: { gems: number };
  /** It made it out with them, and they are in its nest now. */
  thiefFled: { gems: number; roomId: string | null };
  /** It was caught - by the player, or by something on the floor. */
  thiefCaught: { gems: number };
  /** The nest was walked to and emptied. */
  nestEmptied: { gems: number };
  /** The arena's arms have started or stopped. */
  arenaRun: { running: boolean };
  /** The floor's key has been picked up. */
  keyTaken: undefined;
  /**
   * The key has been set down. It is a heavy piece of cut metal, so this
   * is a noise where the key is rather than a number leaving a wallet.
   */
  keyDropped: { roomId: string };
  /** The key is holding a plate down, and the plate is keeping it. */
  keySetOnPlate: { roomId: string };
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
  /** The floor arrived at, and how hot the floor being left had become. */
  floorDescended: { floor: number; heat: number };
  runLost: undefined;
  /** A deed was done for the first time. */
  deedEarned: { id: string };
  gemCollected: { roomId: string; x?: number; z?: number };
  damaged: undefined;
  lifeBought: undefined;
  doorOpened: { toRoomId: string };
  roomEntered: { roomId: string };
  /** Something in reach of the player, or nothing. */
  prompt: Prompt | null;
  /** A line of guidance for the room the player is in, or nothing. */
  hint: string | null;
  /**
   * A line that says itself and then goes, over the room's own hint.
   *
   * Separate from `hint` because they are two different facts with two
   * different owners, and one line held both: the room you are in owns the
   * standing instruction, and the teaching lines - a floor's blurb, the
   * Warden waking - own a passing one. The teaching line cleared itself by
   * emitting `hint: null`, which erased whatever the room had put there,
   * and nothing ever put it back. Standing in a memory chamber six and a
   * half seconds after arriving on the floor, there was no instruction on
   * screen at all.
   */
  notice: string | null;
  /** A gem given at a shrine, and the floor let go of the player. */
  /** A bomb went off, here. */
  bombBurst: { roomId: string; x: number; z: number };
  /** A cracked wall opened onto the room behind it. */
  secretRevealed: { roomId: string; to: string };
  /**
   * The floor's heat has moved up a band.
   *
   * Named, never counted. The band is here for the audio layer to pitch
   * against and the name is what the player is shown - the two together
   * are the whole of Law 3 applied to the one number the player is not
   * entitled to see: the rule is transparent (lingering and taking things
   * heats a floor) and the magnitude is not.
   */
  floorHeat: { band: number; name: string };
  /** The floor's heat bought something, and here it comes. */
  heatSpent: { id: string; says: string };
  /** It ran out, and the Reaper is on the floor. */
  reaperWoke: undefined;
  /** It reached the player. */
  reaperStruck: undefined;
  /** A blast is holding it where it stands. */
  reaperStalled: undefined;
  /** A snare on the floor went off, and what set it off. */
  snareSprung: { by: "warden" | "rat" };
  /** The moth settled on the raised lantern. */
  mothLanded: undefined;
  /** And left it, carrying the light in the Warden's eye a while. */
  mothLeft: undefined;
  /** A roost burst: the noise of it carries. */
  batsRoused: undefined;
  /** The lamplighter wisp gathered at the raised lantern. */
  wispCame: undefined;
  /** And went out with the light. */
  wispLeft: undefined;
  /** The floor's Harrier is up. */
  harrierWoke: undefined;
  /** It reached the player. */
  harrierStruck: undefined;
  /** A blast knocked it out of the air. */
  harrierDowned: undefined;
  /** Downed over something that bites: gone for the floor. */
  harrierSlain: undefined;
  /** The player walked into a room the Keeper stands in. */
  keeperBars: undefined;
  /** It reached the player. */
  keeperStruck: undefined;
  /** A blast made it kneel: the last stairs are open a while. */
  keeperKnelt: undefined;
  /** It got back up. */
  keeperRose: undefined;
  /** The player marked a room on the map, or unmarked it. */
  mapMarked: { roomId: string; marked: boolean };
  /** A sound through a thin wall, and what it says is behind it. */
  wallSound: { roomId: string; flavour: "hoard" | "reliquary" | "shrine" };
  /** A barrel, crate or urn burst in a blast. */
  propBroken: { roomId: string; kind: string; key: string };
  /** A draft of air from a cracked wall, felt for the first time this visit. */
  draftFelt: { roomId: string };
  /** One of the floor's own traps went off, and what set it off. */
  trapSprung: { key: string; kind: "darts" | "pit" | "grate"; by: "player" | "warden" };
  shrineKept: { roomId: string };
  puzzleOpen: PuzzleRequest;
  puzzleResult: { roomId: string; completed: boolean };
  /** Snap the camera to a heading, e.g. after travelling. */
  lookSet: { yaw: number; pitch: number };
  /** Move the player body, e.g. after travelling or from a test harness. */
  teleport: { position: [number, number, number]; yaw?: number };
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
    for (const handler of [...set]) {
      /**
       * One handler throwing must not silence the rest.
       *
       * This dispatched bare, so the first listener to throw ended the
       * loop and every listener registered after it never ran. It cost a
       * real afternoon: a new sound cue passed a pan where the oscillator
       * wanted a sweep target, the audio listener threw, and what the
       * player saw was not a missing sound - it was the Warden being
       * routed with no line on screen, because the teaching line's
       * listener was registered after the audio one and never got the
       * event. A bus whose subscribers can take each other down couples
       * every system on it to the buggiest one.
       *
       * Still loud: the error is reported, and in dev it is rethrown out
       * of band so it reaches the page and the checks that watch for page
       * errors, rather than being quietly swallowed.
       */
      try {
        (handler as Handler<BusEvents[K]>)(payload);
      } catch (error) {
        console.error(`bus handler for "${String(event)}" threw`, error);
        if (import.meta.env.DEV) setTimeout(() => { throw error; }, 0);
      }
    }
  },
};
