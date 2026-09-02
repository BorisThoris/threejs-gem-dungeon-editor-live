import * as THREE from 'three';
import { PLAYER_SPAWN_Y } from '../configs/worldGeometry';

/** How close the player must stand for a door to offer itself. */
export const DOOR_INTERACT_RADIUS = 3;

/**
 * How far into the room the player materialises after travelling.
 *
 * This used to be 1, which dropped you a metre from the door you had just come
 * through - inside its interact radius - so the new room greeted you with a
 * prompt to go straight back where you came from, and a second tap of E would
 * bounce you. Spawning clear of the radius means you arrive in the room rather
 * than on its doorstep. Small rooms clamp so the player never lands past the
 * middle.
 */
export const entranceDistanceFor = (roomHalfSize: number): number =>
  Math.min(DOOR_INTERACT_RADIUS + 0.5, roomHalfSize * 0.6);

export interface DoorPosition {
  position: [number, number, number];
  rotation: [number, number, number];
  direction: 'north' | 'south' | 'east' | 'west';
}

export interface Room {
  id: string;
  position: { x: number; z: number };
  connections: string[];
  /** Measured footprint of the generated room, when it has been laid out. */
  actualSize?: number;
  /** Authored/base footprint of the room. */
  size?: number;
}

/**
 * Calculate door position between two rooms
 */
export const calculateDoorPosition = (
  currentRoom: Room,
  targetRoom: Room,
  roomSize?: number
): DoorPosition => {
  // Use actual room size if available, otherwise fall back to default
  const actualRoomSize = roomSize || currentRoom.actualSize || currentRoom.size || 10;
  
  const dx = targetRoom.position.x - currentRoom.position.x;
  const dz = targetRoom.position.z - currentRoom.position.z;
  
  const roomHalfSize = actualRoomSize / 2;

  if (Math.abs(dx) > Math.abs(dz)) {
    // East or West
    if (dx > 0) {
      return {
        position: [roomHalfSize, 0.5, 0],
        rotation: [0, -Math.PI / 2, 0],
        direction: 'east'
      };
    } else {
      return {
        position: [-roomHalfSize, 0.5, 0],
        rotation: [0, Math.PI / 2, 0],
        direction: 'west'
      };
    }
  } else {
    // North or South
    if (dz > 0) {
      return {
        position: [0, 0.5, roomHalfSize],
        rotation: [0, 0, 0],
        direction: 'north'
      };
    } else {
      return {
        position: [0, 0.5, -roomHalfSize],
        rotation: [0, Math.PI, 0],
        direction: 'south'
      };
    }
  }
};

/**
 * Get all door positions for a room
 */
export const getRoomDoorPositions = (
  room: Room,
  connectedRooms: Room[],
  roomSize?: number
): Array<DoorPosition & { targetRoomId: string }> => {
  return connectedRooms.map(targetRoom => ({
    ...calculateDoorPosition(room, targetRoom, roomSize),
    targetRoomId: targetRoom.id
  }));
};

/**
 * Calculate player spawn position when entering a room
 */
export const calculatePlayerSpawnPosition = (
  direction: 'north' | 'south' | 'east' | 'west',
  roomSize: number = 10
): { position: THREE.Vector3; rotation: THREE.Euler } => {
  const roomHalfSize = roomSize / 2;
  const entranceDistance = entranceDistanceFor(roomHalfSize);
  
  let position: THREE.Vector3;
  let rotation: THREE.Euler;
  
  // `direction` is the direction of TRAVEL, so the player enters the new room
  // through the OPPOSITE wall and should appear just inside it, facing onwards.
  //
  // North and south had this backwards: travelling north put the player at the
  // new room's north edge - the far side, measured 29 units from the door they
  // had just walked through - facing back the way they came. East and west were
  // already correct (their comments describe the wrong wall, but the maths is
  // right), which is why only half of all transitions felt broken.
  //
  // A yaw of 0 looks down -Z, so facing +Z is a yaw of PI.
  switch (direction) {
    case 'north':
      // Travelled +Z: enter at the south edge, carry on facing +Z.
      position = new THREE.Vector3(0, PLAYER_SPAWN_Y, -roomHalfSize + entranceDistance);
      rotation = new THREE.Euler(0, Math.PI, 0);
      break;
    case 'south':
      // Travelled -Z: enter at the north edge, carry on facing -Z.
      position = new THREE.Vector3(0, PLAYER_SPAWN_Y, roomHalfSize - entranceDistance);
      rotation = new THREE.Euler(0, 0, 0);
      break;
    case 'east':
      // Travelled +X: enter at the west edge, carry on facing +X.
      position = new THREE.Vector3(-roomHalfSize + entranceDistance, PLAYER_SPAWN_Y, 0);
      rotation = new THREE.Euler(0, -Math.PI / 2, 0);
      break;
    case 'west':
      // Travelled -X: enter at the east edge, carry on facing -X.
      position = new THREE.Vector3(roomHalfSize - entranceDistance, PLAYER_SPAWN_Y, 0);
      rotation = new THREE.Euler(0, Math.PI / 2, 0);
      break;
    default:
      position = new THREE.Vector3(0, PLAYER_SPAWN_Y, -roomHalfSize + entranceDistance);
      rotation = new THREE.Euler(0, Math.PI, 0);
  }
  
  return { position, rotation };
};
