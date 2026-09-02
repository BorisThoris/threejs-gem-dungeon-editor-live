import { COLOR_PALETTE } from '../themes/colors';

export interface TextureDefinition {
  id: string;
  name: string;
  category: string;
  description: string;
  width: number;
  height: number;
  pixels: string[];
}

// Advanced texture generation utilities
const createGradient = (startColor: string, endColor: string, steps: number): string[] => {
  // Simple gradient implementation - in a real app you'd use color interpolation
  return Array.from({ length: steps }, (_, i) => {
    const ratio = i / (steps - 1);
    // For now, alternate between start and end colors
    return ratio < 0.5 ? startColor : endColor;
  });
};

const createNoise = (width: number, height: number, colors: string[]): string[] => {
  const pixels: string[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // Simple pseudo-random selection
      const index = (x + y * 3) % colors.length;
      pixels.push(colors[index]);
    }
  }
  return pixels;
};

const createWavePattern = (width: number, height: number, colors: string[], frequency: number = 2): string[] => {
  const pixels: string[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const wave = Math.sin((x * frequency * Math.PI) / width) * 0.5 + 0.5;
      const colorIndex = Math.floor(wave * (colors.length - 1));
      pixels.push(colors[colorIndex]);
    }
  }
  return pixels;
};

const createCircularPattern = (width: number, height: number, colors: string[]): string[] => {
  const pixels: string[] = [];
  const centerX = width / 2;
  const centerY = height / 2;
  const maxRadius = Math.min(centerX, centerY);
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
      const normalizedDistance = distance / maxRadius;
      const colorIndex = Math.floor(normalizedDistance * (colors.length - 1));
      pixels.push(colors[colorIndex]);
    }
  }
  return pixels;
};

const createDiamondPattern = (width: number, height: number, colors: string[]): string[] => {
  const pixels: string[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const diamondX = Math.abs(x - width / 2);
      const diamondY = Math.abs(y - height / 2);
      const diamondValue = (diamondX + diamondY) / (width / 2 + height / 2);
      const colorIndex = Math.floor(diamondValue * (colors.length - 1));
      pixels.push(colors[colorIndex]);
    }
  }
  return pixels;
};

const createBrickPattern = (width: number, height: number, colors: string[], brickHeight: number = 4): string[] => {
  const pixels: string[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const brickY = Math.floor(y / brickHeight);
      const brickX = Math.floor(x / (width / 2));
      const offsetX = brickY % 2 === 0 ? 0 : width / 4;
      const adjustedX = (x + offsetX) % width;
      const localBrickX = Math.floor(adjustedX / (width / 2));
      
      const isMortar = (y % brickHeight === 0) || (y % brickHeight === brickHeight - 1) ||
                      (adjustedX % (width / 2) === 0) || (adjustedX % (width / 2) === (width / 2) - 1);
      
      pixels.push(isMortar ? colors[1] : colors[0]);
    }
  }
  return pixels;
};

const createWoodGrainPattern = (width: number, height: number, colors: string[]): string[] => {
  const pixels: string[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // Create wood grain lines
      const grain = Math.sin((y * 0.3) + (x * 0.1)) * 0.3 + 0.7;
      const noise = Math.sin((x * 0.2) + (y * 0.4)) * 0.2;
      const combined = (grain + noise) / 2;
      const colorIndex = Math.floor(combined * (colors.length - 1));
      pixels.push(colors[colorIndex]);
    }
  }
  return pixels;
};

const createPixelArtPattern = (width: number, height: number, colors: string[], pattern: 'checker' | 'dots' | 'stripes' | 'bricks'): string[] => {
  const pixels: string[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let colorIndex = 0;
      
      switch (pattern) {
        case 'checker':
          colorIndex = (x + y) % 2;
          break;
        case 'dots': {
          const dotX = x % 4;
          const dotY = y % 4;
          colorIndex = (dotX === 1 || dotX === 2) && (dotY === 1 || dotY === 2) ? 1 : 0;
          break;
        }
        case 'stripes':
          colorIndex = x % 4 < 2 ? 0 : 1;
          break;
        case 'bricks': {
          const brickY = Math.floor(y / 3);
          const brickX = Math.floor(x / 4);
          const offsetX = brickY % 2 === 0 ? 0 : 2;
          const adjustedX = (x + offsetX) % 8;
          const localBrickX = Math.floor(adjustedX / 4);
          const isMortar = (y % 3 === 0) || (adjustedX % 4 === 0) || (adjustedX % 4 === 3);
          colorIndex = isMortar ? 1 : 0;
          break;
        }
      }
      
      pixels.push(colors[colorIndex % colors.length]);
    }
  }
  return pixels;
};

const createStonePattern = (width: number, height: number, colors: string[]): string[] => {
  const pixels: string[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // Create stone-like patterns with multiple noise layers
      const noise1 = Math.sin((x * 0.4) + (y * 0.3)) * 0.3;
      const noise2 = Math.sin((x * 0.8) + (y * 0.6)) * 0.2;
      const noise3 = Math.sin((x * 1.2) + (y * 0.9)) * 0.1;
      const combined = (noise1 + noise2 + noise3 + 1) / 2;
      const colorIndex = Math.floor(combined * (colors.length - 1));
      pixels.push(colors[colorIndex]);
    }
  }
  return pixels;
};

const createFabricPattern = (width: number, height: number, colors: string[]): string[] => {
  const pixels: string[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // Create fabric weave pattern
      const warp = Math.sin(x * 0.5) * 0.3 + 0.7;
      const weft = Math.sin(y * 0.5) * 0.3 + 0.7;
      const combined = (warp + weft) / 2;
      const colorIndex = Math.floor(combined * (colors.length - 1));
      pixels.push(colors[colorIndex]);
    }
  }
  return pixels;
};

const createCloudPattern = (width: number, height: number, colors: string[]): string[] => {
  const pixels: string[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // Create cloud-like patterns
      const cloud1 = Math.sin((x * 0.2) + (y * 0.15)) * 0.4;
      const cloud2 = Math.sin((x * 0.4) + (y * 0.3)) * 0.3;
      const cloud3 = Math.sin((x * 0.1) + (y * 0.1)) * 0.2;
      const combined = (cloud1 + cloud2 + cloud3 + 1) / 2;
      const colorIndex = Math.floor(combined * (colors.length - 1));
      pixels.push(colors[colorIndex]);
    }
  }
  return pixels;
};

const createTechPattern = (width: number, height: number, colors: string[]): string[] => {
  const pixels: string[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // Create tech/cyberpunk patterns
      const tech1 = Math.abs(Math.sin(x * 0.3) - Math.cos(y * 0.3)) * 0.5;
      const tech2 = Math.abs(Math.sin(x * 0.6) - Math.cos(y * 0.6)) * 0.3;
      const combined = (tech1 + tech2) / 2;
      const colorIndex = Math.floor(combined * (colors.length - 1));
      pixels.push(colors[colorIndex]);
    }
  }
  return pixels;
};

export const generateThemeTextures = (): TextureDefinition[] => {
  const earth = COLOR_PALETTE.earth;
  const metallic = COLOR_PALETTE.metallic;
  const neon = COLOR_PALETTE.neon;
  const cool = COLOR_PALETTE.cool;
  const jewel = COLOR_PALETTE.jewel;
  const warm = COLOR_PALETTE.warm;
  const pastel = COLOR_PALETTE.pastel;
  const blue = COLOR_PALETTE.blue;
  const purple = COLOR_PALETTE.purple;

  return [
    {
      id: "wood",
      name: "Realistic Wood",
      category: "Natural",
      description: "Procedurally generated wood grain with realistic patterns",
      width: 16,
      height: 16,
      pixels: createWoodGrainPattern(16, 16, [earth[0], earth[1], earth[2], earth[3]])
    },
    {
      id: "grass",
      name: "Natural Grass",
      category: "Natural",
      description: "Procedurally generated grass with natural variation",
      width: 16,
      height: 16,
      pixels: createNoise(16, 16, [earth[10], earth[11], earth[12], earth[13], earth[14]])
    },
    {
      id: "brick",
      name: "Realistic Brick",
      category: "Building",
      description: "Procedurally generated brick wall with mortar lines",
      width: 16,
      height: 16,
      pixels: createBrickPattern(16, 16, [jewel[0], earth[4]], 4)
    },
    {
      id: "cobblestone",
      name: "Cobblestone",
      category: "Building",
      description: "Procedurally generated cobblestone with natural variation",
      width: 16,
      height: 16,
      pixels: createNoise(16, 16, [metallic[4], metallic[6], metallic[7], metallic[8]])
    },
    {
      id: "pixel_checkerboard",
      name: "Neon Checkerboard",
      category: "Pixel Art",
      description: "Procedurally generated neon checkerboard pattern",
      width: 8,
      height: 8,
      pixels: createNoise(8, 8, [neon[0], neon[4], neon[8], neon[12]])
    },
    {
      id: "pixel_brick",
      name: "Pixel Brick",
      category: "Pixel Art",
      description: "Procedurally generated pixel brick pattern",
      width: 8,
      height: 8,
      pixels: createBrickPattern(8, 8, [earth[0], earth[1]], 2)
    },
    {
      id: "water",
      name: "Ocean Waves",
      category: "Natural",
      description: "Procedurally generated ocean waves with realistic movement",
      width: 16,
      height: 16,
      pixels: createWavePattern(16, 16, [cool[0], cool[2], cool[4], cool[6], cool[8]], 3)
    },
    {
      id: "deep_ocean",
      name: "Deep Ocean",
      category: "Natural",
      description: "Procedurally generated deep ocean with complex patterns",
      width: 16,
      height: 16,
      pixels: createCircularPattern(16, 16, [cool[0], cool[1], cool[2], cool[3], cool[4], cool[5]])
    },
    {
      id: "lava",
      name: "Lava Flow",
      category: "Natural",
      description: "Procedurally generated lava with flowing patterns",
      width: 16,
      height: 16,
      pixels: createWavePattern(16, 16, [warm[0], warm[2], warm[4], warm[6], warm[8]], 2)
    },
    {
      id: "sand",
      name: "Desert Sand",
      category: "Natural",
      description: "Procedurally generated sand dunes",
      width: 16,
      height: 16,
      pixels: createNoise(16, 16, [warm[10], warm[11], warm[12], warm[13], warm[14]])
    },
    {
      id: "diamond_pattern",
      name: "Crystal Pattern",
      category: "Patterns",
      description: "Procedurally generated crystal/diamond pattern",
      width: 8,
      height: 8,
      pixels: createDiamondPattern(8, 8, [jewel[0], jewel[2], jewel[4], jewel[6], jewel[8]])
    },
    {
      id: "metal_plates",
      name: "Metal Plates",
      category: "Building",
      description: "Procedurally generated metal plating texture",
      width: 16,
      height: 16,
      pixels: createNoise(16, 16, [metallic[0], metallic[2], metallic[4], metallic[6], metallic[8]])
    },
    {
      id: "concrete",
      name: "Concrete",
      category: "Building",
      description: "Procedurally generated concrete texture",
      width: 16,
      height: 16,
      pixels: createNoise(16, 16, [metallic[5], metallic[6], metallic[7], metallic[8], metallic[9]])
    },
    {
      id: "marble",
      name: "Marble",
      category: "Building",
      description: "Procedurally generated marble with veining",
      width: 16,
      height: 16,
      pixels: createWavePattern(16, 16, [pastel[0], pastel[2], pastel[4], pastel[6], pastel[8]], 1.5)
    },
    {
      id: "fabric",
      name: "Fabric Weave",
      category: "Materials",
      description: "Procedurally generated fabric weave pattern",
      width: 16,
      height: 16,
      pixels: createNoise(16, 16, [pastel[5], pastel[6], pastel[7], pastel[8], pastel[9]])
    },
    {
      id: "leather",
      name: "Leather",
      category: "Materials",
      description: "Procedurally generated leather texture",
      width: 16,
      height: 16,
      pixels: createWoodGrainPattern(16, 16, [earth[5], earth[6], earth[7], earth[8]])
    },
    
    // === PIXEL ART TEXTURES ===
    {
      id: "pixel_grass",
      name: "Pixel Grass",
      category: "Pixel Art",
      description: "Realistic pixel art grass texture",
      width: 8,
      height: 8,
      pixels: createPixelArtPattern(8, 8, [earth[10], earth[11], earth[12]], 'dots')
    },
    {
      id: "pixel_stone",
      name: "Pixel Stone",
      category: "Pixel Art",
      description: "Realistic pixel art stone texture",
      width: 8,
      height: 8,
      pixels: createStonePattern(8, 8, [metallic[4], metallic[5], metallic[6], metallic[7]])
    },
    {
      id: "pixel_water",
      name: "Pixel Water",
      category: "Pixel Art",
      description: "Realistic pixel art water texture",
      width: 8,
      height: 8,
      pixels: createWavePattern(8, 8, [cool[0], cool[2], cool[4]], 2)
    },
    {
      id: "pixel_wood",
      name: "Pixel Wood",
      category: "Pixel Art",
      description: "Realistic pixel art wood texture",
      width: 8,
      height: 8,
      pixels: createWoodGrainPattern(8, 8, [earth[0], earth[1], earth[2]])
    },
    {
      id: "pixel_brick_wall",
      name: "Pixel Brick Wall",
      category: "Pixel Art",
      description: "Realistic pixel art brick wall",
      width: 8,
      height: 8,
      pixels: createPixelArtPattern(8, 8, [jewel[0], earth[4]], 'bricks')
    },
    {
      id: "pixel_metal",
      name: "Pixel Metal",
      category: "Pixel Art",
      description: "Realistic pixel art metal texture",
      width: 8,
      height: 8,
      pixels: createPixelArtPattern(8, 8, [metallic[0], metallic[2], metallic[4]], 'stripes')
    },
    {
      id: "pixel_sand",
      name: "Pixel Sand",
      category: "Pixel Art",
      description: "Realistic pixel art sand texture",
      width: 8,
      height: 8,
      pixels: createNoise(8, 8, [warm[10], warm[11], warm[12], warm[13]])
    },
    {
      id: "pixel_lava",
      name: "Pixel Lava",
      category: "Pixel Art",
      description: "Realistic pixel art lava texture",
      width: 8,
      height: 8,
      pixels: createWavePattern(8, 8, [warm[0], warm[2], warm[4]], 1.5)
    },
    
    // === NATURAL TEXTURES ===
    {
      id: "moss",
      name: "Moss",
      category: "Natural",
      description: "Procedurally generated moss texture",
      width: 16,
      height: 16,
      pixels: createNoise(16, 16, [earth[12], earth[13], earth[14], earth[15]])
    },
    {
      id: "snow",
      name: "Snow",
      category: "Natural",
      description: "Procedurally generated snow texture",
      width: 16,
      height: 16,
      pixels: createCloudPattern(16, 16, [pastel[0], pastel[1], pastel[2], pastel[3]])
    },
    {
      id: "ice",
      name: "Ice",
      category: "Natural",
      description: "Procedurally generated ice texture",
      width: 16,
      height: 16,
      pixels: createWavePattern(16, 16, [cool[8], cool[9], pastel[0], pastel[1]], 1)
    },
    {
      id: "ice_crystal",
      name: "Ice Crystal",
      category: "Natural",
      description: "Procedurally generated ice crystal texture",
      width: 16,
      height: 16,
      pixels: createDiamondPattern(16, 16, [cool[6], cool[7], cool[8], cool[9], pastel[0]])
    },
    {
      id: "frost",
      name: "Frost",
      category: "Natural",
      description: "Procedurally generated frost texture",
      width: 16,
      height: 16,
      pixels: createNoise(16, 16, [cool[9], pastel[0], pastel[1], pastel[2]])
    },
    {
      id: "frozen_water",
      name: "Frozen Water",
      category: "Natural",
      description: "Procedurally generated frozen water texture",
      width: 16,
      height: 16,
      pixels: createCircularPattern(16, 16, [cool[7], cool[8], cool[9], pastel[0], pastel[1]])
    },
    {
      id: "pixel_ice",
      name: "Pixel Ice",
      category: "Pixel Art",
      description: "Realistic pixel art ice texture",
      width: 8,
      height: 8,
      pixels: createPixelArtPattern(8, 8, [cool[8], cool[9], pastel[0]], 'dots')
    },
    {
      id: "dirt",
      name: "Dirt",
      category: "Natural",
      description: "Procedurally generated dirt texture",
      width: 16,
      height: 16,
      pixels: createNoise(16, 16, [earth[6], earth[7], earth[8], earth[9]])
    },
    {
      id: "mud",
      name: "Mud",
      category: "Natural",
      description: "Procedurally generated mud texture",
      width: 16,
      height: 16,
      pixels: createNoise(16, 16, [earth[4], earth[5], earth[6], earth[7]])
    },
    {
      id: "clay",
      name: "Clay",
      category: "Natural",
      description: "Procedurally generated clay texture",
      width: 16,
      height: 16,
      pixels: createNoise(16, 16, [warm[8], warm[9], warm[10], warm[11]])
    },
    
    // === BUILDING MATERIALS ===
    {
      id: "asphalt",
      name: "Asphalt",
      category: "Building",
      description: "Procedurally generated asphalt texture",
      width: 16,
      height: 16,
      pixels: createNoise(16, 16, [metallic[8], metallic[9], "#1a1a1a", "#2a2a2a"])
    },
    {
      id: "tile",
      name: "Ceramic Tile",
      category: "Building",
      description: "Procedurally generated ceramic tile texture",
      width: 16,
      height: 16,
      pixels: createPixelArtPattern(16, 16, [pastel[0], pastel[2], pastel[4]], 'checker')
    },
    {
      id: "glass",
      name: "Glass",
      category: "Building",
      description: "Procedurally generated glass texture",
      width: 16,
      height: 16,
      pixels: createWavePattern(16, 16, [cool[8], cool[9], pastel[0]], 0.5)
    },
    {
      id: "plaster",
      name: "Plaster",
      category: "Building",
      description: "Procedurally generated plaster texture",
      width: 16,
      height: 16,
      pixels: createNoise(16, 16, [pastel[5], pastel[6], pastel[7], pastel[8]])
    },
    {
      id: "rust",
      name: "Rust",
      category: "Building",
      description: "Procedurally generated rust texture",
      width: 16,
      height: 16,
      pixels: createNoise(16, 16, [warm[6], warm[7], warm[8], warm[9]])
    },
    
    // === TECH/CYBERPUNK ===
    {
      id: "circuit",
      name: "Circuit Board",
      category: "Tech",
      description: "Procedurally generated circuit board texture",
      width: 16,
      height: 16,
      pixels: createTechPattern(16, 16, [neon[0], neon[4], neon[8], "#000000"])
    },
    {
      id: "hologram",
      name: "Hologram",
      category: "Tech",
      description: "Procedurally generated holographic texture",
      width: 16,
      height: 16,
      pixels: createWavePattern(16, 16, [neon[2], neon[6], neon[10]], 4)
    },
    {
      id: "energy",
      name: "Energy Field",
      category: "Tech",
      description: "Procedurally generated energy field texture",
      width: 16,
      height: 16,
      pixels: createCircularPattern(16, 16, [neon[0], neon[4], neon[8], neon[12]])
    },
    {
      id: "neon_grid",
      name: "Neon Grid",
      category: "Tech",
      description: "Procedurally generated neon grid texture",
      width: 16,
      height: 16,
      pixels: createPixelArtPattern(16, 16, [neon[0], neon[8], "#000000"], 'checker')
    },
    
    // === FABRIC/MATERIALS ===
    {
      id: "denim",
      name: "Denim",
      category: "Materials",
      description: "Procedurally generated denim fabric",
      width: 16,
      height: 16,
      pixels: createFabricPattern(16, 16, [blue[8], blue[9], blue[10]])
    },
    {
      id: "silk",
      name: "Silk",
      category: "Materials",
      description: "Procedurally generated silk fabric",
      width: 16,
      height: 16,
      pixels: createWavePattern(16, 16, [pastel[0], pastel[2], pastel[4]], 2)
    },
    {
      id: "wool",
      name: "Wool",
      category: "Materials",
      description: "Procedurally generated wool fabric",
      width: 16,
      height: 16,
      pixels: createNoise(16, 16, [earth[8], earth[9], earth[10], earth[11]])
    },
    {
      id: "canvas",
      name: "Canvas",
      category: "Materials",
      description: "Procedurally generated canvas texture",
      width: 16,
      height: 16,
      pixels: createFabricPattern(16, 16, [pastel[6], pastel[7], pastel[8]])
    },
    
    // === SPECIAL EFFECTS ===
    {
      id: "smoke",
      name: "Smoke",
      category: "Effects",
      description: "Procedurally generated smoke texture",
      width: 16,
      height: 16,
      pixels: createCloudPattern(16, 16, [metallic[6], metallic[7], metallic[8], metallic[9]])
    },
    {
      id: "fire",
      name: "Fire",
      category: "Effects",
      description: "Procedurally generated fire texture",
      width: 16,
      height: 16,
      pixels: createWavePattern(16, 16, [warm[0], warm[2], warm[4], warm[6]], 3)
    },
    {
      id: "magic",
      name: "Magic Aura",
      category: "Effects",
      description: "Procedurally generated magical aura texture",
      width: 16,
      height: 16,
      pixels: createCircularPattern(16, 16, [purple[0], purple[4], purple[8], purple[12]])
    },
    {
      id: "void",
      name: "Void",
      category: "Effects",
      description: "Procedurally generated void texture",
      width: 16,
      height: 16,
      pixels: createNoise(16, 16, ["#000000", "#1a1a1a", "#2a2a2a", "#3a3a3a"])
    }
  ];
};
