# API Reference Guide

## State Management APIs

### GameStore API (`src/store/gameStore.ts`)

#### State Interface
```typescript
interface GameState {
  playerStats: PlayerStats;
  inventory: Item[];
  isPreviewing: boolean;
  previewTime: number;
  maxPreviewTime: number;
  enemies: Enemy[];
  currentRoomId: string | null;
  discoveredSecrets: string[];
  completedRooms: string[];
  currentFloor: number;
  totalScore: number;
  gamePhase: 'exploration' | 'puzzle' | 'boss';
}
```

#### Player Stats Interface
```typescript
interface PlayerStats {
  lives: number;
  maxLives: number;
  level: number;
  experience: number;
  points: number;
  keys: number;
  bombs: number;
  streak: number;
  maxStreak: number;
  currentFloor: number;
  roomsCompleted: number;
  size: number;
  speed: number;
  strength: number;
  defense: number;
  luck: number;
  dimensions: PlayerDimensions;
  buffs: {
    speedBoost: number;
    strengthBoost: number;
    defenseBoost: number;
    luckBoost: number;
  };
}
```

#### Actions
```typescript
// Player stats
updateStats: (stats: Partial<PlayerStats>) => void;
addExperience: (amount: number) => void;
addPoints: (amount: number) => void;
loseLife: () => void;
gainLife: () => void;

// Character upgrades
upgradeSize: (amount: number) => void;
upgradeSpeed: (amount: number) => void;
upgradeStrength: (amount: number) => void;
upgradeDefense: (amount: number) => void;
upgradeLuck: (amount: number) => void;

// Inventory
addItem: (item: Item) => void;
removeItem: (itemId: string) => void;
useItem: (itemId: string) => boolean;
getItem: (itemId: string) => Item | undefined;

// Game mechanics
startPreview: () => boolean;
stopPreview: () => void;

// Combat system
spawnEnemy: (enemy: Enemy) => void;
removeEnemy: (enemyId: string) => void;
damageEnemy: (enemyId: string, damage: number) => void;

// Room system
enterRoom: (roomId: string) => void;
completeRoom: (roomId: string) => void;
discoverSecret: (secretId: string) => void;

// Progression
advanceFloor: () => void;
addScore: (points: number) => void;
setGamePhase: (phase: GameState['gamePhase']) => void;
resetGame: () => void;
```

### MapStore API (`src/store/mapStore.ts`)

#### State Interface
```typescript
interface MapState {
  currentMap: GameMap | null;
  currentRoomId: string | null;
  visitedRooms: Set<string>;
  isGenerating: boolean;
  error: string | null;
}
```

#### Actions
```typescript
generateMap: (config?: Partial<MapConfig>, enabledBiomeCategories?: string[]) => void;
setCurrentRoom: (roomId: string) => void;
markRoomVisited: (roomId: string) => void;
clearMap: () => void;
setError: (error: string | null) => void;
```

## Map Generation API

### SimpleMapGenerator (`src/algorithms/simpleMapGenerator.ts`)

#### Configuration Interface
```typescript
interface SimpleMapConfig extends MapConfig {
  useShapedRooms: boolean;
  usePortals: boolean;
  shapeChance: number;
  portalChance: number;
  useLiminalSpaces?: boolean;
  corridorChance?: number;
  useMultiTileRooms?: boolean;
  multiTileChance?: number;
  multiTileMaxSegments?: number;
  roomTypeWeights?: Record<string, number>;
  hubChance?: number;
  corridorRunChance?: number;
  culDeSacChance?: number;
  useThemes?: boolean;
  enabledBiomeCategories?: string[];
}
```

#### Methods
```typescript
class SimpleMapGenerator {
  constructor(config: Partial<SimpleMapConfig> = {});
  generateMap(): { rooms: Room[]; startRoomId: string; endRoomId: string };
}
```

#### Default Configuration
```typescript
const defaultSimpleConfig: SimpleMapConfig = {
  width: 20,
  height: 20,
  roomSize: 10,
  minRooms: 8,
  maxRooms: 20,
  specialRoomChance: 0.6,
  connectionChance: 0.4,
  useShapedRooms: true,
  usePortals: true,
  shapeChance: 0.3,
  portalChance: 0.1,
  useLiminalSpaces: true,
  corridorChance: 0.5,
  useMultiTileRooms: true,
  multiTileChance: 0.35,
  multiTileMaxSegments: 4,
  // ... room type weights
};
```

## Type System APIs

### Room Interface (`src/types/map.ts`)

```typescript
interface Room {
  id: string;
  position: Position;
  type: string;
  connections: string[];
  size: number;
  isVisited: boolean;
  isCurrent: boolean;
  items?: Item[];
  specialProperties?: Record<string, unknown>;
  entryPoints?: EntryPoint[];
  shape?: 'square' | 'circle' | 'triangle' | 'hexagon' | 'octagon' | 'diamond' | 'star' | 'cross' | 'spiral';
  width?: number;
  height?: number;
  rotation?: number;
  isPortal?: boolean;
  portalDestination?: string;
  isMultiTile?: boolean;
  tilePositions?: Position[];
  theme?: string;
  difficulty?: number;
  level?: number;
  isLocked?: boolean;
  requiredItem?: string;
  timeLimit?: number;
  maxOccupants?: number;
  ambientSound?: string;
  lighting?: 'bright' | 'dim' | 'dark' | 'mystical' | 'neon' | 'fire' | 'candle';
  temperature?: 'hot' | 'warm' | 'neutral' | 'cool' | 'cold' | 'freezing';
  humidity?: 'dry' | 'normal' | 'humid' | 'wet';
  airQuality?: 'fresh' | 'stale' | 'toxic' | 'magical' | 'ethereal';
  biomeId?: string;
  useBiomeWalls?: boolean;
  biomeScale?: [number, number, number];
}
```

### Entry Point Interface
```typescript
interface EntryPoint {
  id: string;
  direction: EntryDirection;
  position: Position;
  connectedTo?: string;
  type?: 'door' | 'corridor' | 'portal';
  isActive?: boolean;
}
```

### Item Interface
```typescript
interface Item {
  id: string;
  name: string;
  description: string;
  type: 'consumable' | 'passive' | 'active' | 'trinket';
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  cost: number;
  effects: ItemEffect[];
  icon: string;
  maxUses?: number;
  currentUses?: number;
  floorRequirement?: number;
  roomTypeRequirement?: string[];
}
```

### Puzzle Interface
```typescript
interface Puzzle {
  id: string;
  type: 'memory-pairs' | 'sequence' | 'pattern' | 'color' | 'number';
  difficulty: number;
  tiles: PuzzleTile[];
  gridSize: number;
  completed: boolean;
  timeLimit?: number;
}
```

## Biome System APIs

### Biome Categories (`src/types/biomeCategories.ts`)

#### Biome Category Interface
```typescript
interface BiomeCategory {
  id: string;
  name: string;
  description: string;
  biomes: string[];
  weight: number;
  color: string;
  icon: string;
}
```

#### Available Categories
```typescript
const BIOME_CATEGORIES: BiomeCategory[] = [
  {
    id: "buff",
    name: "Buff & Healing",
    biomes: ["coffee", "meditation", "gym", "bench-press", "garden", "bedroom", "kitchen", "sanctuary", "shrine"],
    weight: 0.25,
    color: "#4CAF50",
    icon: "💪"
  },
  {
    id: "resource",
    name: "Resource & Economy",
    biomes: ["shop", "treasure", "library", "library-upgrade", "workshop", "laboratory", "vault", "treasury", "armory", "forge"],
    weight: 0.2,
    color: "#FF9800",
    icon: "💰"
  },
  // ... more categories
];
```

#### Helper Functions
```typescript
getAllBiomes(): string[];
getBiomesByCategory(categoryId: string): string[];
getCategoryForBiome(biomeId: string): BiomeCategory | null;
getWeightedBiomes(enabledCategories: string[] = []): Array<{ biome: string; weight: number }>;
```

### Biome Walls (`src/types/biomeWalls.ts`)

#### Wall Definition Interface
```typescript
interface WallDefinition {
  position: [number, number, number];
  size: [number, number, number];
  rotation: [number, number, number];
  material: string;
  texture?: string;
  color?: string;
  opacity?: number;
  hasDoor?: boolean;
  doorWidth?: number;
  doorPosition?: [number, number, number];
  isBreakable?: boolean;
  breakingOptions?: Record<string, unknown>;
}
```

#### Biome Wall Config Interface
```typescript
interface BiomeWallConfig {
  id: string;
  name: string;
  description: string;
  walls: WallDefinition[];
  floor?: {
    position: [number, number, number];
    size: [number, number, number];
    material: string;
    texture?: string;
    color?: string;
  };
  ceiling?: {
    position: [number, number, number];
    size: [number, number, number];
    material: string;
    texture?: string;
    color?: string;
  };
  decorations?: Array<{
    type: string;
    position: [number, number, number];
    size: [number, number, number];
    rotation?: [number, number, number];
    material: string;
    color?: string;
  }>;
  entryPoints?: Array<{
    direction: 'north' | 'south' | 'east' | 'west';
    position: [number, number, number];
    width: number;
    height: number;
  }>;
  lighting?: {
    type: 'ambient' | 'directional' | 'point' | 'spot';
    position?: [number, number, number];
    intensity: number;
    color?: string;
  };
}
```

#### Helper Functions
```typescript
getBiomeWallConfig(biomeId: string): BiomeWallConfig | null;
getAllBiomeWallConfigs(): BiomeWallConfig[];
hasBiomeWallConfig(biomeId: string): boolean;
```

## Prototype System APIs

### Base Prototype (`src/types/PrototypeSystem.ts`)

#### Base Prototype Interface
```typescript
interface BasePrototype {
  id: string;
  type: string;
  position: [number, number, number];
  rotation: number;
  scale: number;
  color: string;
  texture?: string;
  actions?: Action[];
  properties: Record<string, unknown>;
  metadata: Record<string, unknown>;
}
```

#### Action Interface
```typescript
interface Action {
  id: string;
  name: string;
  description: string;
  icon: string;
  execute: (target: BasePrototype, context?: unknown) => void;
  canExecute?: (target: BasePrototype, context?: unknown) => boolean;
}
```

#### Prototype Manager Interface
```typescript
interface PrototypeManager {
  registerPrototype(prototype: BasePrototype): void;
  getPrototype(id: string): BasePrototype | undefined;
  getAllPrototypes(): BasePrototype[];
  addAction(prototypeId: string, action: Action): void;
  removeAction(prototypeId: string, actionId: string): void;
  setTexture(prototypeId: string, texture: TextureData): void;
  updateProperty(prototypeId: string, key: string, value: unknown): void;
  executeAction(prototypeId: string, actionId: string, context?: unknown): void;
}
```

#### Base Prototype Class
```typescript
class BasePrototypeClass implements BasePrototype {
  constructor(config: Partial<BasePrototype> = {});
  addAction(action: Action): void;
  removeAction(actionId: string): void;
  setTexture(texture: TextureData): void;
  updateProperty(key: string, value: unknown): void;
  executeAction(actionId: string, context?: unknown): boolean;
  clone(): BasePrototypeClass;
  serialize(): string;
  static deserialize(data: string): BasePrototypeClass;
}
```

#### Grid Cell Prototype
```typescript
class GridCellPrototype extends BasePrototypeClass {
  shape: 'square' | 'circle' | 'triangle' | 'diamond' | 'hexagon';
  size: number;
  constructor(config: Partial<BasePrototype & { shape: string; size: number }> = {});
}
```

## Texture System APIs

### Texture Definitions (`src/data/textureDefinitions.json`)

#### Texture Data Structure
```typescript
interface TextureDefinition {
  id: string;
  name: string;
  category: string;
  description: string;
  width: number;
  height: number;
  pixels: string[]; // Array of hex color codes
}
```

#### Available Categories
- **Natural**: wood, grass, water
- **Building**: brick, cobblestone
- **Pixel Art**: pixel_checkerboard, pixel_brick
- **Patterns**: diamond_pattern

## Utility APIs

### Entry Point Generator (`src/utils/entryPointGenerator.ts`)

```typescript
generateEntryPoints(roomId: string, roomType: string, shape: string, size: number): EntryPoint[];
getOppositeDirection(direction: EntryDirection): EntryDirection;
getDirectionBetweenRooms(room1: Room, room2: Room): EntryDirection;
findAvailableEntryPoint(room: Room, direction: EntryDirection): EntryPoint | null;
connectEntryPoints(entry1: EntryPoint, entry2: EntryPoint): void;
```

### Room Connectivity Validator (`src/utils/roomConnectivityValidator.ts`)

```typescript
ensureRoomConnectivity(map: GameMap): GameMap;
analyzeConnectivity(rooms: Room[]): {
  isConnected: boolean;
  isolatedRooms: string[];
  connectionCount: number;
  averageConnections: number;
};
```

### Player Room Detection (`src/utils/playerRoomDetection.ts`)

```typescript
interface PlayerRoomDetection {
  initializeRoomBounds(rooms: Room[]): void;
  detectCurrentRoom(playerPosition: Position): string | null;
  getRoomBounds(roomId: string): Bounds | null;
}
```

## Component APIs

### Breakable Objects

#### BreakableMesh Props
```typescript
interface BreakableMeshProps {
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  breakingOptions?: BreakingOptions;
  onBreak?: () => void;
  onRepair?: () => void;
}
```

#### Breaking Options
```typescript
interface BreakingOptions {
  health: number;
  maxHealth: number;
  isBreakable: boolean;
  breakingThreshold: number;
  repairCost: number;
  debrisCount: number;
  soundEffect?: string;
  visualEffect?: string;
}
```

### Puzzle Components

#### Puzzle Props
```typescript
interface PuzzleProps {
  puzzle: Puzzle;
  onComplete: (puzzleId: string) => void;
  onFail?: (puzzleId: string) => void;
  onProgress?: (progress: number) => void;
  timeLimit?: number;
  difficulty?: number;
}
```

#### Memory Puzzle Props
```typescript
interface MemoryPuzzleProps extends PuzzleProps {
  gridSize: number;
  cardCount: number;
  matchPairs: number;
  flipDuration: number;
  matchDelay: number;
}
```

### Room Components

#### Room Props
```typescript
interface RoomProps {
  room: Room;
  playerPosition: Position;
  onEnter?: (roomId: string) => void;
  onExit?: (roomId: string) => void;
  onItemCollect?: (item: Item) => void;
  onPuzzleComplete?: (puzzleId: string) => void;
}
```

#### Biome Wall Renderer Props
```typescript
interface BiomeWallRendererProps {
  biomeId: string;
  scale?: [number, number, number];
  position?: [number, number, number];
  rotation?: [number, number, number];
  onWallBreak?: (wallId: string) => void;
  onDoorOpen?: (doorId: string) => void;
}
```

## Event System APIs

### Game Events
```typescript
interface GameEvents {
  'room:enter': { roomId: string; playerPosition: Position };
  'room:exit': { roomId: string; playerPosition: Position };
  'item:collect': { item: Item; playerPosition: Position };
  'puzzle:start': { puzzleId: string; puzzleType: string };
  'puzzle:complete': { puzzleId: string; score: number; time: number };
  'puzzle:fail': { puzzleId: string; reason: string };
  'object:break': { objectId: string; position: Position };
  'object:repair': { objectId: string; position: Position };
  'enemy:spawn': { enemyId: string; position: Position; type: string };
  'enemy:defeat': { enemyId: string; score: number; drops: Item[] };
  'player:levelup': { newLevel: number; stats: PlayerStats };
  'player:death': { position: Position; cause: string };
}
```

### Event Emitter
```typescript
interface EventEmitter {
  on<K extends keyof GameEvents>(event: K, listener: (data: GameEvents[K]) => void): void;
  off<K extends keyof GameEvents>(event: K, listener: (data: GameEvents[K]) => void): void;
  emit<K extends keyof GameEvents>(event: K, data: GameEvents[K]): void;
  once<K extends keyof GameEvents>(event: K, listener: (data: GameEvents[K]) => void): void;
}
```

## Performance APIs

### Optimization Utilities
```typescript
interface PerformanceUtils {
  // Memory management
  disposeTexture(texture: THREE.Texture): void;
  disposeGeometry(geometry: THREE.BufferGeometry): void;
  disposeMaterial(material: THREE.Material): void;
  
  // Rendering optimization
  setLODLevel(object: THREE.Object3D, level: number): void;
  enableFrustumCulling(object: THREE.Object3D, enabled: boolean): void;
  setRenderDistance(object: THREE.Object3D, distance: number): void;
  
  // State management
  batchStateUpdates(updates: StateUpdate[]): void;
  debounceStateUpdate(update: StateUpdate, delay: number): void;
  throttleStateUpdate(update: StateUpdate, interval: number): void;
}
```

### Profiling APIs
```typescript
interface ProfilingUtils {
  startProfile(name: string): void;
  endProfile(name: string): number;
  getMemoryUsage(): MemoryInfo;
  getFrameRate(): number;
  getRenderTime(): number;
  getUpdateTime(): number;
}
```

## Error Handling APIs

### Error Types
```typescript
interface GameError extends Error {
  code: string;
  context?: Record<string, unknown>;
  recoverable: boolean;
  timestamp: number;
}

interface ValidationError extends GameError {
  field: string;
  value: unknown;
  expected: unknown;
}

interface NetworkError extends GameError {
  status: number;
  url: string;
  retryable: boolean;
}
```

### Error Handler
```typescript
interface ErrorHandler {
  handleError(error: GameError): void;
  handleValidationError(error: ValidationError): void;
  handleNetworkError(error: NetworkError): void;
  reportError(error: GameError): void;
  recoverFromError(error: GameError): boolean;
}
```

## Configuration APIs

### Game Configuration
```typescript
interface GameConfig {
  graphics: {
    resolution: [number, number];
    quality: 'low' | 'medium' | 'high' | 'ultra';
    shadows: boolean;
    antialiasing: boolean;
    postProcessing: boolean;
  };
  audio: {
    masterVolume: number;
    musicVolume: number;
    sfxVolume: number;
    voiceVolume: number;
  };
  controls: {
    sensitivity: number;
    invertY: boolean;
    keyBindings: Record<string, string>;
  };
  gameplay: {
    difficulty: 'easy' | 'normal' | 'hard' | 'expert';
    autoSave: boolean;
    saveInterval: number;
    maxSaveSlots: number;
  };
}
```

### Configuration Manager
```typescript
interface ConfigManager {
  getConfig(): GameConfig;
  updateConfig(updates: Partial<GameConfig>): void;
  resetConfig(): void;
  saveConfig(): void;
  loadConfig(): void;
  validateConfig(config: GameConfig): ValidationResult;
}
```
