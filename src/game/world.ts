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
 * each floor after. A floor holds about eight gems, so a toll of three was
 * something you tripped over: you took the first three and left, and the
 * rest of the floor may as well not have existed. Rising to seven by the
 * last floor means the deeper floors have to be worked, and the gems you
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
/** It will not appear on a floor until this many rooms have been entered. */
export const WARDEN_GRACE_ROOMS = 2;

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
 * dash. So the room teaches you to run its inside line, a Potion of
 * Swiftness is worth drinking here, and a Potion of Mire is very nearly
 * fatal.
 */
export const ARENA_WIND_UP_S = 2;
export const ARENA_DURATION_S = 14;
export const ARENA_ARMS = 3;
export const ARENA_RADII = [2.4, 4.4, 6.4, 8.4, 10.4];
/** Radians a second. One turn takes about eight seconds. */
export const ARENA_SPIN = 0.75;
/** If a room never reports itself mounted, hand control back anyway. */
export const TRANSITION_FALLBACK_MS = 1500;
