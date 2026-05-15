# Assets Directory

This directory contains all the assets used in the Three.js application, organized by type.

## Directory Structure

```
assets/
├── textures/          # Texture definitions and generated textures
│   ├── textureDefinitions.json  # Main texture definitions file
│   └── *.json         # Individual texture definition files
├── models/            # 3D model definitions and files
│   ├── index.ts       # Model definitions and utilities
│   └── *.gltf         # 3D model files (when added)
├── materials/         # Material definitions
│   ├── index.ts       # Material definitions and utilities
│   └── *.json         # Individual material files
├── sounds/            # Audio assets
│   ├── index.ts       # Sound definitions and utilities
│   └── *.wav, *.mp3   # Audio files (when added)
└── index.ts           # Main assets index file
```

## Texture System

The texture system uses procedurally generated textures based on the application's theme colors. Textures are defined in `textures/textureDefinitions.json` and can be:

- **Generated dynamically** using theme colors
- **Loaded from assets** for better performance
- **Categorized** by type (Natural, Building, Pixel Art, etc.)

### Texture Categories

- **Natural**: Wood, grass, water, ice, snow, etc.
- **Building**: Brick, concrete, metal, glass, etc.
- **Pixel Art**: 8x8 pixel art textures for retro styling
- **Materials**: Fabric, leather, canvas, etc.
- **Tech**: Circuit boards, holograms, energy fields
- **Effects**: Fire, smoke, magic, void

## 3D Models

3D models are defined in `models/index.ts` with metadata including:
- Model ID and name
- Category and description
- File format (GLTF, GLB, OBJ, FBX)
- Size and vertex count
- Associated textures and materials

## Materials

Materials are defined in `materials/index.ts` with properties like:
- Material type (Standard, PBR, Toon, Unlit)
- Color, metalness, roughness
- Emissive properties
- Texture maps (normal, AO, displacement)

## Sounds

Audio assets are defined in `sounds/index.ts` with properties like:
- Sound ID and name
- Category and description
- File format (MP3, WAV, OGG)
- Volume and loop settings

## Usage

Import assets using the main index file:

```typescript
import { loadTextureDefinitions, getAssetUrl, ASSET_CATEGORIES } from '../assets';

// Load textures
const textures = await loadTextureDefinitions();

// Get asset URL
const textureUrl = getAssetUrl('TEXTURES', 'wood.json');
const modelUrl = getAssetUrl('MODELS', 'cube.gltf');
```

## Adding New Assets

1. **Textures**: Add to `src/utils/generateThemeTextures.ts` and run the generation script
2. **Models**: Add to `models/index.ts` and place files in `models/` directory
3. **Materials**: Add to `materials/index.ts` and create JSON files
4. **Sounds**: Add to `sounds/index.ts` and place audio files in `sounds/` directory

## Generation Script

Run the asset generation script to update texture definitions:

```bash
npm run generate-assets
```

This will:
- Generate all texture definitions
- Create individual texture files
- Update the main texture definitions file
- Provide statistics about generated assets
