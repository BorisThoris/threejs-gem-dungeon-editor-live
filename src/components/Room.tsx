import React, { useState, useEffect, memo, useMemo } from "react";
import { RigidBody } from "@react-three/rapier";
import {
  CircleGeometry,
  PlaneGeometry,
} from "three";
import * as THREE from "three";
import type { Room as RoomType, Item } from "../types/map";
import { RoomType as RoomTypeValues } from "../types/map";

// Floor slabs are solid boxes rather than plane trimeshes so that a body
// moving fast cannot tunnel through them between physics steps.

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
import MemoryGamePuzzleBiome from "./primitives/game-rooms/MemoryGamePuzzleBiome";
import PressurePlatePuzzleBiome from "./primitives/game-rooms/PressurePlatePuzzleBiome";
import RoomInteraction from "./RoomInteraction";
import Door from "./Door";
import RoomDecorator from "./primitives/elements/RoomDecorator";
import RoomSegmentRenderer from "./primitives/elements/RoomSegmentRenderer";
import { loadTextureFromImage } from "../utils/textureUtils";
import { useConsolidatedGameStore } from "../store/consolidatedGameStore";
import { FLOOR_THICKNESS, GROUND_Y } from "../configs/worldGeometry";

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
    // The generator computes `actualSize` - up to twice `size` - and doors,
    // player spawn and room detection are all placed from it. The room's own
    // walls, floor and roof were built from `size` instead, so a room could be
    // 32 units wide as far as everything else was concerned while its shell was
    // only 16. Measured across 179 generated rooms: 37% had the two disagree,
    // and in 34% the player was dropped outside their own walls on entry -
    // worst case 7 units into the void, standing on the world ground with the
    // room behind them.
    const roomSize = room.actualSize || room.size || 10;

    // Solving a room's puzzle hands over that room's gem. Both of these
    // biomes already tracked completion; nothing was listening.
    const awardRoomGem = useConsolidatedGameStore((state) => state.collectGem);

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

    /**
     * Floor and wall tint, per room type.
     *
     * These used to be the Material Design swatches the 2D map legend draws
     * rooms with - #4CAF50 green for start, #FFD700 gold for treasure, #E91E63
     * pink for a boss. Tinting a first-person dungeon floor with them made the
     * starting room look like a lawn. Same mistake as roomHeight: map data
     * driving the play space.
     *
     * The type still reads at a glance, but as a tint on stone rather than a
     * hue. Values stay bright enough that the floor texture multiplied by them
     * is still legible.
     */
    const getRoomColor = (type: string): string => {
      switch (type) {
        case RoomTypeValues.START:
          return "#87977f"; // mossy stone
        case RoomTypeValues.END:
          return "#9b8079"; // iron-red stone
        case RoomTypeValues.TREASURE:
          return "#9c9176"; // old gold
        case RoomTypeValues.ENEMY:
          return "#9a8175";
        case RoomTypeValues.PUZZLE:
        case RoomTypeValues.MEMORY_CHAMBER:
          return "#8b84a0"; // faded violet
        case RoomTypeValues.BOSS:
          return "#96788a";
        case RoomTypeValues.SECRET:
          return "#7f8a92";
        case RoomTypeValues.SHOP:
          return "#80978c"; // verdigris
        case RoomTypeValues.TRAP:
          return "#9a8074";
        case RoomTypeValues.CHALLENGE:
          return "#9a8f75";
        case RoomTypeValues.LIBRARY:
          return "#95866f"; // old timber
        case RoomTypeValues.CURSED_ROOM:
          return "#87799a";
        case RoomTypeValues.DEVIL_ROOM:
          return "#96788a";
        case RoomTypeValues.ANGEL_ROOM:
          return "#88a0a4";
        default:
          return "#8c8c96"; // plain stone
      }
    };


    const roomColor = getRoomColor(room.type);
    const opacity = isVisited ? 1 : 0.3;
    // The room is played at its true size. `isCurrent ? 1.1 : 1` was a map-view
    // emphasis, but this component only ever renders the room the player is
    // standing in - so every played room was silently 10% larger than the size
    // that doors, spawns, gems and hazards were all positioned from.

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

    /**
     * The room's floor outline.
     *
     * Every shape but "circle" used to be a solid: a cone for a triangle, a
     * cylinder for a hexagon or octagon, an octahedron for a diamond. The mesh
     * that carries them is rotated flat for a plane, which laid those solids on
     * their sides - a 16-unit cone sticking sideways through the floor of the
     * first room the player sees. A third of rooms get a shape, so most runs
     * opened on one.
     *
     * They are all flat polygons now: CircleGeometry with the right number of
     * segments is a triangle at 3, a diamond at 4, a hexagon at 6 and an
     * octagon at 8, and every one of them lies down the way a plane does.
     *
     * The shape is the floor's outline inside a square room, not the room's
     * own footprint - the walls, the colliders and the doorways are still laid
     * out on the square. Making a room genuinely N-sided means teaching the
     * wall renderer to follow a perimeter and put doorways on it.
     */
    const floorGeometry = useMemo(() => {
      const width = room.width || roomSize;
      const height = room.height || roomSize;
      const radius = width / 2;

      switch (room.shape) {
        case "circle":
          return new CircleGeometry(radius, 48);
        case "triangle":
          return new CircleGeometry(radius, 3);
        case "diamond":
          return new CircleGeometry(radius, 4);
        case "hexagon":
          return new CircleGeometry(radius, 6);
        case "octagon":
          return new CircleGeometry(radius, 8);
        default:
          return new PlaneGeometry(width, height);
      }
    }, [room.shape, room.width, room.height, roomSize]);

    // Geometries are GPU buffers, not plain objects: the old code built a new
    // one on every render of every room and never released any of them.
    useEffect(() => () => floorGeometry.dispose(), [floorGeometry]);

    return (
      <group
        position={[room.position.x, 0, room.position.z]}
        rotation={[0, room.rotation || 0, 0]}
      >
        {/* Physical Floor with Collision - always a full solid slab for reliable
            physics. A zero-thickness plane trimesh lets fast bodies tunnel
            straight through, which is how the player fell out of the world. */}
        <RigidBody type="fixed" colliders="cuboid">
          <mesh
            position={[0, GROUND_Y - FLOOR_THICKNESS / 2, 0]}
            receiveShadow
          >
            <boxGeometry
              args={[
                room.width || roomSize,
                FLOOR_THICKNESS,
                room.height || roomSize,
              ]}
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
          position={[0, GROUND_Y + 0.01, 0]}
          receiveShadow
          onClick={onClick}
        >
          <primitive object={floorGeometry} attach="geometry" />
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

        {/* The room's own light.
            Rooms had none: the scene's ambient was 0.2 and the only real light
            in a room was the point light attached to its gem, so collecting the
            gem dropped the floor's mean luminance by 84%. A room is lit because
            it is a room now, not because it happens to contain a collectible.
            Range follows the room so a large room is not lit only in the
            middle. */}
        <pointLight
          position={[0, wallHeight - 0.6, 0]}
          color="#ffd9a8"
          intensity={2.1}
          distance={roomSize * 2}
          decay={1.1}
        />

        {/* Roof */}
        <RigidBody type="fixed" colliders="cuboid">
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

        {/* Safety Ground Slab - the backstop under the room floor. This was a
            zero-thickness plane, which a falling body passes straight through;
            it only works as a backstop if it has volume. */}
        <RigidBody type="fixed" colliders="cuboid">
          <mesh
            position={[0, GROUND_Y - 3 - FLOOR_THICKNESS / 2, 0]}
            receiveShadow
          >
            <boxGeometry
              args={[roomSize * 2, FLOOR_THICKNESS, roomSize * 2]}
            />
            <meshLambertMaterial color="#4A4A4A" transparent opacity={0.1} />
          </mesh>
        </RigidBody>

        {/* The map view's "you are here" pin used to be rendered here too, a
            yellow sphere hanging at chest height in the middle of every room.
            In a first-person game it is just an unexplained floating ball. */}

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

          {/* The two rooms with the most actual gameplay in the project. They
              were registered only in the editor's biome registry, so in the
              real game they were unreachable - 1,400 lines of finished puzzle
              content that no player could ever see. */}
          {room.type === RoomTypeValues.MEMORY_CHAMBER && (
            <MemoryGamePuzzleBiome
              size={room.actualSize || room.size}
              onPuzzleComplete={() => awardRoomGem(room.id)}
            />
          )}

          {room.type === RoomTypeValues.CHALLENGE && (
            <PressurePlatePuzzleBiome
              size={room.actualSize || room.size}
              onPuzzleComplete={() => awardRoomGem(room.id)}
            />
          )}

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
                      GROUND_Y + 1,
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
                <group position={[0, GROUND_Y + 2.5, 0]}>
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
