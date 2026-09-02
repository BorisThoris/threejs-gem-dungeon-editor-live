import React, { useState } from "react";
import MeditationBiome from "./primitives/game-rooms/MeditationBiome";
import GymBiome from "./primitives/game-rooms/GymBiome";
import ShopBiome from "./primitives/game-rooms/ShopBiome";
import TreasureBiome from "./primitives/game-rooms/TreasureBiome";
import ChallengeBiome from "./primitives/game-rooms/ChallengeBiome";
import PuzzleBiome from "./primitives/game-rooms/PuzzleBiome";
import LibraryBiome from "./primitives/game-rooms/LibraryBiome";

type RoomType =
  | "meditation"
  | "benchpress"
  | "shop"
  | "treasure"
  | "challenge"
  | "puzzle"
  | "library";

const RoomDemo: React.FC = () => {
  const [currentRoom, setCurrentRoom] = useState<RoomType>("meditation");

  const rooms = [
    {
      id: "meditation" as RoomType,
      name: "Meditation Room",
      component: MeditationBiome,
    },
    {
      id: "benchpress" as RoomType,
      name: "Bench Press Room",
      component: GymBiome,
    },
    { id: "shop" as RoomType, name: "Shop Room", component: ShopBiome },
    {
      id: "treasure" as RoomType,
      name: "Treasure Room",
      component: TreasureBiome,
    },
    {
      id: "challenge" as RoomType,
      name: "Challenge Room",
      component: ChallengeBiome,
    },
    { id: "puzzle" as RoomType, name: "Puzzle Room", component: PuzzleBiome },
    {
      id: "library" as RoomType,
      name: "Library Room",
      component: LibraryBiome,
    },
  ];

  const CurrentRoomComponent =
    rooms.find((r) => r.id === currentRoom)?.component || MeditationBiome;

  return (
    <group>
      {/* Room Navigation */}
      <group position={[0, 4, 0]}>
        {rooms.map((room, index) => (
          <mesh
            key={room.id}
            position={[(index - 3) * 2, 0, 0]}
            onClick={() => setCurrentRoom(room.id)}
            onPointerOver={(e) => {
              e.stopPropagation();
              document.body.style.cursor = "pointer";
            }}
            onPointerOut={() => {
              document.body.style.cursor = "default";
            }}
          >
            <boxGeometry args={[1.5, 0.5, 0.2]} />
            <meshStandardMaterial
              color={currentRoom === room.id ? "#00ff00" : "#666666"}
              emissive={currentRoom === room.id ? "#00ff00" : "#000000"}
              emissiveIntensity={currentRoom === room.id ? 0.3 : 0}
            />
          </mesh>
        ))}
      </group>

      {/* Room Labels */}
      <group position={[0, 3.5, 0]}>
        {rooms.map((room, index) => (
          <mesh key={`label-${room.id}`} position={[(index - 3) * 2, 0, 0]}>
            <boxGeometry args={[1.2, 0.1, 0.1]} />
            <meshStandardMaterial color="#ffffff" />
          </mesh>
        ))}
      </group>

      {/* Current Room */}
      <CurrentRoomComponent books={[]} />

      {/* Instructions */}
      <group position={[0, -3, 0]}>
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[8, 0.5, 0.2]} />
          <meshStandardMaterial color="#333333" />
        </mesh>
      </group>
    </group>
  );
};

export default RoomDemo;
