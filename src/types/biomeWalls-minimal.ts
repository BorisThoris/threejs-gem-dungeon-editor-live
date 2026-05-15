export interface WallDefinition {
  position: [number, number, number];
  size: [number, number, number];
  rotation: [number, number, number];
  material: string;
  texture?: string;
  color?: string;
  opacity?: number;
  hasDoor?: boolean;
  doorWidth?: number;
  doorPosition?: [number, number, number];
  isBreakable?: boolean;
  breakingOptions?: Record<string, unknown>;
}

export interface BiomeWallConfig {
  id: string;
  name: string;
  description: string;
  walls: WallDefinition[];
  floor?: {
    position: [number, number, number];
    size: [number, number, number];
    material: string;
    texture?: string;
    color?: string;
  };
  ceiling?: {
    position: [number, number, number];
    size: [number, number, number];
    material: string;
    texture?: string;
    color?: string;
  };
  decorations?: Array<{
    type: string;
    position: [number, number, number];
    size: [number, number, number];
    rotation?: [number, number, number];
    material: string;
    color?: string;
  }>;
  entryPoints?: Array<{
    direction: 'north' | 'south' | 'east' | 'west';
    position: [number, number, number];
    width: number;
    height: number;
  }>;
  lighting?: {
    type: 'ambient' | 'directional' | 'point' | 'spot';
    position?: [number, number, number];
    intensity: number;
    color?: string;
  };
}

export const BIOME_WALL_CONFIGS: Record<string, BiomeWallConfig> = {};

export const getBiomeWallConfig = (biomeId: string): BiomeWallConfig | null => {
  return BIOME_WALL_CONFIGS[biomeId] || null;
};

export const hasBiomeWallConfig = (biomeId: string): boolean => {
  return biomeId in BIOME_WALL_CONFIGS;
};
