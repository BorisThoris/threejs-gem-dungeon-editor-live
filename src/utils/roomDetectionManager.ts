// Global room detection manager to handle edge cases and prevent null room states
import { gameEvents, GAME_EVENTS } from './gameEvents';

class RoomDetectionManager {
  private currentRoomId: string | null = null;
  private lastKnownRoomId: string | null = null;
  private detectionTimeout: number | null = null;
  private isEnabled = true;

  constructor() {
    this.setupEventListeners();
    console.log('RoomDetectionManager initialized');
  }

  private setupEventListeners() {
    // Listen for room enter/exit events
    gameEvents.on(GAME_EVENTS.ROOM_ENTER, (room: any) => {
      this.currentRoomId = room.id;
      this.lastKnownRoomId = room.id;
      console.log(`RoomDetectionManager: Entered ${room.id}`);
    });

    gameEvents.on(GAME_EVENTS.ROOM_EXIT, (room: any) => {
      if (this.currentRoomId === room.id) {
        this.currentRoomId = null;
        console.log(`RoomDetectionManager: Exited ${room.id}`);
      }
    });
  }

  public getCurrentRoomId(): string | null {
    return this.currentRoomId;
  }

  public getLastKnownRoomId(): string | null {
    return this.lastKnownRoomId;
  }

  public setCurrentRoom(roomId: string | null) {
    // Handle undefined values
    if (roomId === undefined) {
      console.warn(`RoomDetectionManager: setCurrentRoom called with undefined, ignoring`);
      return;
    }
    
    const previousRoom = this.currentRoomId;
    this.currentRoomId = roomId;
    if (roomId) {
      this.lastKnownRoomId = roomId;
    }
    
    // Log room transitions for debugging
    if (previousRoom !== roomId) {
      console.log(`RoomDetectionManager: ${previousRoom || 'None'} -> ${roomId || 'None'}`);
    }
  }

  public enableDetection() {
    this.isEnabled = true;
  }

  public disableDetection() {
    this.isEnabled = false;
  }

  public isDetectionEnabled(): boolean {
    return this.isEnabled;
  }

  // Fallback detection - if no room is detected for too long, try to find the closest room
  public startFallbackDetection(rooms: any[]) {
    if (this.detectionTimeout) {
      clearTimeout(this.detectionTimeout);
    }

    this.detectionTimeout = setTimeout(() => {
      if (!this.currentRoomId && this.isEnabled) {
        console.log('RoomDetectionManager: No room detected, attempting fallback detection');
        this.attemptFallbackDetection(rooms);
      }
    }, 2000); // Wait 2 seconds before fallback
  }

  private attemptFallbackDetection(rooms: any[]) {
    // This would need access to player position, but for now just log
    console.log('RoomDetectionManager: Fallback detection triggered');
    // Could implement distance-based fallback here if needed
  }

  public forceReset() {
    console.log('RoomDetectionManager: Force resetting all room states');
    this.currentRoomId = null;
    this.lastKnownRoomId = null;
  }

  public cleanup() {
    if (this.detectionTimeout) {
      clearTimeout(this.detectionTimeout);
      this.detectionTimeout = null;
    }
    this.forceReset();
  }
}

export const roomDetectionManager = new RoomDetectionManager();
