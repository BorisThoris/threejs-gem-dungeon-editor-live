import React from "react";
import useMapStore from "../../../store/mapStore";
import { useGameState } from "../../../hooks/useGameState";
import { gameEvents, GAME_EVENTS } from "../../../utils/gameEvents";
import type { Room } from "../../../types/map";
import { BreakableCeiling, RoomFloor } from "../elements";
import Door from "../../Door";

// Import all room content components
import StartRoom from "./StartRoom";
import MeditationBiome from "./MeditationBiome";
import GymBiome from "./GymBiome";
import LibraryBiome from "./LibraryBiome";
import ShopBiome from "./ShopBiome";
import TreasureBiome from "./TreasureBiome";
import PuzzleBiome from "./PuzzleBiome";
import BossBiome from "./BossBiome";
import CoffeeBiome from "./CoffeeBiome";
import ChallengeBiome from "./ChallengeBiome";
import LibraryUpgradeBiome from "./LibraryUpgradeBiome";
import PortalBiome from "./PortalBiome";
import ArenaBiome from "./ArenaBiome";
import EndBiome from "./EndBiome";
import SpecialBiome from "./SpecialBiome";
import CorridorRoom from "./CorridorRoom";
import ColosseumRoom from "./ColosseumRoom";
import ShapedShell from "./ShapedShell";

// Room configuration interface
interface RoomConfig {
  type: string;
  component: React.ComponentType<any>;
  title: string;
  emoji: string;
  props?: (room: Room) => any;
}

// Room factory configuration
const ROOM_CONFIGS: RoomConfig[] = [
  {
    type: "start",
    component: StartRoom,
    title: "🚀 START ROOM 🚀",
    emoji: "🚀",
  },
  {
    type: "corridor",
    component: CorridorRoom,
    title: "🧱 CORRIDOR 🧱",
    emoji: "🧱",
    props: (room) => ({ size: room.size }),
  },
  {
    type: "colosseum",
    component: ColosseumRoom,
    title: "🏟️ COLOSSEUM 🏟️",
    emoji: "🏟️",
    props: (room) => ({ size: room.size }),
  },
  {
    type: "meditation",
    component: MeditationBiome,
    title: "🧘 MEDITATION CONTENT 🧘",
    emoji: "🧘",
  },
  {
    type: "bench-press",
    component: GymBiome,
    title: "💪 GYM CONTENT 💪",
    emoji: "💪",
  },
  {
    type: "library",
    component: LibraryBiome,
    title: "📚 LIBRARY CONTENT 📚",
    emoji: "📚",
    props: (room) => ({ books: (room as any).books || [] }),
  },
  {
    type: "shop",
    component: ShopBiome,
    title: "🛒 SHOP CONTENT 🛒",
    emoji: "🛒",
  },
  {
    type: "treasure",
    component: TreasureBiome,
    title: "💰 TREASURE CONTENT 💰",
    emoji: "💰",
  },
  {
    type: "puzzle",
    component: PuzzleBiome,
    title: "🧩 PUZZLE CONTENT 🧩",
    emoji: "🧩",
    props: (room) => ({
      puzzle: (room as any).puzzle,
      onPuzzleComplete: () => {},
    }),
  },
  {
    type: "boss",
    component: BossBiome,
    title: "👹 BOSS CONTENT 👹",
    emoji: "👹",
  },
  {
    type: "coffee",
    component: CoffeeBiome,
    title: "☕ COFFEE CONTENT ☕",
    emoji: "☕",
  },
  {
    type: "challenge",
    component: ChallengeBiome,
    title: "⚔️ CHALLENGE CONTENT ⚔️",
    emoji: "⚔️",
  },
  {
    type: "library-upgrade",
    component: LibraryUpgradeBiome,
    title: "📖 LIBRARY UPGRADE 📖",
    emoji: "📖",
  },
  {
    type: "portal",
    component: PortalBiome,
    title: "🌀 PORTAL CONTENT 🌀",
    emoji: "🌀",
    props: (room) => ({ portalDestination: (room as any).portalDestination }),
  },
  {
    type: "arena",
    component: ArenaBiome,
    title: "⚔️ ARENA CONTENT ⚔️",
    emoji: "⚔️",
  },
  {
    type: "end",
    component: EndBiome,
    title: "🏁 END CONTENT 🏁",
    emoji: "🏁",
  },
  {
    type: "devil-room",
    component: SpecialBiome,
    title: "😈 DEVIL CONTENT 😈",
    emoji: "😈",
    props: (room) => ({
      roomType: room.type as any,
      items: (room as any).items || [],
      onItemInteraction: () => {},
      onRoomEnter: () => {},
    }),
  },
  {
    type: "angel-room",
    component: SpecialBiome,
    title: "😇 ANGEL CONTENT 😇",
    emoji: "😇",
    props: (room) => ({
      roomType: room.type as any,
      items: (room as any).items || [],
      onItemInteraction: () => {},
      onRoomEnter: () => {},
    }),
  },
  {
    type: "cursed-room",
    component: SpecialBiome,
    title: "💀 CURSED CONTENT 💀",
    emoji: "💀",
    props: (room) => ({
      roomType: room.type as any,
      items: (room as any).items || [],
      onItemInteraction: () => {},
      onRoomEnter: () => {},
    }),
  },
  {
    type: "secret",
    component: SpecialBiome,
    title: "🔍 SECRET CONTENT 🔍",
    emoji: "🔍",
    props: (room) => ({
      roomType: room.type as any,
      items: (room as any).items || [],
      onItemInteraction: () => {},
      onRoomEnter: () => {},
    }),
  },
];

// Get room configuration by type
const getRoomConfig = (roomType: string): RoomConfig | null => {
  return ROOM_CONFIGS.find((config) => config.type === roomType) || null;
};

// Simple door positioning helper
const getDoorPosition = (room: Room, targetRoom: Room, roomSize?: number) => {
  const actualRoomSize = roomSize || room.actualSize || room.size || 10;
  const dx = targetRoom.position.x - room.position.x;
  const dz = targetRoom.position.z - room.position.z;

  if (Math.abs(dx) > Math.abs(dz)) {
    // East or West
    return {
      pos: [dx > 0 ? actualRoomSize / 2 : -actualRoomSize / 2, 0.5, 0] as [
        number,
        number,
        number
      ],
      rot: [0, dx > 0 ? Math.PI / 2 : -Math.PI / 2, 0] as [
        number,
        number,
        number
      ],
      direction: (dx > 0 ? "east" : "west") as
        | "north"
        | "south"
        | "east"
        | "west",
    };
  } else {
    // North or South
    return {
      pos: [0, 0.5, dz > 0 ? actualRoomSize / 2 : -actualRoomSize / 2] as [
        number,
        number,
        number
      ],
      rot: [0, dz > 0 ? Math.PI : 0, 0] as [number, number, number],
      direction: (dz > 0 ? "south" : "north") as
        | "north"
        | "south"
        | "east"
        | "west",
    };
  }
};

// Main Room Factory Component
interface RoomFactoryProps {
  currentRoomId: string | null;
  onRoomChange?: (roomId: string) => void;
}

const RoomFactory: React.FC<RoomFactoryProps> = ({
  currentRoomId,
  onRoomChange,
}) => {
  const { currentMap } = useMapStore();
  const { updateRoom, updateGamePhase } = useGameState();
  const roomRef = useRef<THREE.Group>(null);

  // Get current room data
  const currentRoom = currentMap?.rooms.find(
    (room) => room.id === currentRoomId
  );
  const roomConfig = currentRoom ? getRoomConfig(currentRoom.type) : null;

  // Debug logging for room connections
  if (currentRoom) {
    console.log(
      `RoomFactory: Current room ${currentRoom.id} (${currentRoom.type})`
    );
    console.log(`RoomFactory: Connections:`, currentRoom.connections);
    console.log(`RoomFactory: Total rooms in map:`, currentMap?.rooms.length);
  }

  // Get room size early for door calculations
  const roomSize = currentRoom?.actualSize || currentRoom?.size || 8;

  // Prepare door data for keyboard interaction
  const doorData =
    currentRoom?.connections
      ?.map((connectionId) => {
        const targetRoom = currentMap?.rooms.find((r) => r.id === connectionId);
        if (!targetRoom) return null;

        const doorPosition = getDoorPosition(
          currentRoom!,
          targetRoom,
          roomSize
        );

        return {
          id: connectionId,
          position: doorPosition.pos,
          type: targetRoom.type,
        };
      })
      .filter(Boolean) || [];

  // Update game state when room changes
  useEffect(() => {
    if (currentRoom) {
      updateRoom(currentRoom.id);

      // Set game phase based on room type
      if (currentRoom.type === "boss") {
        updateGamePhase("boss");
      } else if (currentRoom.type === "puzzle") {
        updateGamePhase("puzzle");
      } else {
        updateGamePhase("exploration");
      }

      // Emit room enter event
      gameEvents.emit(GAME_EVENTS.ROOM_ENTER, currentRoom);

      console.log(
        `RoomFactory: Entered ${currentRoom.id} (${currentRoom.type})`
      );
      console.log(`RoomFactory: Room connections:`, currentRoom.connections);
    }
  }, [currentRoom, updateRoom, updateGamePhase]);

  if (!currentMap || !currentRoom || !roomConfig) {
    return null;
  }

  const roomPosition = { x: 0, y: 0, z: 0 }; // Always center the room

  // Debug logging for room positioning
  console.log(
    `RoomFactory: Room ${currentRoom.id} positioned at [${roomPosition.x}, ${roomPosition.y}, ${roomPosition.z}]`
  );
  console.log(`RoomFactory: Floor positioned at [0, -0.5, 0] relative to room`);
  console.log(`RoomFactory: Floor top at y = 0`);

  // Get room component props and always include size for consistent footprint
  const roomProps = {
    size: roomSize,
    ...(roomConfig.props ? roomConfig.props(currentRoom) : {}),
  } as any;

  return (
    <group
      ref={roomRef}
      position={[roomPosition.x, roomPosition.y, roomPosition.z]}
    >
      {/* Smart Room Floor - automatically chooses correct floor based on room type */}
      <RoomFloor
        room={currentRoom}
        position={[0, -0.5, 0]}
        isCollidable={true}
      />

      {/* Size-based shell(s): if multi-tile, render a shell per tile position */}
      {currentRoom.isMultiTile &&
      currentRoom.tilePositions &&
      currentRoom.tilePositions.length > 0 ? (
        <group>
          {currentRoom.tilePositions.map((pos, idx) => (
            <group
              key={`tile-${idx}`}
              position={[
                pos.x - currentRoom.position.x,
                0,
                pos.z - currentRoom.position.z,
              ]}
            >
              <ShapedShell size={roomSize} shape={currentRoom.shape as any} />
            </group>
          ))}
        </group>
      ) : (
        <ShapedShell size={roomSize} shape={currentRoom.shape as any} />
      )}

      {/* Roof using Ceiling component */}
      <BreakableCeiling
        position={[0, 4.5, 0]}
        width={roomSize}
        height={0.5}
        depth={roomSize}
        material="wood"
        style="beamed"
        color="#654321"
        isCollidable={true}
        enabled={false}
      />

      {/* Doors - Black rectangle doors that trigger room changes */}
      {currentRoom.connections && currentRoom.connections.length > 0 ? (
        <group key={`doors-${currentRoom.id}`}>
          {currentRoom.connections.map((connectionId) => {
            const targetRoom = currentMap?.rooms.find(
              (r) => r.id === connectionId
            );
            if (!targetRoom) return null;

            const doorPosition = getDoorPosition(
              currentRoom,
              targetRoom,
              roomSize
            );

            return (
              <Door
                key={`door-${connectionId}`}
                position={doorPosition.pos}
                rotation={doorPosition.rot}
                targetRoomId={connectionId}
                direction={doorPosition.direction}
                showLabel={true}
                onDoorClick={() => onRoomChange?.(connectionId)}
              />
            );
          })}
        </group>
      ) : (
        console.warn(
          `RoomFactory: No connections found for room ${currentRoom.id}`
        )
      )}

      {/* Room-specific content - Render actual room components */}
      <roomConfig.component {...roomProps} />

      {/* Room Title - Minecraft Style Sign */}
      <AdvancedMinecraftSign
        position={[0, 2, 0]}
        lines={[roomConfig.title]}
        textColor="#FFFFFF"
        signColor="#8B4513"
        fontSize={0.3}
        scale={[1.2, 1.2, 1.2]}
        glowEffect={true}
      />
    </group>
  );
};

export default RoomFactory;
