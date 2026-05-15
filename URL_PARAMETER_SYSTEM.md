# URL Parameter System for 3D Editor

This document describes the enhanced URL parameter system that allows the 3D editor to maintain state across page refreshes and browser navigation.

## Overview

The 3D editor now uses URL parameters to persist:
- Selected asset type and category
- Camera position
- Component properties
- UI state (panels, search, collapsed groups)
- Active tabs and subcategories

## URL Parameters

### Core Editor Parameters
- `editor=true` - Opens the 3D editor
- `type` - Selected asset type (e.g., "start", "coffee-biome")
- `category` - Asset category ("rooms", "biomes", "objects", "elements")
- `tab` - Active tab ("demo", "game")

### Camera State
- `cameraX` - Camera X position
- `cameraY` - Camera Y position  
- `cameraZ` - Camera Z position

### UI State
- `showPropsEditor` - Props editor panel visibility
- `showRoomInfo` - Room info panel visibility
- `showActionCards` - Action cards visibility
- `searchQuery` - Search input value
- `collapsedGroups` - JSON array of collapsed group names

### Component Properties
- `props` - JSON string of current component properties
- `componentProps` - JSON string of component-specific properties
- `objectProps` - JSON string of object-specific properties
- `elementProps` - JSON string of element-specific properties

### Selection State
- `componentType` - Selected component type
- `objectType` - Selected object type
- `elementType` - Selected element type
- `subcategory` - Selected subcategory filter

## Usage Examples

### Basic Editor Access
```
?editor=true
```

### Editor with Specific Asset
```
?editor=true&type=coffee-biome&category=biomes&tab=game
```

### Editor with Camera Position
```
?editor=true&type=start&cameraX=15&cameraY=20&cameraZ=25
```

### Editor with Custom Properties
```
?editor=true&type=start&props={"size":10,"color":"red"}
```

### Editor with UI State
```
?editor=true&type=start&showPropsEditor=true&searchQuery=coffee
```

## Implementation Details

### Custom Hook: `useURLParams`

The system uses a custom React hook that provides:
- `urlParams` - Current URL parameters object
- `updateURL(updates, replace)` - Update URL parameters
- `getParam(key)` - Get specific parameter value
- `setParam(key, value)` - Set specific parameter
- `clearParam(key)` - Clear specific parameter
- `clearAllParams()` - Clear all parameters

### Helper Functions

- `parseCameraPosition(x, y, z)` - Parse camera position from URL
- `serializeCameraPosition(position)` - Serialize camera position to URL
- `parseBoolean(value)` - Parse boolean from URL string
- `parseJSON(value, defaultValue)` - Parse JSON from URL string
- `serializeJSON(value)` - Serialize value to JSON string

### Components Updated

1. **ThreeDEditor.tsx** - Enhanced with comprehensive URL parameter support
2. **AutoThreeDEditor.tsx** - Updated to use URL parameters for navigation
3. **App.tsx** - Added URL parameter test route
4. **PauseMenu.tsx** - Added URL parameter test button

## Testing

A test component is available at `?url-test=true` that demonstrates:
- URL parameter setting and reading
- Camera position serialization
- JSON property serialization
- Boolean value handling
- Parameter persistence across refreshes

## Benefits

1. **State Persistence** - Editor state survives page refreshes
2. **Shareable URLs** - Users can share specific editor configurations
3. **Browser Navigation** - Back/forward buttons work correctly
4. **Deep Linking** - Direct access to specific assets and configurations
5. **Development** - Easier debugging and testing of specific states

## Browser Compatibility

The system uses modern web APIs:
- `URLSearchParams` for parameter parsing
- `window.history` for URL updates
- `JSON.stringify/parse` for serialization

All modern browsers (Chrome, Firefox, Safari, Edge) are supported.
