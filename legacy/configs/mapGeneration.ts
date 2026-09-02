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

/**
 * The room types the demo is allowed to generate.
 *
 * The generator can emit 38 different biomes, most of them a few props and a
 * floor. A dungeon of 38 half-finished rooms reads as broken; eight finished
 * ones read as designed. These are the types with real content behind them,
 * including the two puzzle rooms that were previously unreachable outside the
 * editor. Start and end rooms are placed separately and are always present.
 */
export const DEMO_ROOM_TYPES: string[] = [
  "treasure", // loot room
  "memory-chamber", // the memory puzzle
  "challenge", // the pressure-plate puzzle
  "trap", // hazards that cost a life
  "library", // readable set dressing
  "shop", // stocked room
  "arena", // open combat-shaped space
  "normal", // plain connector room
];
