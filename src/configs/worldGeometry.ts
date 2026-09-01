/**
 * The one vertical datum the whole game agrees on.
 *
 * Room floors used to be placed at `-roomHeight / 2`, where `roomHeight` was a
 * leftover from the 2D map view - the thickness of a room's card, 0.4 for a
 * normal room, 0.5 for start and end, 0.6 for a boss room. That number had no
 * business in the play space, and because it varied by room type the floor sat
 * at a different height in each kind of room. Walking from a normal room into
 * the start room meant a silent 0.05 step, and every value derived from the
 * floor (spawn heights, prop bases) had to guess which room it was in.
 *
 * There is now one ground plane, at y = 0, in every room.
 */
export const GROUND_Y = 0;

/** Floor slabs are solid boxes; a plane lets a fast body tunnel through. */
export const FLOOR_THICKNESS = 1;

/** Half-height of the player capsule's cylindrical section. */
export const PLAYER_CAPSULE_HALF_HEIGHT = 0.8;
/** Radius of the player capsule's hemispherical caps. */
export const PLAYER_CAPSULE_RADIUS = 0.3;

/**
 * Where the player's body centre sits when standing on the ground.
 *
 * Spawn points used to hardcode y = 0.5, which put the capsule's bottom well
 * below the floor. Every room entry therefore began with the solver shoving the
 * player up out of the floor they had been spawned inside - an unasked-for
 * vertical launch at the exact moment the player took control.
 */
export const PLAYER_REST_Y =
  GROUND_Y + PLAYER_CAPSULE_HALF_HEIGHT + PLAYER_CAPSULE_RADIUS;

/**
 * Spawn height: resting height plus a hair, so the player settles down onto the
 * floor rather than being pushed up out of it.
 */
export const PLAYER_SPAWN_Y = PLAYER_REST_Y + 0.05;
