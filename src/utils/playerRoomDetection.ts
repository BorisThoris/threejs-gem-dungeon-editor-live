import type { Room } from '../types/map';

export interface RoomBounds {
  id: string;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  minY: number;
  maxY: number;
  centerX: number;
  centerZ: number;
  size: number;
}

export class PlayerRoomDetection {
  private roomBounds: Map<string, RoomBounds> = new Map();
  private currentRoomId: string | null = null;
  private lastPlayerPosition: { x: number; y: number; z: number } | null = null;
  private detectionThreshold = 2.0; // Only recalculate when player moves this distance
  private detectionEnabled = true;

  /**
   * Initialize room bounds from map data
   */
  initializeRoomBounds(rooms: Room[]): void {
    this.roomBounds.clear();
    
    rooms.forEach(room => {
      const roomSize = room.size || 10;
      const halfSize = roomSize / 2;
      const tolerance = 0.5; // Small tolerance for edge cases
      
      const bounds: RoomBounds = {
        id: room.id,
        minX: room.position.x - halfSize - tolerance,
        maxX: room.position.x + halfSize + tolerance,
        minZ: room.position.z - halfSize - tolerance,
        maxZ: room.position.z + halfSize + tolerance,
        minY: -2, // Allow some vertical tolerance
        maxY: 4,
        centerX: room.position.x,
        centerZ: room.position.z,
        size: roomSize
      };
      
      this.roomBounds.set(room.id, bounds);
    });
    
    // PlayerRoomDetection: Initialized bounds
  }

  /**
   * Check if player position has changed significantly enough to warrant recalculation
   */
  private shouldRecalculate(playerPosition: { x: number; y: number; z: number }): boolean {
    if (!this.lastPlayerPosition) {
      return true; // First check
    }

    const dx = playerPosition.x - this.lastPlayerPosition.x;
    const dz = playerPosition.z - this.lastPlayerPosition.z;
    const distance = Math.sqrt(dx * dx + dz * dz);
    
    return distance >= this.detectionThreshold;
  }

  /**
   * Find which room the player is currently in
   */
  detectCurrentRoom(playerPosition: { x: number; y: number; z: number }): string | null {
    if (!this.detectionEnabled) {
      return this.currentRoomId;
    }

    // Only recalculate if player has moved significantly
    if (!this.shouldRecalculate(playerPosition)) {
      return this.currentRoomId;
    }

    this.lastPlayerPosition = { ...playerPosition };

    // Check each room's bounds
    for (const [roomId, bounds] of this.roomBounds) {
      if (
        playerPosition.x >= bounds.minX &&
        playerPosition.x <= bounds.maxX &&
        playerPosition.z >= bounds.minZ &&
        playerPosition.z <= bounds.maxZ &&
        playerPosition.y >= bounds.minY &&
        playerPosition.y <= bounds.maxY
      ) {
        if (this.currentRoomId !== roomId) {
          // PlayerRoomDetection: Player entered room
          this.currentRoomId = roomId;
        }
        return roomId;
      }
    }

    // Player is not in any room
    if (this.currentRoomId !== null) {
      // PlayerRoomDetection: Player exited room
      this.currentRoomId = null;
    }

    return null;
  }

  /**
   * Get current room ID without triggering detection
   */
  getCurrentRoomId(): string | null {
    return this.currentRoomId;
  }

  /**
   * Get room bounds for a specific room
   */
  getRoomBounds(roomId: string): RoomBounds | undefined {
    return this.roomBounds.get(roomId);
  }

  /**
   * Get all room bounds
   */
  getAllRoomBounds(): Map<string, RoomBounds> {
    return new Map(this.roomBounds);
  }

  /**
   * Enable/disable detection
   */
  setDetectionEnabled(enabled: boolean): void {
    this.detectionEnabled = enabled;
  }

  /**
   * Check if detection is enabled
   */
  isDetectionEnabled(): boolean {
    return this.detectionEnabled;
  }

  /**
   * Set detection threshold
   */
  setDetectionThreshold(threshold: number): void {
    this.detectionThreshold = threshold;
  }

  /**
   * Clear current room state
   */
  clearCurrentRoom(): void {
    this.currentRoomId = null;
    this.lastPlayerPosition = null;
  }

  /**
   * Get debug info about current state
   */
  getDebugInfo(): {
    currentRoomId: string | null;
    lastPlayerPosition: { x: number; y: number; z: number } | null;
    detectionThreshold: number;
    isDetectionEnabled: boolean;
    roomCount: number;
  } {
    return {
      currentRoomId: this.currentRoomId,
      lastPlayerPosition: this.lastPlayerPosition,
      detectionThreshold: this.detectionThreshold,
      isDetectionEnabled: this.detectionEnabled,
      roomCount: this.roomBounds.size
    };
  }
}

// Singleton instance
export const playerRoomDetection = new PlayerRoomDetection();
