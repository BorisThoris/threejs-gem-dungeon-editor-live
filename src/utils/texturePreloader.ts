import * as THREE from 'three';
import { loadTextureFromImage } from './textureUtils';

interface TextureCache {
  [key: string]: THREE.Texture;
}

class TexturePreloader {
  private cache: TextureCache = {};
  private loadingPromises: { [key: string]: Promise<THREE.Texture> } = {};

  async preloadTexture(type: string): Promise<THREE.Texture> {
    // Return cached texture if available
    if (this.cache[type]) {
      return this.cache[type];
    }

    // Return existing promise if already loading
    if (this.loadingPromises[type]) {
      return this.loadingPromises[type];
    }

    // Create new loading promise
    this.loadingPromises[type] = this.loadTexture(type);
    
    try {
      const texture = await this.loadingPromises[type];
      this.cache[type] = texture;
      return texture;
    } finally {
      delete this.loadingPromises[type];
    }
  }

  private async loadTexture(type: string): Promise<THREE.Texture> {
    try {
      return await loadTextureFromImage(type);
    } catch (error) {
      console.warn(`Failed to load texture: ${type}`, error);
      // Return a fallback texture
      return this.createFallbackTexture(type);
    }
  }

  private createFallbackTexture(type: string): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;

    // Create a simple colored texture based on type
    const colors: { [key: string]: string } = {
      wood: '#8B4513',
      brick: '#B22222',
      cobblestone: '#696969',
      grass: '#228B22',
      water: '#4169E1',
    };

    const color = colors[type] || '#808080';
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 64, 64);

    // Add some pattern
    ctx.fillStyle = '#000000';
    for (let i = 0; i < 64; i += 8) {
      for (let j = 0; j < 64; j += 8) {
        if ((i + j) % 16 === 0) {
          ctx.fillRect(i, j, 4, 4);
        }
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1, 1);
    return texture;
  }

  getTexture(type: string): THREE.Texture | null {
    return this.cache[type] || null;
  }

  isLoaded(type: string): boolean {
    return type in this.cache;
  }

  getCacheSize(): number {
    return Object.keys(this.cache).length;
  }

  clearCache(): void {
    Object.values(this.cache).forEach(texture => texture.dispose());
    this.cache = {};
  }

  async preloadAll(): Promise<void> {
    const textureTypes = ['wood', 'brick', 'cobblestone', 'grass', 'water'];
    const promises = textureTypes.map(type => this.preloadTexture(type));
    await Promise.all(promises);
  }
}

// Export singleton instance
export const texturePreloader = new TexturePreloader();
export default texturePreloader;
