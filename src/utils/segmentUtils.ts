import * as THREE from 'three';

export interface WallSegment {
  id: string;
  position: [number, number, number];
  rotation: [number, number, number];
  size: [number, number, number];
  material: string;
  color: string;
  isCollidable: boolean;
  isVisible: boolean;
}

export interface DoorSegment {
  id: string;
  position: [number, number, number];
  rotation: [number, number, number];
  size: [number, number, number];
  direction: 'north' | 'south' | 'east' | 'west';
  isLocked: boolean;
  keyRequired?: string;
  targetRoomId?: string;
}

export interface RoomSegments {
  walls: WallSegment[];
  doors: DoorSegment[];
  floors: WallSegment[];
  ceilings: WallSegment[];
}

export class SegmentManager {
  private segments: Map<string, RoomSegments> = new Map();

  createRoomSegments(roomId: string): RoomSegments {
    const segments: RoomSegments = {
      walls: [],
      doors: [],
      floors: [],
      ceilings: [],
    };
    this.segments.set(roomId, segments);
    return segments;
  }

  getRoomSegments(roomId: string): RoomSegments | undefined {
    return this.segments.get(roomId);
  }

  addWallSegment(
    roomId: string,
    position: [number, number, number],
    rotation: [number, number, number],
    size: [number, number, number],
    material: string = 'stone',
    color: string = '#8B4513'
  ): string {
    const segments = this.getRoomSegments(roomId);
    if (!segments) {
      throw new Error(`Room ${roomId} segments not found`);
    }

    const segmentId = `wall_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const segment: WallSegment = {
      id: segmentId,
      position,
      rotation,
      size,
      material,
      color,
      isCollidable: true,
      isVisible: true,
    };

    segments.walls.push(segment);
    return segmentId;
  }

  addDoorSegment(
    roomId: string,
    position: [number, number, number],
    rotation: [number, number, number],
    size: [number, number, number],
    direction: 'north' | 'south' | 'east' | 'west',
    isLocked: boolean = false,
    keyRequired?: string,
    targetRoomId?: string
  ): string {
    const segments = this.getRoomSegments(roomId);
    if (!segments) {
      throw new Error(`Room ${roomId} segments not found`);
    }

    const segmentId = `door_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const segment: DoorSegment = {
      id: segmentId,
      position,
      rotation,
      size,
      direction,
      isLocked,
      keyRequired,
      targetRoomId,
    };

    segments.doors.push(segment);
    return segmentId;
  }

  removeSegment(roomId: string, segmentId: string): boolean {
    const segments = this.getRoomSegments(roomId);
    if (!segments) return false;

    // Remove from all segment arrays
    const wallIndex = segments.walls.findIndex(s => s.id === segmentId);
    if (wallIndex !== -1) {
      segments.walls.splice(wallIndex, 1);
      return true;
    }

    const doorIndex = segments.doors.findIndex(s => s.id === segmentId);
    if (doorIndex !== -1) {
      segments.doors.splice(doorIndex, 1);
      return true;
    }

    const floorIndex = segments.floors.findIndex(s => s.id === segmentId);
    if (floorIndex !== -1) {
      segments.floors.splice(floorIndex, 1);
      return true;
    }

    const ceilingIndex = segments.ceilings.findIndex(s => s.id === segmentId);
    if (ceilingIndex !== -1) {
      segments.ceilings.splice(ceilingIndex, 1);
      return true;
    }

    return false;
  }

  updateSegment(
    roomId: string,
    segmentId: string,
    updates: Partial<WallSegment | DoorSegment>
  ): boolean {
    const segments = this.getRoomSegments(roomId);
    if (!segments) return false;

    // Update in all segment arrays
    const wallSegment = segments.walls.find(s => s.id === segmentId);
    if (wallSegment) {
      Object.assign(wallSegment, updates);
      return true;
    }

    const doorSegment = segments.doors.find(s => s.id === segmentId);
    if (doorSegment) {
      Object.assign(doorSegment, updates);
      return true;
    }

    const floorSegment = segments.floors.find(s => s.id === segmentId);
    if (floorSegment) {
      Object.assign(floorSegment, updates);
      return true;
    }

    const ceilingSegment = segments.ceilings.find(s => s.id === segmentId);
    if (ceilingSegment) {
      Object.assign(ceilingSegment, updates);
      return true;
    }

    return false;
  }

  generateWallSegmentsForRoom(
    roomId: string,
    roomSize: number,
    wallHeight: number,
    wallThickness: number,
    doorWidth: number,
    connections: string[] = [],
    roomConnections?: string[] // Actual room connection IDs
  ): void {
    const segments = this.getRoomSegments(roomId);
    if (!segments) {
      this.createRoomSegments(roomId);
    }

    const halfSize = roomSize / 2;
    const doorHalfWidth = doorWidth / 2;

    // North Wall
    const hasNorthConnection = connections.includes('north');
    if (hasNorthConnection) {
      // Left segment
      this.addWallSegment(
        roomId,
        [-roomSize / 4, wallHeight / 2, -halfSize],
        [0, 0, 0],
        [halfSize - doorHalfWidth, wallHeight, wallThickness]
      );
      // Right segment
      this.addWallSegment(
        roomId,
        [roomSize / 4, wallHeight / 2, -halfSize],
        [0, 0, 0],
        [halfSize - doorHalfWidth, wallHeight, wallThickness]
      );
    } else {
      // Full wall
      this.addWallSegment(
        roomId,
        [0, wallHeight / 2, -halfSize],
        [0, 0, 0],
        [roomSize, wallHeight, wallThickness]
      );
    }

    // South Wall
    const hasSouthConnection = connections.includes('south');
    if (hasSouthConnection) {
      // Left segment
      this.addWallSegment(
        roomId,
        [-roomSize / 4, wallHeight / 2, halfSize],
        [0, 0, 0],
        [halfSize - doorHalfWidth, wallHeight, wallThickness]
      );
      // Right segment
      this.addWallSegment(
        roomId,
        [roomSize / 4, wallHeight / 2, halfSize],
        [0, 0, 0],
        [halfSize - doorHalfWidth, wallHeight, wallThickness]
      );
    } else {
      // Full wall
      this.addWallSegment(
        roomId,
        [0, wallHeight / 2, halfSize],
        [0, 0, 0],
        [roomSize, wallHeight, wallThickness]
      );
    }

    // East Wall
    const hasEastConnection = connections.includes('east');
    if (hasEastConnection) {
      // Top segment
      this.addWallSegment(
        roomId,
        [halfSize, wallHeight / 2, -roomSize / 4],
        [0, Math.PI / 2, 0],
        [halfSize - doorHalfWidth, wallHeight, wallThickness]
      );
      // Bottom segment
      this.addWallSegment(
        roomId,
        [halfSize, wallHeight / 2, roomSize / 4],
        [0, Math.PI / 2, 0],
        [halfSize - doorHalfWidth, wallHeight, wallThickness]
      );
    } else {
      // Full wall
      this.addWallSegment(
        roomId,
        [halfSize, wallHeight / 2, 0],
        [0, Math.PI / 2, 0],
        [roomSize, wallHeight, wallThickness]
      );
    }

    // West Wall
    const hasWestConnection = connections.includes('west');
    if (hasWestConnection) {
      // Top segment
      this.addWallSegment(
        roomId,
        [-halfSize, wallHeight / 2, -roomSize / 4],
        [0, Math.PI / 2, 0],
        [halfSize - doorHalfWidth, wallHeight, wallThickness]
      );
      // Bottom segment
      this.addWallSegment(
        roomId,
        [-halfSize, wallHeight / 2, roomSize / 4],
        [0, Math.PI / 2, 0],
        [halfSize - doorHalfWidth, wallHeight, wallThickness]
      );
    } else {
      // Full wall
      this.addWallSegment(
        roomId,
        [-halfSize, wallHeight / 2, 0],
        [0, Math.PI / 2, 0],
        [roomSize, wallHeight, wallThickness]
      );
    }

    // Generate door segments for each connection
    connections.forEach((direction, index) => {
      // Use actual room connection ID if available, otherwise fallback to direction-based ID
      const targetRoomId = roomConnections && roomConnections[index] 
        ? roomConnections[index] 
        : `room_${direction}`;
      
      this.addDoorSegment(
        roomId,
        this.getDoorPosition(direction, roomSize, wallHeight, doorWidth),
        this.getDoorRotation(direction),
        [doorWidth, wallHeight, wallThickness],
        direction as 'north' | 'south' | 'east' | 'west',
        false, // isLocked
        undefined, // keyRequired
        targetRoomId // targetRoomId
      );
    });
  }

  private getDoorPosition(direction: string, roomSize: number, wallHeight: number, doorWidth: number): [number, number, number] {
    const halfSize = roomSize / 2;
    // Position doors at appropriate height above floor (floor is at y: -0.5)
    const doorY = 0.5; // Position doors at y: 0.5 instead of wallHeight / 2
    switch (direction) {
      case 'north':
        return [0, doorY, -halfSize];
      case 'south':
        return [0, doorY, halfSize];
      case 'east':
        return [halfSize, doorY, 0];
      case 'west':
        return [-halfSize, doorY, 0];
      default:
        return [0, doorY, -halfSize];
    }
  }

  private getDoorRotation(direction: string): [number, number, number] {
    switch (direction) {
      case 'north':
        return [0, 0, 0];
      case 'south':
        return [0, Math.PI, 0];
      case 'east':
        return [0, Math.PI / 2, 0];
      case 'west':
        return [0, -Math.PI / 2, 0];
      default:
        return [0, 0, 0];
    }
  }

  clearRoomSegments(roomId: string): void {
    this.segments.delete(roomId);
  }

  getAllSegments(): Map<string, RoomSegments> {
    return new Map(this.segments);
  }
}

// Export singleton instance
export const segmentManager = new SegmentManager();
