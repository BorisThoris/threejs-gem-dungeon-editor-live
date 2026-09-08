import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

import { bus } from "../events";
import { generateDungeon } from "../dungeon/generate";
import { doorPosition, spawnAfterTravel, spawnAtStart, crackSpot } from "../dungeon/layout";
import { DIR_STEP, OPPOSITE, roomById, type Dir, type Dungeon, type Room } from "../dungeon/types";
import {
  AVARICE_ALARM,
  AVARICE_GEMS,
  BANISH_CALM,
  DREAD_ALARM,
  ECHOES_S,
  GLOOM_S,
  ITEMS,
  MIRE_S,
  MIRE_LOUDNESS,
  ITEM_IDS,
  RATTLE_ALARM,
  SATCHEL_SLOTS,
  SNARE_HOLD_S,
  SNARE_RADIUS,
  SWIFTNESS_S,
  WARD_S,
  appearancesFor,
  isBomb,
  isDevice,
  rollItem,
  type Appearances,
  type ItemId,
} from "../items/catalog";
import { chargesFor, inverted, lifted, scaled, type Charge, type Charges } from "../items/charge";
import { DEFAULT_DELVER, DELVERS, delverOr, knownFrom, type DelverId } from "../delvers/catalog";
import { useRecords } from "./records";
import { modifiers, type RelicId } from "../relics/catalog";
import { paceFor, type Pace, type PaceEffect } from "../systems/pace";
import { playerAt } from "../player/where";
import { BREAKABLE, breakKey, shielded, spillFor } from "../props/breakable";
import { chestKey, placementsFor } from "../rooms/placements";
import { gemFor, keyFor } from "../rooms/kinds";
import { sentryFor } from "../sentry/placement";
import { nestRoom } from "../thief/nest";
import { biomeFor } from "../rooms/biomes";
import { keeperPostsFor } from "../keeper/posts";
import { BODIES, type Body } from "../mobs/body";
import { REAPER_AT, affordable, bandFor, bandName, heatFrom, type PurchaseId } from "../heat/coefficient";
import {
  GLIM_BANDS,
  GLIM_MAX,
  RAISE_OIL,
  RAISE_S,
  cracksShow,
  gemveinsShow,
  glimBand,
  oilForRoom,
} from "../lantern/glim";
import { AFFLICTIONS, BATCH, afflictionFor } from "../items/afflictions";
import { bombCracks, snareSets } from "../verbs/gates";
import { surfaceOf } from "../din/emissions";
import { barKey } from "../warden/bars";
import { banishTo, wakingRoom } from "../warden/roam";
import { behaviourFor } from "../warden/tuning";
import {
  ALARM_PER_GEM,
  BAR_NOISE_S,
  BAR_S,
  BATS_NOISE_FACTOR,
  BATS_ROUSED_S,
  BOMB_FUSE_S,
  BOMB_RADIUS,
  CLOSE_REACH,
  CUTPURSE_FROM_FLOOR,
  CUTPURSE_GRACE_ROOMS,
  CUTPURSE_REST_S,
  CUTPURSE_SHY_S,
  DAMAGE_COOLDOWN_S,
  DART_REARM_S,
  FLOORS,
  GRATE_HOLD_S,
  HARRIER_DOWN_S,
  HARRIER_RETREAT_S,
  KEEPER_FLOOR,
  KEEPER_STALL_S,
  KEEPER_STRIKE_GRACE_S,
  LANTERN_OIL_FULL,
  LANTERN_SEEN_HOLD_S,
  MOTH_HOLD_S,
  NOISE_HOLD_S,
  REAPER_STALL_S,
  REAPER_STRIKE_GRACE_S,
  STARTING_LIVES,
  TRANSITION_FALLBACK_MS,
  WARDEN_BANISH_DISTANCE,
  WARDEN_ROUT_CALM,
  WARDEN_STAGGER_S,
  WARDEN_WOUNDS_TO_ROUT,
  floorRules,
  tollForFloor,
} from "../world";

export type Phase = "menu" | "playing" | "won" | "lost";

/**
 * What the Cutpurse is doing. It is only ever in the room the player is
 * standing in - it has no life of its own between visits, because a thief
 * that wanders a floor nobody is watching is just a second Warden with a
 * different model.
 */
export type ThiefPhase = "away" | "stalking" | "fleeing";

/** A device the player has put down, where they put it. */
export interface PlacedDevice {
  /** Unique for the run, so a snare can be sprung by name. */
  key: string;
  id: ItemId;
  roomId: string;
  x: number;
  z: number;
  /** False once a snare has caught something: it stays as wreckage. */
  live: boolean;
  /** A bomb's deadline on the run's clock. Only bombs have one. */
  fuseAt?: number;
}

/** What can set a snare off: the thing it was set for, or something small. */
export type SnareSpringer = "warden" | "rat";

export interface RunState {
  phase: Phase;
  paused: boolean;
  dungeon: Dungeon | null;
  /** 1-based; the run is won on leaving floor FLOORS. */
  floor: number;
  /**
   * The seed the run started from: the one worth showing and replaying.
   * Each floor's dungeon is generated from a seed derived from it, so
   * `dungeon.seed` is this floor's and parts company with this on the way
   * down. Showing that one meant every "same dungeon again" replayed a
   * floor nobody had played.
   */
  runSeed: number;
  /** Rooms first entered over the whole run, for the summary. */
  roomsSeen: number;
  currentRoomId: string | null;
  /** Room ids in the order first entered. */
  visited: string[];
  lives: number;
  maxLives: number;
  /** Gems in hand: the toll comes out of these, and what is left is the score. */
  gems: number;
  /** Gems collected over the whole run, for the summary. */
  gemsTotal: number;
  /** Rooms whose gem has been taken. */
  gemRooms: string[];
  /** Rooms whose puzzle or challenge has been completed. */
  cleared: string[];
  /** Rooms whose puzzle or challenge has been failed for good. */
  failed: string[];
  /**
   * How far into a room's trial the player is: misses spent in the attempt
   * under way, and attempts spent for good.
   *
   * This is a fact about the run, and it used to be a fact about a
   * component. The memory trial counted both in `useState`, and only the
   * room the player is standing in is mounted - so stepping through a door
   * and back handed you a fresh allowance and the trial's whole cost, a
   * life at two misses and the book burned at two attempts, could be walked
   * away from and never paid.
   */
  trials: Record<string, { attempts: number; misses: number }>;
  /**
   * Who went down. Chosen at the title and fixed for the run: it decides
   * what the first door is walked up to with, and it goes on the summary
   * because "twenty-two gems" means two different things depending on
   * which of these was carrying them.
   */
  delver: DelverId;
  /** Relics held. What they do is decided in relics/catalog.ts. */
  relics: RelicId[];
  /** What is in the satchel, oldest first. Four slots, used with 1-4. */
  satchel: ItemId[];
  /** Items whose appearance the player has worked out, this run. */
  identified: ItemId[];
  /** Which look means which item, this run. Fixed when the run starts. */
  appearances: Appearances;
  /**
   * Which kinds this dungeon has blessed and which it has cursed, this
   * run. Visible on sight, unlike the appearances - see items/charge.ts
   * for why the two hidden axes are one hidden axis.
   *
   * Not readonly: the shop lifts one kind a step, which is the only thing
   * in the game that changes it.
   */
  charges: Charges;
  /** Timed effects, as the wall-clock second each one runs out. */
  effects: { swift: number; mire: number; gloom: number };
  /**
   * The room a thrown sound has sent the Warden to, and when it stops
   * caring. It walks there rather than towards the player, and while it is
   * doing that it is not listening for footsteps - which is what makes a
   * Scroll of Echoes the one thing that buys the right to run.
   */
  wardenLure: string | null;
  lureUntil: number;
  /**
   * Run-clock time until which the player is still being heard. Running is
   * loud: while this is in the future the Warden knows which room they are
   * in. Held here rather than in the player so the HUD, the driver and the
   * tests all read the same fact.
   */
  noisyUntil: number;
  /**
   * The lantern: whether it is up, and how many seconds of oil are left.
   *
   * Oil burns only while it is raised, so a player who keeps it down never
   * runs out and never has to think about it. `litUntil` is the other half
   * - the run-clock second the Warden stops walking towards the light -
   * and is the exact twin of `noisyUntil`, deliberately: the two bargains
   * in this game are shaped the same and are kept the same way.
   */
  /**
   * How much light the delver is showing, 0 to 100.
   *
   * This replaces `lanternRaised`, which was a boolean, and a boolean
   * cannot express the thing the lantern is for. Darkness has to be an
   * affordance the player SPENDS - cheap and instant to enter, expensive
   * and slow to leave, its payoff in a currency the lit state cannot buy
   * at all - and that needs steps between "on" and "off".
   *
   * Five named bands, and both ends pay: at the top you read the next room
   * from its doorway, and at the bottom the veins show in the walls and a
   * cracked wall shows itself without a bomb. The middle band buys
   * nothing, which is what makes it the middle.
   */
  glim: number;
  /**
   * When a raise finishes, on the run's clock.
   *
   * The asymmetry made physical: lowering is free and lands on the frame
   * it is asked for, and raising takes a moment and costs oil, so dropping
   * the flame to slip past a watcher is a commitment rather than a
   * keystroke.
   */
  glimUpAt: number;
  oil: number;
  litUntil: number;
  /** Whether a Scroll of Mapping has shown this floor. */
  mapped: boolean;
  /** Chests already emptied, as `roomId:index`. */
  looted: string[];
  /**
   * Devices set down on this floor, in the room they were set down in.
   *
   * Held on the run rather than in the room, because only one room is
   * mounted at a time and a snare has to still be there when the player
   * comes back through - which is most of the point of setting one. Wiped
   * with the floor, like the key and the lock.
   */
  placed: PlacedDevice[];
  /**
   * The room a ward stone lies in and the run-clock second it stops
   * holding. One at a time: a second stone moves the ward rather than
   * stacking, which is the reading of "while it lies here" that does not
   * need a rule to explain it.
   */
  wardRoomId: string | null;
  wardUntil: number;
  /**
   * The Cutpurse: what it is doing, when it will next try, and how much of
   * yours is in its nest.
   *
   * `nestRoomId` is derived from the floor rather than stored with it, and
   * cached here so the map, the room shell and the driver all read one
   * answer. `nestSeen` is whether the player has been shown where it is,
   * which is what turns a theft from a loss into a walk.
   */
  thiefPhase: ThiefPhase;
  thiefNextAt: number;
  /** Gems it is carrying right now: dropped if it is caught. */
  thiefHolding: number;
  /** Gems already in the nest, waiting to be walked to. */
  nestGems: number;
  nestRoomId: string | null;
  nestSeen: boolean;
  /**
   * The doorway the player has barred, and when it gives way on its own.
   *
   * One at a time: two would let a player wall themselves into a corner
   * and wait, which is a hiding place rather than a decision, and the
   * Warden's whole job is that there is nowhere to wait. Held as an edge
   * key (`warden/bars.ts`) rather than a room and a direction, because
   * barring a doorway from either side is the same act.
   */
  barredDoor: string | null;
  barUntil: number;
  /** A room whose doors are barred while something in it is happening. */
  sealedRoomId: string | null;
  /** Iron keys in hand. One opens one vault. */
  keys: number;
  /**
   * The room a set-down key is lying in, and where in it.
   *
   * The key was a counter for the whole of its life, which is what made it
   * a function wearing an object's name: a number in a wallet cannot be
   * put on a plate, cannot be dropped to make a noise, and cannot be taken
   * off you. It is a heavy piece of cut metal now, so it has to be
   * somewhere, and this is where.
   */
  keyLyingIn: string | null;
  keyLyingAt: { x: number; z: number } | null;
  /**
   * The room whose plate the key is holding down, for good.
   *
   * Heavy is a property the key has, and this is the price of using it:
   * the plate keeps it. A vault with only one way in could never have
   * allowed this, which is the whole argument for auditing per gate.
   */
  keyOnPlateIn: string | null;
  /**
   * How many containers have been opened toward working the mire out of
   * your hands. The cure is a NAMED TASK CLEARED BY PLAYING rather than a
   * subtraction: a flat cost is computed once and forgotten, and a task
   * makes the player price their own current fragility, so the same
   * draught is a different decision at different moments.
   */
  mireOpened: number;
  /**
   * Where the thing that followed you out of the dark is, which is never
   * where you are. It is the best lure in the game, and it is the reason
   * to drink an unknown potion in a room you want emptied.
   */
  dreadRoomId: string | null;
  /** The Cutpurse has the key in its hands, right now. */
  thiefKey: boolean;
  /** The Cutpurse got away with the key, and the nest has it. */
  nestKey: boolean;
  /** Vaults already opened, so a door stays open once it has been. */
  unlocked: string[];
  /**
   * The room whose key has been picked up. Kept apart from `unlocked`,
   * which the two used to share: it held today only because the generator
   * never puts a key inside the vault, and a second lock on a floor would
   * have made a picked-up key silently open a door.
   */
  keyTakenIn: string | null;
  /**
   * How roused this floor's Warden is. Raised by taking gems, reset on
   * every new floor. This is the whole risk side of the run: the more of a
   * floor you take, the harder it is to leave.
   */
  alarm: number;
  /**
   * What this floor's heat has already bought, so nothing is bought twice.
   *
   * Per floor rather than per run: the whole point of the coefficient
   * compounding with depth is that each floor starts its own ladder from a
   * higher base, and a roost that could only ever go up once in a run
   * would waste the compounding on floors two and three.
   */
  heatBought: PurchaseId[];
  /** Rooms entered on this floor, which is what wakes the Warden. */
  floorRooms: number;
  /** Which room the Warden is in, or null while it still sleeps. */
  wardenRoomId: string | null;
  /** The room it walked in from, so wandering does not just pace a corridor. */
  wardenCameFrom: string | null;
  /**
   * The doorway the player came into this room by, or null at a floor's
   * start. The one fact a grate needs: it drops behind whoever came in
   * under it, and "under it" is this.
   */
  enteredBy: Dir | null;
  /**
   * Wounds the Warden has taken from the floor's own spikes since it was
   * last routed, and the run-clock second it stops reeling from the last
   * one. Per floor, like everything else about it.
   */
  wardenWounds: number;
  wardenStaggerUntil: number;
  /**
   * Whether it has learned. Set by a rout and never unset on the floor it
   * happened on: from then on it walks round what bit it, and the trap
   * room is a trap room again rather than the answer to the Warden.
   */
  wardenWary: boolean;
  /**
   * The run-clock second this floor began. The floor's patience runs
   * from it, and a fresh floor is a fresh one: what you spent upstairs is
   * not held against you downstairs.
   */
  floorEnteredAt: number;
  /** The floor's patience ran out and the Reaper is on it. */
  reaperAwake: boolean;
  /** Run-clock second a blast stops holding the Reaper. */
  reaperStalledUntil: number;
  /** Run-clock second of the Reaper's last strike, for the grace between two. */
  reaperLastStrikeAt: number;
  /** The floor's Harrier is up and hunting. */
  harrierAwake: boolean;
  /** It was downed over something that bites, and is gone for the floor. */
  harrierSlain: boolean;
  /** Run-clock second it gets back off the floor after a blast. */
  harrierDownedUntil: number;
  /** Run-clock second it comes back after a strike. */
  harrierRetreatUntil: number;
  /** Run-clock second the Keeper gets back up after a blast. */
  keeperStalledUntil: number;
  /** Run-clock second of the Keeper's last strike, for the grace between two. */
  keeperLastStrikeAt: number;
  /** The moth is on the raised lantern, and the Warden can see it. */
  mothOn: boolean;
  /** Run-clock second the startled roost settles. */
  batsRousedUntil: number;
  /**
   * The floor's traps that have gone off, by key, and when. A dart plate
   * re-arms after a while; a pit stays open; both are the floor's and go
   * with it, like the devices.
   */
  sprung: Record<string, number>;
  /** The shop's one bomb this floor has been bought. */
  bombBought: boolean;
  /** Breakables that have burst this floor, by `breakKey`. */
  broken: string[];
  /**
   * Rooms the player has marked on the map. Theirs entirely: nothing in
   * the game reads a mark, which is what makes it worth making.
   */
  marks: string[];
  /**
   * Rooms whose draft the delver has FELT, which is a different thing
   * from a room the game knows has a crack in it.
   *
   * The Sounding Rod operates on this list and on nothing else, which is
   * what makes it an enabler rather than a substitute: it cannot show a
   * wall the player has not already stood at, so it saves the bomb and
   * never the noticing.
   */
  draftsFelt: string[];
  /** The lamplighter wisp is out: the Warden can see the player's light. */
  wispOut: boolean;
  /** Whether the player has met the Warden yet, for the one-time warning. */
  wardenMet: boolean;
  /** True from leaving one room until the next has mounted. */
  transitioning: boolean;
  /** Counted, not flagged: a puzzle overlay and a menu may both hold it. */
  inputLocks: number;
  lastDamageAt: number;
  /**
   * Seconds spent in the pause menu. Timed things - a potion, the damage
   * cooldown - are deadlines on `runClock`, which is wall time less this,
   * so a Potion of Swiftness is not burnt by twenty seconds in a menu.
   */
  pausedFor: number;
  /** When the current pause began, in wall seconds, or 0 while running. */
  pausedAt: number;
  /**
   * `runClock` when the run began, in seconds. On the run clock, not the
   * wall clock, so the summary and the records agree with everything else
   * the game times.
   */
  startedAt: number;
  /** The same clock, read when the run is won or lost. */
  endedAt: number;

  startRun: (seed?: number, delver?: DelverId) => void;
  quitToMenu: () => void;
  pause: () => void;
  resume: () => void;
  /** Walk through the doorway on this wall of the current room. */
  travel: (dir: Dir) => void;
  /** The room shell reports that its colliders are mounted. */
  roomReady: (roomId: string) => void;
  /**
   * Take the room's gem. `at` is where it was lying, when the caller
   * knows: the store does no geometry with it and only passes it on, so
   * the flourish can play where the gem stood rather than at the player.
   * A puzzle's reward has no spot and gives none.
   */
  collectGem: (
    roomId: string,
    at?: readonly [number, number],
    /**
     * How many gems it pays. One for a gem lying on a floor, and
     * `SET_PIECE_GEMS` for a set piece answered - the one place that
     * decides is `world.ts`, and the three rooms that pay it all ask.
     */
    worth?: number
  ) => boolean;
  spendGems: (amount: number) => boolean;
  /** Take a relic. Does not charge for it; the shop does that. */
  addRelic: (id: RelicId, at?: readonly [number, number]) => void;
  /** Put an item in the satchel. False when there is no room for it. */
  takeItem: (id: ItemId, from?: string, at?: readonly [number, number]) => boolean;
  /** Drink or read what is in a slot, and learn what it was. */
  useItem: (slot: number) => void;
  /**
   * Put the device in a slot down where the player is standing. Called by
   * `useItem` for anything in the device family, so 1-4 is still the one
   * key that spends a slot however the thing in it works.
   */
  placeDevice: (slot: number) => boolean;
  /** Learn what a slot holds without spending it. The shop charges for this. */
  identifySlot: (slot: number) => boolean;
  /**
   * Name several at once, and they lock in together.
   *
   * The designer who rejected limiting or punishing guesses put the reason
   * plainly - "I'd expect people to just not make guesses until the very
   * end" - which is exactly why our potions rotted in the satchel. The
   * shipped answer was batched, locking validation: guessing costs more
   * than deducing because a wrong guess in a batch wastes the right ones
   * beside it, and nothing costs a resource at all. Returns how many were
   * newly named.
   */
  identifyBatch: (slots: readonly number[]) => number;
  /** Stand in a brazier's light: the dark stops clinging. */
  clearGloom: () => void;
  /** A container opened, which is what works the mire out of your hands. */
  openedContainer: () => void;
  /**
   * Lift what is in a slot one step: cursed to plain, plain to blessed.
   * It lifts the whole kind, because a charge is a fact about a kind in
   * this dungeon rather than about one bottle. The shop charges for it.
   */
  blessSlot: (slot: number) => boolean;
  /** A snare caught something and is spent. */
  springSnare: (key: string, by?: SnareSpringer) => void;
  /** The Cutpurse comes into the room the player is standing in. */
  thiefArrives: () => boolean;
  /** It reached the player and took a gem. False if there was nothing to take. */
  thiefSteals: () => boolean;
  /** It got out of the room with what it was holding. */
  thiefEscapes: () => void;
  /**
   * The player caught it, or something on the floor did. It drops what it
   * has and stays away longer.
   */
  thiefCaught: () => void;
  /** The player walked into the nest and took back what was in it. */
  emptyNest: () => boolean;
  /**
   * Kneel at a floor's shrine: one gem, and the floor forgets you.
   *
   * Returns false, without spending anything, when there is nothing to buy
   * - no gem to pay with, or a floor already as quiet as it starts. The
   * trigger says which before the press.
   */
  kneelAtShrine: (roomId: string) => boolean;
  /** A bomb whose fuse has run out goes off. Called from the frame loop. */
  detonate: (key: string) => void;
  /** The blast opened a cracked wall: the secret becomes a doorway. */
  revealSecret: (hostId: string) => void;
  /**
   * Throw the Warden across the floor and calm the floor, as a second
   * wound does. One owner, because a bomb and the spikes rout it the
   * same way and the difference between them must never be a rule.
   */
  routWarden: () => void;
  /** Bar or unbar a room's doors. */
  sealRoom: (roomId: string | null) => void;
  /** Rouse the floor. The one way the alarm goes up. */
  raiseAlarm: (amount: number) => void;
  /**
   * Something told the Warden where the player is - a watcher calling out,
   * a Potion of Dread. It rouses the floor and, unlike a gem, it ends any
   * noise the Warden was off chasing: being told beats being distracted.
   */
  giveAway: (amount: number) => void;
  /** The player made a noise loud enough to be placed. Sprinting does this. */
  makeNoise: () => void;
  /** Raise or lower the lantern. Raising with no oil left does nothing. */
  toggleLantern: () => void;
  /**
   * Bar the doorway between the room the player is in and `toRoomId`. Loud,
   * and it replaces whatever was barred before. False when it cannot.
   */
  barDoor: (toRoomId: string) => boolean;
  /**
   * The bar is gone: the Warden came through it, or the player lifted it
   * walking out. Two very different events with one piece of state, so the
   * event says which.
   */
  breakBar: (byWarden?: boolean) => void;
  /**
   * Spend oil for walking into a room, and nothing for standing in one.
   *
   * Called once per doorway rather than from a frame loop, which is the
   * whole change: a wall clock taxed deliberation, careful looking and
   * hiding, and those are the three things this game is made of.
   */
  burnOilEntering: (alreadyWalked: boolean) => void;
  /** Buy oil. Returns false when the flask is already full. */
  buyOil: (measures: number) => boolean;
  /** Pick up the floor's key - from where it lay, or from where it was set down. */
  takeKey: (roomId: string) => void;
  /**
   * Set the key down where the player stands. Metal on stone: [loud] 0.50,
   * which makes it the one lure in the game you already own.
   */
  dropKey: () => boolean;
  /** Weight a room's plate with the key, for good. False without one. */
  setKeyOnPlate: (roomId: string) => boolean;
  /**
   * Put the flame out where it stands, spending nothing and refunding
   * nothing. A draft does this; the player cannot.
   */
  snuffLantern: () => void;
  /** Spend a key on a vault. Returns false without one. */
  unlockRoom: (roomId: string) => boolean;
  /** The Warden walks to another room. */
  moveWarden: (roomId: string) => void;
  /** It reached the player: a life, unless the charm pays, and it is thrown back. */
  wardenStrike: () => void;
  /** The floor's Harrier wakes: the alarm reached its level, or the player is in its roost. */
  wakeHarrier: () => void;
  /** It reached the player: the ordinary damage, then it wheels away a while. */
  harrierStrike: () => void;
  /** A blast in its room: it drops, and is a ground body until it is up. */
  downHarrier: () => void;
  /** Down over something that bites: gone for the floor. */
  slayHarrier: () => void;
  /** A blast in a room the Keeper stands in: it kneels, and the stairs are open a while. */
  stallKeeper: () => void;
  /** Someone within its reach: the ordinary damage, once per grace. */
  keeperStrike: () => void;
  /** The floor's patience ran out. Called from the frame loop. */
  wakeReaper: () => void;
  /** The Reaper reached the player. */
  reaperStrike: () => void;
  /** A blast in the Reaper's room holds it where it stands for a while. */
  stallReaper: () => void;
  /** The moth settled on the raised lantern. */
  mothLands: () => void;
  /** The moth left the lantern: the light stays in the Warden's eye a while. */
  mothLeaves: () => void;
  /** Something startled the roost: the noise carries further than the ground would. */
  rouseBats: () => void;
  /**
   * Record that the floor's heat has delivered something, so it is never
   * delivered twice. The doing is the driver's; the remembering is the
   * store's, because what a floor has already sent is part of what the
   * run IS.
   */
  heatDelivered: (id: PurchaseId) => void;
  /**
   * A dart plate or a pit went off under something. Returns false when it
   * was not armed - a plate still re-arming, a pit already open - so the
   * thing that stepped on it knows whether anything happened.
   */
  springTrap: (key: string, kind: "darts" | "pit", by: "player" | "warden") => boolean;
  /** A grate dropped behind the player: that doorway is barred, briefly, and not by them. */
  dropGrate: (toRoomId: string) => void;
  /** The shop's bomb for this floor is sold. */
  markBombBought: () => void;
  /** Mark the room the player is in on the map, or unmark it. */
  toggleMark: () => void;
  /** A draft was felt here, by standing in it. */
  feltDraft: (roomId: string) => void;
  /** The wisp came out, or went out. Called from the frame loop when the light's visibility changes. */
  setWisp: (out: boolean) => void;
  /**
   * It walked into something that hurt it: the floor's own spikes, or a
   * snare the player set. `hold` is how long it reels, which is the only
   * thing the two differ in.
   */
  wardenWounded: (hold?: number) => void;
  /** Take a hit. Returns false if inside the invulnerability window. */
  damage: () => boolean;
  gainLife: () => boolean;
  clearRoom: (roomId: string) => void;
  failRoom: (roomId: string) => void;
  /** A wrong answer in a room's trial. Returns the misses now spent in it. */
  trialMiss: (roomId: string) => number;
  /** An attempt spent: the misses go back to none. Returns attempts spent. */
  trialAttempt: (roomId: string) => number;
  lockInput: () => void;
  unlockInput: () => void;
}

/** The player is in control: not on a menu, not mid-transition, not in a modal. */
export const canControl = (s: RunState): boolean =>
  s.phase === "playing" && !s.paused && !s.transitioning && s.inputLocks === 0;

let transitionFallback: number | null = null;

/**
 * How long the run took, in whole seconds.
 *
 * The one place that answers it. This was written out twice - here and in
 * RunSummary - from `endedAt - startedAt` on the wall clock, so both copies
 * counted the time the player spent in the pause menu. Measured: a run of
 * about seven seconds with a five-second pause in it was recorded and shown
 * as 0:11, and `fastestEscape` is a saved personal best sitting on top of
 * that number. Everything else the game times - a potion, the damage
 * cooldown, the arena's fourteen seconds, the watcher's beam - is a
 * deadline on `runClock`; this is the run itself, and it was the one thing
 * not kept on it.
 */
export const runSeconds = (s: RunState): number =>
  Math.max(0, Math.round((s.endedAt > 0 ? s.endedAt : runClock(s)) - s.startedAt));

/**
 * Fold a finished run into the records. Called from the two places a run
 * can end and nowhere else, so a run is never counted twice.
 */
function rememberRun(s: RunState) {
  if (!s.dungeon) return;
  useRecords.getState().record({
    won: s.phase === "won",
    seed: s.runSeed,
    delver: s.delver,
    carried: s.gems,
    gemsFound: s.gemsTotal,
    floor: s.floor,
    seconds: runSeconds(s),
  });
}

const currentRoom = (s: RunState): Room | undefined =>
  s.dungeon && s.currentRoomId ? roomById(s.dungeon, s.currentRoomId) : undefined;

/**
 * The run.
 *
 * One store. The old tree had six, and the two that both claimed to own the
 * player's stats disagreed about them. Everything a run is - where you are,
 * what you hold, whether you are still alive - is here; everything that is
 * not state (a sound, a prompt, a puzzle) goes over the bus.
 */
export const useRun = create<RunState>()(
  subscribeWithSelector((set, get) => ({
    phase: "menu",
    paused: false,
    dungeon: null,
    floor: 1,
    runSeed: 0,
    roomsSeen: 0,
    currentRoomId: null,
    visited: [],
    lives: STARTING_LIVES,
    maxLives: STARTING_LIVES,
    gems: 0,
    gemsTotal: 0,
    gemRooms: [],
    cleared: [],
    failed: [],
    trials: {},
    relics: [],
    satchel: [],
    identified: [],
    delver: DEFAULT_DELVER,
    appearances: appearancesFor(0),
    charges: chargesFor(0),
    effects: { swift: 0, mire: 0, gloom: 0 },
    noisyUntil: 0,
    wardenLure: null,
    lureUntil: 0,
    glim: 0,
    glimUpAt: 0,
    oil: LANTERN_OIL_FULL,
    litUntil: 0,
    barredDoor: null,
    barUntil: 0,
    mapped: false,
    looted: [],
    placed: [],
    thiefPhase: "away",
    thiefNextAt: 0,
    thiefHolding: 0,
    nestGems: 0,
    nestRoomId: null,
    nestSeen: false,
    wardRoomId: null,
    wardUntil: 0,
    sealedRoomId: null,
    keys: 0,
    keyLyingIn: null,
    keyLyingAt: null,
    keyOnPlateIn: null,
    mireOpened: 0,
    dreadRoomId: null,
    thiefKey: false,
    nestKey: false,
    unlocked: [],
    keyTakenIn: null,
    alarm: 0,
    heatBought: [],
    floorRooms: 1,
    wardenRoomId: null,
    wardenCameFrom: null,
    enteredBy: null,
    wardenWounds: 0,
    wardenStaggerUntil: 0,
    wardenWary: false,
    floorEnteredAt: 0,
    reaperAwake: false,
    harrierAwake: false,
    keeperStalledUntil: 0,
    keeperLastStrikeAt: 0,
    harrierSlain: false,
    harrierDownedUntil: 0,
    harrierRetreatUntil: 0,
    reaperStalledUntil: 0,
    reaperLastStrikeAt: 0,
    mothOn: false,
    batsRousedUntil: 0,
    sprung: {},
    bombBought: false,
    broken: [],
    marks: [],
    draftsFelt: [],
    wispOut: false,
    wardenMet: false,
    transitioning: false,
    inputLocks: 0,
    lastDamageAt: -Infinity,
    pausedFor: 0,
    pausedAt: 0,
    startedAt: 0,
    endedAt: 0,

    startRun: (seed, delverId) => {
      const floor = 1;
      const rules = floorRules(floor);
      // The one they asked for, the one they last used, or the Vagrant.
      // Falling back rather than throwing because this comes off a saved
      // preference, and a build that renames a delver must not make an old
      // save unable to start a run.
      const delver = delverOr(delverId ?? useRecords.getState().lastDelver);
      const dungeon = generateDungeon({
        seed,
        minRooms: rules.minRooms,
        maxRooms: rules.maxRooms,
        // What a delver opens with can already bias their first floor.
        pays: modifiers(delver.relics).biasesRooms,
      });
      if (transitionFallback) window.clearTimeout(transitionFallback);
      set({
        phase: "playing",
        paused: false,
        dungeon,
        floor,
        runSeed: dungeon.seed,
        roomsSeen: 1,
        currentRoomId: dungeon.startId,
        visited: [dungeon.startId],
        delver: delver.id,
        lives: delver.lives,
        maxLives: delver.lives,
        // Gems in hand at the first door count as found: they are part of
        // what this run got out with, and the summary would otherwise show
        // a Tomb Robber carrying two gems it says were never picked up.
        gems: delver.gems,
        gemsTotal: delver.gems,
        gemRooms: [],
        cleared: [],
        failed: [],
        trials: {},
        relics: [...delver.relics],
        satchel: [...delver.satchel],
        identified: knownFrom(delver),
        appearances: appearancesFor(dungeon.seed),
        charges: chargesFor(dungeon.seed),
        effects: { swift: 0, mire: 0, gloom: 0 },
        noisyUntil: 0,
        // Down. See world.ts: up as a default made every run open already
        // seen, which is the bargain removed rather than offered.
        glim: 0,
        glimUpAt: 0,
        oil: LANTERN_OIL_FULL,
        litUntil: 0,
        barredDoor: null,
        barUntil: 0,
        mapped: false,
        looted: [],
        placed: [],
        thiefPhase: "away",
        thiefNextAt: 0,
        thiefHolding: 0,
        nestGems: 0,
        // The first floor is where the dungeon is learned, and the thief
        // arrives on the second - but this reads the same rule the descent
        // does rather than hard-coding null, so moving CUTPURSE_FROM_FLOOR
        // moves both ends of it.
        nestRoomId: floor >= CUTPURSE_FROM_FLOOR ? nestRoom(dungeon) : null,
        nestSeen: false,
        wardRoomId: null,
        wardUntil: 0,
        sealedRoomId: null,
        keys: 0,
        keyLyingIn: null,
        keyLyingAt: null,
        keyOnPlateIn: null,
        mireOpened: 0,
        dreadRoomId: null,
        thiefKey: false,
        nestKey: false,
        unlocked: [],
        keyTakenIn: null,
        alarm: alarmFloorOn(floor, delver.id),
        heatBought: [],
        floorRooms: 1,
        wardenRoomId: null,
        wardenCameFrom: null,
        enteredBy: null,
        wardenWounds: 0,
        wardenStaggerUntil: 0,
        wardenWary: false,
        // The floor's patience starts with the run. On the same clock as
        // `startedAt`, and cleared with it.
        floorEnteredAt: performance.now() / 1000,
        reaperAwake: false,
        harrierAwake: false,
        keeperStalledUntil: 0,
        keeperLastStrikeAt: 0,
        harrierSlain: false,
        harrierDownedUntil: 0,
        harrierRetreatUntil: 0,
        reaperStalledUntil: 0,
        reaperLastStrikeAt: 0,
        mothOn: false,
        batsRousedUntil: 0,
        sprung: {},
        bombBought: false,
        broken: [],
        marks: [],
        draftsFelt: [],
        wispOut: false,
        wardenLure: null,
        lureUntil: 0,
        wardenMet: false,
        // The start room has to mount before the player is let go.
        transitioning: true,
        inputLocks: 0,
        lastDamageAt: -Infinity,
        pausedFor: 0,
        pausedAt: 0,
        // `pausedFor` and `pausedAt` are cleared in this same write, so the
        // run clock immediately after it is exactly this.
        startedAt: performance.now() / 1000,
        endedAt: 0,
      });
      const spawn = spawnAtStart();
      bus.emit("teleport", { position: spawn.position, yaw: spawn.yaw });
      bus.emit("lookSet", { yaw: spawn.yaw, pitch: 0 });
      bus.emit("runStarted");
      transitionFallback = window.setTimeout(
        () => get().roomReady(dungeon.startId),
        TRANSITION_FALLBACK_MS
      );
    },

    quitToMenu: () => {
      if (transitionFallback) window.clearTimeout(transitionFallback);
      set({ phase: "menu", paused: false, dungeon: null, currentRoomId: null, transitioning: false, inputLocks: 0 });
    },

    pause: () => {
      if (get().phase !== "playing" || get().paused) return;
      set({ paused: true, pausedAt: performance.now() / 1000 });
    },
    resume: () => {
      const s = get();
      if (!s.paused) return;
      const spent = s.pausedAt > 0 ? performance.now() / 1000 - s.pausedAt : 0;
      set({ paused: false, pausedAt: 0, pausedFor: s.pausedFor + spent });
    },

    travel: (dir) => {
      const s = get();
      const room = currentRoom(s);
      const toId = room?.links[dir];
      if (!s.dungeon || !room || !toId || !canControl(s)) return;
      const to = roomById(s.dungeon, toId);
      if (!to) return;
      // The Keeper holds the stairs: the store refuses the exit while it
      // stands, so the door's prompt and the walk cannot disagree.
      if (to.kind === "end" && keeperHolds(s)) {
        bus.emit("notice", "The Keeper holds the stairs.");
        return;
      }

      /**
       * Walking out through your own bar lifts it.
       *
       * A bar the player can pass and the Warden cannot would otherwise be
       * a door that only opens one way for forty-five seconds, and the
       * play it invites is to stand behind it - which is a hiding place,
       * and hiding places are the one thing this dungeon is built not to
       * have. Lifting it means a bar is spent the moment you use the
       * doorway yourself: it buys you the room you are leaving, not a
       * corridor you can pace.
       */
      if (barredNow(s) === barKey(s.currentRoomId!, toId)) get().breakBar(false);

      const seen = s.visited.includes(toId);
      /**
       * Walking into a room is what costs oil, and a room nobody has
       * walked into costs six times what one already known does. Charged
       * here, at the doorway, because this is the one place that knows
       * both that a room is being entered and whether it has been entered
       * before.
       */
      get().burnOilEntering(seen);
      set({
        transitioning: true,
        currentRoomId: toId,
        visited: seen ? s.visited : [...s.visited, toId],
        roomsSeen: seen ? s.roomsSeen : s.roomsSeen + 1,
        floorRooms: s.floorRooms + 1,
        enteredBy: OPPOSITE[dir],
      });
      /**
       * A vault re-locks behind you.
       *
       * The bar drops as you cross the threshold, the first time and
       * every time, so the key buys one ENTRY rather than a door that is
       * now permanently open. You can always walk out - the bar is on the
       * outside - and getting back in costs another way through. It is
       * why setting the key on a plate is a real decision instead of a
       * free extra use of a thing you had finished with.
       */
      if (toId === s.dungeon.vaultId && s.unlocked.includes(toId)) {
        set({ unlocked: get().unlocked.filter((id) => id !== toId) });
        bus.emit("notice", "The bar drops behind you.");
      }
      const spawn = spawnAfterTravel(to, dir);
      bus.emit("teleport", { position: spawn.position, yaw: spawn.yaw });
      bus.emit("lookSet", { yaw: spawn.yaw, pitch: 0 });
      bus.emit("doorOpened", { toRoomId: toId });

      // The destination reports itself mounted; if it never does, hand control
      // back anyway rather than leaving the player frozen.
      if (transitionFallback) window.clearTimeout(transitionFallback);
      transitionFallback = window.setTimeout(
        () => get().roomReady(toId),
        TRANSITION_FALLBACK_MS
      );
    },

    roomReady: (roomId) => {
      const s = get();
      if (roomId !== s.currentRoomId || !s.transitioning) return;
      if (transitionFallback) {
        window.clearTimeout(transitionFallback);
        transitionFallback = null;
      }
      if (s.dungeon && roomId === s.dungeon.endId && s.phase === "playing") {
        if (s.floor >= FLOORS) {
          set({ transitioning: false, phase: "won", endedAt: runClock(s) });
          rememberRun(get());
          bus.emit("runWon");
          return;
        }
        // Down a floor: a fresh dungeon, the same player. The screen is
        // still dark from the door, and stays so until the new start room
        // reports in.
        const floor = s.floor + 1;
        const rules = floorRules(floor);
        const dungeon = generateDungeon({
          seed: (s.dungeon.seed * 7919 + floor) >>> 0,
          minRooms: rules.minRooms,
          maxRooms: rules.maxRooms,
          // Bought on the way down, felt on the floor below - which is
          // the only place a meta purchase is allowed to be felt at all.
          pays: modifiers(s.relics).biasesRooms,
        });
        set({
          floor,
          dungeon,
          currentRoomId: dungeon.startId,
          visited: [dungeon.startId],
          roomsSeen: s.roomsSeen + 1,
          gemRooms: [],
          cleared: [],
          failed: [],
          // Room ids repeat from floor to floor, so a trial half spent on
          // the floor above must not follow its name down.
          trials: {},
          // A new floor is a new Warden, asleep, and a floor nobody has
          // robbed yet - though a deep one is already stirring before you
          // touch anything. Relics, gems and the satchel carry down; what
          // was drunk on the last floor does not.
          effects: { swift: 0, mire: 0, gloom: 0 },
          noisyUntil: 0,
          // The oil goes down with you, like the lives and the gems and
          // unlike the alarm. A lantern refilled at every stair would be a
          // per-floor allowance nobody has to think about; carrying it is
          // what makes a room you chose to light up on floor one cost you
          // something on floor three. Only what the last floor knew about
          // you is left behind.
          litUntil: 0,
          // A plank across a doorway on the floor above is on the floor
          // above, like the key and the lock and the snares.
          barredDoor: null,
          barUntil: 0,
          mapped: false,
          looted: [],
          // A snare set on the floor above is on the floor above. Devices
          // go with the room they were set in, like the key and the lock.
          placed: [],
          // A new floor is a new thief with an empty nest. What it stole
          // on the floor above and you did not go back for is gone, which
          // is the whole price of walking on rather than walking back.
          thiefPhase: "away",
          thiefNextAt: 0,
          thiefHolding: 0,
          nestGems: 0,
          nestRoomId: floor >= CUTPURSE_FROM_FLOOR ? nestRoom(dungeon) : null,
          nestSeen: false,
          wardRoomId: null,
          wardUntil: 0,
          sealedRoomId: null,
          // A key is cut for one floor's lock and is no use on the next.
          keys: 0,
          keyLyingIn: null,
          keyLyingAt: null,
          keyOnPlateIn: null,
          mireOpened: 0,
          dreadRoomId: null,
          thiefKey: false,
          nestKey: false,
          unlocked: [],
          keyTakenIn: null,
          // The delver's bonus is part of every floor's baseline, not a
          // one-off on the first: a Tomb Robber is remembered by the whole
          // dungeon, and `wardenWounded` and a Scroll of Banishment both
          // clamp the alarm to the floor's baseline, so a bonus that only
          // applied on arrival would be scrubbed off by the first rout.
          alarm: alarmFloorOn(floor, get().delver),
          heatBought: [],
          floorRooms: 1,
          wardenRoomId: null,
          wardenCameFrom: null,
          enteredBy: null,
          wardenWounds: 0,
          wardenStaggerUntil: 0,
          wardenWary: false,
          // A new floor is patient again, and whatever was hunting you on
          // the last one stays there. Going down is the way out of it.
          floorEnteredAt: runClock(s),
          reaperAwake: false,
          harrierAwake: false,
          keeperStalledUntil: 0,
          keeperLastStrikeAt: 0,
          harrierSlain: false,
          harrierDownedUntil: 0,
          harrierRetreatUntil: 0,
          reaperStalledUntil: 0,
          reaperLastStrikeAt: 0,
          mothOn: false,
          batsRousedUntil: 0,
          sprung: {},
          bombBought: false,
          broken: [],
          marks: [],
          draftsFelt: [],
          wispOut: false,
          wardenLure: null,
          lureUntil: 0,
          transitioning: true,
        });
        const spawn = spawnAtStart();
        bus.emit("teleport", { position: spawn.position, yaw: spawn.yaw });
        bus.emit("lookSet", { yaw: spawn.yaw, pitch: 0 });
        // `s` is the floor being left, so its heat is still its own.
        bus.emit("floorDescended", { floor, heat: heatNow(s) });
        transitionFallback = window.setTimeout(
          () => get().roomReady(dungeon.startId),
          TRANSITION_FALLBACK_MS
        );
        return;
      }
      set({ transitioning: false });
      bus.emit("roomEntered", { roomId });

      // The Warden wakes once the floor has been walked a little, and wakes
      // as far from the player as the floor allows.
      const after = get();
      if (
        !after.wardenRoomId &&
        after.dungeon &&
        after.floorRooms >= floorRules(after.floor).wardenGrace
      ) {
        const wake = wakingRoom(after.dungeon, roomId);
        if (wake) {
          set({ wardenRoomId: wake, wardenCameFrom: null });
          bus.emit("wardenWoke", { roomId: wake });
        }
      }
    },

    collectGem: (roomId, at, worth = 1) => {
      const s = get();
      if (s.gemRooms.includes(roomId)) return false;
      // Every gem taken rouses the floor. This is the whole bargain: the
      // reward and the danger come from the same act - and a set piece
      // that pays three raises it three times, because otherwise the way
      // to a quiet floor would be to answer everything.
      // The delver's multiplier and the relic's, in that order: a Pilgrim
      // with an Ash Censer is back to an ordinary gem, which is exactly
      // what four gems bought them.
      /**
       * And the vein beside it, if the flame is low enough to see one.
       *
       * This is the key idea of the whole lantern bargain and the reason
       * it is a bargain rather than a penalty: the SAME ROOM means two
       * different things depending on how you walk into it. The veins are
       * in the walls the whole time; below the Dark band they show, and a
       * socket that pays one pays two.
       *
       * It cannot be banked, which is the other half. There is no way to
       * find the vein in the light and come back for it - you can only
       * take it while you are standing in the danger, which is what makes
       * dropping the flame a decision made in a particular room rather
       * than a setting chosen once.
       */
      const veined = veinsShowing(s) ? worth : 0;
      const took = worth + veined;
      const alarm =
        s.alarm +
        took * ALARM_PER_GEM * DELVERS[s.delver].alarmFactor;
      set({
        gems: s.gems + took,
        gemsTotal: s.gemsTotal + took,
        gemRooms: [...s.gemRooms, roomId],
        alarm,
      });
      bus.emit("gemCollected", { roomId, x: at?.[0], z: at?.[1] });
      if (veined) bus.emit("notice", "There is a vein in the wall behind it.");
      return true;
    },

    spendGems: (amount) => {
      const s = get();
      if (s.gems < amount) return false;
      set({ gems: s.gems - amount });
      return true;
    },

    damage: () => {
      const s = get();
      if (s.phase !== "playing") return false;
      const now = runClock(s);
      if (now - s.lastDamageAt < DAMAGE_COOLDOWN_S) return false;
      // The free hit used to be eaten here. It was the meta layer holding
      // the run's POWER, which is the one thing the split forbids: what
      // is bought changes the odds a run faces, never how much it can
      // take. Nothing replaces it, because nothing should.
      const lives = Math.max(0, s.lives - 1);
      set({ lives, lastDamageAt: now });
      bus.emit("damaged");
      if (lives === 0) {
        set({ phase: "lost", endedAt: now });
        rememberRun(get());
        bus.emit("runLost");
      }
      return true;
    },

    gainLife: () => {
      const s = get();
      if (s.lives >= s.maxLives) return false;
      set({ lives: s.lives + 1 });
      bus.emit("lifeBought");
      return true;
    },

    addRelic: (id, at) => {
      const s = get();
      if (s.relics.includes(id)) return;
      set({ relics: [...s.relics, id] });
      bus.emit("relicTaken", { id, x: at?.[0], z: at?.[1] });
    },

    takeItem: (id, from, at) => {
      const s = get();
      if (s.satchel.length >= satchelSlots(s)) {
        bus.emit("notice", "Your satchel is full. Use something first.");
        return false;
      }
      set({
        satchel: [...s.satchel, id],
        looted: from && !s.looted.includes(from) ? [...s.looted, from] : s.looted,
      });
      // Working your hands loose: a chest opened counts toward the mire's
      // named cure, and so does a container burst below.
      if (from && !s.looted.includes(from)) get().openedContainer();
      /**
       * The Assayer's Chit: there is a second thing under the first one.
       *
       * ODDS rather than power - it does not make what a chest holds
       * better, it makes a chest hold more often - and it is refused
       * outright when there is nowhere to put it, so the offer never
       * silently drops what it promised.
       */
      if (from && modifiers(s.relics).chestPaysTwice) {
        const after = get();
        if (after.satchel.length < satchelSlots(after) && after.dungeon) {
          // A second roll on a key derived from the first, so the thing
          // under the thing is as seeded and as replayable as the thing.
          const under = rollItem(after.dungeon.seed, `${from}:under`, after.floor);
          set({ satchel: [...after.satchel, under] });
          bus.emit("itemTaken", { id: under, x: at?.[0], z: at?.[1] });
          bus.emit("notice", "There is something under it.");
        }
      }
      bus.emit("itemTaken", { id, x: at?.[0], z: at?.[1] });
      return true;
    },

    useItem: (slot) => {
      const s = get();
      const id = s.satchel[slot];
      // `canControl`, not a hand-rolled copy of it. This spelled out three
      // of that predicate's four terms and left out `transitioning`, and
      // that is the term this one needed most: a satchel key is live while
      // the screen is black between rooms, and a potion drunk in that
      // window starts its clock on a player who cannot move. Walking into
      // the exit is the worst of it - the descent wipes `effects` a beat
      // later, so a Potion of Swiftness read at the door is spent, gone
      // from the satchel, and worth nothing at all. Measured: swift set to
      // 30.7, floor 2 reached, swift 0, satchel empty.
      if (!id || !canControl(s)) return;
      // Checked before the scroll is spent, not after: throwing a noise
      // down a floor with nothing awake on it would consume the one card
      // that buys a window, and the player could not have known.
      if (id === "echoes" && !s.wardenRoomId) {
        bus.emit("notice", "You could throw it, but nothing down here is listening yet.");
        return;
      }
      // The same guard, for the scroll that promises the same thing twice
      // over. Banishment throws the Warden and calms the floor; on a floor
      // whose Warden has not woken and whose alarm is still its own
      // baseline it does neither, and it was being spent for it - the
      // strongest card in the deck, gone with nothing said. The calm is a
      // real reason to read it early, so this refuses only when both
      // halves are no-ops.
      if (id === "banish" && !s.wardenRoomId && s.alarm <= alarmFloorFor(s)) {
        bus.emit("notice", "Nothing walks this floor yet, and it is already as quiet as it gets.");
        return;
      }
      const now = runClock(s);
      /**
       * What this dungeon has done to this kind of thing.
       *
       * Every number below reads it. Where more is better - how long a
       * potion runs, how far a scroll throws - `scaled` does the work;
       * where more is worse - how much a bad potion rouses the floor -
       * the call site says so itself with `inverted`, because a helper
       * that silently flips its own sign is one that gets used the wrong
       * way round exactly once.
       */
      const charge = s.charges[id];
      const until = (seconds: number) => now + scaled(seconds, charge);

      // A device is not drunk or read: it goes on the floor where the
      // player is standing, and it is still there when they come back.
      if (isDevice(id)) {
        get().placeDevice(slot);
        return;
      }

      // Whatever it does, it is spent and it is now known.
      set({
        satchel: s.satchel.filter((_, i) => i !== slot),
        identified: s.identified.includes(id) ? s.identified : [...s.identified, id],
      });

      switch (id) {
        case "healing":
          get().gainLife();
          // Blessed, it is worth two - if there is room for two. Cursed,
          // it heals and the floor hears you retching, which is the shape
          // every cursed thing here takes: it still does its job, and it
          // costs you something on the way.
          if (charge === "blessed") get().gainLife();
          if (charge === "cursed") get().raiseAlarm(1);
          break;
        case "swiftness":
          set({ effects: { ...get().effects, swift: until(SWIFTNESS_S), mire: 0 } });
          break;
        case "mire":
          // Cruel already, so the charge runs the other way: blessed means
          // a shorter mire, cursed a longer one.
          set({
            effects: {
              ...get().effects,
              mire: now + inverted(MIRE_S, charge),
              swift: 0,
            },
          });
          break;
        case "gloom":
          /**
           * Was "your map goes dark for a while", which is a subtraction
           * with no upside at all - and against the rule this whole system
           * turns on: an unknown consumable earns its slot only if the bad
           * outcome is DUAL-SIDED. If the worst case is pure loss, never
           * drinking is correct play, and the satchel fills up with things
           * a rational delver carries to the exit unopened.
           *
           * So it is the darkness bargain, imposed instead of chosen. The
           * flame goes out and will not come back up while it clings, and
           * imposed darkness pays exactly what chosen darkness pays: the
           * watchers lose you, and the veins show in the walls. Nothing
           * here is new - it is the lantern's own rules arriving without
           * having been asked for.
           */
          set({
            effects: { ...get().effects, gloom: now + inverted(GLOOM_S, charge) },
            glim: 0,
            glimUpAt: 0,
          });
          bus.emit("lanternOut");
          break;
        case "mapping":
          set({ mapped: true });
          // A cursed map is a map, and then the dark. It still did what it
          // said on the label, which is the rule for every cursed thing
          // here: the trap is the price, never the promise.
          if (charge === "cursed") set({ effects: { ...get().effects, gloom: now + GLOOM_S * 0.5 } });
          break;
        case "echoes": {
          // Thrown as far as the floor goes: the room the Warden would have
          // woken in, which is the one farthest from where the player is
          // standing.
          const after = get();
          const to =
            after.dungeon && after.currentRoomId
              ? wakingRoom(after.dungeon, after.currentRoomId)
              : null;
          if (to) {
            set({ wardenLure: to, lureUntil: until(ECHOES_S) });
            bus.emit("wardenLured", { roomId: to });
          }
          break;
        }
        case "dread": {
          /**
           * Was the worst of the four, and the only affliction that could
           * end a run outright: it told the Warden exactly where you were,
           * so nobody sane would ever drink it.
           *
           * Now the thing that followed you out of the dark is a NOISE
           * SOURCE THAT IS NOT WHERE YOU ARE, which under the Din makes it
           * the best lure in the game and a reason to drink an unknown
           * potion in a room you want emptied. The floor still rouses,
           * because something did follow you out; what changed is where
           * everything that hears it goes.
           */
          const after = get();
          const to =
            after.dungeon && after.currentRoomId
              ? wakingRoom(after.dungeon, after.currentRoomId)
              : null;
          get().raiseAlarm(inverted(DREAD_ALARM, charge));
          if (to) {
            set({ dreadRoomId: to, wardenLure: to, lureUntil: until(GLOOM_S) });
            bus.emit("wardenLured", { roomId: to });
          }
          break;
        }
        case "avarice": {
          // Both halves move, in opposite directions: blessed is more gems
          // for less noise, cursed is fewer for more. It is the one item
          // where the charge changes what the trade is rather than how
          // much of it there is.
          const gems = charge === "blessed" ? AVARICE_GEMS + 1 : charge === "cursed" ? 1 : AVARICE_GEMS;
          set({ gems: get().gems + gems, gemsTotal: get().gemsTotal + gems });
          get().raiseAlarm(inverted(AVARICE_ALARM, charge));
          break;
        }
        case "banish": {
          const after = get();
          if (after.dungeon && after.currentRoomId && after.wardenRoomId) {
            const away = banishTo(after.dungeon, after.currentRoomId, WARDEN_BANISH_DISTANCE);
            // Thrown across the floor, it is no longer walking to anything.
            if (away) set({ wardenRoomId: away, wardenCameFrom: null, wardenLure: null, lureUntil: 0 });
          }
          // Never below what the floor itself starts at. A floor's baseline
          // is its character, not just its opening value: letting a scroll
          // take the bottom floor to "Still" made it calmer than the first
          // one, which is the opposite of what the descent claims.
          set({
            alarm: Math.max(alarmFloorFor(after), get().alarm - scaled(BANISH_CALM, charge)),
          });
          break;
        }
      }
      /**
       * And both edges are stated the moment it lands.
       *
       * Never discovered across runs: a dual edge the player has to find
       * out about over three deaths is a pure loss in the run they are
       * currently in, which is the failure this table exists to fix. The
       * cure is said with it, because a named task nobody has been told
       * about is a subtraction wearing a task's clothes.
       */
      const bite = afflictionFor(id);
      if (bite) {
        bus.emit("notice", `${bite.lands} ${bite.edge}`);
        bus.emit("notice", bite.cure);
      }
      bus.emit("itemUsed", { id, cruel: ITEMS[id].cruel });
    },

    placeDevice: (slot) => {
      const s = get();
      const id = s.satchel[slot];
      if (!id || !(isDevice(id) || isBomb(id)) || !s.currentRoomId || !canControl(s)) return false;
      const now = runClock(s);
      const roomId = s.currentRoomId;
      /**
       * A snare will not set on tile: the teeth skid and it will not sit
       * flat. The one edge the snare has, and it costs nothing to learn
       * because the wire is not spent finding out - a limit you only
       * discover by paying for it is not a limit, it is a trap.
       */
      if (id === "snare" && s.dungeon) {
        const here = roomById(s.dungeon, roomId);
        if (here && !snareSets(surfaceOf(here))) {
          bus.emit("notice", "The teeth skid on the glaze. It will not sit flat here.");
          return false;
        }
      }
      const key = `${roomId}:${id}:${s.placed.length}:${Math.round(now * 100)}`;
      // Where the player is standing, from the one place that knows.
      const at = { x: playerAt.x, z: playerAt.z };

      set({
        satchel: s.satchel.filter((_, i) => i !== slot),
        identified: s.identified.includes(id) ? s.identified : [...s.identified, id],
        placed: [
          ...s.placed,
          // A knot of iron is spent the moment it lands; the other two are
          // live until something walks into them or their time runs out.
          // It stays on the floor either way, because a player who cannot
          // see where they dropped the loud thing cannot learn to avoid
          // dropping it there.
          {
            key,
            id,
            roomId,
            x: at.x,
            z: at.z,
            live: id !== "rattle",
            ...(isBomb(id) ? { fuseAt: now + BOMB_FUSE_S } : {}),
          },
        ],
      });

      const charge = s.charges[id];
      switch (id) {
        case "rattle":
          get().giveAway(inverted(RATTLE_ALARM, charge));
          break;
        case "wardstone": {
          set({ wardRoomId: roomId, wardUntil: now + scaled(WARD_S, charge) });
          // "It will not come into this room" has to be true of a Warden
          // already standing in it, or the one moment worth spending the
          // stone on is the one moment it does nothing.
          const after = get();
          if (after.wardenRoomId === roomId && after.dungeon) {
            const here = roomById(after.dungeon, roomId);
            const out = here
              ? Object.values(here.links).filter((to): to is string => Boolean(to))
              : [];
            if (out.length) {
              set({ wardenRoomId: out[0], wardenCameFrom: null, wardenLure: null, lureUntil: 0 });
            }
          }
          break;
        }
        case "snare":
          break;
        case "bomb":
          bus.emit("notice", "The fuse is lit.");
          break;
      }
      bus.emit("devicePlaced", { id, cruel: ITEMS[id].cruel });
      bus.emit("itemUsed", { id, cruel: ITEMS[id].cruel });
      return true;
    },

    springSnare: (key, by = "warden") => {
      const s = get();
      const device = s.placed.find((d) => d.key === key);
      if (!device || !device.live) return;
      set({ placed: s.placed.map((d) => (d.key === key ? { ...d, live: false } : d)) });
      bus.emit("snareSprung", { by });
      // Something small sprang it: the wire is spent and nothing is wounded.
      // That is the whole cost of setting a snare where the rats run.
      if (by !== "warden") return;
      // Through the same door the floor's own spikes use, so the wound, the
      // count towards a rout and the reeling all stay in one place - and a
      // snare cannot be a second, quietly different way of hurting it.
      // The charge of the kind that was set, read now rather than stored
      // on the device: the shop can lift a kind after a snare is already
      // on the floor, and the wire in the ground is the same wire.
      get().wardenWounded(scaled(SNARE_HOLD_S, s.charges.snare));
    },

    thiefArrives: () => {
      const s = get();
      if (s.thiefPhase !== "away" || !s.currentRoomId) return false;
      if (s.floor < CUTPURSE_FROM_FLOOR) return false;
      // Nothing to take is nothing to come for. It is a thief, not a
      // threat: turning up empty-handed to be chased would be all of the
      // interruption and none of the decision.
      //
      // Unless you are carrying the key, which is the only one of its cut
      // on the floor and therefore the most interesting thing on it. This
      // is the third property the rebrief bought, and it is the one that
      // makes carrying the key a decision rather than a formality.
      if (s.gems < 1 && s.keys < 1) return false;
      if (runClock(s) < s.thiefNextAt) return false;
      if (s.floorRooms < CUTPURSE_GRACE_ROOMS) return false;
      // A ward stone keeps everything out, not only the Warden. It is a
      // circle drawn on the floor of a room, and a rule that reads "the
      // Warden will not come in here, but" is a rule nobody remembers.
      if (wardNow(s) === s.currentRoomId) return false;
      // Nor into the room the floor started you in, until you have left it.
      if (sanctuaryRoom(s) === s.currentRoomId) return false;
      set({ thiefPhase: "stalking" });
      bus.emit("thiefCame", { roomId: s.currentRoomId });
      return true;
    },

    thiefSteals: () => {
      const s = get();
      if (s.thiefPhase !== "stalking") return false;
      if (s.gems < 1) {
        // Nothing in the purse, but a heavy piece of cut metal in your
        // hands. It takes that instead, and the vault's other two ways
        // are what stop this being a dead run.
        if (s.keys > 0) {
          set({ keys: s.keys - 1, thiefPhase: "fleeing", thiefKey: true });
          bus.emit("thiefTook", { gems: 0 });
          return true;
        }
        // It got to you and there was nothing left. It leaves rather than
        // circling: a thief with nothing to steal is not a chase.
        set({ thiefPhase: "fleeing", thiefHolding: 0 });
        return false;
      }
      set({ gems: s.gems - 1, thiefHolding: s.thiefHolding + 1, thiefPhase: "fleeing" });
      bus.emit("thiefTook", { gems: 1 });
      return true;
    },

    thiefEscapes: () => {
      const s = get();
      if (s.thiefPhase === "away") return;
      const held = s.thiefHolding;
      set({
        thiefPhase: "away",
        thiefHolding: 0,
        // The key goes into the heap with everything else it has taken.
        // A theft you cannot answer is a punishment; the nest is the
        // address that turns it into a decision about how far you walk.
        thiefKey: false,
        nestKey: s.nestKey || s.thiefKey,
        nestGems: s.nestGems + held,
        thiefNextAt: runClock(s) + CUTPURSE_REST_S,
        // The nest goes on the map the moment it costs you something. A
        // theft you cannot answer is a punishment; a theft with an address
        // is a decision about how much further you are willing to walk.
        nestSeen: s.nestSeen || held > 0,
      });
      if (held > 0) bus.emit("thiefFled", { gems: held, roomId: s.nestRoomId });
    },

    thiefCaught: () => {
      const s = get();
      if (s.thiefPhase === "away") return;
      const held = s.thiefHolding;
      set({
        thiefPhase: "away",
        thiefHolding: 0,
        gems: s.gems + held,
        // Caught with the key on it: it drops that too, like everything
        // else, and one press picks it back up off the floor.
        thiefKey: false,
        keys: s.keys + (s.thiefKey ? 1 : 0),
        thiefNextAt: runClock(s) + CUTPURSE_SHY_S,
      });
      bus.emit("thiefCaught", { gems: held });
      if (s.thiefKey) bus.emit("keyTaken");
    },

    emptyNest: () => {
      const s = get();
      if (s.nestGems < 1 && !s.nestKey) return false;
      set({
        gems: s.gems + s.nestGems,
        nestGems: 0,
        keys: s.keys + (s.nestKey ? 1 : 0),
        nestKey: false,
      });
      bus.emit("nestEmptied", { gems: s.nestGems });
      if (s.nestKey) bus.emit("keyTaken");
      return true;
    },

    blessSlot: (slot) => {
      const s = get();
      const id = s.satchel[slot];
      if (!id || s.charges[id] === "blessed") return false;
      set({ charges: { ...s.charges, [id]: lifted(s.charges[id]) } });
      bus.emit("itemBlessed", { id, charge: get().charges[id] });
      return true;
    },

    identifySlot: (slot) => {
      const s = get();
      const id = s.satchel[slot];
      if (!id || s.identified.includes(id)) return false;
      set({ identified: [...s.identified, id] });
      bus.emit("itemNamed", { id });
      return true;
    },

    identifyBatch: (slots) => {
      const s = get();
      // At most a batch at a time, and each slot counted once however many
      // times it was named: the lock is on the batch, not on the presses.
      const ids = [...new Set(slots.slice(0, BATCH).map((i) => s.satchel[i]))]
        .filter((id): id is ItemId => Boolean(id) && !s.identified.includes(id as ItemId));
      if (ids.length === 0) return 0;
      set({ identified: [...s.identified, ...ids] });
      for (const id of ids) bus.emit("itemNamed", { id });
      return ids.length;
    },

    clearGloom: () => {
      const s = get();
      if (!running(s, s.effects.gloom)) return;
      // Cleared by standing somewhere, not by paying for it. The brazier
      // keeps the one job it was always better at than filling a flask.
      set({ effects: { ...s.effects, gloom: 0 } });
      bus.emit("notice", "The fire burns the dark off you.");
    },

    openedContainer: () => {
      const s = get();
      if (!running(s, s.effects.mire)) return;
      const opened = s.mireOpened + 1;
      const cure = AFFLICTIONS.find((a) => a.id === "mire");
      if (cure && opened >= cure.clears.count) {
        set({ effects: { ...s.effects, mire: 0 }, mireOpened: 0 });
        bus.emit("notice", "Your hands come back to you.");
        return;
      }
      set({ mireOpened: opened });
    },

    /**
     * The shrine.
     *
     * A floor holds between 1.2 and 2.3 times what its exit charges, so a
     * player who takes what is lying about arrives at the door with gems
     * left over and nothing to do with them but bank the score. This is
     * the something: a gem buys the floor's attention back.
     *
     * It never takes the floor below the baseline it arrived at, for the
     * reason the Scroll of Banishment does not either - a floor's opening
     * alarm is its character, and the third floor must not be made calmer
     * than the first by kneeling twice. Once per shrine, and the shrine is
     * a once-per-run room, so this is one gem's worth of quiet a floor.
     */
    kneelAtShrine: (roomId) => {
      const s = get();
      if (!canControl(s) || s.cleared.includes(roomId)) return false;
      // `alarmFloorFor`, not `floorRules(...).startingAlarm`: the delver's
      // own bonus is part of the floor this run cannot go below, and the
      // shrine is the third place that clamps to it.
      const floor = alarmFloorFor(s);
      if (s.gems < 1 || s.alarm <= floor) return false;
      set({
        gems: s.gems - 1,
        alarm: floor,
        cleared: [...s.cleared, roomId],
        // Being forgotten means being forgotten: a noise it was walking
        // towards is no longer worth walking towards.
        wardenLure: null,
        lureUntil: 0,
      });
      bus.emit("shrineKept", { roomId });
      return true;
    },

    sealRoom: (roomId) => set({ sealedRoomId: roomId }),

    raiseAlarm: (amount) => {
      set({ alarm: get().alarm + amount });
    },

    giveAway: (amount) => {
      set({ wardenLure: null, lureUntil: 0 });
      get().raiseAlarm(amount);
    },

    makeNoise: () => {
      const s = get();
      const until = runClock(s) + noiseHoldFor(s);
      // Called from the frame loop while a sprint is held, so it must be
      // cheap and must not write on every frame: every write re-runs every
      // selector in the store. The deadline is seconds long, so refreshing
      // it twice a second costs at most half a second of accuracy on when
      // the Warden stops listening and nothing anyone can see.
      if (until - s.noisyUntil < 0.5) return;
      const heard = wardenHears(s);
      set({ noisyUntil: until });
      if (!heard) bus.emit("wardenHeard");
    },

    /**
     * The lantern, on one key, and asymmetric on purpose.
     *
     * A press takes it DOWN one band: instant, free, and available at any
     * moment. A press at the bottom takes it back to the top, and that one
     * costs oil and takes a moment. So four free taps put you in the dark
     * and one slow expensive press gets you out of it, which is the rule
     * the whole system is built on:
     *
     *   Darkness is an affordance the player spends, not a state the game
     *   imposes.
     *
     * One key rather than two because the cycle IS the asymmetry - a
     * player who has learned that the light only goes one way round has
     * learned the bargain without being told it.
     */
    toggleLantern: () => {
      const s = get();
      const now = runClock(s);
      // Still coming up. A raise is a commitment and cannot be interrupted
      // by the same key that started it.
      if (now < s.glimUpAt) return;

      if (s.glim > 0) {
        // Down one band, which is where the five named steps are read
        // from - so the delver drops through Guttered, Shrouded, Dark and
        // Blind rather than between two states.
        const at = GLIM_BANDS.findIndex((b) => b.id === glimBand(s.glim).id);
        const to = GLIM_BANDS[Math.min(GLIM_BANDS.length - 1, at + 1)].at;
        set({ glim: to, litUntil: now + LANTERN_SEEN_HOLD_S });
        bus.emit("lanternToggled", { raised: to > 0 });
        return;
      }

      // The dark clings: the flame will not come up while it does, which
      // is the whole of what the gloom now is. The cure is a place to
      // stand rather than a price to pay, so this is a wait, not a wall.
      if (running(s, s.effects.gloom)) {
        bus.emit("notice", "The dark clings to you. The wick will not catch.");
        return;
      }
      if (s.oil < RAISE_OIL) {
        bus.emit("notice", "There is not enough oil to bring it back up.");
        return;
      }
      // Seen from the moment it starts to go up, rather than when it
      // arrives: the brightest thing on the floor must not be invisible to
      // the things that answer to light for the length of the wind-up.
      set({
        glim: GLIM_MAX,
        glimUpAt: now + RAISE_S,
        oil: Math.max(0, s.oil - RAISE_OIL),
        litUntil: now + RAISE_S + LANTERN_SEEN_HOLD_S,
      });
      bus.emit("lanternToggled", { raised: true });
    },

    /**
     * Oil is spent by walking into a room, and never by standing in one.
     *
     * My first version of this was a sixty-second wick on a wall clock.
     * The game that shipped the best version of this idea has light that
     * does not decay with time at all - it costs a little for a segment
     * already explored and a lot for a new one - and the note that goes
     * with it is aimed straight at us: a time-based drain punishes
     * deliberation, careful looking and hiding, which are exactly the
     * behaviours an evade-only lantern game wants to reward.
     *
     * This whole game is deliberation and hiding. A wall clock taxes the
     * core verb, so pushing into the unknown is what costs and backtracking
     * is nearly free - and the cost scales with the band, so a guttered
     * flame is a cheap flame.
     */
    burnOilEntering: (alreadyWalked) => {
      const s = get();
      if (s.glim <= 0 || s.oil <= 0) return;
      const spend = oilForRoom(alreadyWalked) * (s.glim / GLIM_MAX);
      const oil = Math.max(0, s.oil - spend);
      const now = runClock(s);
      if (oil <= 0) {
        // It goes out on its own, and says so: a light that simply stopped
        // reaching would read as the floor getting darker.
        set({ oil: 0, glim: 0, glimUpAt: 0, litUntil: now + LANTERN_SEEN_HOLD_S });
        bus.emit("lanternOut");
        return;
      }
      set({ oil, litUntil: now + LANTERN_SEEN_HOLD_S });
    },

    /**
     * Oil bought, rather than refilled from a brazier.
     *
     * The brazier refill was one of the three mechanics the anti-grinding
     * test names outright: low risk, takes a lot of time, brings some
     * reward - "it encourages players to bore themselves, and even worse,
     * it may be optimal to do so." Walking back across a cleared floor to
     * a fire was exactly that, and the correct play was to do it every
     * time.
     *
     * So oil joins the things gems buy - a run-scoped, spendable thing -
     * and the braziers keep the job they were always better at, which is
     * being the one light you can stand in without carrying it.
     */
    buyOil: (measures) => {
      const s = get();
      if (s.oil >= LANTERN_OIL_FULL) return false;
      set({ oil: Math.min(LANTERN_OIL_FULL, s.oil + measures) });
      bus.emit("lanternFilled");
      return true;
    },

    barDoor: (toRoomId) => {
      const s = get();
      if (!s.currentRoomId || !s.dungeon || !canControl(s)) return false;
      const here = roomById(s.dungeon, s.currentRoomId);
      if (!here || !Object.values(here.links).includes(toRoomId)) return false;
      const key = barKey(s.currentRoomId, toRoomId);
      if (key === barredNow(s)) return false;
      const now = runClock(s);
      set({
        barredDoor: key,
        barUntil: now + BAR_S,
        // Hammering is the loudest thing in the game, and it is made
        // standing still. What the bar buys is distance; what it spends is
        // any doubt about where you were when you made it.
        noisyUntil: Math.max(s.noisyUntil, now + BAR_NOISE_S),
      });
      bus.emit("doorBarred", { roomId: s.currentRoomId, toRoomId });
      return true;
    },

    breakBar: (byWarden = true) => {
      const s = get();
      if (!s.barredDoor) return;
      set({ barredDoor: null, barUntil: 0 });
      bus.emit("barBroken", { byWarden });
    },

    takeKey: (roomId) => {
      const s = get();
      // Off the ground where it was set down, which is the same press and
      // the same key: a thing you put down is a thing you can pick up, and
      // a key you could only ever take once would be a counter again.
      if (s.keyLyingIn !== null) {
        set({ keys: s.keys + 1, keyLyingIn: null, keyLyingAt: null });
        bus.emit("keyTaken");
        return;
      }
      if (s.keyTakenIn !== null) return;
      set({ keys: s.keys + 1, keyTakenIn: roomId });
      bus.emit("keyTaken");
    },

    dropKey: () => {
      const s = get();
      if (s.keys < 1 || !s.currentRoomId || !canControl(s)) return false;
      set({
        keys: s.keys - 1,
        keyLyingIn: s.currentRoomId,
        keyLyingAt: { x: playerAt.x, z: playerAt.z },
      });
      // Where the key is, not where the player is - which are the same
      // place this frame and will not be in a moment, and that difference
      // is the whole of what a dropped key is for.
      bus.emit("keyDropped", { roomId: s.currentRoomId });
      return true;
    },

    setKeyOnPlate: (roomId) => {
      const s = get();
      if (s.keys < 1 || s.keyOnPlateIn !== null) return false;
      set({ keys: s.keys - 1, keyOnPlateIn: roomId });
      bus.emit("keySetOnPlate", { roomId });
      return true;
    },

    snuffLantern: () => {
      const s = get();
      if (s.glim <= 0) return;
      // No refund. The oil that went into raising it is burnt, which is
      // what makes a draft cost something rather than annoy.
      set({ glim: 0, glimUpAt: 0, litUntil: runClock(s) + LANTERN_SEEN_HOLD_S });
      bus.emit("lanternOut");
    },

    unlockRoom: (roomId) => {
      const s = get();
      if (s.keys < 1 || s.unlocked.includes(roomId)) return false;
      /**
       * The Company Seal: the one key that was cut opens any vault on the
       * floor, so the key is turned rather than spent. An OPTION - it
       * changes what the key may be used for, not how much anything is
       * worth - and it is the offer that makes setting the key on a plate
       * a decision with two live sides rather than one.
       */
      const keeps = modifiers(s.relics).anyVault;
      set({ keys: keeps ? s.keys : s.keys - 1, unlocked: [...s.unlocked, roomId] });
      bus.emit("vaultOpened", { roomId });
      return true;
    },

    moveWarden: (roomId) => {
      const s = get();
      if (!s.wardenRoomId || s.wardenRoomId === roomId) return;
      set({ wardenRoomId: roomId, wardenCameFrom: s.wardenRoomId });
      // It got to the noise and found nothing, so the noise is over. Left
      // set, the lure came back the moment it stepped away again and it
      // walked in circles around an empty room until the timer ran out.
      if (roomId === s.wardenLure) set({ wardenLure: null, lureUntil: 0 });
      if (roomId === s.currentRoomId) {
        if (!s.wardenMet) set({ wardenMet: true });
        bus.emit("wardenEntered", { roomId });
      }
    },

    wardenStrike: () => {
      const s = get();
      if (!s.dungeon || !s.currentRoomId) return;
      // The hit goes through the ordinary damage path, so the charm, the
      // cooldown and the death check all stay in one place.
      if (!get().damage()) return;
      const away = banishTo(s.dungeon, s.currentRoomId, WARDEN_BANISH_DISTANCE);
      if (away) set({ wardenRoomId: away, wardenCameFrom: null, wardenLure: null, lureUntil: 0 });
      bus.emit("wardenStruck");
    },

    mothLands: () => {
      if (get().mothOn) return;
      set({ mothOn: true });
      bus.emit("mothLanded");
    },

    mothLeaves: () => {
      const s = get();
      if (!s.mothOn) return;
      // It carried the light a while: the Warden's eye holds it after the
      // lantern is down, for longer than the lantern's own afterglow.
      set({ mothOn: false, litUntil: Math.max(s.litUntil, runClock(s) + MOTH_HOLD_S) });
      bus.emit("mothLeft");
    },

    heatDelivered: (id) => {
      const s = get();
      if (s.heatBought.includes(id)) return;
      set({ heatBought: [...s.heatBought, id] });
    },

    rouseBats: () => {
      const s = get();
      const now = runClock(s);
      if (now < s.batsRousedUntil) return;
      const heard = wardenHears(s);
      set({
        batsRousedUntil: now + BATS_ROUSED_S,
        noisyUntil: Math.max(s.noisyUntil, now + noiseHoldFor(s) * BATS_NOISE_FACTOR),
      });
      bus.emit("batsRoused");
      if (!heard) bus.emit("wardenHeard");
    },

    springTrap: (key, kind, by) => {
      const s = get();
      const now = runClock(s);
      const was = s.sprung[key];
      if (was !== undefined && (kind === "pit" || now - was < DART_REARM_S)) return false;
      set({ sprung: { ...s.sprung, [key]: now } });
      bus.emit("trapSprung", { key, kind, by });
      return true;
    },

    dropGrate: (toRoomId) => {
      const s = get();
      if (!s.currentRoomId || !s.dungeon) return;
      const key = barKey(s.currentRoomId, toRoomId);
      if (key === barredNow(s)) return;
      /**
       * A snare set in the channel holds it. The snare is briefed as a
       * device that holds a moving thing in place, and a portcullis on
       * its way down is a moving thing - so this is the brief paying out
       * rather than a special case written for the grate.
       */
      if (snaresIn(s.placed, s.currentRoomId).length > 0) {
        bus.emit("notice", "The grate comes down on the wire and stops.");
        return;
      }
      // A bar the player did not make: shorter, and silent - nobody
      // hammered anything - but the Warden breaks it the same way, and is
      // heard doing it.
      set({ barredDoor: key, barUntil: runClock(s) + GRATE_HOLD_S });
      bus.emit("trapSprung", { key: `${s.currentRoomId}:grate`, kind: "grate", by: "player" });
      bus.emit("doorBarred", { roomId: s.currentRoomId, toRoomId });
    },

    markBombBought: () => set({ bombBought: true }),

    setWisp: (out) => {
      if (get().wispOut === out) return;
      set({ wispOut: out });
      // Two literal emits, not one ternary: the layout suite greps for
      // every event's emitter by name.
      if (out) bus.emit("wispCame");
      else bus.emit("wispLeft");
    },

    feltDraft: (roomId) => {
      const s = get();
      if (s.draftsFelt.includes(roomId)) return;
      set({ draftsFelt: [...s.draftsFelt, roomId] });
    },

    toggleMark: () => {
      const s = get();
      if (!s.currentRoomId || !canControl(s)) return;
      const id = s.currentRoomId;
      const marked = s.marks.includes(id);
      set({ marks: marked ? s.marks.filter((m) => m !== id) : [...s.marks, id] });
      bus.emit("mapMarked", { roomId: id, marked: !marked });
    },

    wakeHarrier: () => {
      const s = get();
      if (s.harrierAwake || s.harrierSlain || s.phase !== "playing") return;
      set({ harrierAwake: true });
      bus.emit("harrierWoke");
    },

    harrierStrike: () => {
      const s = get();
      if (!s.harrierAwake || s.harrierSlain) return;
      const now = runClock(s);
      if (now < s.harrierRetreatUntil || now < s.harrierDownedUntil) return;
      // Hit and run: it wheels away whether or not the hit landed, so a
      // player inside the invulnerability window is not hovered over.
      set({ harrierRetreatUntil: now + HARRIER_RETREAT_S });
      if (get().damage()) bus.emit("harrierStruck");
    },

    downHarrier: () => {
      const s = get();
      if (!s.harrierAwake || s.harrierSlain) return;
      const now = runClock(s);
      if (now < s.harrierRetreatUntil) return;
      set({ harrierDownedUntil: now + HARRIER_DOWN_S });
      bus.emit("harrierDowned");
    },

    slayHarrier: () => {
      const s = get();
      if (!s.harrierAwake || s.harrierSlain) return;
      set({ harrierSlain: true, harrierDownedUntil: 0 });
      bus.emit("harrierSlain");
      bus.emit("notice", "The harrier is spiked. The floor is quieter.");
    },

    stallKeeper: () => {
      const s = get();
      if (s.floor !== KEEPER_FLOOR || s.phase !== "playing") return;
      set({ keeperStalledUntil: runClock(s) + KEEPER_STALL_S });
      bus.emit("keeperKnelt");
      bus.emit("notice", "The Keeper kneels. The stairs, now.");
    },

    keeperStrike: () => {
      const s = get();
      if (!keeperHolds(s)) return;
      const now = runClock(s);
      if (now - s.keeperLastStrikeAt < KEEPER_STRIKE_GRACE_S) return;
      set({ keeperLastStrikeAt: now });
      if (get().damage()) bus.emit("keeperStruck");
    },

    wakeReaper: () => {
      const s = get();
      if (s.reaperAwake || s.phase !== "playing") return;
      set({ reaperAwake: true });
      bus.emit("reaperWoke");
      bus.emit("notice", "The floor has had enough of you. The exit, now.");
    },

    reaperStrike: () => {
      const s = get();
      if (!s.reaperAwake) return;
      const now = runClock(s);
      if (now - s.reaperLastStrikeAt < REAPER_STRIKE_GRACE_S) return;
      // The ordinary damage path, as the Warden's strike is: the charm,
      // the cooldown and the death check stay in one place.
      if (!get().damage()) return;
      set({ reaperLastStrikeAt: now });
      bus.emit("reaperStruck");
    },

    stallReaper: () => {
      const s = get();
      if (!s.reaperAwake) return;
      set({ reaperStalledUntil: runClock(s) + REAPER_STALL_S });
      bus.emit("reaperStalled");
    },

    wardenWounded: (hold = WARDEN_STAGGER_S) => {
      const s = get();
      if (!s.wardenRoomId || !s.dungeon || !s.currentRoomId) return;
      const now = runClock(s);
      // One wound per stagger. Without this the patch it is standing in
      // charges it again every frame it reels there, and two wounds - the
      // whole cost of a rout - are spent in a third of a second by a
      // player who did nothing but stand still.
      if (now < s.wardenStaggerUntil) return;

      const wounds = s.wardenWounds + 1;
      if (wounds < WARDEN_WOUNDS_TO_ROUT) {
        set({ wardenWounds: wounds, wardenStaggerUntil: now + hold });
        bus.emit("wardenWounded", { wounds });
        return;
      }

      // Routed: thrown across the floor, the count reset, and from here on
      // it knows better.
      bus.emit("wardenWounded", { wounds });
      get().routWarden();
    },

    routWarden: () => {
      const s = get();
      if (!s.wardenRoomId || !s.dungeon || !s.currentRoomId) return;
      // The floor calms, but never below its own baseline - the bottom
      // floor is the bottom floor however well you fought on it.
      const away = banishTo(s.dungeon, s.currentRoomId, WARDEN_BANISH_DISTANCE);
      set({
        wardenWounds: 0,
        wardenWary: true,
        wardenStaggerUntil: 0,
        wardenRoomId: away ?? s.wardenRoomId,
        wardenCameFrom: null,
        wardenLure: null,
        lureUntil: 0,
        alarm: Math.max(alarmFloorFor(s), s.alarm - WARDEN_ROUT_CALM),
      });
      bus.emit("wardenRouted");
    },

    detonate: (key) => {
      const s = get();
      const bomb = s.placed.find((d) => d.key === key && d.live && isBomb(d.id));
      if (!bomb || !s.dungeon) return;
      // Spent first, so nothing below can go off twice.
      set({ placed: s.placed.filter((d) => d.key !== key) });
      const { roomId, x, z } = bomb;
      const inBlast = (px: number, pz: number) => (px - x) ** 2 + (pz - z) ** 2 <= BOMB_RADIUS * BOMB_RADIUS;
      bus.emit("bombBurst", { roomId, x, z });
      // What stood in the blast: barrels, crates and urns burst - one of
      // them between the bomb and the player takes it for them - and now
      // and then there is a gem in the wreck. The list is the one the room
      // draws, and the key is where a thing stood, so a vault's extra
      // chests do not shift anybody's index.
      const blastRoom = roomById(s.dungeon, roomId);
      const standing = blastRoom
        ? placementsFor(blastRoom, s.dungeon.seed)
            .filter((p) => BREAKABLE.has(p.kind))
            .map((p) => ({ kind: p.kind, x: p.x, z: p.z, key: breakKey(blastRoom, p) }))
            .filter((p) => !s.broken.includes(p.key))
        : [];
      const shield = s.currentRoomId === roomId ? shielded({ x, z }, playerAt, standing) : null;
      const burst = standing.filter((p) => p === shield || inBlast(p.x, p.z));
      if (burst.length) {
        let spilled = 0;
        for (const p of burst) {
          bus.emit("propBroken", { roomId, kind: p.kind, key: p.key });
          if (spillFor(s.dungeon.seed, p.key)) spilled++;
          // A crate blown open is a crate opened, for the mire's cure.
          get().openedContainer();
        }
        set({
          broken: [...get().broken, ...burst.map((p) => p.key)],
          gems: get().gems + spilled,
          gemsTotal: get().gemsTotal + spilled,
        });
        if (spilled) bus.emit("notice", spilled === 1 ? "Something glints in the wreck." : `${spilled} gems glint in the wreck.`);
      }
      // The player, if they did not walk - and nothing stood between.
      if (s.currentRoomId === roomId && inBlast(playerAt.x, playerAt.z) && !shield) get().damage();
      // The Warden, if it is in the room - whether or not the player is.
      // A bomb left behind in a room the Warden later walks into is a
      // trap, and a trap that only works while you stand in it is a dud.
      if (get().wardenRoomId === roomId) get().routWarden();
      // The Reaper, which is always in the room the player is in: a blast
      // there is the one thing on the floor that holds it.
      if (get().reaperAwake && get().currentRoomId === roomId) get().stallReaper();
      // The Harrier, if it is in the room rather than wheeling away from
      // it: knocked out of the air, and a ground body until it is up.
      if (get().harrierAwake && get().currentRoomId === roomId && runClock(get()) >= get().harrierRetreatUntil) get().downHarrier();
      // The Keeper, if this is a room it stands in: it kneels. The one
      // thing on the floor that opens the last stairs.
      if (keeperPostsFor(s.dungeon, s.floor).some((p) => p.roomId === roomId)) get().stallKeeper();
      // The moth, if it was on the lantern: scattered, and the light it
      // carried goes with it. The roost hears the blast from its own room.
      if (get().mothOn && get().currentRoomId === roomId) get().mothLeaves();
      // The thief, likewise: it drops what it holds. It is only ever in the
      // room the player is in - it comes for them and runs from them - so
      // "in this room" is "the player is".
      if (get().currentRoomId === roomId && get().thiefPhase !== "away") get().thiefCaught();
      // The wall, if this room has a crack in one and the blast reached it.
      const host = roomById(s.dungeon, roomId);
      if (host?.secret) {
        const half = host.size / 2;
        const step = DIR_STEP[host.secret.dir];
        const wx = step.x * half;
        const wz = step.z * half;
        if (inBlast(wx, wz)) {
          /**
           * Wet stone does not crack. The wave goes into the water
           * instead of into the wall, and the room signposts itself from
           * its doorway - a flooded chamber is unmistakable, and the
           * crack in it runs dark and swollen rather than dry and pale.
           */
          if (bombCracks(surfaceOf(host))) get().revealSecret(roomId);
          else bus.emit("notice", "The wall runs with water. The wave goes into it, and nothing gives.");
        }
      }

      /**
       * The stone beside a vault door is the weakest on the floor, and a
       * blast at that doorway brings it down. This is the gate audit
       * paying out: the vault HAS a key, and it does not have ONLY a key,
       * so losing the key to the Cutpurse is a setback rather than a wall.
       */
      const vaultId = s.dungeon.vaultId;
      if (vaultId && blastRoom && !get().unlocked.includes(vaultId)) {
        const toward = (Object.keys(blastRoom.links) as Dir[]).find((d) => blastRoom.links[d] === vaultId);
        if (toward) {
          const [vx, , vz] = doorPosition(blastRoom, toward);
          if (inBlast(vx, vz)) {
            set({ unlocked: [...get().unlocked, vaultId] });
            bus.emit("vaultOpened", { roomId: vaultId });
            bus.emit("notice", "The stone beside the vault door comes away.");
          }
        }
      }
    },

    revealSecret: (hostId) => {
      const s = get();
      if (!s.dungeon) return;
      const host = roomById(s.dungeon, hostId);
      if (!host?.secret || host.links[host.secret.dir]) return;
      const { dir, to } = host.secret;
      // New room objects, not mutated ones: the walls and the map are
      // rendered from these and have to see the change.
      const rooms = s.dungeon.rooms.map((r) => {
        if (r.id === hostId) return { ...r, links: { ...r.links, [dir]: to } };
        if (r.id === to) return { ...r, links: { ...r.links, [OPPOSITE[dir]]: hostId } };
        return r;
      });
      set({ dungeon: { ...s.dungeon, rooms } });
      bus.emit("secretRevealed", { roomId: hostId, to });
      bus.emit("notice", "The wall gives. There is a room behind it.");
    },

    clearRoom: (roomId) => {
      const s = get();
      if (!s.cleared.includes(roomId)) set({ cleared: [...s.cleared, roomId] });
    },
    failRoom: (roomId) => {
      const s = get();
      if (!s.failed.includes(roomId)) set({ failed: [...s.failed, roomId] });
    },

    trialMiss: (roomId) => {
      const at = get().trials[roomId] ?? { attempts: 0, misses: 0 };
      const next = { attempts: at.attempts, misses: at.misses + 1 };
      set((s) => ({ trials: { ...s.trials, [roomId]: next } }));
      return next.misses;
    },
    trialAttempt: (roomId) => {
      const at = get().trials[roomId] ?? { attempts: 0, misses: 0 };
      const next = { attempts: at.attempts + 1, misses: 0 };
      set((s) => ({ trials: { ...s.trials, [roomId]: next } }));
      return next.attempts;
    },

    lockInput: () => set((s) => ({ inputLocks: s.inputLocks + 1 })),
    unlockInput: () => set((s) => ({ inputLocks: Math.max(0, s.inputLocks - 1) })),
  }))
);

/**
 * The run's own clock, in seconds: wall time less whatever was spent in the
 * pause menu. Everything timed measures against this, so pausing does not
 * quietly spend a potion.
 */
export const runClock = (s: RunState): number =>
  performance.now() / 1000 - s.pausedFor - (s.paused && s.pausedAt > 0 ? performance.now() / 1000 - s.pausedAt : 0);

/**
 * The room a floor starts you in, while it is still a sanctuary.
 *
 * A floor begins with a breath: you arrive, you read the room, you decide
 * which doorway to take. That is not a moment to be hit in, and on the
 * third floor - where the Warden wakes on the first room walked - it was:
 * you could arrive, stand still, and be hunted before you had chosen
 * anything. Nothing that hunts comes into this room while the rule holds.
 *
 * It holds until you leave (`floorRooms` counts the rooms walked on this
 * floor and starts at one), and it does not survive the floor running out
 * of patience: the one thing you cannot wait out is the one thing a safe
 * room must not shelter you from, or standing on the stairs would be a way
 * to play. Come back later and it is an ordinary room - which is the other
 * half of the rule, and the reason the first breath being free costs the
 * floor nothing.
 *
 * Every threat asks this rather than each deciding for itself: the
 * Warden's step, the Harrier's waking, the thief's arrival.
 */
export const sanctuaryRoom = (s: RunState): string | null =>
  s.dungeon &&
  s.phase === "playing" &&
  s.currentRoomId === s.dungeon.startId &&
  s.floorRooms === 1 &&
  heatNow(s) < REAPER_AT
    ? s.dungeon.startId
    : null;

/** True while a timed effect is still running. */
const running = (s: RunState, until: number): boolean => until > runClock(s);

/**
 * The floor's heat: one number, three inputs, recomputed every tick.
 *
 * This replaces `FLOOR_PATIENCE_S = 300`, which was a countdown, and a
 * countdown is a ramp. The evidence against a monotonic ramp is
 * unambiguous - one studio shipped it, players hated it, and their own
 * patch notes now target a value that "should stay in-between 3 and 7
 * during most of the run", which is a cycle. Ours also made dwell, greed
 * and depth three unrelated pressures with three hand-tuned tables.
 *
 *     heat = (dwellMinutes + alarm x 0.5) x 1.15 ^ floorsDescended
 *
 * A PURE FUNCTION of the state, never a value mutated on a transition:
 * a mutated accumulator has a history, so the same player in the same
 * situation gets different pressure depending on the route they took to
 * it, and no amount of tuning fixes a number that cannot be reasoned
 * about.
 *
 * And it compounds rather than adding, so a slow floor one costs you on
 * floor three - which is what "floors get worse as you go down" was always
 * trying to be.
 */
export const heatNow = (s: RunState): number =>
  heatFrom(runClock(s) - s.floorEnteredAt, s.alarm, s.floor - 1);

/**
 * What the floor is CALLED, and never what it is counted at.
 *
 * Law 3, applied: the rule is transparent and the magnitude is not. The
 * player is entitled to know that lingering and taking things heats a
 * floor, because that is a rule they can plan against. They are not
 * entitled to a countdown, because a player who can count does not hurry.
 * The names carry no mechanical weight at all and do the work a number
 * cannot.
 */
export const heatSays = (s: RunState): string => bandName(heatNow(s));
export const heatBand = (s: RunState): number => bandFor(heatNow(s));

/**
 * Everything this floor's heat has bought that has not been delivered yet.
 *
 * Heat never kills. It buys, in lumps, at named thresholds, and the
 * accumulator crossing an integer is what makes pressure arrive as an
 * EVENT rather than as a slider moving - the difference between "the world
 * sent something" and "the numbers got worse".
 */
export const heatOwes = (s: RunState): PurchaseId[] =>
  affordable(heatNow(s)).filter((id) => !s.heatBought.includes(id));

/** True while a blast is holding the Reaper where it stands. */
/** It is on the floor after a blast. */
export const harrierDowned = (s: RunState): boolean => s.harrierAwake && !s.harrierSlain && running(s, s.harrierDownedUntil);
/** It has struck and is wheeling away. */
export const harrierAway = (s: RunState): boolean => s.harrierAwake && !s.harrierSlain && running(s, s.harrierRetreatUntil);
/** What the floor's rules treat it as right now: a flier, or - downed - a thing with feet. */
export const harrierBody = (s: RunState): Body => (harrierDowned(s) ? "ground" : BODIES.harrier);

/** The Keeper is kneeling after a blast: the last stairs are open. */
export const keeperStalled = (s: RunState): boolean => s.floor === KEEPER_FLOOR && running(s, s.keeperStalledUntil);
/** The Keeper stands at the last stairs and the store refuses them. */
export const keeperHolds = (s: RunState): boolean =>
  s.phase === "playing" && s.floor === KEEPER_FLOOR && !running(s, s.keeperStalledUntil);

export const reaperStalled = (s: RunState): boolean =>
  s.reaperAwake && running(s, s.reaperStalledUntil);

/** Which timed potion is running, if either. */
export const paceEffect = (s: RunState): PaceEffect =>
  running(s, s.effects.swift) ? "swift" : running(s, s.effects.mire) ? "mire" : "none";

/**
 * How fast the player moves right now: their relics, then whatever they
 * last drank. One owner for the answer, so the player, the HUD and anything
 * else that cares cannot disagree about it.
 *
 * The arithmetic itself lives in pace.ts, with the Warden's side of it, so
 * that the promise the two of them make together - a sprint always gets
 * away, a walk does not - can be checked over the whole matrix of relics,
 * potions and alarm levels rather than trusted.
 */
export const speedNow = (s: RunState): Pace => paceFor(s.relics, paceEffect(s));

/**
 * The room the Warden is currently walking to instead of the player's, or
 * null. It stops caring when the sound goes cold or when it gets there and
 * finds nothing.
 */
export function lureNow(s: RunState): string | null {
  if (!s.wardenLure || !running(s, s.lureUntil)) return null;
  return s.wardenRoomId === s.wardenLure ? null : s.wardenLure;
}

/**
 * Whether the Warden currently knows where the player is by sound. A gem
 * taken rouses the floor for good; a sprint only gives you away while it
 * lasts, which is what makes the two different costs.
 */
/**
 * The room the player is standing in, or undefined between floors.
 *
 * Asked here rather than through `useCurrentRoom`, which is a hook: the
 * store has to answer this from inside `makeNoise`, on the frame loop.
 */
const roomNow = (s: RunState): Room | undefined =>
  s.dungeon && s.currentRoomId ? roomById(s.dungeon, s.currentRoomId) : undefined;

/**
 * How long a sprint keeps the Warden coming, in this room.
 *
 * `NOISE_HOLD_S` is the bare-stone figure; the biome scales it. Standing
 * water throws a footfall down every corridor and moss swallows it, so
 * the same dash is a seven-second confession in one room and a
 * two-second one in another. Between floors, where there is no room to
 * stand in, it is the bare figure - a noise made through a black screen
 * is one the game should not be inventing a floor for.
 */
/**
 * How long a sprint stays audible, and the one owner of it.
 *
 * The mire's other edge is read here rather than decided here: heavy legs
 * are also quiet legs, and `MIRE_LOUDNESS` sits beside the duration it
 * belongs to in the item catalogue so the rule can be checked without a
 * browser. This stays the one place that answers "how far do my feet
 * carry", which is why the ground and the legs are multiplied together
 * here and nowhere else.
 */
export const noiseHoldFor = (s: RunState): number => {
  const room = roomNow(s);
  const ground = !room || !s.dungeon ? 1 : biomeFor(room.kind, room.id, s.dungeon.seed).carry;
  const legs = running(s, s.effects.mire) ? MIRE_LOUDNESS : 1;
  return NOISE_HOLD_S * ground * legs;
};

export const wardenHears = (s: RunState): boolean => running(s, s.noisyUntil);

/** Whether the lantern is up and still has oil in it. */
/**
 * Whether the lantern is showing any light at all.
 *
 * A selector rather than a field, because the glim is the one owner of it:
 * two facts that must agree - "is it up" and "how far up" - are one fact
 * with a threshold, and keeping both in the store is how they drift.
 */
export const lanternRaised = (s: RunState): boolean => s.glim > 0;
export const lanternLit = (s: RunState): boolean => s.glim > 0 && s.oil > 0;

/** The band the flame is in, and what that band buys. */
export const lanternBand = (s: RunState) => glimBand(lanternLit(s) ? s.glim : 0);

/**
 * Whether the walls are giving up their veins.
 *
 * The key idea of the whole bargain: the same room means two different
 * things depending on how you walk into it, and what the dark pays cannot
 * be banked, because you can only take it while you are standing in the
 * danger.
 */
/**
 * Whether the walls are giving up their veins.
 *
 * The Gutter Hood reads them a band earlier than the dark usually allows,
 * which is ODDS rather than power: it does not make a socket worth more,
 * it makes the band at which you can take the doubled one wider. The
 * lantern's own bands are still the one owner of where the line is.
 */
export const veinsShowing = (s: RunState): boolean =>
  gemveinsShow(lanternLit(s) ? s.glim : 0, modifiers(s.relics).veinsEarlier);
/** And at nothing at all, a thin wall shows itself without a bomb. */
/**
 * Whether a cracked wall is showing itself without a bomb.
 *
 * The Long Dark - the pair of the Sounding Rod and the Gutter Hood - moves
 * it up to the Dark band instead of nothing at all. A pair cannot be
 * numerically inflated: you either hold both or you do not, so its value
 * is categorical, and it arrives only if two earlier picks happened to
 * line up.
 */
export const cracksShowing = (s: RunState): boolean =>
  cracksShow(lanternLit(s) ? s.glim : 0, modifiers(s.relics).longDark);

/**
 * Whether the player's light is currently showing.
 *
 * A neutral fact with a neutral name, because it stopped being one
 * creature's business. It was `wardenSeesLight`, and it meant two
 * different things at once: a raised lantern, and a moth circling your
 * head. Splitting them is what the Din's susceptibility table forced, and
 * the split is better than what it replaced - see `wardenMarked`.
 *
 * This half is read by the things that genuinely answer to [bright]: the
 * Sentry, the moth, and the lamplighter that follows a raised lamp.
 */
export const lightIsShowing = (s: RunState): boolean => running(s, s.litUntil);

/**
 * Whether a moth has marked the player for the Warden.
 *
 * The Warden is blind to light - it has been holding the company's lamp
 * since the shift ended and nothing you can carry is brighter. So a raised
 * lantern, on its own, tells it nothing, and the bargain the lantern makes
 * is with the Sentry rather than with this.
 *
 * A moth is not light. A moth is a creature that has settled on you and
 * will not leave, and that IS something a Warden can read across a room -
 * which is what makes the moth worth its place: it is the only way in the
 * game that being lit gives you away to the thing that hunts you.
 */
export const wardenMarked = (s: RunState): boolean => s.mothOn;

/**
 * Whether it knows where the player is at all, by either sense.
 *
 * One owner. The driver, the HUD and the tuning all used to ask
 * `wardenHears`, and adding a second way of being given away without this
 * would have meant three places each deciding for themselves whether
 * light counts - which is exactly the class of bug the rebuild was for.
 */
export const wardenSenses = (s: RunState): boolean => wardenHears(s) || wardenMarked(s);

/**
 * Whether the Warden is still reeling from the spikes. While it is, it
 * neither walks nor strikes nor steps between rooms - which is the window
 * the player bought, and the only thing in the game that stops it.
 */
export const wardenStaggered = (s: RunState): boolean => running(s, s.wardenStaggerUntil);

/**
 * The room a ward stone is still holding, or null. Read by the Warden's
 * driver, which will not step into it, and by the HUD, which says so.
 */
export const wardNow = (s: RunState): string | null =>
  s.wardRoomId && running(s, s.wardUntil) ? s.wardRoomId : null;

/**
 * The snares still set in a room. Takes the list rather than the whole
 * run, so a component can subscribe to just that slice of the store and
 * not re-render on every gem.
 */
export const snaresIn = (placed: readonly PlacedDevice[], roomId: string): PlacedDevice[] =>
  placed.filter((d) => d.live && d.id === "snare" && d.roomId === roomId);

/**
 * The lowest this floor's alarm can be brought, for this delver.
 *
 * Two places calm the floor - a Scroll of Banishment and a rout - and both
 * clamp to a baseline. That baseline was `floorRules(floor).startingAlarm`
 * written out twice, which was right until a delver could add to it: a
 * Tomb Robber's floor starts at 2 and either of those would have taken it
 * to 1, quietly making the run easier than the character it chose.
 */
export const alarmFloorOn = (floor: number, delver: DelverId): number =>
  floorRules(floor).startingAlarm + DELVERS[delver].alarmBonus;

/** The same question asked of the run as it stands. */
export const alarmFloorFor = (s: RunState): number => alarmFloorOn(s.floor, s.delver);

/**
 * The doorway currently barred, or null. A bar is a deadline like every
 * other timed thing in the run, so whether one is standing is asked here
 * rather than remembered anywhere else.
 */
export const barredNow = (s: RunState): string | null =>
  s.barredDoor && running(s, s.barUntil) ? s.barredDoor : null;

/** The bars the Warden's pathing has to work around: none, or the one. */
export const barsNow = (s: RunState): Set<string> => {
  const bar = barredNow(s);
  return bar ? new Set([bar]) : EMPTY_BARS;
};

/**
 * One empty set rather than a fresh one per call. This is read from the
 * frame loop, and a new Set every frame is garbage the collector has to
 * come back for - which on this project is not a theoretical cost: a
 * forced collection mid-sprint is one of the things `yarn test:perf`
 * measures, and the Warden's own step cap exists because of what a long
 * frame does to it.
 */
const EMPTY_BARS: Set<string> = new Set();

/** Whether a Scroll of Gloom is still blacking out the map. */
export const mapIsDark = (s: RunState): boolean => running(s, s.effects.gloom);

/**
 * What the exit charges on this floor, after relics. Never below one.
 *
 * Not after the delver: a delver was going to be able to raise this, and
 * the economy check found in one run that the floors do not hold a gem of
 * slack to spend on it. What a delver changes is the alarm, which does.
 */
export const tollNow = (s: RunState): number =>
  /**
   * The toll, undiscounted. Nothing bought reduces it any more: "every
   * exit costs one gem less" is a number wearing a name, and the toll
   * rising 3, 5, 7 is the one sentence the whole fiction is read off.
   */
  Math.max(1, tollForFloor(s.floor));

/**
 * How many slots this run's satchel has. Four for everyone but the
 * Courier, who trades two of them for the boots.
 */
export const satchelSlots = (s: RunState): number => DELVERS[s.delver].slots;

/** Gems held over what the exit will cost: what the run is actually earning. */
export const spareGems = (s: RunState): number => Math.max(0, s.gems - tollNow(s));

/**
 * Whether something on sale can be bought without stranding the player.
 *
 * The shop is the only place gems are spent on anything but the exit, and
 * the exit is the only thing a player must be able to afford: a floor can
 * hold as few as one gem more than its toll, so a single purchase can leave
 * a run unable to leave the floor by any route it is guaranteed to have.
 *
 * The rule existed and was applied to one of the three things the shop
 * sells. Buying a life asked; asking the shopkeeper what a potion is, and
 * buying a relic for several gems, did not.
 */
export const canSpend = (s: RunState, price: number): boolean =>
  s.gems >= price && s.gems - price >= tollNow(s);

export const useCurrentRoom = (): Room | undefined => useRun(roomNow);

// Dev-only handle for the smoke test and the console. The derived numbers
// go with it: a test that reads the toll off the HUD is really testing
// React's render timing.
if (import.meta.env.DEV && typeof window !== "undefined") {
  const w = window as unknown as Record<string, unknown>;
  // Built first, published last, and only by the copy of this module that
  // gets here first.
  //
  // A dev server can serve this file twice - the app's copy carrying an
  // HMR query, a bare `import("/src/game/state/run.ts")` from a test not -
  // and the second copy's store is one nothing renders from. Assigning
  // over the handle pointed every later write at that store: the screen
  // froze on its last painted frame while the run went on being played
  // where nobody could see it, and forty checks failed for reasons that
  // were not their own. The app's copy loads first, and it keeps them.
  const derived = {
    toll: () => tollNow(useRun.getState()),
    spare: () => spareGems(useRun.getState()),
    walk: () => speedNow(useRun.getState()).walk,
    slots: () => satchelSlots(useRun.getState()),
    rules: () => floorRules(useRun.getState().floor),
    // The floor's own lowest alarm, delver bonus included - `rules()`
    // alone is half the fact, and a probe that reads half of it agrees
    // with the game only for the delver whose bonus is zero.
    alarmFloor: () => alarmFloorFor(useRun.getState()),
    // Asked here rather than imported by a test: a bare import of this
    // module from the page is a second copy of it.
    canSpend: (price: number) => canSpend(useRun.getState(), price),
    hears: () => wardenHears(useRun.getState()),
    // Where to stand to set a bomb against this room's cracked wall: at
    // arm's length from the middle of that wall, inside the room.
    crackSpot: () => {
      const room = roomNow(useRun.getState());
      return room ? crackSpot(room) : null;
    },
    // Where this room's gem lies, if it has one: the flourish plays there
    // and a check that walks to a gem needs the same answer the room's
    // own dressing used, not one of its own.
    gemSpot: (roomId: string) => {
      const s = useRun.getState();
      const room = s.dungeon ? roomById(s.dungeon, roomId) : null;
      return room && s.dungeon ? gemFor(room, s.dungeon.seed) : null;
    },
    // Every chest in a room, by the key looting one is recorded under.
    // One owner, in Dressing, so a check cannot loot a chest under a key
    // the room would never use.
    chestKeys: (roomId: string) => {
      const s = useRun.getState();
      const room = s.dungeon ? roomById(s.dungeon, roomId) : null;
      if (!room || !s.dungeon) return [];
      const asVault = s.dungeon.vaultId === room.id;
      const key = s.dungeon.keyRoomId === room.id ? keyFor(room, s.dungeon.seed) : null;
      const sentry = sentryFor(room, s.dungeon.seed, s.floor, key ? [key] : [])?.at ?? null;
      return placementsFor(room, s.dungeon.seed, { asVault, sentry, key })
        .map((p, i) => (p.kind === "chest" ? chestKey(room.id, i) : null))
        .filter((k): k is string => k !== null);
    },
    // What colour the light a delver carries would be with these relics.
    // The modifiers decide; this only asks, so a check cannot agree with
    // a copy of the rule instead of with the rule.
    lightTint: (relics: readonly RelicId[]) => modifiers(relics).lightTint,
    /**
     * What the offers a run is carrying actually change. Asked of the one
     * place that computes it, so a check cannot agree with a copy of the
     * rule instead of with the rule.
     */
    offers: () => modifiers(useRun.getState().relics),
    bombs: () => useRun.getState().placed.filter((d) => isBomb(d.id)),
    // What has gone off, by key: a probe reads it beside where the traps are.
    sprung: () => ({ ...useRun.getState().sprung }),
    // How hot the floor is, what it is called, and what it has already
    // bought. On the run's clock, like every deadline in here.
    heat: () => heatNow(useRun.getState()),
    heatSays: () => heatSays(useRun.getState()),
    heatBought: () => [...useRun.getState().heatBought],
    // Whether the room the player is in is the floor's first, still unleft
    // and still below the band the floor stops putting up with you at:
    // the one rule every threat asks before it comes in.
    sanctuary: () => sanctuaryRoom(useRun.getState()) !== null,
    reaper: () => {
      const s = useRun.getState();
      return { awake: s.reaperAwake, stalled: reaperStalled(s), enteredAt: s.floorEnteredAt };
    },
    // The Keeper, as the store has it, and where it stands.
    keeper: () => {
      const s = useRun.getState();
      return { holds: keeperHolds(s), stalled: keeperStalled(s), posts: s.dungeon ? keeperPostsFor(s.dungeon, s.floor) : [] };
    },
    // The floor's Harrier, as the store has it.
    harrier: () => {
      const s = useRun.getState();
      return { awake: s.harrierAwake, slain: s.harrierSlain, down: harrierDowned(s), away: harrierAway(s) };
    },
    // How long a sprint in this room keeps the Warden coming.
    noiseHold: () => noiseHoldFor(useRun.getState()),
    // The run's own clock, which every deadline in the store is kept on.
    // A probe that reads a deadline needs the clock it was set against;
    // `performance.now()` is not it once the pause menu has been opened.
    clock: () => runClock(useRun.getState()),
    bars: () => barsNow(useRun.getState()),
    lantern: () => {
      const s = useRun.getState();
      return { raised: lanternRaised(s), lit: lanternLit(s), oil: s.oil, glim: s.glim, band: lanternBand(s).id, veins: veinsShowing(s), cracks: cracksShowing(s), seen: lightIsShowing(s) };
    },
    lure: () => lureNow(useRun.getState()),
    items: () => ITEM_IDS.slice(),
    charges: () => ({ ...useRun.getState().charges }),
    warden: () => {
      const s = useRun.getState();
      return {
        room: s.wardenRoomId,
        wounds: s.wardenWounds,
        wary: s.wardenWary,
        staggered: wardenStaggered(s),
        alarm: s.alarm,
      };
    },
    thief: () => {
      const s = useRun.getState();
      return {
        phase: s.thiefPhase,
        holding: s.thiefHolding,
        nest: s.nestRoomId,
        nestGems: s.nestGems,
        nestSeen: s.nestSeen,
        nextIn: Math.max(0, s.thiefNextAt - runClock(s)),
      };
    },
    hunts: () => {
      const s = useRun.getState();
      return behaviourFor(s.alarm, !lureNow(s) && wardenSenses(s)).hunts;
    },
  };
  if (w.__run) {
    console.warn("[run] a second copy of the run store loaded; the first keeps __run");
  } else {
    w.__run = useRun;
    w.__derived = derived;
  }
}
