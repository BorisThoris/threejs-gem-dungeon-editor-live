# Component Reference Guide

## Main Application Components

### App.tsx
**Purpose**: Main application router and entry point
**Key Features**:
- URL parameter routing for different modes
- Theme provider integration
- Environment detection (Electron vs Web)

**URL Parameters**:
- `?editor=true` → ThreeDEditor
- `?room-builder=true` → RoomBuilderPage
- `?texture-painter=true` → TexturePainterLauncher
- `?mosaic-creator=true` → MosaicCreatorLauncher
- `?texture-painter-example=true` → TexturePainterExample

### StartScreen.tsx
**Purpose**: Main menu and navigation hub
**Features**:
- Mode selection buttons
- Game information display
- Navigation to different tools

## 3D Editor Components

### ThreeDEditor.tsx
**Purpose**: Main 3D scene editor
**Features**:
- 3D scene management
- Object manipulation
- Camera controls
- Tool integration
- Action cards system
- URL parameter persistence

## Game Components

### FirstPersonPlayer.tsx
**Purpose**: First-person player controller
**Features**:
- WASD movement
- Mouse look
- Collision detection
- Physics integration

### Room.tsx
**Purpose**: Room rendering and management
**Features**:
- Room geometry generation
- Wall rendering
- Door placement
- Lighting setup

### GameUI.tsx
**Purpose**: Game interface overlay
**Features**:
- Health display
- Inventory management
- Action buttons
- Status indicators

## Breakable Object System

### BreakableMesh.tsx
**Purpose**: Base breakable object component
**Features**:
- Destructible geometry
- Breaking animations
- Physics integration
- State management

### BreakableDestructibleWall.tsx
**Purpose**: Breakable wall implementation
**Features**:
- Wall destruction
- Debris generation
- Sound effects
- Visual feedback

### BreakableDoor.tsx
**Purpose**: Interactive door system
**Features**:
- Door opening/closing
- Key requirements
- Animation system
- State persistence

### BreakableItemSprite.tsx
**Purpose**: Collectible item sprites
**Features**:
- Item rendering
- Collection detection
- Inventory integration
- Visual effects

## Puzzle System

### PuzzleRouter.tsx
**Purpose**: Puzzle system management
**Features**:
- Puzzle type routing
- State management
- Progress tracking
- Completion handling

### MemoryPuzzle.tsx
**Purpose**: Memory card matching puzzle
**Features**:
- Card grid generation
- Match detection
- Timer system
- Score tracking

### NumberPuzzle.tsx
**Purpose**: Mathematical number puzzle
**Features**:
- Number grid
- Calculation logic
- Input validation
- Solution checking

### SequencePuzzle.tsx
**Purpose**: Pattern sequence puzzle
**Features**:
- Sequence generation
- Pattern recognition
- Input handling
- Progress tracking

## Room Building System

### RoomBuilder.tsx
**Purpose**: Room construction interface
**Features**:
- Room type selection
- Layout tools
- Object placement
- Preview system

### RoomManager.tsx
**Purpose**: Room state management
**Features**:
- Room loading
- State persistence
- Connection management
- Validation

### BiomeCategorySelector.tsx
**Purpose**: Biome category selection
**Features**:
- Category filtering
- Biome selection
- Weight configuration
- Visual preview

### BiomeWallRenderer.tsx
**Purpose**: Biome-specific wall rendering
**Features**:
- Dynamic wall generation
- Material application
- Texture mapping
- Lighting setup

## Texture and Art Tools

### TexturePainter.tsx
**Purpose**: Advanced texture painting tool
**Features**:
- Layer system
- Brush tools
- Filter effects
- Export functionality

### TexturePainterLauncher.tsx
**Purpose**: Texture painter launcher
**Features**:
- Tool initialization
- Canvas setup
- UI integration
- File management

### MosaicCreatorLauncher.tsx
**Purpose**: Mosaic creation tool launcher
**Features**:
- Grid setup
- Color palette
- Shape tools
- Export options

### ProgrammaticTextureGenerator.tsx
**Purpose**: Procedural texture generation
**Features**:
- Algorithm-based generation
- Parameter control
- Real-time preview
- Export functionality

## UI Components

### MainMenu.tsx
**Purpose**: Main navigation menu
**Features**:
- Mode selection
- Settings access
- Help system
- Exit options

### PauseMenu.tsx
**Purpose**: Game pause interface
**Features**:
- Resume functionality
- Settings access
- Save/load options
- Quit confirmation

### OverlayUI.tsx
**Purpose**: Game overlay interface
**Features**:
- HUD elements
- Status displays
- Quick actions
- Notifications

### GameUI.tsx
**Purpose**: Main game interface
**Features**:
- Health bar
- Inventory display
- Action buttons
- Progress indicators

## Utility Components

### Cursor.tsx
**Purpose**: Custom cursor management
**Features**:
- Cursor states
- Visual feedback
- Interaction hints
- Animation system

### VisualEffects.tsx
**Purpose**: Visual effect system
**Features**:
- Particle effects
- Screen transitions
- UI animations
- Feedback effects

### InteractionManager.tsx
**Purpose**: Input and interaction handling
**Features**:
- Event management
- Input processing
- State coordination
- Feedback system

## Primitive Components

### Elements Directory (`src/components/primitives/elements/`)
**Purpose**: Basic 3D building blocks

#### Structural Elements
- **Wall.tsx** - Basic wall component
- **Floor.tsx** - Floor tile component
- **Ceiling.tsx** - Ceiling component
- **Door.tsx** - Door component
- **Pillar.tsx** - Support pillar

#### Decorative Elements
- **Torch.tsx** - Lighting element
- **Brazier.tsx** - Fire source
- **Chain.tsx** - Decorative chain
- **Spikes.tsx** - Hazard element
- **Web.tsx** - Environmental decoration

#### Building Elements
- **Brick.tsx** - Brick wall
- **Stone.tsx** - Stone wall
- **Concrete.tsx** - Concrete element
- **Glass.tsx** - Glass element
- **MetalBar.tsx** - Metal barrier

#### Specialized Elements
- **DungeonAltar.tsx** - Altar component
- **DungeonCell.tsx** - Prison cell
- **DungeonCorridor.tsx** - Corridor
- **DungeonGate.tsx** - Gate
- **DungeonThrone.tsx** - Throne

### Game Rooms Directory (`src/components/primitives/game-rooms/`)
**Purpose**: Complete room implementations

#### Room Types
- **TreasureRoom.tsx** - Treasure collection room
- **PuzzleRoom.tsx** - Puzzle challenge room
- **CombatRoom.tsx** - Combat encounter room
- **BossRoom.tsx** - Boss battle room
- **SecretRoom.tsx** - Hidden room

#### Specialized Rooms
- **LibraryRoom.tsx** - Knowledge room
- **ShopRoom.tsx** - Trading room
- **ArenaRoom.tsx** - Combat arena
- **PortalRoom.tsx** - Teleportation room
- **TrapRoom.tsx** - Hazard room

### Objects Directory (`src/components/primitives/objects/`)
**Purpose**: Interactive objects and items

#### Interactive Objects
- **Chest.tsx** - Treasure chest
- **Barrel.tsx** - Destructible barrel
- **Crate.tsx** - Storage crate
- **Switch.tsx** - Toggle switch
- **Lever.tsx** - Control lever

#### Collectible Items
- **Coin.tsx** - Currency item
- **Gem.tsx** - Valuable gem
- **Key.tsx** - Door key
- **Potion.tsx** - Health potion
- **Scroll.tsx** - Magic scroll

## Context Providers

### BreakingContext.tsx
**Purpose**: Breakable object state management
**Features**:
- Breaking state
- Animation coordination
- Sound effects
- Visual feedback

### WallToggleContext.tsx
**Purpose**: Wall visibility management
**Features**:
- Wall toggling
- State persistence
- UI integration
- Performance optimization

### ThemeContext.tsx
**Purpose**: Theme management system
**Features**:
- Theme switching
- Color schemes
- UI consistency
- User preferences

## Hooks

### Custom Hooks Directory (`src/hooks/`)
**Purpose**: Reusable stateful logic

#### Game Hooks
- **useGameState.ts** - Game state management
- **usePlayer.ts** - Player state and actions
- **useInventory.ts** - Inventory management
- **useRoom.ts** - Room state management

#### UI Hooks
- **useUI.ts** - UI state management
- **useModal.ts** - Modal dialog management
- **useTooltip.ts** - Tooltip system
- **useAnimation.ts** - Animation control

#### Utility Hooks
- **useLocalStorage.ts** - Local storage management
- **useDebounce.ts** - Debounced values
- **useThrottle.ts** - Throttled functions
- **useEventListener.ts** - Event listener management

## Component Patterns

### Higher-Order Components
- **withOptionalBreaking.tsx** - Adds breaking functionality
- **withPhysics.tsx** - Adds physics integration
- **withAnimation.tsx** - Adds animation support

### Render Props
- **RoomRenderer.tsx** - Room rendering logic
- **ObjectRenderer.tsx** - Object rendering logic
- **EffectRenderer.tsx** - Effect rendering logic

### Compound Components
- **RoomElements.tsx** - Room element composition
- **PuzzleGrid.tsx** - Puzzle grid composition
- **TexturePalette.tsx** - Texture selection composition

## Best Practices

### Component Design
1. **Single Responsibility** - Each component has one clear purpose
2. **Composition over Inheritance** - Use composition patterns
3. **Props Interface** - Define clear TypeScript interfaces
4. **Default Props** - Provide sensible defaults
5. **Error Boundaries** - Handle component errors gracefully

### Performance Optimization
1. **Memoization** - Use React.memo for expensive components
2. **Callback Optimization** - Use useCallback for event handlers
3. **State Optimization** - Minimize unnecessary re-renders
4. **Lazy Loading** - Load components on demand
5. **Code Splitting** - Split large components

### State Management
1. **Local State** - Use useState for component-specific state
2. **Shared State** - Use Zustand for global state
3. **Derived State** - Compute state from props when possible
4. **State Normalization** - Keep state flat and normalized
5. **Immutable Updates** - Always update state immutably

### TypeScript Integration
1. **Strict Types** - Use strict TypeScript configuration
2. **Interface Definitions** - Define clear component interfaces
3. **Generic Components** - Use generics for reusable components
4. **Type Guards** - Use type guards for runtime type checking
5. **Documentation** - Document complex type relationships
