import React from "react";
import {
  BreakableTorch,
  BreakableCandle,
  BreakableBarrel,
  BreakableChest,
  BreakableTable,
  BreakableChair,
  BreakableBookshelf,
  BreakablePotionBottle,
  BreakableCrystal,
  BreakableSkull,
  BreakableFloatingText,
} from "./index";

interface RoomDecoratorProps {
  roomType: string;
  roomSize?: number;
}

const RoomDecorator: React.FC<RoomDecoratorProps> = ({
  roomType,
  roomSize = 8,
}) => {
  const halfSize = roomSize / 2;
  const margin = 1.5; // Distance from walls

  const getRoomElements = () => {
    switch (roomType) {
      case "start":
        return (
          <>
            {/* Welcome area with table and chairs */}
            <BreakableTable position={[0, 0, 0]} />
            <BreakableChair position={[-0.6, 0, 0.4]} />
            <BreakableChair position={[0.6, 0, 0.4]} />

            {/* Torches for lighting */}
            <BreakableTorch
              position={[-halfSize + margin, 0, -halfSize + margin]}
            />
            <BreakableTorch
              position={[halfSize - margin, 0, -halfSize + margin]}
            />
            <BreakableTorch
              position={[-halfSize + margin, 0, halfSize - margin]}
            />
            <BreakableTorch
              position={[halfSize - margin, 0, halfSize - margin]}
            />

            {/* Welcome chest */}
            <BreakableChest position={[0, 0, -1.5]} />
          </>
        );

      case "end":
        return (
          <>
            {/* Exit portal area */}
            <BreakableCrystal position={[0, 1, 0]} color="#ff00ff" />
            <BreakableCrystal position={[-1, 0.5, 0]} color="#00ffff" />
            <BreakableCrystal position={[1, 0.5, 0]} color="#ffff00" />

            {/* Altar table */}
            <BreakableTable position={[0, 0, 0]} />

            {/* Magical candles */}
            <BreakableCandle position={[-0.8, 0.4, -0.4]} />
            <BreakableCandle position={[0.8, 0.4, -0.4]} />
            <BreakableCandle position={[-0.8, 0.4, 0.4]} />
            <BreakableCandle position={[0.8, 0.4, 0.4]} />

            {/* Victory chest */}
            <BreakableChest position={[0, 0, -1.5]} />
          </>
        );

      case "normal":
        return (
          <>
            {/* Fixed furniture placement */}
            <BreakableTable position={[0, 0, 0]} />
            <BreakableChair position={[-1, 0, 0.5]} />
            <BreakableChair position={[1, 0, 0.5]} />

            {/* Fixed barrels and chests */}
            <BreakableBarrel position={[-2, 0, -2]} />
            <BreakableChest position={[2, 0, -2]} />

            {/* Lighting */}
            <BreakableTorch
              position={[-halfSize + margin, 0, -halfSize + margin]}
            />
            <BreakableTorch
              position={[halfSize - margin, 0, halfSize - margin]}
            />

            {/* Potions */}
            {Math.random() > 0.7 && (
              <BreakablePotionBottle
                position={[Math.random() * 4 - 2, 0.2, Math.random() * 4 - 2]}
                color={
                  ["#ff0000", "#00ff00", "#0000ff", "#ffff00"][
                    Math.floor(Math.random() * 4)
                  ]
                }
              />
            )}
          </>
        );

      case "treasure":
        return (
          <>
            {/* Multiple chests */}
            <BreakableChest position={[0, 0, 0]} />
            <BreakableChest position={[-1.5, 0, 0]} />
            <BreakableChest position={[1.5, 0, 0]} />

            {/* Fixed gold and gems placement */}
            <BreakableCrystal position={[-1, 0.1, -1]} color="#FFD700" />
            <BreakableCrystal position={[1, 0.1, -1]} color="#FFD700" />
            <BreakableCrystal position={[-1, 0.1, 1]} color="#FFD700" />
            <BreakableCrystal position={[1, 0.1, 1]} color="#FFD700" />

            {/* Magical lighting */}
            <BreakableCandle position={[-2, 0.4, -2]} />
            <BreakableCandle position={[2, 0.4, -2]} />
            <BreakableCandle position={[-2, 0.4, 2]} />
            <BreakableCandle position={[2, 0.4, 2]} />

            <BreakableFloatingText
              position={[0, 2, 0]}
              text="TREASURE ROOM"
              color="#FFD700"
            />
          </>
        );

      case "shop":
        return (
          <>
            {/* Shop counter */}
            <BreakableTable position={[0, 0, -1]} />
            <BreakableTable position={[0, 0, 1]} />

            {/* Shopkeeper area */}
            <BreakableChair position={[0, 0, -2]} />

            {/* Display shelves */}
            <BreakableBookshelf position={[-2, 0, 0]} />
            <BreakableBookshelf position={[2, 0, 0]} />

            {/* Potion display */}
            <BreakablePotionBottle position={[-1, 0.4, -1]} color="#ff0000" />
            <BreakablePotionBottle position={[0, 0.4, -1]} color="#00ff00" />
            <BreakablePotionBottle position={[1, 0.4, -1]} color="#0000ff" />

            {/* Shop lighting */}
            <BreakableTorch position={[-halfSize + margin, 0, 0]} />
            <BreakableTorch position={[halfSize - margin, 0, 0]} />
          </>
        );

      case "puzzle":
        return (
          <>
            {/* Puzzle table */}
            <BreakableTable position={[0, 0, 0]} />

            {/* Mystical elements */}
            <BreakableCrystal position={[-1, 0.5, 0]} color="#8000ff" />
            <BreakableCrystal position={[1, 0.5, 0]} color="#8000ff" />
            <BreakableCrystal position={[0, 0.5, -1]} color="#8000ff" />
            <BreakableCrystal position={[0, 0.5, 1]} color="#8000ff" />

            {/* Books for reference */}
            <BreakableBookshelf position={[-2.5, 0, 0]} />

            {/* Magical candles */}
            <BreakableCandle position={[-1, 0.4, -1]} />
            <BreakableCandle position={[1, 0.4, -1]} />
            <BreakableCandle position={[-1, 0.4, 1]} />
            <BreakableCandle position={[1, 0.4, 1]} />
          </>
        );

      case "library":
        return (
          <>
            {/* Multiple bookshelves */}
            <BreakableBookshelf position={[-2, 0, -2]} />
            <BreakableBookshelf position={[0, 0, -2]} />
            <BreakableBookshelf position={[2, 0, -2]} />
            <BreakableBookshelf position={[-2, 0, 2]} />
            <BreakableBookshelf position={[0, 0, 2]} />
            <BreakableBookshelf position={[2, 0, 2]} />

            {/* Reading area */}
            <BreakableTable position={[0, 0, 0]} />
            <BreakableChair position={[-0.6, 0, 0.4]} />
            <BreakableChair position={[0.6, 0, 0.4]} />

            {/* Magical lighting */}
            <BreakableCandle position={[-1, 0.4, 0]} />
            <BreakableCandle position={[1, 0.4, 0]} />
          </>
        );

      case "devil-room":
        return (
          <>
            {/* Altar */}
            <BreakableTable position={[0, 0, 0]} />

            {/* Skulls and bones */}
            <BreakableSkull position={[-1, 0.2, -1]} />
            <BreakableSkull position={[1, 0.2, -1]} />
            <BreakableSkull position={[-1, 0.2, 1]} />
            <BreakableSkull position={[1, 0.2, 1]} />

            {/* Dark crystals */}
            <BreakableCrystal position={[0, 0.5, 0]} color="#8B0000" />

            {/* Red candles */}
            <BreakableCandle position={[-1, 0.4, 0]} />
            <BreakableCandle position={[1, 0.4, 0]} />
            <BreakableCandle position={[0, 0.4, -1]} />
            <BreakableCandle position={[0, 0.4, 1]} />

            <BreakableFloatingText
              position={[0, 2, 0]}
              text="DEVIL ROOM"
              color="#8B0000"
            />
          </>
        );

      case "angel-room":
        return (
          <>
            {/* Altar */}
            <BreakableTable position={[0, 0, 0]} />

            {/* Golden crystals */}
            <BreakableCrystal position={[-1, 0.5, 0]} color="#FFD700" />
            <BreakableCrystal position={[1, 0.5, 0]} color="#FFD700" />
            <BreakableCrystal position={[0, 0.5, -1]} color="#FFD700" />
            <BreakableCrystal position={[0, 0.5, 1]} color="#FFD700" />

            {/* Healing potions */}
            <BreakablePotionBottle position={[-1, 0.4, -1]} color="#00ff00" />
            <BreakablePotionBottle position={[1, 0.4, -1]} color="#00ff00" />
            <BreakablePotionBottle position={[-1, 0.4, 1]} color="#00ff00" />
            <BreakablePotionBottle position={[1, 0.4, 1]} color="#00ff00" />

            {/* White candles */}
            <BreakableCandle position={[-1, 0.4, 0]} />
            <BreakableCandle position={[1, 0.4, 0]} />
          </>
        );

      case "secret":
        return (
          <>
            {/* Hidden treasures */}
            <BreakableChest position={[0, 0, 0]} />
            <BreakableBarrel position={[-1.5, 0, 0]} />
            <BreakableBarrel position={[1.5, 0, 0]} />

            {/* Fixed mysterious crystals */}
            <BreakableCrystal position={[-1, 0.2, -1]} color="#00ffff" />
            <BreakableCrystal position={[1, 0.2, -1]} color="#ff00ff" />
            <BreakableCrystal position={[-1, 0.2, 1]} color="#ffff00" />
            <BreakableCrystal position={[1, 0.2, 1]} color="#00ffff" />
            <BreakableCrystal position={[0, 0.2, -1.5]} color="#ff00ff" />
            <BreakableCrystal position={[0, 0.2, 1.5]} color="#ffff00" />

            {/* Dim lighting */}
            <BreakableCandle position={[-2, 0.4, -2]} />
            <BreakableCandle position={[2, 0.4, 2]} />
          </>
        );

      case "boss":
        return (
          <>
            {/* Boss arena */}
            <BreakableTable position={[0, 0, 0]} />

            {/* Boss throne/altar */}
            <mesh position={[0, 0.5, 0]} castShadow>
              <boxGeometry args={[1, 1, 0.5]} />
              <meshStandardMaterial color="#8B0000" />
            </mesh>

            {/* Boss crystals */}
            <BreakableCrystal position={[-1.5, 0.5, 0]} color="#ff0000" />
            <BreakableCrystal position={[1.5, 0.5, 0]} color="#ff0000" />
            <BreakableCrystal position={[0, 0.5, -1.5]} color="#ff0000" />
            <BreakableCrystal position={[0, 0.5, 1.5]} color="#ff0000" />

            {/* Skulls and bones */}
            <BreakableSkull position={[-1, 0.2, -1]} />
            <BreakableSkull position={[1, 0.2, -1]} />
            <BreakableSkull position={[-1, 0.2, 1]} />
            <BreakableSkull position={[1, 0.2, 1]} />

            {/* Red candles */}
            <BreakableCandle position={[-2, 0.4, -2]} />
            <BreakableCandle position={[2, 0.4, -2]} />
            <BreakableCandle position={[-2, 0.4, 2]} />
            <BreakableCandle position={[2, 0.4, 2]} />
          </>
        );

      case "trap":
        return (
          <>
            {/* Trap mechanisms */}
            <mesh position={[0, 0.1, 0]} castShadow>
              <boxGeometry args={[2, 0.2, 2]} />
              <meshStandardMaterial color="#2F4F4F" />
            </mesh>

            {/* Pressure plates */}
            <mesh position={[-0.5, 0.15, -0.5]} castShadow>
              <boxGeometry args={[0.3, 0.1, 0.3]} />
              <meshStandardMaterial color="#C0C0C0" />
            </mesh>
            <mesh position={[0.5, 0.15, 0.5]} castShadow>
              <boxGeometry args={[0.3, 0.1, 0.3]} />
              <meshStandardMaterial color="#C0C0C0" />
            </mesh>

            {/* Trap spikes */}
            <mesh position={[-1, 0.3, 0]} castShadow>
              <coneGeometry args={[0.1, 0.4, 6]} />
              <meshStandardMaterial color="#8B0000" />
            </mesh>
            <mesh position={[1, 0.3, 0]} castShadow>
              <coneGeometry args={[0.1, 0.4, 6]} />
              <meshStandardMaterial color="#8B0000" />
            </mesh>
            <mesh position={[0, 0.3, -1]} castShadow>
              <coneGeometry args={[0.1, 0.4, 6]} />
              <meshStandardMaterial color="#8B0000" />
            </mesh>
            <mesh position={[0, 0.3, 1]} castShadow>
              <coneGeometry args={[0.1, 0.4, 6]} />
              <meshStandardMaterial color="#8B0000" />
            </mesh>

            {/* Warning candles */}
            <BreakableCandle position={[-1.5, 0.4, -1.5]} />
            <BreakableCandle position={[1.5, 0.4, 1.5]} />
          </>
        );

      default:
        return (
          <>
            {/* Basic elements for unknown room types */}
            <BreakableTorch
              position={[-halfSize + margin, 0, -halfSize + margin]}
            />
            <BreakableTorch
              position={[halfSize - margin, 0, halfSize - margin]}
            />

            <BreakableBarrel position={[-1, 0, -1]} />
            <BreakableChest position={[1, 0, 1]} />
          </>
        );
    }
  };

  return <>{getRoomElements()}</>;
};

export default RoomDecorator;
