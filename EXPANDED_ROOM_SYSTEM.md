# Expanded Room System

## Overview

The room system has been expanded to support varying room sizes and more complex shapes while maintaining proper door placement and connectivity.

## New Features

### 1. Variable Room Sizes

Rooms can now have different sizes while maintaining the minimum size as the current standard:

- **Minimum Size**: Same as current room size (configurable via `minRoomSizeMultiplier`)
- **Maximum Size**: Up to 2x larger by default (configurable via `maxRoomSizeMultiplier`)
- **Size Variation Chance**: 40% chance for rooms to have variable size (configurable via `sizeVariationChance`)
- **Size Properties**: 
  - `minSize`: Minimum size multiplier
  - `maxSize`: Maximum size multiplier  
  - `actualSize`: Computed actual size for the room

### 2. New Room Shapes

Added support for more complex room shapes:

- **L Shape**: L-shaped rooms with entry points at arm ends
- **T Shape**: T-shaped rooms with entry points at each end
- **U Shape**: U-shaped rooms with entry points at open ends
- **C Shape**: C-shaped rooms with entry points at the open side
- **H Shape**: H-shaped rooms with entry points at vertical line ends
- **Plus Shape**: Plus-shaped rooms with entry points at each arm
- **Line Shape**: Linear rooms with entry points at ends
- **Block Shape**: 2x2 block rooms with entry points on all sides

### 3. Enhanced Door Placement

Door placement has been updated to work with:

- **Variable Room Sizes**: Doors are positioned based on actual room size
- **Complex Shapes**: Entry points are intelligently placed based on room shape
- **Multi-tile Rooms**: Each tile can have appropriate door placement
- **Backward Compatibility**: Existing door placement logic still works

## Configuration

### Map Generator Configuration

```typescript
interface SimpleMapConfig {
  // Room size variations
  useVariableRoomSizes?: boolean;           // Enable size variations
  minRoomSizeMultiplier?: number;          // Minimum size multiplier (default: 1.0)
  maxRoomSizeMultiplier?: number;          // Maximum size multiplier (default: 2.0)
  sizeVariationChance?: number;            // Chance for size variation (default: 0.4)
  
  // Multi-tile rooms
  useMultiTileRooms?: boolean;             // Enable multi-tile rooms
  multiTileChance?: number;                // Chance for multi-tile (default: 0.35)
  multiTileMaxSegments?: number;           // Max segments (default: 4)
}
```

### Default Configuration

```typescript
const defaultSimpleConfig: SimpleMapConfig = {
  // ... existing config
  useVariableRoomSizes: true,
  minRoomSizeMultiplier: 1.0,    // Same as current size
  maxRoomSizeMultiplier: 2.0,    // Up to 2x larger
  sizeVariationChance: 0.4,      // 40% chance for size variation
  useMultiTileRooms: true,
  multiTileChance: 0.35,
  multiTileMaxSegments: 4,
};
```

## Room Properties

### Enhanced Room Interface

```typescript
interface Room {
  // ... existing properties
  size: number;                    // Backward compatibility
  minSize?: number;               // Minimum size multiplier
  maxSize?: number;               // Maximum size multiplier
  actualSize?: number;            // Actual computed size
  shape?: 'square' | 'circle' | 'triangle' | 'hexagon' | 'octagon' | 
         'diamond' | 'star' | 'cross' | 'spiral' | 'L' | 'T' | 
         'U' | 'C' | 'H' | 'plus' | 'line' | 'block';
  // ... other properties
}
```

## Entry Point Generation

Entry points are automatically generated based on room shape:

- **Square/Circle**: 4 cardinal directions
- **L Shape**: Entry points at arm ends
- **T Shape**: Entry points at each end
- **U Shape**: Entry points at open ends
- **C Shape**: Entry points at open side
- **H Shape**: Entry points at vertical line ends
- **Plus Shape**: Entry points at each arm
- **Line Shape**: Entry points at ends
- **Block Shape**: Entry points on all sides

## Door Positioning

Door positioning automatically adapts to:

1. **Room Size**: Uses `actualSize` if available, falls back to `size`
2. **Room Shape**: Entry points are placed appropriately for each shape
3. **Multi-tile Rooms**: Each tile gets appropriate door placement
4. **Relative Positioning**: Doors are placed based on target room direction

## Usage Examples

### Basic Room Generation

```typescript
const generator = new SimpleMapGenerator({
  useVariableRoomSizes: true,
  minRoomSizeMultiplier: 1.0,
  maxRoomSizeMultiplier: 2.5,
  sizeVariationChance: 0.6,
  useMultiTileRooms: true,
  multiTileChance: 0.5
});

const map = generator.generateMap();
```

### Custom Room Sizes

```typescript
// Create a room with specific size
const room: Room = {
  id: 'custom_room',
  position: { x: 0, z: 0 },
  type: 'normal',
  connections: [],
  size: 10,                    // Base size
  actualSize: 15,              // Actual size (1.5x larger)
  minSize: 1.0,
  maxSize: 2.0,
  shape: 'L',
  // ... other properties
};
```

### Door Position Calculation

```typescript
import { calculateDoorPosition } from './utils/doorUtils';

const doorPos = calculateDoorPosition(
  currentRoom,    // Source room
  targetRoom,    // Target room
  roomSize       // Optional: specific size override
);
```

## Benefits

1. **Visual Variety**: Rooms now have different sizes and shapes
2. **Better Layout**: Complex shapes allow for more interesting room layouts
3. **Proper Connectivity**: Doors are always placed appropriately
4. **Backward Compatibility**: Existing rooms continue to work
5. **Configurable**: All features can be enabled/disabled via configuration
6. **Scalable**: Easy to add new shapes and size variations

## Migration Notes

- Existing rooms will continue to work without changes
- New properties are optional and have sensible defaults
- Door positioning automatically adapts to new room properties
- Entry point generation handles all shape types
- Configuration is backward compatible

## Future Enhancements

Potential future improvements:

1. **Custom Shape Definitions**: Allow custom room shape patterns
2. **Size-based Room Types**: Different room types for different sizes
3. **Dynamic Door Placement**: More sophisticated door positioning algorithms
4. **Room Templates**: Predefined room layouts with specific shapes and sizes
5. **Procedural Shapes**: Algorithmically generated room shapes
