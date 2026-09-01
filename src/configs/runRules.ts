/**
 * The rules of a single run. Kept in one place so the demo can be tuned from
 * playtesting without hunting through components.
 */

/** Gems the player must hand over to open the door to the end room. */
export const GEMS_REQUIRED_FOR_END = 3;

/** Lives a run starts with. Losing the last one ends the run. */
export const STARTING_LIVES = 3;

/** Seconds of invulnerability after taking a hit, so one trap cannot chain. */
export const DAMAGE_COOLDOWN_SECONDS = 1.5;
