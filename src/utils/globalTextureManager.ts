import * as THREE from 'three';
import { loadTextureFromImage } from './textureUtils';

interface TextureCacheEntry {
  texture: THREE.Texture;
  refCount: number;
  lastUsed: number;
}

class GlobalTextureManager {
  private cache = new Map<string, TextureCacheEntry>();
  private loadingPromises = new Map<string, Promise<THREE.Texture>>();
  private maxCacheSize = 50; // Maximum number of textures to cache
  private maxAge = 5 * 60 * 1000; // 5 minutes in milliseconds

  async getTexture(textureId: string): Promise<THREE.Texture> {
    // Return cached texture if available
    const cached = this.cache.get(textureId);
    if (cached) {
      cached.refCount++;
      cached.lastUsed = Date.now();
      return cached.texture;
    }

    // Return existing promise if already loading
    const existingPromise = this.loadingPromises.get(textureId);
    if (existingPromise) {
      return existingPromise;
    }

    // Create new loading promise
    const promise = this.loadTexture(textureId);
    this.loadingPromises.set(textureId, promise);

    try {
      const texture = await promise;
      
      // Cache the texture
      this.cache.set(textureId, {
        texture,
        refCount: 1,
        lastUsed: Date.now(),
      });

      // Clean up old textures if cache is full
      this.cleanupOldTextures();

      return texture;
    } finally {
      this.loadingPromises.delete(textureId);
    }
  }

  private async loadTexture(textureId: string): Promise<THREE.Texture> {
    try {
      const texture = await loadTextureFromImage(textureId);
      
      // Set up proper disposal
      texture.userData = {
        textureId,
        manager: this,
      };

      return texture;
    } catch (error) {
      console.warn(`Failed to load texture: ${textureId}`, error);
      return this.createFallbackTexture(textureId);
    }
  }

  private createFallbackTexture(textureId: string): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    
    // Create a simple fallback pattern
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, 64, 64);
    ctx.fillStyle = '#404040';
    ctx.fillRect(0, 0, 32, 32);
    ctx.fillRect(32, 32, 32, 32);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.needsUpdate = true;

    return texture;
  }

  releaseTexture(textureId: string): void {
    const cached = this.cache.get(textureId);
    if (cached) {
      cached.refCount--;
      if (cached.refCount <= 0) {
        // Dispose of the texture
        cached.texture.dispose();
        this.cache.delete(textureId);
      }
    }
  }

  private cleanupOldTextures(): void {
    if (this.cache.size <= this.maxCacheSize) {
      return;
    }

    const now = Date.now();
    const entries = Array.from(this.cache.entries());

    // Sort by last used (oldest first)
    entries.sort((a, b) => a[1].lastUsed - b[1].lastUsed);

    // Remove oldest textures until we're under the limit
    const toRemove = entries.slice(0, entries.length - this.maxCacheSize);
    toRemove.forEach(([textureId, entry]) => {
      if (entry.refCount <= 0) {
        entry.texture.dispose();
        this.cache.delete(textureId);
      }
    });
  }

  // Clean up textures that haven't been used recently
  cleanup(): void {
    const now = Date.now();
    const toRemove: string[] = [];

    this.cache.forEach((entry, textureId) => {
      if (entry.refCount <= 0 && (now - entry.lastUsed) > this.maxAge) {
        toRemove.push(textureId);
      }
    });

    toRemove.forEach(textureId => {
      const entry = this.cache.get(textureId);
      if (entry) {
        entry.texture.dispose();
        this.cache.delete(textureId);
      }
    });
  }

  // Dispose all textures
  disposeAll(): void {
    this.cache.forEach(entry => {
      entry.texture.dispose();
    });
    this.cache.clear();
    this.loadingPromises.clear();
  }

  getStats() {
    return {
      cacheSize: this.cache.size,
      loadingCount: this.loadingPromises.size,
      totalRefs: Array.from(this.cache.values()).reduce((sum, entry) => sum + entry.refCount, 0),
    };
  }
}

// Global instance
export const globalTextureManager = new GlobalTextureManager();

// Cleanup interval reference for proper cleanup
let cleanupInterval: number | null = null;

// Start cleanup interval
const startCleanup = () => {
  if (cleanupInterval) return; // Already running
  cleanupInterval = window.setInterval(() => {
    globalTextureManager.cleanup();
  }, 30000);
};

// Stop cleanup interval
const stopCleanup = () => {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
};

// Start cleanup when first texture is loaded
let hasStarted = false;
const originalGetTexture = globalTextureManager.getTexture.bind(globalTextureManager);
globalTextureManager.getTexture = async (textureName: string) => {
  if (!hasStarted) {
    hasStarted = true;
    startCleanup();
  }
  return originalGetTexture(textureName);
};

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  stopCleanup();
  globalTextureManager.disposeAll();
});

// Cleanup when app is hidden (mobile/background)
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    stopCleanup();
  } else if (hasStarted) {
    startCleanup();
  }
});
