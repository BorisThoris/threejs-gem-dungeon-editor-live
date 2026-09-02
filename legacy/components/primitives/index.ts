// Export all primitives organized by category
export * as GameRooms from './game-rooms';
export * as DemoRooms from './demo-rooms';
export * as Objects from './objects';
export * as Elements from './elements';

// Re-export commonly used components for convenience
export { StartRoom, CoffeeBiome, MeditationBiome } from './game-rooms';
export { ItemSprite, DestructibleWall, CrackedDestructibleWall, ParticleSystem } from './objects';
export { Tile, Wall, Ceiling, Plank, Stair, Handrail } from './elements';
export { Torch, Barrel, Chest, Brick, CrackedBrick, Stone, WoodPlank } from './elements';
