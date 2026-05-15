import type { Room, Position, MapConfig, Item, ItemEffect, EntryDirection } from '../types/map';
import { RoomType } from '../types/map';
import {
  generateEntryPoints,
  getOppositeDirection,
  getDirectionBetweenRooms,
  findAvailableEntryPoint,
  connectEntryPoints,
} from '../utils/entryPointGenerator';
import { ensureRoomConnectivity, analyzeConnectivity } from '../utils/roomConnectivityValidator';
import { getWeightedBiomes, getAllBiomes } from '../types/biomeCategories';
import { getBiomeWallConfig, hasBiomeWallConfig } from '../types/biomeWalls';

export interface SimpleMapConfig extends MapConfig {
  useShapedRooms: boolean;
  usePortals: boolean;
  shapeChance: number;
  portalChance: number;
  useLiminalSpaces?: boolean;
  useMultiTileRooms?: boolean;
  multiTileChance?: number;
  multiTileMaxSegments?: number;
  // Room size variations
  useVariableRoomSizes?: boolean;
  minRoomSizeMultiplier?: number; // Minimum size as multiplier of base roomSize
  maxRoomSizeMultiplier?: number; // Maximum size as multiplier of base roomSize
  sizeVariationChance?: number; // Chance for a room to have variable size
  // Advanced generation
  roomTypeWeights?: Record<string, number>;
  hubChance?: number; // chance to spawn a hub/atrium (plus/block)
  useThemes?: boolean;
  enabledBiomeCategories?: string[]; // New: categories to use for generation
}

export const defaultSimpleConfig: SimpleMapConfig = {
  width: 20,
  height: 20,
  roomSize: 16,
  minRooms: 8,
  maxRooms: 20,
  specialRoomChance: 0.6,
  connectionChance: 0.4,
  useShapedRooms: true,
  usePortals: true,
  shapeChance: 0.3,
  portalChance: 0.1,
  useLiminalSpaces: false,
  useMultiTileRooms: true,
  multiTileChance: 0.35,
  multiTileMaxSegments: 4,
  // Room size variations
  useVariableRoomSizes: true,
  minRoomSizeMultiplier: 1.0, // Same as current size
  maxRoomSizeMultiplier: 2.0, // Up to 2x larger
  sizeVariationChance: 0.4, // 40% chance for size variation
  roomTypeWeights: {
    normal: 1.0,
    treasure: 0.3,
    shop: 0.25,
    puzzle: 0.4,
    secret: 0.2,
    library: 0.25,
    'bench-press': 0.15,
    coffee: 0.2,
    'library-upgrade': 0.15,
    meditation: 0.2,
    portal: 0.15,
    arena: 0.12,
    boss: 0.1,
    trap: 0.2,
    corridor: 0.6,
    colosseum: 0.05,
  },
  hubChance: 0.15,
  corridorRunChance: 0.4,
  culDeSacChance: 0.35,
  useThemes: true,
};

export class SimpleMapGenerator {
  private config: SimpleMapConfig;
  private rooms: Room[] = [];
  private grid: (Room | null)[][] = [];
  private gridSize: number;
  private startX: number;
  private startZ: number;
  private roomIdCounter = 1;

  constructor(config: Partial<SimpleMapConfig> = {}) {
    this.config = { ...defaultSimpleConfig, ...config };
    this.gridSize = 12;
    this.startX = Math.floor(this.gridSize / 2);
    this.startZ = Math.floor(this.gridSize / 2);
  }

  generateMap(): { rooms: Room[]; startRoomId: string; endRoomId: string } {
    this.initializeGrid();
    this.generateStartRoom();
    this.generateRooms();
    this.addShapedRooms();
    this.addPortals();
    if ((this.config.useThemes ?? true)) {
      this.assignThemes();
    }
    
    // Enhanced connectivity check and repair
    this.ensureConnectivity();
    
    const endRoom = this.rooms.find(room => room.type === RoomType.END) || this.createEndRoom();
    
    // Final connectivity validation using the new system
    const map = {
      id: `map_${Date.now()}`,
      rooms: this.rooms,
      startRoomId: this.rooms[0].id,
      endRoomId: endRoom.id,
      config: this.config,
      generatedAt: Date.now(),
    };
    
    const finalMap = ensureRoomConnectivity(map);
    
    // Log room generation summary
    const variableRooms = finalMap.rooms.filter(r => r.actualSize && r.actualSize !== r.size).length;
    const multiTileRooms = finalMap.rooms.filter(r => r.isMultiTile).length;
    const shapeStats = finalMap.rooms.reduce((acc, room) => {
      const shape = room.shape || 'square';
      acc[shape] = (acc[shape] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log(`\n🎉 Map Generation Complete!`);
    console.log(`📊 Generated ${finalMap.rooms.length} rooms:`);
    console.log(`   - Variable size rooms: ${variableRooms}`);
    console.log(`   - Multi-tile rooms: ${multiTileRooms}`);
    console.log(`   - Room shapes:`, shapeStats);
    
    return {
      rooms: finalMap.rooms,
      startRoomId: finalMap.startRoomId,
      endRoomId: finalMap.endRoomId
    };
  }

  private initializeGrid(): void {
    this.grid = Array(this.gridSize).fill(null).map(() => Array(this.gridSize).fill(null));
    this.rooms = [];
    this.roomIdCounter = 1;
  }

  private generateStartRoom(): void {
    const startRoom: Room = {
      id: 'start',
      position: { x: 0, z: 0 },
      type: RoomType.START,
      connections: [],
      size: this.config.roomSize,
      isVisited: true,
      isCurrent: true,
      shape: 'circle',
      theme: 'mystical',
      lighting: 'bright',
      difficulty: 1,
      level: 1,
      items: this.getItemsForRoomType(RoomType.START),
      specialProperties: this.getSpecialPropertiesForRoomType(RoomType.START),
      // Generate entry points for start room
      entryPoints: generateEntryPoints('start', RoomType.START, 'circle', this.config.roomSize),
    };
    
    this.rooms.push(startRoom);
    this.grid[this.startX][this.startZ] = startRoom;
    
  }

  private generateRooms(): void {
    const maxRooms = this.config.minRooms + Math.floor(Math.random() * (this.config.maxRooms - this.config.minRooms));
    const directions = [
      { dx: 0, dz: -1 }, { dx: 0, dz: 1 },
      { dx: -1, dz: 0 }, { dx: 1, dz: 0 }
    ];
    
    let attempts = 0;
    const maxAttempts = maxRooms * 10;
    
    while (this.rooms.length < maxRooms && attempts < maxAttempts) {
      attempts++;
      
      // Pick a random existing room to branch from
      const sourceRoom = this.rooms[Math.floor(Math.random() * this.rooms.length)];
      const sourceGridPos = this.getGridPosition(sourceRoom.position);
      
      // Pick a random direction
      const direction = directions[Math.floor(Math.random() * directions.length)];
      const newX = sourceGridPos.x + direction.dx;
      const newZ = sourceGridPos.z + direction.dz;
      
      // Check if position is valid and empty
      if (newX >= 0 && newX < this.gridSize && 
          newZ >= 0 && newZ < this.gridSize && 
          !this.grid[newX][newZ]) {
        
        // Direct room connection (no corridors)
        const targetType = this.getRandomRoomType();
        const targetRoom = this.createRoomAt(newX, newZ, targetType);
        this.connectRooms(sourceRoom, targetRoom);
      }
    }
  }

  private pickMultiTilePattern(): 'line' | 'L' | 'T' | 'plus' | 'block' | 'U' | 'C' | 'H' {
    const patterns: Array<'line' | 'L' | 'T' | 'plus' | 'block' | 'U' | 'C' | 'H'> = ['line', 'L', 'T', 'plus', 'block', 'U', 'C', 'H'];
    return patterns[Math.floor(Math.random() * patterns.length)];
  }

  private getRandomDirection(): { dx: number; dz: number } {
    const directions = [
      { dx: 1, dz: 0 },   // East
      { dx: -1, dz: 0 },  // West
      { dx: 0, dz: 1 },   // South
      { dx: 0, dz: -1 },  // North
    ];
    return directions[Math.floor(Math.random() * directions.length)];
  }

  private getShapeForPattern(pattern: 'line' | 'L' | 'T' | 'plus' | 'block' | 'U' | 'C' | 'H'): 'square' | 'circle' | 'triangle' | 'hexagon' | 'octagon' | 'diamond' | 'star' | 'cross' | 'spiral' | 'L' | 'T' | 'U' | 'C' | 'H' | 'plus' | 'line' | 'block' {
    switch (pattern) {
      case 'line':
        return 'line';
      case 'L':
        return 'L';
      case 'T':
        return 'T';
      case 'plus':
        return 'plus';
      case 'block':
        return 'block';
      case 'U':
        return 'U';
      case 'C':
        return 'C';
      case 'H':
        return 'H';
      default:
        return 'square';
    }
  }

  private computePatternTiles(
    startX: number,
    startZ: number,
    dir: { dx: number; dz: number },
    pattern: 'line' | 'L' | 'T' | 'plus' | 'block' | 'U' | 'C' | 'H'
  ): Array<{ x: number; z: number }> {
    const tiles: Array<{ x: number; z: number }> = [{ x: startX, z: startZ }];
    const maxSeg = Math.max(2, Math.min(this.config.multiTileMaxSegments ?? 4, 6));

    if (pattern === 'line') {
      const len = 1 + Math.floor(Math.random() * (maxSeg - 1));
      for (let i = 1; i <= len; i++) tiles.push({ x: startX + dir.dx * i, z: startZ + dir.dz * i });
      return tiles;
    }

    const perp = { dx: dir.dz, dz: dir.dx }; // simple perpendicular (swap)

    if (pattern === 'L') {
      tiles.push({ x: startX + dir.dx, z: startZ + dir.dz });
      tiles.push({ x: startX + dir.dx + perp.dx, z: startZ + dir.dz + perp.dz });
      return tiles;
    }

    if (pattern === 'T') {
      tiles.push({ x: startX + perp.dx, z: startZ + perp.dz });
      tiles.push({ x: startX, z: startZ });
      tiles.push({ x: startX - perp.dx, z: startZ - perp.dz });
      tiles.push({ x: startX + dir.dx, z: startZ + dir.dz });
      return tiles;
    }

    if (pattern === 'plus') {
      tiles.push({ x: startX + 1, z: startZ });
      tiles.push({ x: startX - 1, z: startZ });
      tiles.push({ x: startX, z: startZ + 1 });
      tiles.push({ x: startX, z: startZ - 1 });
      return tiles;
    }

    // block (2x2)
    tiles.push({ x: startX + 1, z: startZ });
    tiles.push({ x: startX, z: startZ + 1 });
    tiles.push({ x: startX + 1, z: startZ + 1 });
    return tiles;

    if (pattern === 'U') {
      // U shape: horizontal line with vertical extensions
      tiles.push({ x: startX + dir.dx, z: startZ + dir.dz });
      tiles.push({ x: startX + dir.dx * 2, z: startZ + dir.dz * 2 });
      tiles.push({ x: startX + dir.dx * 2 + perp.dx, z: startZ + dir.dz * 2 + perp.dz });
      tiles.push({ x: startX + dir.dx + perp.dx, z: startZ + dir.dz + perp.dz });
      return tiles;
    }

    if (pattern === 'C') {
      // C shape: like U but with opening on one side
      tiles.push({ x: startX + dir.dx, z: startZ + dir.dz });
      tiles.push({ x: startX + dir.dx * 2, z: startZ + dir.dz * 2 });
      tiles.push({ x: startX + dir.dx * 2 + perp.dx, z: startZ + dir.dz * 2 + perp.dz });
      tiles.push({ x: startX + dir.dx + perp.dx, z: startZ + dir.dz + perp.dz });
      tiles.push({ x: startX + perp.dx, z: startZ + perp.dz });
      return tiles;
    }

    if (pattern === 'H') {
      // H shape: two vertical lines connected by horizontal
      tiles.push({ x: startX + perp.dx, z: startZ + perp.dz });
      tiles.push({ x: startX - perp.dx, z: startZ - perp.dz });
      tiles.push({ x: startX + perp.dx + dir.dx, z: startZ + perp.dz + dir.dz });
      tiles.push({ x: startX - perp.dx + dir.dx, z: startZ - perp.dz + dir.dz });
      tiles.push({ x: startX + dir.dx, z: startZ + dir.dz });
      return tiles;
    }
  }

  private addShapedRooms(): void {
    if (!this.config.useShapedRooms) return;
    
    this.rooms.forEach(room => {
      if (Math.random() < this.config.shapeChance) {
        const shapes: Array<Room['shape']> = ['circle', 'triangle', 'hexagon', 'octagon', 'diamond'];
        room.shape = shapes[Math.floor(Math.random() * shapes.length)];
        
        // Adjust size for different shapes
        switch (room.shape) {
          case 'circle':
            room.width = room.size;
            room.height = room.size;
            break;
          case 'triangle':
            room.width = room.size * 0.8;
            room.height = room.size * 0.8;
            break;
          case 'hexagon':
            room.width = room.size * 1.2;
            room.height = room.size * 1.1;
            break;
          case 'diamond':
            room.width = room.size * 1.3;
            room.height = room.size * 1.3;
            break;
        }
      }
    });
  }

  private addPortals(): void {
    if (!this.config.usePortals) return;
    
    const portalCount = Math.floor(this.rooms.length * this.config.portalChance);
    
    for (let i = 0; i < portalCount; i++) {
      const room = this.rooms[Math.floor(Math.random() * this.rooms.length)];
      if (!room.isPortal && room.type !== RoomType.START && room.type !== RoomType.END) {
        room.isPortal = true;
        room.type = RoomType.PORTAL;
        room.portalDestination = this.findPortalDestination(room);
        room.theme = 'mystical';
        room.lighting = 'mystical';
        room.items = this.getItemsForRoomType(RoomType.PORTAL);
        room.specialProperties = this.getSpecialPropertiesForRoomType(RoomType.PORTAL);
      }
    }
  }

  private ensureConnectivity(): void {
    
    const visited = new Set<string>();
    const queue = [this.rooms[0].id];
    
    while (queue.length > 0) {
      const currentId = queue.shift()!;
      if (visited.has(currentId)) continue;
      
      visited.add(currentId);
      const currentRoom = this.rooms.find(r => r.id === currentId)!;
      
      for (const connectedId of currentRoom.connections) {
        if (!visited.has(connectedId)) {
          queue.push(connectedId);
        }
      }
    }
    
    
    // Connect unvisited rooms with enhanced connection types
    const unvisited = this.rooms.filter(r => !visited.has(r.id));
    
    for (const room of unvisited) {
      const closestRoom = this.rooms
        .filter(r => visited.has(r.id))
        .reduce((closest, current) => {
          const roomDist = Math.abs(room.position.x - current.position.x) + Math.abs(room.position.z - current.position.z);
          const closestDist = Math.abs(room.position.x - closest.position.x) + Math.abs(room.position.z - closest.position.z);
          return roomDist < closestDist ? current : closest;
        });
      
      // Determine connection type based on room properties
      const connectionType = this.determineConnectionType(room, closestRoom);
      
      if (!room.connections.includes(closestRoom.id)) {
        room.connections.push(closestRoom.id);
      }
      if (!closestRoom.connections.includes(room.id)) {
        closestRoom.connections.push(room.id);
      }
      
      // Update entry points for the connection
      this.updateEntryPointsForConnection(room, closestRoom, connectionType);
      
      visited.add(room.id);
    }
    
    // Final connectivity check
    const startRoom = this.rooms[0];
    
    // Log final connectivity statistics
    const totalConnections = this.rooms.reduce((sum, room) => sum + room.connections.length, 0);
    const avgConnections = totalConnections / this.rooms.length;
  }

  private getGridPosition(position: Position): Position {
    return {
      x: Math.round(position.x / this.config.roomSize) + this.startX,
      z: Math.round(position.z / this.config.roomSize) + this.startZ
    };
  }

  private determineConnectionType(room1: Room, room2: Room): 'door' | 'breakable_wall' | 'portal' | 'corridor' {
    const room1Type = room1.type.toLowerCase();
    const room2Type = room2.type.toLowerCase();
    
    // Portal connections for mystical or special rooms
    if (room1Type.includes('portal') || room2Type.includes('portal') ||
        room1Type.includes('mystical') || room2Type.includes('mystical') ||
        room1.theme === 'mystical' || room2.theme === 'mystical') {
      return 'portal';
    }
    
    // Breakable wall for dungeon or challenging rooms
    if (room1Type.includes('dungeon') || room2Type.includes('dungeon') ||
        room1Type.includes('challenge') || room2Type.includes('challenge') ||
        room1Type.includes('boss') || room2Type.includes('boss') ||
        room1.theme === 'dungeon' || room2.theme === 'dungeon') {
      return 'breakable_wall';
    }
    
    // Corridor for connecting different areas
    if (room1Type.includes('corridor') || room2Type.includes('corridor')) {
      return 'corridor';
    }
    
    // Default to door
    return 'door';
  }

  private updateEntryPointsForConnection(
    room1: Room, 
    room2: Room, 
    connectionType: 'door' | 'breakable_wall' | 'portal' | 'corridor'
  ): void {
    if (!room1.entryPoints || !room2.entryPoints) return;
    
    const direction = this.getDirectionBetweenRooms(room1, room2);
    const oppositeDirection = getOppositeDirection(direction);
    
    // Find entry points in the correct directions
    const room1Entry = room1.entryPoints.find(ep => ep.direction === direction);
    const room2Entry = room2.entryPoints.find(ep => ep.direction === oppositeDirection);
    
    if (room1Entry && room2Entry) {
      // Connect the entry points
      connectEntryPoints(room1Entry, room2Entry);
      
      // Set the connection type
      const entryType = connectionType === 'breakable_wall' ? 'door' : 
                       connectionType === 'portal' ? 'portal' : 'door';
      
      room1Entry.type = entryType;
      room2Entry.type = entryType;
      
    }
  }

  private getDirectionBetweenRooms(room1: Room, room2: Room): EntryDirection {
    const dx = room2.position.x - room1.position.x;
    const dz = room2.position.z - room1.position.z;
    
    if (Math.abs(dx) > Math.abs(dz)) {
      return dx > 0 ? 'east' : 'west';
    } else {
      return dz > 0 ? 'south' : 'north';
    }
  }

  private createRoomAt(x: number, z: number, type: string): Room {
    const roomId = `room_${this.roomIdCounter++}`;
    
    // Check if this room type has a biome wall configuration
    const hasBiomeConfig = hasBiomeWallConfig(type);
    const biomeConfig = hasBiomeConfig ? getBiomeWallConfig(type) : null;
    
    // Random scale for biome walls (0.8x - 1.2x)
    const biomeScale: [number, number, number] = hasBiomeConfig 
      ? [0.8 + Math.random() * 0.4, 0.8 + Math.random() * 0.4, 0.8 + Math.random() * 0.4]
      : [1, 1, 1];

    // Calculate room size variation
    let actualRoomSize = this.config.roomSize;
    let minSize = this.config.minRoomSizeMultiplier || 1.0;
    let maxSize = this.config.maxRoomSizeMultiplier || 2.0;
    
    if (this.config.useVariableRoomSizes && 
        Math.random() < (this.config.sizeVariationChance || 0.4) &&
        type !== 'start' && type !== 'end') { // Don't vary start/end room sizes
      const sizeMultiplier = minSize + Math.random() * (maxSize - minSize);
      actualRoomSize = this.config.roomSize * sizeMultiplier;
      console.log(`🔷 Variable size room created: ${roomId} (${type}) - Size: ${actualRoomSize.toFixed(1)} (${sizeMultiplier.toFixed(2)}x)`);
    }

    // Check if this should be a multi-tile room
    const shouldBeMultiTile = this.config.useMultiTileRooms && 
      Math.random() < (this.config.multiTileChance || 0.35) &&
      type !== 'start' && type !== 'end'; // Don't make start/end rooms multi-tile

    let isMultiTile = false;
    let tilePositions: Array<{ x: number; z: number }> = [];
    let shape: 'square' | 'circle' | 'triangle' | 'hexagon' | 'octagon' | 'diamond' | 'star' | 'cross' | 'spiral' = 'square';

    if (shouldBeMultiTile) {
      isMultiTile = true;
      const pattern = this.pickMultiTilePattern();
      const direction = this.getRandomDirection();
      tilePositions = this.computePatternTiles(x, z, direction, pattern);
      shape = this.getShapeForPattern(pattern);
      console.log(`🔷 Multi-tile room created: ${roomId} (${type}) - Shape: ${shape} - Pattern: ${pattern} - Tiles: ${tilePositions.length}`);
    }

    const room: Room = {
      id: roomId,
      position: { x: (x - this.startX) * this.config.roomSize, z: (z - this.startZ) * this.config.roomSize },
      type,
      connections: [],
      size: this.config.roomSize, // Keep for backward compatibility
      minSize: minSize,
      maxSize: maxSize,
      actualSize: actualRoomSize,
      isVisited: false,
      isCurrent: false,
      items: this.getItemsForRoomType(type),
      specialProperties: this.getSpecialPropertiesForRoomType(type),
      // Multi-tile room properties
      isMultiTile,
      tilePositions: isMultiTile ? tilePositions.map(pos => ({
        x: (pos.x - this.startX) * this.config.roomSize,
        z: (pos.z - this.startZ) * this.config.roomSize
      })) : undefined,
      shape: isMultiTile ? shape : 'square',
      // Biome-based wall system
      biomeId: hasBiomeConfig ? type : undefined,
      useBiomeWalls: hasBiomeConfig,
      biomeScale: biomeScale,
      // Generate entry points based on biome config or fallback to shape-based
      entryPoints: hasBiomeConfig && biomeConfig?.entryPoints
        ? biomeConfig.entryPoints.map(ep => ({
            id: `${roomId}-${ep.direction}`,
            direction: ep.direction,
            position: ep.position,
            width: ep.width,
            height: ep.height,
            isActive: false,
          }))
        : generateEntryPoints(roomId, type, isMultiTile ? shape : 'square', actualRoomSize),
    };
    
    this.rooms.push(room);
    this.grid[x][z] = room;
    return room;
  }

  private getDimensionsForType(
    type: string,
    base: number
  ): { width: number; height: number } {
    switch (type) {
      case RoomType.COLOSSEUM:
      case RoomType.ARENA:
      case RoomType.BOSS:
        return { width: base * 1.6, height: base * 1.6 };
      case RoomType.TREASURE:
      case RoomType.SECRET:
        return { width: base * 0.8, height: base * 0.8 };
      case RoomType.LIBRARY:
      case RoomType.LIBRARY_UPGRADE:
      case RoomType.SHRINE:
        return { width: base * 1.2, height: base * 1.2 };
      case RoomType.SHOP:
      case RoomType.COFFEE:
        return { width: base, height: base };
      case RoomType.MEDITATION:
        return { width: base * 1.0, height: base * 1.0 };
      default:
        return { width: base, height: base };
    }
  }

  private getShapeForType(type: string): Room['shape'] | null {
    switch (type) {
      case RoomType.COLOSSEUM:
      case RoomType.ARENA:
      case RoomType.PORTAL:
      case RoomType.MEDITATION:
        return 'circle';
      case RoomType.BOSS:
        return 'octagon';
      case RoomType.LIBRARY:
        return 'hexagon';
      case RoomType.SECRET:
        return 'diamond';
      default:
        return null;
    }
  }

  private connectRooms(room1: Room, room2: Room): void {
    // Add to connections list (for backward compatibility)
    if (!room1.connections.includes(room2.id)) {
      room1.connections.push(room2.id);
    }
    if (!room2.connections.includes(room1.id)) {
      room2.connections.push(room1.id);
    }

    // Connect via entry points for proper alignment
    const room1GridPos = this.getGridPosition(room1.position);
    const room2GridPos = this.getGridPosition(room2.position);
    
    // Determine the direction from room1 to room2
    const directionToRoom2 = getDirectionBetweenRooms(
      room1GridPos.x,
      room1GridPos.z,
      room2GridPos.x,
      room2GridPos.z
    );

    if (directionToRoom2 && room1.entryPoints && room2.entryPoints) {
      // Find available entry point in room1 facing room2
      const room1Entry = findAvailableEntryPoint(room1, directionToRoom2);
      
      // Find available entry point in room2 facing room1 (opposite direction)
      const oppositeDirection = getOppositeDirection(directionToRoom2);
      const room2Entry = findAvailableEntryPoint(room2, oppositeDirection);

      // Connect the entry points if both are available
      if (room1Entry && room2Entry) {
        connectEntryPoints(room1Entry, room2Entry);
      }
    }
  }

  private getRandomRoomType(): string {
    // Use biome categories if enabled, otherwise fall back to old system
    if (this.config.enabledBiomeCategories && this.config.enabledBiomeCategories.length > 0) {
      const weightedBiomes = getWeightedBiomes(this.config.enabledBiomeCategories);
      const total = weightedBiomes.reduce((sum, biome) => sum + biome.weight, 0);
      let r = Math.random() * total;
      
      for (const biome of weightedBiomes) {
        if ((r -= biome.weight) <= 0) {
          return biome.biome;
        }
      }
      
      // Fallback to first available biome
      return weightedBiomes[0]?.biome || RoomType.NORMAL;
    }
    
    // Fallback to old system for backward compatibility
    const weights = this.config.roomTypeWeights || {};
    const pool: Array<{ t: string; w: number }> = [
      RoomType.NORMAL,
      RoomType.TREASURE,
      RoomType.SHOP,
      RoomType.PUZZLE,
      RoomType.SECRET,
      RoomType.LIBRARY,
      RoomType.BENCH_PRESS,
      RoomType.COFFEE,
      RoomType.LIBRARY_UPGRADE,
      RoomType.MEDITATION,
      RoomType.PORTAL,
      RoomType.ARENA,
      RoomType.COLOSSEUM,
      RoomType.BOSS,
      RoomType.TRAP,
    ].map((t) => ({ t, w: Math.max(0.0001, weights[t] ?? 0.2) }));
    const total = pool.reduce((s, p) => s + p.w, 0);
    let r = Math.random() * total;
    for (const p of pool) {
      if ((r -= p.w) <= 0) return p.t;
    }
    return RoomType.NORMAL;
  }

  private findPortalDestination(room: Room): string {
    const otherRooms = this.rooms.filter(r => r.id !== room.id && !r.isPortal);
    if (otherRooms.length === 0) return room.id;
    
    return otherRooms[Math.floor(Math.random() * otherRooms.length)].id;
  }

  private createEndRoom(): Room {
    const endRoomId = `room_${this.roomIdCounter++}`;
    const endRoom: Room = {
      id: endRoomId,
      position: { x: 0, z: this.config.roomSize * 3 },
      type: RoomType.END,
      connections: [],
      size: this.config.roomSize,
      isVisited: false,
      isCurrent: false,
      items: this.getItemsForRoomType(RoomType.END),
      specialProperties: this.getSpecialPropertiesForRoomType(RoomType.END),
      // Generate entry points for end room
      entryPoints: generateEntryPoints(endRoomId, RoomType.END, 'square', this.config.roomSize),
    };
    
    this.rooms.push(endRoom);
    
    // Connect to nearest room
    const nearestRoom = this.rooms
      .filter(r => r.id !== endRoom.id)
      .reduce((nearest, current) => {
        const endDist = Math.abs(endRoom.position.x - current.position.x) + Math.abs(endRoom.position.z - current.position.z);
        const nearestDist = Math.abs(endRoom.position.x - nearest.position.x) + Math.abs(endRoom.position.z - nearest.position.z);
        return endDist < nearestDist ? current : nearest;
      });
    
    this.connectRooms(endRoom, nearestRoom);
    return endRoom;
  }

  private getItemsForRoomType(roomType: string): Item[] {
    switch (roomType) {
      case RoomType.TREASURE:
        return [
          this.createItem('treasure-coin', 'Gold Coin', 'A shiny gold coin', 'consumable', 'common', 10, [{ type: 'points', value: 10, description: '+10 points' }], '🪙'),
          this.createItem('treasure-gem', 'Ruby', 'A precious red gem', 'consumable', 'rare', 50, [{ type: 'points', value: 50, description: '+50 points' }], '💎')
        ];
      case RoomType.PORTAL:
        return [
          this.createItem('portal-energy', 'Portal Energy', 'Mystical energy from the portal', 'consumable', 'rare', 100, [{ type: 'points', value: 100, description: '+100 points' }], '🌌')
        ];
      case RoomType.ARENA:
        return [
          this.createItem('arena-trophy', 'Arena Trophy', 'A trophy from arena victory', 'consumable', 'epic', 200, [{ type: 'points', value: 200, description: '+200 points' }], '🏆')
        ];
      default:
        return [];
    }
  }

  private createItem(
    id: string, 
    name: string, 
    description: string, 
    type: Item['type'], 
    rarity: Item['rarity'], 
    cost: number, 
    effects: ItemEffect[], 
    icon: string
  ): Item {
    return {
      id,
      name,
      description,
      type,
      rarity,
      cost,
      effects,
      icon
    };
  }

  private getSpecialPropertiesForRoomType(roomType: string): Record<string, unknown> {
    switch (roomType) {
      case RoomType.PORTAL:
        return { isPortal: true, teleportation: true };
      case RoomType.ARENA:
        return { isArena: true, combat: true };
      case RoomType.TREASURE:
        return { hasTreasure: true, lootable: true };
      default:
        return {};
    }
  }

  private assignThemes(): void {
    const centerX = 0;
    const centerZ = 0;
    const maxDist = this.config.roomSize * (this.gridSize / 2);
    this.rooms.forEach((room) => {
      const dx = room.position.x - centerX;
      const dz = room.position.z - centerZ;
      const dist = Math.sqrt(dx * dx + dz * dz);
      const norm = Math.min(1, dist / maxDist);
      if (norm < 0.33) {
        room.theme = 'sanctuary';
        room.lighting = 'bright';
      } else if (norm < 0.66) {
        room.theme = 'dungeon';
        room.lighting = 'dim';
      } else {
        room.theme = 'forge';
        room.lighting = 'dark';
      }
    });
  }
}
