import * as THREE from 'three';

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
  const entranceDistance = 1;
  
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
 * How high above a room floor to place the player when they walk in.
 *
 * The player is a capsule 1.1 units tall from its centre (0.8 half-height plus
 * a 0.3 radius) and room floors are solid slabs whose top face sits at y=0. The
 * old spawn height of 0.5 therefore dropped the capsule 0.6 units *inside* the
 * floor: Rapier resolved the overlap by pushing the body out of the bottom of
 * the slab, and the player finished every room transition wedged underneath the
 * room with the floor above their head. Movement kept working - the velocity was
 * set every frame - but the body had nowhere to go, so the player simply stopped
 * dead the first time they walked through a door.
 *
 * This matches the height `usePlayerSpawn` uses to place the player at the very
 * start of a run, which is the one spawn that was never broken.
 */
export const PLAYER_SPAWN_HEIGHT = 1.5;

/** How close the player must get to a doorway for it to travel. */
export const DOOR_TRIGGER_RADIUS = 1.5;

/** How far they must back off before that doorway will fire again. */
export const DOOR_REARM_RADIUS = 2.4;

/**
 * Where to put the player when they walk into a room, given the direction they
 * travelled to get there.
 *
 * `direction` is the way the player moved - callers derive it from the vector
 * between the two rooms - so someone travelling north enters through the new
 * room's *south* wall. This function used to spawn them at the north edge
 * instead: the far side of the room, standing inside the doorway that leads out
 * the other end.
 *
 * That doorway's trigger fired on the very next frame, which travelled again,
 * which spawned them in the next doorway. One step north out of the start room
 * carried the player through three rooms in a row without a key being pressed,
 * and they came to rest wherever the chain ran out of aligned doors. Rooms in
 * between were never explored, never marked visited, and their gems were never
 * reachable.
 *
 * Spawn on the wall the player came through, facing the middle of the room.
 */
export const calculatePlayerSpawnPosition = (
  direction: 'north' | 'south' | 'east' | 'west',
  roomSize: number = 10
): { position: THREE.Vector3; rotation: THREE.Euler } => {
  const roomHalfSize = roomSize / 2;
  // Far enough inside the room that the doorway just walked through is outside
  // its own re-arm radius. Land any closer and that trigger fires on the next
  // frame and walks the player straight back out again.
  const entranceDistance = DOOR_REARM_RADIUS + 0.6;
  const edge = roomHalfSize - entranceDistance;

  // The camera looks down -Z at a yaw of 0, so each rotation below turns it to
  // face the direction of travel - which is into the room from the entry wall.
  switch (direction) {
    case 'north':
      // Travelled +Z: entered by the south wall, now facing +Z.
      return {
        position: new THREE.Vector3(0, PLAYER_SPAWN_HEIGHT, -edge),
        rotation: new THREE.Euler(0, Math.PI, 0),
      };
    case 'south':
      // Travelled -Z: entered by the north wall, now facing -Z.
      return {
        position: new THREE.Vector3(0, PLAYER_SPAWN_HEIGHT, edge),
        rotation: new THREE.Euler(0, 0, 0),
      };
    case 'east':
      // Travelled +X: entered by the west wall, now facing +X.
      return {
        position: new THREE.Vector3(-edge, PLAYER_SPAWN_HEIGHT, 0),
        rotation: new THREE.Euler(0, -Math.PI / 2, 0),
      };
    case 'west':
      // Travelled -X: entered by the east wall, now facing -X.
      return {
        position: new THREE.Vector3(edge, PLAYER_SPAWN_HEIGHT, 0),
        rotation: new THREE.Euler(0, Math.PI / 2, 0),
      };
    default:
      return {
        position: new THREE.Vector3(0, PLAYER_SPAWN_HEIGHT, 0),
        rotation: new THREE.Euler(0, 0, 0),
      };
  }
};
