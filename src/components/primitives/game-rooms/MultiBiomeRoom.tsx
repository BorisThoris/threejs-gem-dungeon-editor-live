import React from "react";
import { RigidBody } from "@react-three/rapier";
import useGameStore from "../../../store/gameStore";
import { getBiomeScale } from "../../../utils/biomeScaling";

// Define BiomePlacement interface locally to avoid import issues
interface BiomePlacement {
  type: string;
  position: [number, number, number];
  rotation?: [number, number, number];
  size?: number;
  props?: any;
}

// Import all biome components
import CoffeeBiome from "./CoffeeBiome";
import MeditationBiome from "./MeditationBiome";
import LibraryBiome from "./LibraryBiome";
import ShopBiome from "./ShopBiome";
import TreasureBiome from "./TreasureBiome";
import PuzzleBiome from "./PuzzleBiome";
import BossBiome from "./BossBiome";
import ArenaBiome from "./ArenaBiome";
import EndBiome from "./EndBiome";
import PortalBiome from "./PortalBiome";
import SpecialBiome from "./SpecialBiome";
import ChallengeBiome from "./ChallengeBiome";
import LibraryUpgradeBiome from "./LibraryUpgradeBiome";
import TrapBiome from "./TrapBiome";
import CryptBiome from "./CryptBiome";
import GymBiome from "./GymBiome";
import GardenBiome from "./GardenBiome";
import KitchenBiome from "./KitchenBiome";
import BedroomBiome from "./BedroomBiome";
import LaboratoryBiome from "./LaboratoryBiome";
import ObservatoryBiome from "./ObservatoryBiome";
import WorkshopBiome from "./WorkshopBiome";
import ArchBiome from "./ArchBiome";
import PillarBiome from "./PillarBiome";
import BarrierBiome from "./BarrierBiome";
import MazeBiome from "./MazeBiome";
import BridgeBiome from "./BridgeBiome";
import StatueBiome from "./StatueBiome";
import MemoryGamePuzzleBiome from "./MemoryGamePuzzleBiome";
import PressurePlatePuzzleBiome from "./PressurePlatePuzzleBiome";

// Biome component mapping
const BIOME_COMPONENTS = {
  coffee: CoffeeBiome,
  meditation: MeditationBiome,
  library: LibraryBiome,
  shop: ShopBiome,
  treasure: TreasureBiome,
  puzzle: PuzzleBiome,
  boss: BossBiome,
  arena: ArenaBiome,
  end: EndBiome,
  portal: PortalBiome,
  special: SpecialBiome,
  challenge: ChallengeBiome,
  "library-upgrade": LibraryUpgradeBiome,
  trap: TrapBiome,
  crypt: CryptBiome,
  gym: GymBiome,
  "bench-press": GymBiome,
  garden: GardenBiome,
  kitchen: KitchenBiome,
  bedroom: BedroomBiome,
  laboratory: LaboratoryBiome,
  observatory: ObservatoryBiome,
  workshop: WorkshopBiome,
  arch: ArchBiome,
  pillar: PillarBiome,
  barrier: BarrierBiome,
  maze: MazeBiome,
  bridge: BridgeBiome,
  statue: StatueBiome,
  "memory-puzzle": MemoryGamePuzzleBiome,
  "pressure-plate-puzzle": PressurePlatePuzzleBiome,
};

export interface MultiBiomeRoomProps {
  roomSize?: number;
  biomes: BiomePlacement[];
  onRoomComplete?: () => void;
}

const MultiBiomeRoom: React.FC<MultiBiomeRoomProps> = ({
  roomSize = 20,
  biomes = [],
  onRoomComplete,
}) => {
  const playerDimensions = useGameStore(
    (state) => state.playerStats.dimensions
  );
  const scale = getBiomeScale(playerDimensions);

  return (
    <group>
      {/* Room Floor */}
      <RigidBody type="fixed" position={[0, -0.5, 0]}>
        <mesh receiveShadow>
          <boxGeometry args={[roomSize, 1, roomSize]} />
          <meshStandardMaterial color="#4a4a4a" />
        </mesh>
      </RigidBody>

      {/* Room Walls */}
      <RigidBody type="fixed" position={[0, 2, roomSize / 2]}>
        <mesh castShadow>
          <boxGeometry args={[roomSize, 4, 0.5]} />
          <meshStandardMaterial color="#8B4513" />
        </mesh>
      </RigidBody>
      <RigidBody type="fixed" position={[0, 2, -roomSize / 2]}>
        <mesh castShadow>
          <boxGeometry args={[roomSize, 4, 0.5]} />
          <meshStandardMaterial color="#8B4513" />
        </mesh>
      </RigidBody>
      <RigidBody type="fixed" position={[roomSize / 2, 2, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.5, 4, roomSize]} />
          <meshStandardMaterial color="#8B4513" />
        </mesh>
      </RigidBody>
      <RigidBody type="fixed" position={[-roomSize / 2, 2, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.5, 4, roomSize]} />
          <meshStandardMaterial color="#8B4513" />
        </mesh>
      </RigidBody>

      {/* Room Ceiling */}
      <RigidBody type="fixed" position={[0, 4.5, 0]}>
        <mesh castShadow>
          <boxGeometry args={[roomSize, 0.5, roomSize]} />
          <meshStandardMaterial color="#654321" />
        </mesh>
      </RigidBody>

      {/* Placed Biomes */}
      {biomes.map((biome, index) => {
        const BiomeComponent =
          BIOME_COMPONENTS[biome.type as keyof typeof BIOME_COMPONENTS];

        if (!BiomeComponent) {
          console.warn(`Unknown biome type: ${biome.type}`);
          return null;
        }

        return (
          <group
            key={`biome-${index}`}
            position={biome.position}
            rotation={biome.rotation || [0, 0, 0]}
          >
            <BiomeComponent size={biome.size || 10} {...(biome.props || {})} />
          </group>
        );
      })}

      {/* Room Title */}
      <mesh position={[0, 5, 0]}>
        <boxGeometry args={[0.1, 0.1, 0.1]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
    </group>
  );
};

export default MultiBiomeRoom;
