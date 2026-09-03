/**
 * Every number the world is built from, in one place.
 *
 * The old tree had five separate opinions about where the floor was
 * (roomHeight, GROUND_LEVEL, a 1.1x room scale, spawn y = 0.5, a 1.5 guessed
 * against a floor "typically at -0.5") and every bug fixed in its last week
 * was two of them disagreeing. A fact lives here or it does not exist.
 */

// --- Geometry --------------------------------------------------------------

/** The one ground plane. Every floor's top surface is here. */
export const GROUND_Y = 0;
/** Floors are solid slabs; a plane lets a fast body tunnel through. */
export const FLOOR_THICKNESS = 1;
export const WALL_HEIGHT = 5;
export const WALL_THICKNESS = 0.4;
/** Width of the gap cut in a wall for a doorway. */
export const DOOR_WIDTH = 3;
export const DOOR_HEIGHT = 3.4;

/** Player capsule: cylinder half-height and cap radius. */
export const PLAYER_CAPSULE_HALF_HEIGHT = 0.8;
export const PLAYER_CAPSULE_RADIUS = 0.3;
/** Body centre when standing on the ground. */
export const PLAYER_REST_Y =
  GROUND_Y + PLAYER_CAPSULE_HALF_HEIGHT + PLAYER_CAPSULE_RADIUS;
/** Spawn a hair above rest so the player settles down, not up out of the floor. */
export const PLAYER_SPAWN_Y = PLAYER_REST_Y + 0.05;
/** Camera height above the body centre. */
export const EYE_OFFSET = 0.5;

/** How close the player must stand for a door, counter or lectern to offer itself. */
export const INTERACT_RADIUS = 3;

/**
 * How far inside the room the player lands after travelling. Clear of the
 * interact radius of the door they came through, so the new room does not
 * greet them with an offer to go straight back.
 */
export const entranceDepth = (halfSize: number): number =>
  Math.min(INTERACT_RADIUS + 0.5, halfSize * 0.6);

// --- Movement --------------------------------------------------------------

export const WALK_SPEED = 5;
export const DASH_SPEED = 8;
/** Terminal velocity: keeps every physics step inside the floor's thickness. */
export const MAX_FALL_SPEED = 25;
/**
 * The player cannot jump and the world is flat, so upward motion is only
 * ever the solver pushing the capsule out of something. Capped low enough
 * that it never reads as a launch, but not zero: de-penetration is how the
 * player gets out of geometry they end up inside.
 */
export const MAX_RISE_SPEED = 2;
export const GRAVITY_SCALE = 2;
export const MOUSE_SENSITIVITY = 0.0016;
export const GAMEPAD_LOOK_SPEED = 2.4;
export const CAMERA_FOV = 90;

// --- Room sizes -------------------------------------------------------------

export const ROOM_SIZE_DEFAULT = 16;
export const ROOM_SIZE_SMALL = 14;
export const ROOM_SIZE_LARGE = 24;
/** Every size a room may be; the editor offers exactly these. */
export const ROOM_SIZES = [ROOM_SIZE_SMALL, ROOM_SIZE_DEFAULT, ROOM_SIZE_LARGE] as const;

// --- Run rules --------------------------------------------------------------

export const STARTING_LIVES = 3;
/**
 * What the exit charges on the first floor, and how much more it charges on
 * each floor after. The shallowest floor holds about ten gems, so a toll of
 * three was something you tripped over: you took the first three and left,
 * and the rest of the floor may as well not have existed. Rising to seven by
 * the last floor means the deeper floors have to be worked, and the gems you
 * hold over the toll are the ones you get to keep.
 */
export const TOLL_BASE = 3;
export const TOLL_STEP = 2;
/** What the exit charges on a floor, before relics. */
export const tollForFloor = (floor: number): number =>
  TOLL_BASE + TOLL_STEP * (floor - 1);
/**
 * Floors in a run. One floor's shortest path is twenty seconds of walking;
 * three floors, each a fresh dungeon with its toll, is a demo's worth. Lives
 * and gems carry down; the rooms do not.
 */
export const FLOORS = 3;
/**
 * What the shopkeeper charges for a life. A third of the exit toll, so a
 * careless run keeps paying for itself and a careful one gets out sooner.
 */
export const GEMS_PER_LIFE = 1;
/** Seconds of invulnerability after a hit, so one trap cannot chain. */
export const DAMAGE_COOLDOWN_S = 1.5;

// --- The Warden -------------------------------------------------------------

/**
 * One presence walks each floor. It is not fought: it is heard, avoided and
 * outrun. Everything about it scales with the floor's alarm, and alarm is
 * raised by taking gems - so the floor gets more dangerous exactly as far as
 * you have chosen to rob it.
 *
 * Its chase speed stays under WALK_SPEED at every level, so a player who
 * keeps moving is never simply caught; it wins by cornering, by surprise,
 * and by being between you and the door.
 */
export const ALARM_PER_GEM = 1;
/** Alarm at which it stops wandering and starts walking towards you. */
export const ALARM_HUNTS_AT = 3;
/** Seconds between room-to-room moves, from calm to fully roused. */
export const WARDEN_STEP_CALM_S = 9;
export const WARDEN_STEP_ROUSED_S = 4;
/** How fast it crosses a room, from calm to fully roused. */
export const WARDEN_SPEED_CALM = 2.2;
export const WARDEN_SPEED_ROUSED = 4.4;
/** Alarm at which the scaling has topped out. */
export const ALARM_MAX = 6;
/** How close it has to be to take a life. */
export const WARDEN_TOUCH_RADIUS = 1.05;
/** Doorways it is thrown back when it lands a hit. */
export const WARDEN_BANISH_DISTANCE = 3;
// How long a floor is left alone before it wakes scales with depth, and so
// lives with the rest of the descent in `floorRules` below.

// --- The Sentry -------------------------------------------------------------

/**
 * A watcher on a post, turning a beam around an otherwise ordinary room.
 *
 * The Warden roams and this does not, which is the point of having both:
 * one makes you leave, the other makes you time your crossing. It never
 * takes a life - being seen rouses the floor and tells the Warden where you
 * are, which is worse than a life and is felt later rather than at once.
 *
 * How many of a floor's plain rooms get one is a per-floor matter and lives
 * in `floorRules` below; the first floor gets none, because that is where a
 * player learns the dungeon and a room that punishes walking through it is
 * not the place to do that.
 */
/** Radians a second, and how wide the beam is either side of centre. */
export const SENTRY_SPIN = 0.55;
export const SENTRY_HALF_ANGLE = 0.42;
export const SENTRY_RANGE = 11;
/** Seconds held in the light before it calls out. */
export const SENTRY_PATIENCE = 0.9;
/** How much being seen rouses the floor, and how long before it can again. */
export const SENTRY_ALARM = 1;
export const SENTRY_COOLDOWN_S = 6;

// --- The descent ------------------------------------------------------------

/**
 * What changes on the way down.
 *
 * The floors used to differ only in what the exit charged, which made the
 * descent an arithmetic problem rather than a journey: the third floor was
 * the first floor with a bigger bill. This is the one table that says how a
 * floor is worse than the one above it, and everything that scales with
 * depth reads it - the generator, the Warden's grace, the alarm a floor
 * starts at, and how many rooms are watched.
 *
 * The arc is deliberate. Floor one is small, unwatched, slow to wake and lit
 * like somewhere people still work: it is where the dungeon is learned.
 * Floor two is bigger, colder, has watchers, and is already stirring when
 * you arrive. Floor three is the bottom of something - large enough to get
 * lost in, watched almost everywhere, one gem away from being hunted the
 * moment you step off the stair, and dark enough that the braziers are the
 * only reason a corner has anything in it.
 */
export interface FloorRules {
  /** Rooms the floor is generated with, including start and end. */
  minRooms: number;
  maxRooms: number;
  /** Rooms entered before the Warden wakes on this floor. */
  wardenGrace: number;
  /** How roused the floor already is when you arrive. */
  startingAlarm: number;
  /** Share of the floor's plain rooms that get a Sentry. */
  sentryChance: number;
  /**
   * The one line the player is shown on arriving. It says what the row above
   * it does, in words, so the numbers and what the player is told cannot
   * drift apart.
   */
  blurb: string;
  /**
   * How the floor is lit. Difficulty a player has to infer from being
   * caught; light they read the moment they arrive, which is why it belongs
   * in this row and not in a theme file of its own. Deeper means dimmer and
   * colder-cast, so the braziers stop being decoration and start being the
   * only reason a corner is visible.
   */
  light: {
    /** Ambient and hemisphere intensity for the whole scene. */
    ambient: number;
    /** The colour the hemisphere light casts from above. */
    sky: string;
    /** The room's overhead fill, in colour and candela. */
    fill: string;
    fillIntensity: number;
    /** How far down a room you can see before the dark takes it. */
    fogFar: number;
  };
}

const DESCENT: readonly FloorRules[] = [
  {
    minRooms: 8,
    maxRooms: 10,
    wardenGrace: 3,
    startingAlarm: 0,
    sentryChance: 0,
    blurb: "The upper vaults. Quiet, unwatched, and slow to notice you.",
    light: { ambient: 0.7, sky: "#9fb4d8", fill: "#ffd9a8", fillIntensity: 18, fogFar: 46 },
  },
  {
    minRooms: 10,
    maxRooms: 13,
    wardenGrace: 2,
    startingAlarm: 1,
    sentryChance: 0.45,
    blurb: "Deeper. The halls are wider, watchers stand in them, and something is already stirring.",
    light: { ambient: 0.5, sky: "#7f96bd", fill: "#cfe0dc", fillIntensity: 14, fogFar: 41 },
  },
  {
    minRooms: 12,
    maxRooms: 16,
    wardenGrace: 1,
    startingAlarm: 2,
    sentryChance: 0.65,
    blurb: "The bottom. Watched almost everywhere, and one gem from being hunted. Take what you can and climb.",
    light: { ambient: 0.34, sky: "#9c6a72", fill: "#ffae96", fillIntensity: 11, fogFar: 36 },
  },
];

/**
 * The rules for a floor, 1-based. Floors past the last described one keep
 * the last row, so adding a floor to FLOORS is playable before it is tuned.
 */
export function floorRules(floor: number): FloorRules {
  const i = Math.max(0, Math.min(DESCENT.length - 1, Math.round(floor) - 1));
  return DESCENT[i];
}

// --- The arena --------------------------------------------------------------

/**
 * The arena's gem sits on a plinth in the middle, and lifting it bars the
 * doors and starts the arms turning.
 *
 * Three arms of spikes sweep the whole floor, so there is no corner to wait
 * in: the only safe ground is the turning gap between two arms, and staying
 * in it means walking a circle for as long as it lasts. The maths of that
 * is the design. At the inner ring, keeping pace needs about 1.8 units a
 * second and a walk does 5; out at the wall it needs 8, which is exactly a
 * dash, and in the corners it needs more than a dash can give. So the room
 * teaches you to run its inside line, a Potion of Swiftness is worth
 * drinking here, and a Potion of Mire is very nearly fatal.
 *
 * The rings run out to the corners of the room's box, not to the edge of
 * the floor it draws. A shaped arena still has square walls, so a player
 * can stand where the polygon does not reach - and with the rings stopping
 * at the polygon, those four corners were the safest ground in a room whose
 * whole promise is that there is nowhere safe to stand.
 */
export const ARENA_WIND_UP_S = 2;
export const ARENA_DURATION_S = 14;
export const ARENA_ARMS = 3;
/** Innermost ring, and the gap between rings. Rings run out to the corners. */
export const ARENA_INNER_RADIUS = 2.4;
export const ARENA_RING_GAP = 2;
/** Radians a second. One turn takes about eight seconds. */
export const ARENA_SPIN = 0.75;
/** If a room never reports itself mounted, hand control back anyway. */
export const TRANSITION_FALLBACK_MS = 1500;
