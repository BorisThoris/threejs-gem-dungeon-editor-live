import React, { useState, useEffect, memo, useMemo } from "react";
import { RigidBody } from "@react-three/rapier";
import {
  CircleGeometry,
  ConeGeometry,
  CylinderGeometry,
  OctahedronGeometry,
} from "three";
import * as THREE from "three";
import type { Room as RoomType, Item } from "../types/map";
import { RoomType as RoomTypeValues } from "../types/map";
import BiomeWallRenderer from "./BiomeWallRenderer";
import { getBiomeWallConfig } from "../types/biomeWalls";
import ItemSprite from "./primitives/objects/ItemSprite";
import PuzzleGrid from "./PuzzleGrid";
import TreasureBiome from "./primitives/game-rooms/TreasureBiome";
import ShopBiome from "./primitives/game-rooms/ShopBiome";
import PuzzleBiome from "./primitives/game-rooms/PuzzleBiome";
import SpecialBiome from "./primitives/game-rooms/SpecialBiome";
import LibraryBiome from "./primitives/game-rooms/LibraryBiome";
import GymBiome from "./primitives/game-rooms/GymBiome";
import CoffeeBiome from "./primitives/game-rooms/CoffeeBiome";
import LibraryUpgradeBiome from "./primitives/game-rooms/LibraryUpgradeBiome";
import MeditationBiome from "./primitives/game-rooms/MeditationBiome";
import PortalBiome from "./primitives/game-rooms/PortalBiome";
import ArenaBiome from "./primitives/game-rooms/ArenaBiome";
import BossBiome from "./primitives/game-rooms/BossBiome";
import StartRoom from "./primitives/game-rooms/StartRoom";
import EndBiome from "./primitives/game-rooms/EndBiome";
import RoomInteraction from "./RoomInteraction";
import Door from "./Door";
import RoomDecorator from "./primitives/elements/RoomDecorator";
import RoomSegmentRenderer from "./primitives/elements/RoomSegmentRenderer";
import { loadTextureFromImage } from "../utils/textureUtils";

interface RoomProps {
  room: RoomType;
  isCurrent: boolean;
  isVisited: boolean;
  connectedRooms: RoomType[];
  onClick?: () => void;
  playerPosition?: [number, number, number];
  onInteraction?: (interactionType: string, roomId: string) => void;
  onRoomTransition?: (
    fromRoomId: string,
    toRoomId: string,
    direction: string
  ) => void;
  disableDoors?: boolean; // New prop to disable internal door rendering
}

const Room: React.FC<RoomProps> = memo(
  ({
    room,
    isCurrent,
    isVisited,
    connectedRooms,
    onClick,
    playerPosition = [0, 0, 0],
    onInteraction,
    onRoomTransition,
    disableDoors = false,
  }) => {
    const roomSize = room.size || 10;

    // Debug logging removed for performance

    // Texture loading state
    const [textures, setTextures] = useState<{
      wall?: THREE.Texture;
      floor?: THREE.Texture;
      roof?: THREE.Texture;
    }>({});

    // Load textures based on room type
    useEffect(() => {
      const loadTextures = async () => {
        try {
          const texturePromises: Array<{
            key: string;
            promise: Promise<THREE.Texture>;
          }> = [];

          // Determine textures based on room type
          let wallTextureId = "brick";
          let floorTextureId = "wood";
          let roofTextureId = "wood";

          switch (room.type) {
            case RoomTypeValues.TREASURE:
              wallTextureId = "brick";
              floorTextureId = "wood";
              roofTextureId = "wood";
              break;
            case RoomTypeValues.SHOP:
              wallTextureId = "brick";
              floorTextureId = "cobblestone";
              roofTextureId = "brick";
              break;
            case RoomTypeValues.PUZZLE:
              wallTextureId = "cobblestone";
              floorTextureId = "wood";
              roofTextureId = "cobblestone";
              break;
            case RoomTypeValues.LIBRARY:
              wallTextureId = "wood";
              floorTextureId = "wood";
              roofTextureId = "wood";
              break;
            case RoomTypeValues.BOSS:
              wallTextureId = "cobblestone";
              floorTextureId = "cobblestone";
              roofTextureId = "cobblestone";
              break;
            case RoomTypeValues.ENEMY:
              wallTextureId = "brick";
              floorTextureId = "cobblestone";
              roofTextureId = "brick";
              break;
            default:
              wallTextureId = "brick";
              floorTextureId = "wood";
              roofTextureId = "wood";
          }

          // Load wall texture
          texturePromises.push({
            key: "wall",
            promise: loadTextureFromImage(wallTextureId),
          });

          // Load floor texture
          texturePromises.push({
            key: "floor",
            promise: loadTextureFromImage(floorTextureId),
          });

          // Load roof texture
          texturePromises.push({
            key: "roof",
            promise: loadTextureFromImage(roofTextureId),
          });

          const loadedTextures = await Promise.all(
            texturePromises.map((tp) => tp.promise)
          );

          const textureMap: { [key: string]: THREE.Texture } = {};
          texturePromises.forEach((tp, index) => {
            const texture = loadedTextures[index];
            // Set texture repeat for better tiling
            texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
            texture.repeat.set(2, 2); // Repeat texture 2x2 times
            texture.needsUpdate = true;
            textureMap[tp.key] = texture;
          });

          setTextures(textureMap);
        } catch (error) {
          console.error("❌ Failed to load room textures:", error);
        }
      };

      loadTextures();
    }, [room.type]);

    // Compute door placement based on relative position of connected room - DISABLED FOR NOW
    // const getDoorPosition = (self: RoomType, target: RoomType) => {
    //   const dx = target.position.x - self.position.x;
    //   const dz = target.position.z - self.position.z;

    //   // East / West
    //   if (Math.abs(dx) > Math.abs(dz)) {
    //     if (dx > 0) {
    //       // East (right wall)
    //       return {
    //         position: [roomSize / 2, 1.5, 0] as [number, number, number],
    //         rotation: [0, Math.PI / 2, 0] as [number, number, number],
    //       };
    //     } else {
    //       // West (left wall)
    //       return {
    //         position: [-roomSize / 2, 1.5, 0] as [number, number, number],
    //         rotation: [0, -Math.PI / 2, 0] as [number, number, number],
    //       };
    //     }
    //   }

    //   // North / South (z axis)
    //   if (dz > 0) {
    //     // South (front wall)
    //     return {
    //       position: [0, 1.5, roomSize / 2] as [number, number, number],
    //       rotation: [0, 0, 0] as [number, number, number],
    //     };
    //   }
    //   // North (back wall)
    //   return {
    //     position: [0, 1.5, -roomSize / 2] as [number, number, number],
    //     rotation: [0, Math.PI, 0] as [number, number, number],
    //   };
    // };

    const getRoomColor = (type: string): string => {
      switch (type) {
        case RoomTypeValues.START:
          return "#4CAF50"; // Green
        case RoomTypeValues.END:
          return "#F44336"; // Red
        case RoomTypeValues.TREASURE:
          return "#FFD700"; // Gold
        case RoomTypeValues.ENEMY:
          return "#FF5722"; // Orange
        case RoomTypeValues.PUZZLE:
          return "#9C27B0"; // Purple
        case RoomTypeValues.BOSS:
          return "#E91E63"; // Pink
        case RoomTypeValues.SECRET:
          return "#607D8B"; // Blue Grey
        // Enhanced room types
        case RoomTypeValues.MEMORY_CHAMBER:
          return "#673AB7"; // Deep Purple
        case RoomTypeValues.SHOP:
          return "#4CAF50"; // Green
        case RoomTypeValues.TRAP:
          return "#FF5722"; // Orange
        case RoomTypeValues.CHALLENGE:
          return "#FF9800"; // Amber
        case RoomTypeValues.LIBRARY:
          return "#795548"; // Brown
        case RoomTypeValues.CURSED_ROOM:
          return "#9C27B0"; // Purple
        case RoomTypeValues.DEVIL_ROOM:
          return "#E91E63"; // Pink
        case RoomTypeValues.ANGEL_ROOM:
          return "#00BCD4"; // Cyan
        default:
          return "#2196F3"; // Blue
      }
    };

    const getRoomHeight = (type: string): number => {
      switch (type) {
        case RoomTypeValues.START:
        case RoomTypeValues.END:
          return 0.5;
        case RoomTypeValues.BOSS:
          return 0.6;
        default:
          return 0.4;
      }
    };

    const roomColor = getRoomColor(room.type);
    const roomHeight = getRoomHeight(room.type);
    const opacity = isVisited ? 1 : 0.3;
    const scale = isCurrent ? 1.1 : 1;

    // Check if this room uses biome-based walls
    const biomeConfig =
      room.useBiomeWalls && room.biomeId
        ? getBiomeWallConfig(room.biomeId)
        : null;

    const wallThickness = 0.2;
    const wallHeight = 5;
    const doorWidth = 3; // Width of door openings

    // Check which walls should have doors (connections)
    const hasNorthConnection = connectedRooms.some(
      (connectedRoom) =>
        connectedRoom.position.z < room.position.z &&
        Math.abs(room.position.z - connectedRoom.position.z) === room.size &&
        room.position.x === connectedRoom.position.x
    );

    const hasSouthConnection = connectedRooms.some(
      (connectedRoom) =>
        connectedRoom.position.z > room.position.z &&
        Math.abs(room.position.z - connectedRoom.position.z) === room.size &&
        room.position.x === connectedRoom.position.x
    );

    const hasEastConnection = connectedRooms.some(
      (connectedRoom) =>
        connectedRoom.position.x > room.position.x &&
        Math.abs(room.position.x - connectedRoom.position.x) === room.size &&
        room.position.z === connectedRoom.position.z
    );

    const hasWestConnection = connectedRooms.some(
      (connectedRoom) =>
        connectedRoom.position.x < room.position.x &&
        Math.abs(room.position.x - connectedRoom.position.x) === room.size &&
        room.position.z === connectedRoom.position.z
    );

    // Create connections array for segment renderer
    // In room-instance mode, generate directional connections based on room connections count
    const connections: string[] = [];
    const roomConnections = room.connections || [];
    const directions = ["north", "south", "east", "west"];

    // Create directional connections for each room connection
    roomConnections.forEach((_, index) => {
      if (index < directions.length) {
        connections.push(directions[index]);
      }
    });

    // Get room shape geometry
    const getRoomGeometry = () => {
      const width = room.width || room.size;
      const height = room.height || room.size;

      switch (room.shape) {
        case "circle":
          return <primitive object={new CircleGeometry(width / 2, 32)} />;
        case "triangle":
          return <primitive object={new ConeGeometry(width / 2, height, 3)} />;
        case "hexagon":
          return (
            <primitive
              object={new CylinderGeometry(width / 2, width / 2, 0.1, 6)}
            />
          );
        case "octagon":
          return (
            <primitive
              object={new CylinderGeometry(width / 2, width / 2, 0.1, 8)}
            />
          );
        case "diamond":
          return <primitive object={new OctahedronGeometry(width / 2)} />;
        case "star":
          return <boxGeometry args={[width, 0.1, height]} />; // Fallback to box for star
        case "cross":
          return <boxGeometry args={[width, 0.1, height]} />;
        default:
          return <planeGeometry args={[width, height]} />;
      }
    };

    return (
      <group
        position={[room.position.x, 0, room.position.z]}
        scale={scale}
        rotation={[0, room.rotation || 0, 0]}
      >
        {/* Physical Floor with Collision - always full square for reliable physics */}
        <RigidBody type="fixed" colliders="trimesh">
          <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            position={[0, -roomHeight / 2, 0]}
            receiveShadow
          >
            <planeGeometry
              args={[room.width || roomSize, room.height || roomSize]}
            />
            <meshLambertMaterial
              color={roomColor}
              transparent
              opacity={opacity}
            />
          </mesh>
        </RigidBody>

        {/* Visual Floor Overlay - shaped for variety */}
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, -roomHeight / 2 + 0.01, 0]}
          receiveShadow
          onClick={onClick}
        >
          {getRoomGeometry()}
          <meshLambertMaterial
            color={roomColor}
            transparent
            opacity={opacity}
            map={textures.floor}
            roughness={0.8}
            metalness={0.0}
          />
        </mesh>

        {/* Render walls based on biome config or fallback to traditional walls */}
        {biomeConfig ? (
          <BiomeWallRenderer
            biomeConfig={biomeConfig}
            position={[0, 0, 0]}
            rotation={[0, 0, 0]}
            scale={room.biomeScale || [1, 1, 1]}
          />
        ) : (
          <RoomSegmentRenderer
            roomId={room.id}
            roomSize={roomSize}
            wallHeight={wallHeight}
            wallThickness={wallThickness}
            doorWidth={doorWidth}
            connections={disableDoors ? [] : connections} // Disable doors if disableDoors is true
            roomConnections={disableDoors ? [] : room.connections} // Disable room connections if disableDoors is true
            onDoorClick={
              disableDoors
                ? undefined
                : (targetRoomId, direction) => {
                    // Trigger room transition
                    onRoomTransition?.(room.id, targetRoomId, direction);
                  }
            }
            onSegmentClick={(segmentId) => {
              // Wall segment clicked
            }}
            onSegmentHover={(segmentId) => {
              // Wall segment hovered
            }}
            onSegmentUnhover={(segmentId) => {
              // Wall segment unhovered
            }}
          />
        )}

        {/* Roof */}
        <RigidBody type="fixed" colliders="trimesh">
          <mesh
            position={[0, wallHeight, 0]}
            rotation={[0, 0, 0]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[roomSize, 0.2, roomSize]} />
            <meshLambertMaterial
              color="#8B7355"
              map={textures.roof}
              roughness={0.8}
              metalness={0.0}
            />
          </mesh>
        </RigidBody>

        {/* Safety Ground Plane - prevents falling through floor */}
        <RigidBody type="fixed" colliders="trimesh">
          <mesh
            position={[0, -roomHeight / 2 - 1, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
            receiveShadow
          >
            <planeGeometry args={[roomSize * 2, roomSize * 2]} />
            <meshLambertMaterial color="#4A4A4A" transparent opacity={0.1} />
          </mesh>
        </RigidBody>

        {/* Current Room Indicator */}
        <mesh position={[0, roomHeight + 0.5, 0]}>
          <sphereGeometry args={[0.3, 8, 8]} />
          <meshLambertMaterial
            color={isCurrent ? "#FFEB3B" : roomColor}
            transparent
            opacity={isCurrent ? 1 : 0.7}
          />
        </mesh>

        {/* Room Decorations - Add elements to all room types */}
        <RoomDecorator roomType={room.type} roomSize={roomSize} />

        {/* Enhanced Room Features - Always render all specialized rooms */}
        <>
          {/* Specialized Room Types */}
          {room.type === RoomTypeValues.TREASURE && <TreasureBiome />}

          {room.type === RoomTypeValues.SHOP && <ShopBiome />}

          {room.type === RoomTypeValues.PUZZLE && (room as any).puzzle && (
            <PuzzleBiome
              puzzle={(room as any).puzzle}
              onPuzzleComplete={() => {
                // Handle puzzle completion through card system
              }}
            />
          )}

          {(room.type === RoomTypeValues.DEVIL_ROOM ||
            room.type === RoomTypeValues.ANGEL_ROOM ||
            room.type === RoomTypeValues.CURSED_ROOM ||
            room.type === RoomTypeValues.SECRET) && (
            <SpecialBiome
              roomType={room.type as any}
              items={(room as any).items || []}
              onItemInteraction={(item) => {
                // Handle special item interaction through card system
              }}
              onRoomEnter={() => {
                // Handle special room entry through card system
              }}
            />
          )}

          {room.type === RoomTypeValues.LIBRARY && (
            <LibraryBiome books={(room as any).books || []} />
          )}

          {/* Upgrade Rooms - All interactions through card system */}
          {room.type === RoomTypeValues.BENCH_PRESS && <GymBiome />}

          {room.type === RoomTypeValues.COFFEE && <CoffeeBiome />}

          {room.type === RoomTypeValues.LIBRARY_UPGRADE && (
            <LibraryUpgradeBiome />
          )}

          {room.type === RoomTypeValues.MEDITATION && <MeditationBiome />}

          {/* New Advanced Room Types - All interactions through card system */}
          {room.type === RoomTypeValues.PORTAL && (
            <PortalBiome portalDestination={room.portalDestination} />
          )}

          {room.type === RoomTypeValues.ARENA && <ArenaBiome />}

          {room.type === RoomTypeValues.BOSS && <BossBiome />}

          {room.type === RoomTypeValues.START && <StartRoom />}

          {room.type === RoomTypeValues.END && <EndBiome />}

          {/* Fallback for other room types */}
          {![
            RoomTypeValues.START,
            RoomTypeValues.END,
            RoomTypeValues.TREASURE,
            RoomTypeValues.SHOP,
            RoomTypeValues.PUZZLE,
            RoomTypeValues.DEVIL_ROOM,
            RoomTypeValues.ANGEL_ROOM,
            RoomTypeValues.CURSED_ROOM,
            RoomTypeValues.SECRET,
            RoomTypeValues.LIBRARY,
            RoomTypeValues.BENCH_PRESS,
            RoomTypeValues.COFFEE,
            RoomTypeValues.LIBRARY_UPGRADE,
            RoomTypeValues.MEDITATION,
            RoomTypeValues.PORTAL,
            RoomTypeValues.ARENA,
            RoomTypeValues.BOSS,
            RoomTypeValues.ENEMY,
            RoomTypeValues.TRAP,
          ].includes(room.type as any) && (
            <>
              {/* Items in room */}
              {(room as any).items?.map((item: Item, index: number) => (
                <ItemSprite
                  key={item.id}
                  item={item}
                  position={
                    [
                      ((index % 3) - 1) * 2,
                      roomHeight + 0.5,
                      Math.floor(index / 3) * 2 - 1,
                    ] as [number, number, number]
                  }
                  scale={0.5}
                  onClick={() => {
                    // Handle item pickup
                  }}
                />
              ))}

              {/* Puzzle in room */}
              {(room as any).puzzle && (
                <PuzzleGrid
                  puzzle={(room as any).puzzle}
                  onTileClick={(tile) => {
                    // Handle puzzle tile click
                  }}
                  onComplete={() => {
                    // Handle puzzle completion
                  }}
                />
              )}

              {/* Special room effects */}
              {(room as any).specialProperties && (
                <group position={[0, roomHeight + 2, 0]}>
                  {/* Special room indicator */}
                  <mesh>
                    <sphereGeometry args={[0.2, 8, 8]} />
                    <meshBasicMaterial
                      color="#FFD700"
                      transparent
                      opacity={0.8}
                    />
                  </mesh>
                </group>
              )}
            </>
          )}

          {/* Room Interaction System */}
          {onInteraction && (
            <RoomInteraction
              room={room}
              playerPosition={playerPosition}
              onInteraction={onInteraction}
            />
          )}

          {/* Room Collision Detection - Now handled by UnifiedRoomManager */}

          {/* Doors - DISABLED FOR NOW */}
          {/* {room.connections && room.connections.length > 0 && (
          <>
            {room.connections.map((connectionId) => {
              const target = connectedRooms.find((r) => r.id === connectionId);
              if (!target) return null;
              const doorPosition = getDoorPosition(room, target);
              return (
                <Door
                  key={`door-${connectionId}`}
                  position={doorPosition.position}
                  rotation={doorPosition.rotation}
                  targetRoomId={connectionId}
                  showLabel={true}
                  onDoorClick={() => onRoomChange?.(connectionId)}
                />
              );
            })}
          </>
        )} */}
        </>
      </group>
    );
  }
);

Room.displayName = "Room";

export default Room;
