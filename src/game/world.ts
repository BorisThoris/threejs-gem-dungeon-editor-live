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
/** Gems handed over to open the door into the end room. */
export const GEMS_FOR_EXIT = 3;
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
/** If a room never reports itself mounted, hand control back anyway. */
export const TRANSITION_FALLBACK_MS = 1500;
