import type { EntryPoint, EntryDirection, Room } from '../types/map';

/**
 * Generate entry points for a room based on its shape and type
 * Entry points define where doors/hallways can connect to the room
 */
export function generateEntryPoints(
  roomId: string,
  roomType: string,
  roomShape: Room['shape'] = 'square',
  roomSize: number = 10
): EntryPoint[] {
  const entryPoints: EntryPoint[] = [];
  
  // Helper to create an entry point
  const createEntry = (
    direction: EntryDirection,
    localX: number,
    localZ: number,
    type: 'door' | 'corridor' | 'portal' = 'door'
  ): EntryPoint => ({
    id: `${roomId}_entry_${direction}_${entryPoints.length}`,
    direction,
    position: { x: localX, z: localZ },
    type,
    isActive: false,
  });

  switch (roomShape) {
    case 'square':
    case undefined:
      // Standard square room - 4 cardinal directions
      entryPoints.push(
        createEntry('north', 0, -roomSize / 2),
        createEntry('south', 0, roomSize / 2),
        createEntry('east', roomSize / 2, 0),
        createEntry('west', -roomSize / 2, 0)
      );
      break;

    case 'circle':
      // Circular rooms - 4 cardinal entry points
      entryPoints.push(
        createEntry('north', 0, -roomSize / 2),
        createEntry('south', 0, roomSize / 2),
        createEntry('east', roomSize / 2, 0),
        createEntry('west', -roomSize / 2, 0)
      );
      break;

    case 'hexagon':
      // Hexagon - 6 entry points (cardinal + diagonal)
      entryPoints.push(
        createEntry('north', 0, -roomSize / 2),
        createEntry('south', 0, roomSize / 2),
        createEntry('east', roomSize / 2, 0),
        createEntry('west', -roomSize / 2, 0),
        // Additional diagonal entries for hexagon
        createEntry('north', roomSize / 4, -roomSize / 2),
        createEntry('north', -roomSize / 4, -roomSize / 2)
      );
      break;

    case 'octagon': {
      // Octagon - 8 entry points
      const offset = roomSize / 3;
      entryPoints.push(
        createEntry('north', 0, -roomSize / 2),
        createEntry('south', 0, roomSize / 2),
        createEntry('east', roomSize / 2, 0),
        createEntry('west', -roomSize / 2, 0),
        // Diagonal entries
        createEntry('north', offset, -roomSize / 2),
        createEntry('north', -offset, -roomSize / 2),
        createEntry('south', offset, roomSize / 2),
        createEntry('south', -offset, roomSize / 2)
      );
      break;
    }

    case 'triangle':
      // Triangle - 3 entry points
      entryPoints.push(
        createEntry('north', 0, -roomSize / 3),
        createEntry('south', roomSize / 3, roomSize / 3),
        createEntry('south', -roomSize / 3, roomSize / 3)
      );
      break;

    case 'diamond':
      // Diamond - 4 diagonal entry points
      entryPoints.push(
        createEntry('north', 0, -roomSize / 2),
        createEntry('south', 0, roomSize / 2),
        createEntry('east', roomSize / 2, 0),
        createEntry('west', -roomSize / 2, 0)
      );
      break;

    case 'cross':
      // Cross shape - entry points at each arm
      entryPoints.push(
        createEntry('north', 0, -roomSize / 2),
        createEntry('south', 0, roomSize / 2),
        createEntry('east', roomSize / 2, 0),
        createEntry('west', -roomSize / 2, 0)
      );
      break;

    case 'L':
      // L shape - entry points at the ends of each arm
      entryPoints.push(
        createEntry('north', 0, -roomSize / 2),
        createEntry('east', roomSize / 2, 0),
        createEntry('south', roomSize / 4, roomSize / 2),
        createEntry('west', -roomSize / 2, roomSize / 4)
      );
      break;

    case 'T':
      // T shape - entry points at each end
      entryPoints.push(
        createEntry('north', 0, -roomSize / 2),
        createEntry('east', roomSize / 2, 0),
        createEntry('west', -roomSize / 2, 0),
        createEntry('south', 0, roomSize / 2)
      );
      break;

    case 'U':
      // U shape - entry points at the open ends
      entryPoints.push(
        createEntry('north', -roomSize / 3, -roomSize / 2),
        createEntry('north', roomSize / 3, -roomSize / 2),
        createEntry('south', 0, roomSize / 2)
      );
      break;

    case 'C':
      // C shape - entry points at the open side
      entryPoints.push(
        createEntry('east', roomSize / 2, 0),
        createEntry('north', 0, -roomSize / 2),
        createEntry('south', 0, roomSize / 2)
      );
      break;

    case 'H':
      // H shape - entry points at the ends of each vertical line
      entryPoints.push(
        createEntry('north', -roomSize / 3, -roomSize / 2),
        createEntry('north', roomSize / 3, -roomSize / 2),
        createEntry('south', -roomSize / 3, roomSize / 2),
        createEntry('south', roomSize / 3, roomSize / 2)
      );
      break;

    case 'plus':
      // Plus shape - entry points at each arm
      entryPoints.push(
        createEntry('north', 0, -roomSize / 2),
        createEntry('south', 0, roomSize / 2),
        createEntry('east', roomSize / 2, 0),
        createEntry('west', -roomSize / 2, 0)
      );
      break;

    case 'line':
      // Line shape - entry points at the ends
      entryPoints.push(
        createEntry('north', 0, -roomSize / 2),
        createEntry('south', 0, roomSize / 2)
      );
      break;

    case 'block':
      // Block shape (2x2) - entry points on all sides
      entryPoints.push(
        createEntry('north', 0, -roomSize / 2),
        createEntry('south', 0, roomSize / 2),
        createEntry('east', roomSize / 2, 0),
        createEntry('west', -roomSize / 2, 0)
      );
      break;

    default:
      // Default to square configuration
      entryPoints.push(
        createEntry('north', 0, -roomSize / 2),
        createEntry('south', 0, roomSize / 2),
        createEntry('east', roomSize / 2, 0),
        createEntry('west', -roomSize / 2, 0)
      );
  }

  // Modify entry points based on room type
  if (roomType === 'corridor') {
    // Corridors typically only have 2 opposing entry points
    return entryPoints.filter(
      (ep) => ep.direction === 'north' || ep.direction === 'south'
    );
  }

  return entryPoints;
}

/**
 * Find the opposite direction
 */
export function getOppositeDirection(direction: EntryDirection): EntryDirection {
  const opposites: Record<EntryDirection, EntryDirection> = {
    north: 'south',
    south: 'north',
    east: 'west',
    west: 'east',
  };
  return opposites[direction];
}

/**
 * Calculate the grid offset for a given direction
 */
export function getDirectionOffset(direction: EntryDirection): { dx: number; dz: number } {
  const offsets: Record<EntryDirection, { dx: number; dz: number }> = {
    north: { dx: 0, dz: -1 },
    south: { dx: 0, dz: 1 },
    east: { dx: 1, dz: 0 },
    west: { dx: -1, dz: 0 },
  };
  return offsets[direction];
}

/**
 * Get the direction from one room to another based on their grid positions
 */
export function getDirectionBetweenRooms(
  fromGridX: number,
  fromGridZ: number,
  toGridX: number,
  toGridZ: number
): EntryDirection | null {
  const dx = toGridX - fromGridX;
  const dz = toGridZ - fromGridZ;

  // Only return a direction if rooms are directly adjacent
  if (Math.abs(dx) + Math.abs(dz) !== 1) {
    return null;
  }

  if (dx === 1) return 'east';
  if (dx === -1) return 'west';
  if (dz === 1) return 'south';
  if (dz === -1) return 'north';

  return null;
}

/**
 * Find an available (inactive) entry point in the given direction
 */
export function findAvailableEntryPoint(
  room: Room,
  direction: EntryDirection
): EntryPoint | undefined {
  return room.entryPoints?.find(
    (ep) => ep.direction === direction && !ep.isActive
  );
}

/**
 * Connect two entry points together
 */
export function connectEntryPoints(
  sourceEntry: EntryPoint,
  targetEntry: EntryPoint
): void {
  sourceEntry.connectedTo = targetEntry.id;
  targetEntry.connectedTo = sourceEntry.id;
  sourceEntry.isActive = true;
  targetEntry.isActive = true;
}

/**
 * Get world position of an entry point given the room's world position
 */
export function getEntryPointWorldPosition(
  room: Room,
  entryPoint: EntryPoint
): { x: number; z: number } {
  return {
    x: room.position.x + entryPoint.position.x,
    z: room.position.z + entryPoint.position.z,
  };
}

