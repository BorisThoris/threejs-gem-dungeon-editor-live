import type { TextureData, BasePrototype } from './PrototypeSystem';

// Texture manager for handling different types of textures
export interface TextureManager {
  registerTexture(texture: TextureData): void;
  getTexture(id: string): TextureData | undefined;
  getAllTextures(): TextureData[];
  applyTexture(prototypeId: string, textureId: string): void;
  createProceduralTexture(config: ProceduralTextureConfig): TextureData;
  createImageTexture(url: string, name: string): TextureData;
}

export interface ProceduralTextureConfig {
  type: 'noise' | 'gradient' | 'pattern' | 'checker' | 'stripes';
  size: [number, number];
  colors: string[];
  parameters: Record<string, any>;
}

// Built-in texture presets
export const TEXTURE_PRESETS: TextureData[] = [
  {
    id: 'wood-grain',
    name: 'Wood Grain',
    url: 'data:texture/wood',
    type: 'procedural',
    properties: {
      repeat: [2, 2],
      rotation: 0,
      scale: [1, 1],
    },
  },
  {
    id: 'metal-brushed',
    name: 'Brushed Metal',
    url: 'data:texture/metal',
    type: 'procedural',
    properties: {
      repeat: [1, 1],
      rotation: 0,
      scale: [1, 1],
    },
  },
  {
    id: 'stone-brick',
    name: 'Stone Brick',
    url: 'data:texture/stone',
    type: 'procedural',
    properties: {
      repeat: [4, 4],
      rotation: 0,
      scale: [1, 1],
    },
  },
  {
    id: 'fabric-canvas',
    name: 'Canvas Fabric',
    url: 'data:texture/fabric',
    type: 'procedural',
    properties: {
      repeat: [3, 3],
      rotation: 0,
      scale: [1, 1],
    },
  },
  {
    id: 'glass-frosted',
    name: 'Frosted Glass',
    url: 'data:texture/glass',
    type: 'procedural',
    properties: {
      repeat: [1, 1],
      rotation: 0,
      scale: [1, 1],
    },
  },
];

export class TextureManagerClass implements TextureManager {
  private textures: Map<string, TextureData> = new Map();

  constructor() {
    // Register built-in textures
    TEXTURE_PRESETS.forEach(texture => this.registerTexture(texture));
  }

  registerTexture(texture: TextureData): void {
    this.textures.set(texture.id, texture);
  }

  getTexture(id: string): TextureData | undefined {
    return this.textures.get(id);
  }

  getAllTextures(): TextureData[] {
    return Array.from(this.textures.values());
  }

  applyTexture(prototypeId: string, textureId: string): void {
    const texture = this.getTexture(textureId);
    if (texture) {
      // This would integrate with the prototype manager
      // For now, we'll just return the texture data
      console.log(`Applying texture ${textureId} to prototype ${prototypeId}`);
    }
  }

  createProceduralTexture(config: ProceduralTextureConfig): TextureData {
    const id = `procedural_${config.type}_${Date.now()}`;
    const texture: TextureData = {
      id,
      name: `${config.type} texture`,
      url: `data:texture/procedural/${config.type}`,
      type: 'procedural',
      properties: {
        repeat: [1, 1],
        rotation: 0,
        scale: [1, 1],
        ...config.parameters,
      },
    };
    
    this.registerTexture(texture);
    return texture;
  }

  createImageTexture(url: string, name: string): TextureData {
    const id = `image_${Date.now()}`;
    const texture: TextureData = {
      id,
      name,
      url,
      type: 'image',
      properties: {
        repeat: [1, 1],
        rotation: 0,
        scale: [1, 1],
      },
    };
    
    this.registerTexture(texture);
    return texture;
  }
}

// Global texture manager instance
export const textureManager = new TextureManagerClass();

// Action creators for texture-related actions
export const createTextureActions = (textureManager: TextureManager) => [
  {
    id: 'apply-texture',
    name: 'Apply Texture',
    description: 'Apply a texture to this object',
    icon: '🖼️',
    execute: (target: BasePrototype, context?: any) => {
      if (context?.textureId) {
        textureManager.applyTexture(target.id, context.textureId);
      }
    },
  },
  {
    id: 'remove-texture',
    name: 'Remove Texture',
    description: 'Remove texture from this object',
    icon: '🚫',
    execute: (target: BasePrototype) => {
      target.texture = undefined;
      delete target.properties.texture;
    },
  },
  {
    id: 'random-texture',
    name: 'Random Texture',
    description: 'Apply a random texture',
    icon: '🎲',
    execute: (target: BasePrototype) => {
      const textures = textureManager.getAllTextures();
      if (textures.length > 0) {
        const randomTexture = textures[Math.floor(Math.random() * textures.length)];
        textureManager.applyTexture(target.id, randomTexture.id);
      }
    },
  },
];
