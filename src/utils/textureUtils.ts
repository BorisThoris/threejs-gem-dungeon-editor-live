import { Texture, TextureLoader, RepeatWrapping, CanvasTexture } from 'three';

export interface TextureDefinition {
  id: string;
  name: string;
  category: string;
  description: string;
  width: number;
  height: number;
  pixels: string[];
}

// Create simple procedural textures
export const loadTextureFromImage = async (textureId: string): Promise<Texture> => {
  try {

    
    // Create procedural textures based on textureId
    const texture = createProceduralTexture(textureId);
    texture.wrapS = texture.wrapT = RepeatWrapping;
    texture.needsUpdate = true;
    

    return texture;
  } catch (error) {
    console.error(`Failed to create texture ${textureId}:`, error);
    // Return a fallback texture
    return createFallbackTexture(textureId);
  }
};

// Convert pixel array to canvas texture (fallback)
export const createTextureFromPixels = (textureDef: TextureDefinition): Texture => {
  const canvas = document.createElement('canvas');
  canvas.width = textureDef.width;
  canvas.height = textureDef.height;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');
  
  const imageData = ctx.createImageData(textureDef.width, textureDef.height);
  
  for (let i = 0; i < textureDef.pixels.length; i++) {
    const pixelIndex = i * 4;
    const color = textureDef.pixels[i];
    
    // Convert hex color to RGB
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    imageData.data[pixelIndex] = r;     // Red
    imageData.data[pixelIndex + 1] = g; // Green
    imageData.data[pixelIndex + 2] = b; // Blue
    imageData.data[pixelIndex + 3] = 255; // Alpha
  }
  
  ctx.putImageData(imageData, 0, 0);
  
  const texture = new CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.needsUpdate = true;
  
  return texture;
};

// Get texture by ID from definitions
export const getTextureById = (textureId: string, definitions: TextureDefinition[]): TextureDefinition | null => {
  return definitions.find(def => def.id === textureId) || null;
};

// Create material with texture
export const createTexturedMaterial = (
  textureDef: TextureDefinition,
  baseColor: string = '#ffffff',
  roughness: number = 0.5,
  metalness: number = 0.0
) => {
  const texture = createTextureFromPixels(textureDef);
  
  return {
    map: texture,
    color: baseColor,
    roughness,
    metalness,
  };
};

// Create a fallback texture when loading fails
const createFallbackTexture = (textureId: string): Texture => {
  const canvas = document.createElement('canvas');
  canvas.width = 16;
  canvas.height = 16;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');
  
  // Create a simple colored texture based on textureId
  let color = '#8B4513'; // Default brown
  switch (textureId) {
    case 'wood':
      color = '#8B4513';
      break;
    case 'brick':
      color = '#B22222';
      break;
    case 'cobblestone':
      color = '#696969';
      break;
    default:
      color = '#8B4513';
  }
  
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 16, 16);
  
  const texture = new CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.needsUpdate = true;
  
  return texture;
};

// Create procedural textures
const createProceduralTexture = (textureId: string): Texture => {
  const canvas = document.createElement('canvas');
  const size = 64; // Larger texture for better quality
  canvas.width = size;
  canvas.height = size;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');
  
  switch (textureId) {
    case 'wood':
      createWoodTexture(ctx, size);
      break;
    case 'brick':
      createBrickTexture(ctx, size);
      break;
    case 'cobblestone':
      createCobblestoneTexture(ctx, size);
      break;
    default:
      createWoodTexture(ctx, size);
  }
  
  const texture = new CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.needsUpdate = true;
  
  return texture;
};

// Create wood grain texture
const createWoodTexture = (ctx: CanvasRenderingContext2D, size: number) => {
  // Base wood color
  ctx.fillStyle = '#8B4513';
  ctx.fillRect(0, 0, size, size);
  
  // Add wood grain lines
  ctx.strokeStyle = '#654321';
  ctx.lineWidth = 1;
  for (let i = 0; i < size; i += 4) {
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(size, i + Math.sin(i * 0.1) * 2);
    ctx.stroke();
  }
  
  // Add darker grain lines
  ctx.strokeStyle = '#5D2F0A';
  ctx.lineWidth = 0.5;
  for (let i = 0; i < size; i += 8) {
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(size, i + Math.sin(i * 0.15) * 1);
    ctx.stroke();
  }
};

// Create brick texture
const createBrickTexture = (ctx: CanvasRenderingContext2D, size: number) => {
  // Base brick color
  ctx.fillStyle = '#B22222';
  ctx.fillRect(0, 0, size, size);
  
  // Add mortar lines
  ctx.strokeStyle = '#F5F5DC';
  ctx.lineWidth = 2;
  
  // Horizontal mortar lines
  for (let y = 0; y < size; y += 16) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(size, y);
    ctx.stroke();
  }
  
  // Vertical mortar lines (offset every other row)
  for (let y = 0; y < size; y += 32) {
    for (let x = 0; x < size; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y + 16);
      ctx.stroke();
    }
    for (let x = 16; x < size; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, y + 16);
      ctx.lineTo(x, y + 32);
      ctx.stroke();
    }
  }
};

// Create cobblestone texture
const createCobblestoneTexture = (ctx: CanvasRenderingContext2D, size: number) => {
  // Base stone color
  ctx.fillStyle = '#696969';
  ctx.fillRect(0, 0, size, size);
  
  // Add random stone shapes
  ctx.fillStyle = '#778899';
  for (let i = 0; i < 20; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const w = 8 + Math.random() * 8;
    const h = 8 + Math.random() * 8;
    
    ctx.fillRect(x, y, w, h);
  }
  
  // Add darker stones
  ctx.fillStyle = '#2F4F4F';
  for (let i = 0; i < 15; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const w = 6 + Math.random() * 6;
    const h = 6 + Math.random() * 6;
    
    ctx.fillRect(x, y, w, h);
  }
};

// Predefined texture mappings for building blocks
export const BUILDING_BLOCK_TEXTURES = {
  // Brick textures
  brick_standard: 'brick_standard',
  brick_weathered: 'brick_weathered',
  brick_ancient: 'brick_ancient',
  brick_modern: 'brick_modern',
  
  // Stone textures
  stone_cobblestone: 'cobblestone',
  stone_marble: 'marble',
  stone_granite: 'granite',
  stone_limestone: 'limestone',
  stone_sandstone: 'sandstone',
  
  // Wood textures
  wood_oak: 'wood',
  wood_pine: 'wood_pine',
  wood_mahogany: 'wood_mahogany',
  wood_cedar: 'wood_cedar',
  wood_birch: 'wood_birch',
  
  // Metal textures
  metal_iron: 'metal_iron',
  metal_steel: 'metal_steel',
  metal_copper: 'metal_copper',
  metal_bronze: 'metal_bronze',
  metal_gold: 'metal_gold',
  
  // Concrete textures
  concrete_standard: 'concrete_standard',
  concrete_reinforced: 'concrete_reinforced',
  concrete_precast: 'concrete_precast',
  concrete_exposed: 'concrete_exposed',
  concrete_polished: 'concrete_polished',
  
  // Glass textures
  glass_clear: 'glass',
  glass_tinted: 'glass_tinted',
  glass_frosted: 'glass_frosted',
  glass_stained: 'glass_stained',
  glass_safety: 'glass_safety',
} as const;
