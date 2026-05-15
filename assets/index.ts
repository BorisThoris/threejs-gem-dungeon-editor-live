// Assets index file
// This file exports all available assets for easy importing

// Texture definitions
export { generateThemeTextures } from '../src/utils/generateThemeTextures';

// Asset categories
export const ASSET_CATEGORIES = {
  TEXTURES: 'textures',
  MODELS: 'models', 
  MATERIALS: 'materials',
  SOUNDS: 'sounds'
} as const;

// Asset paths
export const ASSET_PATHS = {
  TEXTURES: '/assets/textures/',
  MODELS: '/assets/models/',
  MATERIALS: '/assets/materials/',
  SOUNDS: '/assets/sounds/'
} as const;

// Helper function to get asset URL
export const getAssetUrl = (category: keyof typeof ASSET_PATHS, filename: string): string => {
  return `${ASSET_PATHS[category]}${filename}`;
};

// Helper function to load texture definitions
export const loadTextureDefinitions = async (): Promise<any[]> => {
  try {
    const response = await fetch('/assets/textures/textureDefinitions.json');
    if (!response.ok) {
      throw new Error(`Failed to load texture definitions: ${response.statusText}`);
    }
    const data = await response.json();
    return data.textures || [];
  } catch (error) {
    console.error('Error loading texture definitions:', error);
    // Fallback to generated textures
    const { generateThemeTextures } = await import('../src/utils/generateThemeTextures');
    return generateThemeTextures();
  }
};
