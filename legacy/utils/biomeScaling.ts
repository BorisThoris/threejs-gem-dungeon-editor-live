import type { PlayerDimensions } from '../store/gameStore';

/**
 * Utility functions for scaling biome elements according to player dimensions
 */

export interface BiomeScale {
  // Base unit measurements relative to player
  unitSize: number; // 1 block unit in world coordinates
  playerWidth: number;
  playerHeight: number;
  playerDepth: number;
  
  // Derived measurements for common biome elements
  pathWidth: number; // Width of walkable paths (comfortable for player)
  doorWidth: number; // Width of doorways
  wallThickness: number; // Thickness of walls
  wallHeight: number; // Height of walls (taller than player)
  platformHeight: number; // Height player can step up
  ceilingHeight: number; // Height of ceilings above player
}

/**
 * Calculate standardized biome scale factors based on player dimensions
 */
export function getBiomeScale(playerDimensions: PlayerDimensions): BiomeScale {
  const { width, height, depth } = playerDimensions;
  
  return {
    // Base measurements
    unitSize: 10, // 1 "room block" = 10 units
    playerWidth: width,
    playerHeight: height,
    playerDepth: depth,
    
    // Derived measurements (scaled to player)
    pathWidth: Math.max(3, width * 5), // Path should be 5x player width minimum
    doorWidth: Math.max(2, width * 3), // Door should be 3x player width minimum
    wallThickness: Math.max(0.2, width * 0.5), // Wall thickness 50% of player width
    wallHeight: height * 1.5, // Walls 1.5x player height
    platformHeight: height * 0.3, // Platforms 30% of player height (steppable)
    ceilingHeight: height * 2, // Ceilings 2x player height
  };
}

/**
 * Scale a bridge length to appropriate width based on player dimensions
 */
export function getBridgeDimensions(
  length: number,
  playerDimensions: PlayerDimensions
): { length: number; width: number; railHeight: number } {
  const scale = getBiomeScale(playerDimensions);
  
  return {
    length,
    width: scale.pathWidth, // Use standard path width
    railHeight: scale.playerHeight * 0.6, // Rails at 60% player height
  };
}

/**
 * Scale maze dimensions based on player size
 */
export function getMazeDimensions(
  size: number,
  playerDimensions: PlayerDimensions
): { 
  size: number; 
  pathWidth: number; 
  wallThickness: number; 
  wallHeight: number;
  minPathWidth: number;
} {
  const scale = getBiomeScale(playerDimensions);
  
  return {
    size,
    pathWidth: scale.pathWidth * 0.6, // Maze paths slightly narrower (60% of normal)
    wallThickness: scale.wallThickness,
    wallHeight: scale.wallHeight,
    minPathWidth: scale.playerWidth * 2, // Minimum clearance 2x player width
  };
}

/**
 * Scale arch/doorway dimensions based on player size
 */
export function getArchDimensions(
  playerDimensions: PlayerDimensions
): { 
  width: number; 
  height: number; 
  depth: number; 
  pillarWidth: number;
} {
  const scale = getBiomeScale(playerDimensions);
  
  return {
    width: scale.doorWidth,
    height: scale.wallHeight,
    depth: scale.wallThickness * 4, // Arch depth 4x wall thickness
    pillarWidth: scale.wallThickness * 3, // Pillars 3x wall thickness
  };
}

/**
 * Get standard room tile size (10x10 units by default)
 */
export function getRoomTileSize(): number {
  return 10;
}

/**
 * Convert room blocks to world units
 */
export function blocksToUnits(blocks: number): number {
  return blocks * getRoomTileSize();
}

/**
 * Convert world units to room blocks
 */
export function unitsToBlocks(units: number): number {
  return units / getRoomTileSize();
}
