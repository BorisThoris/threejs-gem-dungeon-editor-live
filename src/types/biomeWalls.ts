// Biome-based wall system for dynamic room generation
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

// Predefined biome wall configurations
export const BIOME_WALL_CONFIGS: Record<string, BiomeWallConfig> = {
  corridor: {
    id: 'corridor',
    name: 'Corridor',
    description: 'A connecting passage between areas',
    walls: [
      {
        position: [-2, 2, 0],
        size: [0.2, 4, 8],
        rotation: [0, 0, 0],
        material: 'stone',
        texture: 'cobblestone',
        color: '#8B4513',
      },
      {
        position: [2, 2, 0],
        size: [0.2, 4, 8],
        rotation: [0, 0, 0],
        material: 'stone',
        texture: 'cobblestone',
        color: '#8B4513',
      },
    ],
    floor: {
      position: [0, 0, 0],
      size: [4, 0.2, 8],
      material: 'stone',
      texture: 'cobblestone',
      color: '#666666',
    },
    ceiling: {
      position: [0, 4, 0],
      size: [4, 0.2, 8],
      material: 'stone',
      texture: 'cobblestone',
      color: '#8B4513',
    },
    entryPoints: [
      { direction: 'north', position: [0, 0, -4], width: 2, height: 3 },
      { direction: 'south', position: [0, 0, 4], width: 2, height: 3 },
    ],
    lighting: {
      type: 'ambient',
      intensity: 0.3,
      color: '#FFD700',
    },
  },
};

// Helper function to get biome wall config
export const getBiomeWallConfig = (biomeId: string): BiomeWallConfig | null => {
  return BIOME_WALL_CONFIGS[biomeId] || null;
};

// Helper function to get all available biome wall configs
export const getAllBiomeWallConfigs = (): BiomeWallConfig[] => {
  return Object.values(BIOME_WALL_CONFIGS);
};

// Helper function to check if a biome has wall config
export const hasBiomeWallConfig = (biomeId: string): boolean => {
  return biomeId in BIOME_WALL_CONFIGS;
};