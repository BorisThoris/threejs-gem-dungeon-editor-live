/**
 * Which biome categories the dungeon generator is allowed to draw from.
 *
 * This list used to live inline in StartScreen, which also generated a map of
 * its own. UnifiedRoomManager generated a second one without the list, so the
 * map the player actually explored depended on which call finished last - and
 * the biome filter was silently ignored half the time. There is one generator
 * call now, and it reads this.
 */
export const ENABLED_BIOME_CATEGORIES: string[] = [
  "buff",
  "resource",
  "puzzle",
  "transport",
  "obstacle",
  "special",
  "religious",
  "social",
  "geometric",
];
