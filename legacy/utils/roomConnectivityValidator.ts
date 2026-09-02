import type { Room, GameMap } from '../types/map';

export interface ConnectivityReport {
  isolatedRooms: Room[];
  connectedComponents: Room[][];
  totalRooms: number;
  connectedRooms: number;
  isFullyConnected: boolean;
  needsRepair: boolean;
}

export interface ConnectionRepair {
  roomId: string;
  connectionType: 'door' | 'breakable_wall' | 'portal' | 'corridor';
  targetRoomId?: string;
  direction?: 'north' | 'south' | 'east' | 'west';
  isTemporary?: boolean;
  requiresAction?: boolean; // e.g., break wall, activate portal
}

/**
 * Analyzes the connectivity of rooms in a map
 */
export function analyzeConnectivity(map: GameMap): ConnectivityReport {
  const rooms = map.rooms;
  const visited = new Set<string>();
  const components: Room[][] = [];
  
  // Find all connected components using DFS
  for (const room of rooms) {
    if (!visited.has(room.id)) {
      const component: Room[] = [];
      const stack = [room];
      
      while (stack.length > 0) {
        const currentRoom = stack.pop()!;
        if (visited.has(currentRoom.id)) continue;
        
        visited.add(currentRoom.id);
        component.push(currentRoom);
        
        // Add all connected rooms to stack
        for (const connectionId of currentRoom.connections) {
          const connectedRoom = rooms.find(r => r.id === connectionId);
          if (connectedRoom && !visited.has(connectedRoom.id)) {
            stack.push(connectedRoom);
          }
        }
      }
      
      if (component.length > 0) {
        components.push(component);
      }
    }
  }
  
  // Find isolated rooms (rooms with no connections)
  const isolatedRooms = rooms.filter(room => room.connections.length === 0);
  
  // Find the largest connected component
  const largestComponent = components.reduce((largest, current) => 
    current.length > largest.length ? current : largest, 
    components[0] || []
  );
  
  return {
    isolatedRooms,
    connectedComponents: components,
    totalRooms: rooms.length,
    connectedRooms: visited.size,
    isFullyConnected: components.length === 1,
    needsRepair: isolatedRooms.length > 0 || components.length > 1
  };
}

/**
 * Generates repair suggestions for isolated rooms
 */
export function generateConnectionRepairs(
  map: GameMap, 
  report: ConnectivityReport
): ConnectionRepair[] {
  const repairs: ConnectionRepair[] = [];
  const rooms = map.rooms;
  
  // Handle isolated rooms
  for (const isolatedRoom of report.isolatedRooms) {
    // Find the nearest room to connect to
    const nearestRoom = findNearestRoom(isolatedRoom, rooms.filter(r => r.id !== isolatedRoom.id));
    
    if (nearestRoom) {
      const direction = getDirectionBetweenRooms(isolatedRoom, nearestRoom);
      const connectionType = determineConnectionType(isolatedRoom, nearestRoom);
      
      repairs.push({
        roomId: isolatedRoom.id,
        connectionType,
        targetRoomId: nearestRoom.id,
        direction,
        isTemporary: false,
        requiresAction: connectionType === 'breakable_wall' || connectionType === 'portal'
      });
    }
  }
  
  // Handle disconnected components
  if (report.connectedComponents.length > 1) {
    const mainComponent = report.connectedComponents[0]; // Start room component
    const otherComponents = report.connectedComponents.slice(1);
    
    for (const component of otherComponents) {
      const nearestRoom = findNearestRoomInComponents(component, [mainComponent]);
      const targetRoom = findNearestRoomInComponents(mainComponent, [component]);
      
      if (nearestRoom && targetRoom) {
        const direction = getDirectionBetweenRooms(nearestRoom, targetRoom);
        const connectionType = determineConnectionType(nearestRoom, targetRoom);
        
        repairs.push({
          roomId: nearestRoom.id,
          connectionType,
          targetRoomId: targetRoom.id,
          direction,
          isTemporary: false,
          requiresAction: connectionType === 'breakable_wall' || connectionType === 'portal'
        });
      }
    }
  }
  
  return repairs;
}

/**
 * Applies connection repairs to a map
 */
export function applyConnectionRepairs(map: GameMap, repairs: ConnectionRepair[]): GameMap {
  const updatedRooms = map.rooms.map(room => ({ ...room }));
  
  for (const repair of repairs) {
    const room = updatedRooms.find(r => r.id === repair.roomId);
    const targetRoom = repair.targetRoomId ? updatedRooms.find(r => r.id === repair.targetRoomId) : null;
    
    if (room && targetRoom) {
      // Add bidirectional connection
      if (!room.connections.includes(targetRoom.id)) {
        room.connections.push(targetRoom.id);
      }
      if (!targetRoom.connections.includes(room.id)) {
        targetRoom.connections.push(room.id);
      }
      
      // Update entry points if they exist
      if (room.entryPoints && repair.direction) {
        const entryPoint = room.entryPoints.find(ep => ep.direction === repair.direction);
        if (entryPoint) {
          entryPoint.connectedTo = targetRoom.id;
          entryPoint.isActive = true;
          entryPoint.type = repair.connectionType === 'breakable_wall' ? 'door' : 
                           repair.connectionType === 'portal' ? 'portal' : 'door';
        }
      }
      
      if (targetRoom.entryPoints && repair.direction) {
        const oppositeDirection = getOppositeDirection(repair.direction);
        const entryPoint = targetRoom.entryPoints.find(ep => ep.direction === oppositeDirection);
        if (entryPoint) {
          entryPoint.connectedTo = room.id;
          entryPoint.isActive = true;
          entryPoint.type = repair.connectionType === 'breakable_wall' ? 'door' : 
                           repair.connectionType === 'portal' ? 'portal' : 'door';
        }
      }
      
      // Applied repair
    }
  }
  
  return {
    ...map,
    rooms: updatedRooms
  };
}

/**
 * Ensures all rooms in a map have at least one connection
 */
export function ensureRoomConnectivity(map: GameMap): GameMap {
  // Ensuring room connectivity
  
  const report = analyzeConnectivity(map);
  // Connectivity report
  
  if (!report.needsRepair) {
    // All rooms are already connected
    return map;
  }
  
  const repairs = generateConnectionRepairs(map, report);
  // Generated connection repairs
  
  const repairedMap = applyConnectionRepairs(map, repairs);
  
  // Verify the repair worked
  const finalReport = analyzeConnectivity(repairedMap);
  // Final connectivity report
  
  if (finalReport.isFullyConnected) {
    // All rooms are now connected
  } else {
    // Some rooms may still be isolated
  }
  
  return repairedMap;
}

// Helper functions

function findNearestRoom(room: Room, otherRooms: Room[]): Room | null {
  if (otherRooms.length === 0) return null;
  
  let nearest = otherRooms[0];
  let minDistance = getDistance(room, nearest);
  
  for (const otherRoom of otherRooms.slice(1)) {
    const distance = getDistance(room, otherRoom);
    if (distance < minDistance) {
      minDistance = distance;
      nearest = otherRoom;
    }
  }
  
  return nearest;
}

function findNearestRoomInComponents(component: Room[], otherComponents: Room[][]): Room | null {
  let nearest: Room | null = null;
  let minDistance = Infinity;
  
  for (const room of component) {
    for (const otherComponent of otherComponents) {
      const otherRoom = findNearestRoom(room, otherComponent);
      if (otherRoom) {
        const distance = getDistance(room, otherRoom);
        if (distance < minDistance) {
          minDistance = distance;
          nearest = room;
        }
      }
    }
  }
  
  return nearest;
}

function getDistance(room1: Room, room2: Room): number {
  const dx = room1.position.x - room2.position.x;
  const dz = room1.position.z - room2.position.z;
  return Math.sqrt(dx * dx + dz * dz);
}

function getDirectionBetweenRooms(room1: Room, room2: Room): 'north' | 'south' | 'east' | 'west' {
  const dx = room2.position.x - room1.position.x;
  const dz = room2.position.z - room1.position.z;
  
  if (Math.abs(dx) > Math.abs(dz)) {
    return dx > 0 ? 'east' : 'west';
  } else {
    return dz > 0 ? 'south' : 'north';
  }
}

function getOppositeDirection(direction: 'north' | 'south' | 'east' | 'west'): 'north' | 'south' | 'east' | 'west' {
  switch (direction) {
    case 'north': return 'south';
    case 'south': return 'north';
    case 'east': return 'west';
    case 'west': return 'east';
  }
}

function determineConnectionType(room1: Room, room2: Room): 'door' | 'breakable_wall' | 'portal' | 'corridor' {
  // Determine connection type based on room types and themes
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
