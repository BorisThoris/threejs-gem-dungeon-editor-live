import * as THREE from 'three';
import type { Room } from '../store/roomStore';

export interface RoomLayout {
  size: number;
  obstacles: Array<{
    position: [number, number, number];
    size: [number, number, number];
    type: 'wall' | 'furniture' | 'decoration';
  }>;
  walls: Array<{
    direction: 'north' | 'south' | 'east' | 'west';
    hasDoor: boolean;
    doorPosition?: [number, number, number];
  }>;
}

export interface SmartDoorPosition {
  position: [number, number, number];
  rotation: [number, number, number];
  direction: 'north' | 'south' | 'east' | 'west';
  accessibility: 'excellent' | 'good' | 'fair' | 'poor';
  conflicts: string[];
}

/**
 * Calculate optimal door position based on room layout and accessibility
 */
export const calculateOptimalDoorPosition = (
  currentRoom: Room,
  targetRoom: Room,
  roomLayout: RoomLayout,
  playerPosition?: THREE.Vector3
): SmartDoorPosition => {
  const roomSize = roomLayout.size;
  const roomHalfSize = roomSize / 2;
  const entranceDistance = 1.5;
  
  // Analyze each wall for door placement
  const wallOptions: Array<SmartDoorPosition & { score: number }> = [];
  
  // North wall
  const northPosition = calculateWallPosition('north', roomSize, entranceDistance);
  const northScore = calculateAccessibilityScore(northPosition, roomLayout, playerPosition);
  wallOptions.push({
    ...northPosition,
    accessibility: northScore.accessibility,
    conflicts: northScore.conflicts,
    score: northScore.score
  });
  
  // South wall
  const southPosition = calculateWallPosition('south', roomSize, entranceDistance);
  const southScore = calculateAccessibilityScore(southPosition, roomLayout, playerPosition);
  wallOptions.push({
    ...southPosition,
    accessibility: southScore.accessibility,
    conflicts: southScore.conflicts,
    score: southScore.score
  });
  
  // East wall
  const eastPosition = calculateWallPosition('east', roomSize, entranceDistance);
  const eastScore = calculateAccessibilityScore(eastPosition, roomLayout, playerPosition);
  wallOptions.push({
    ...eastPosition,
    accessibility: eastScore.accessibility,
    conflicts: eastScore.conflicts,
    score: eastScore.score
  });
  
  // West wall
  const westPosition = calculateWallPosition('west', roomSize, entranceDistance);
  const westScore = calculateAccessibilityScore(westPosition, roomLayout, playerPosition);
  wallOptions.push({
    ...westPosition,
    accessibility: westScore.accessibility,
    conflicts: westScore.conflicts,
    score: westScore.score
  });
  
  // Sort by score (highest first) and return best option
  wallOptions.sort((a, b) => b.score - a.score);
  const bestOption = wallOptions[0];
  
  return {
    position: bestOption.position,
    rotation: bestOption.rotation,
    direction: bestOption.direction,
    accessibility: bestOption.accessibility,
    conflicts: bestOption.conflicts
  };
};

/**
 * Calculate position for a specific wall
 */
const calculateWallPosition = (
  direction: 'north' | 'south' | 'east' | 'west',
  roomSize: number,
  entranceDistance: number
): Omit<SmartDoorPosition, 'accessibility' | 'conflicts'> => {
  const roomHalfSize = roomSize / 2;
  
  switch (direction) {
    case 'north':
      return {
        position: [0, 0.5, roomHalfSize - entranceDistance],
        rotation: [0, 0, 0],
        direction: 'north'
      };
    case 'south':
      return {
        position: [0, 0.5, -roomHalfSize + entranceDistance],
        rotation: [0, Math.PI, 0],
        direction: 'south'
      };
    case 'east':
      return {
        position: [roomHalfSize - entranceDistance, 0.5, 0],
        rotation: [0, -Math.PI / 2, 0],
        direction: 'east'
      };
    case 'west':
      return {
        position: [-roomHalfSize + entranceDistance, 0.5, 0],
        rotation: [0, Math.PI / 2, 0],
        direction: 'west'
      };
  }
};

/**
 * Calculate accessibility score for a door position
 */
const calculateAccessibilityScore = (
  doorPosition: Omit<SmartDoorPosition, 'accessibility' | 'conflicts'>,
  roomLayout: RoomLayout,
  playerPosition?: THREE.Vector3
): { score: number; accessibility: 'excellent' | 'good' | 'fair' | 'poor'; conflicts: string[] } => {
  let score = 100;
  const conflicts: string[] = [];
  
  const doorPos = new THREE.Vector3(...doorPosition.position);
  
  // Check for obstacle conflicts
  roomLayout.obstacles.forEach((obstacle, index) => {
    const obstaclePos = new THREE.Vector3(...obstacle.position);
    const distance = doorPos.distanceTo(obstaclePos);
    
    if (distance < 2) {
      score -= 30;
      conflicts.push(`Obstacle ${index + 1} too close`);
    }
  });
  
  // Check player accessibility (if player position provided)
  if (playerPosition) {
    const playerDistance = doorPos.distanceTo(playerPosition);
    if (playerDistance < 3) {
      score += 20; // Bonus for being close to player
    } else if (playerDistance > 8) {
      score -= 15; // Penalty for being far from player
    }
  }
  
  // Check wall conflicts
  const conflictingWall = roomLayout.walls.find(wall => 
    wall.direction === doorPosition.direction && wall.hasDoor
  );
  if (conflictingWall) {
    score -= 50;
    conflicts.push('Wall already has door');
  }
  
  // Determine accessibility level
  let accessibility: 'excellent' | 'good' | 'fair' | 'poor';
  if (score >= 80) accessibility = 'excellent';
  else if (score >= 60) accessibility = 'good';
  else if (score >= 40) accessibility = 'fair';
  else accessibility = 'poor';
  
  return { score, accessibility, conflicts };
};

/**
 * Get all optimal door positions for a room
 */
export const getAllOptimalDoorPositions = (
  room: Room,
  connectedRooms: Room[],
  roomLayout: RoomLayout,
  playerPosition?: THREE.Vector3
): Array<SmartDoorPosition & { targetRoomId: string }> => {
  return connectedRooms.map(targetRoom => ({
    ...calculateOptimalDoorPosition(room, targetRoom, roomLayout, playerPosition),
    targetRoomId: targetRoom.id
  }));
};

/**
 * Validate door placement
 */
export const validateDoorPlacement = (
  doorPosition: SmartDoorPosition,
  roomLayout: RoomLayout
): { isValid: boolean; issues: string[] } => {
  const issues: string[] = [];
  
  // Check if position is within room bounds
  const roomHalfSize = roomLayout.size / 2;
  const [x, y, z] = doorPosition.position;
  
  if (Math.abs(x) > roomHalfSize - 1) {
    issues.push('Door position outside room bounds (X)');
  }
  if (Math.abs(z) > roomHalfSize - 1) {
    issues.push('Door position outside room bounds (Z)');
  }
  if (y < 0 || y > 3) {
    issues.push('Door height invalid');
  }
  
  // Check for obstacle conflicts
  roomLayout.obstacles.forEach((obstacle, index) => {
    const obstaclePos = new THREE.Vector3(...obstacle.position);
    const doorPos = new THREE.Vector3(...doorPosition.position);
    const distance = doorPos.distanceTo(obstaclePos);
    
    if (distance < 1.5) {
      issues.push(`Too close to obstacle ${index + 1}`);
    }
  });
  
  return {
    isValid: issues.length === 0,
    issues
  };
};
