# ThreeJS Gem Dungeon Editor

**ThreeJS Gem** is a React Three Fiber / Three.js first-person dungeon exploration and editor project packaged with Electron. It combines a playable 3D dungeon prototype with room generation, puzzle interactions, breakable objects, texture tooling, mosaic creation, and editor-style utility modes.

This repository is a portfolio-ready 3D application project rather than a small Three.js demo. It shows modern React, TypeScript, Three.js rendering, physics integration, state management, procedural room/content systems, asset tooling, and desktop packaging.

## What It Demonstrates

- React 19 application structure with TypeScript and Vite.
- Three.js rendering through `@react-three/fiber` and `@react-three/drei`.
- Physics integration through `@react-three/rapier`.
- First-person movement, camera control, cursor handling, minimap, pause UI, and HUD overlays.
- Room/biome system with generated dungeon spaces, doors, transitions, puzzles, and interactive objects.
- Breakable/destructible object components and reusable primitive room elements.
- Zustand stores for game, map, room, door progression, and initialization state.
- Texture generation, preset texture libraries, texture painting, and mosaic creation tools.
- URL-parameter driven modes for editor, room builder, texture painter, mosaic creator, and debug screens.
- Electron desktop shell and installer configuration.

## Tech Stack

- React 19
- TypeScript
- Three.js
- React Three Fiber
- Drei
- Rapier physics
- Zustand
- Vite
- Electron / Electron Builder
- ESLint

## Main Modes

- Main game: default route.
- 3D editor: `?editor=true`
- Room builder: `?room-builder=true`
- Texture painter: `?texture-painter=true`
- Mosaic creator: `?mosaic-creator=true`
- Texture painter example: `?texture-painter-example=true`
- URL/debug screens: `?url-test=true`, `?url-debug=true`
- Hand demo: `?hand-demo=true`

## Main Code Areas

- `src/App.tsx` - mode routing based on URL parameters.
- `src/components/StartScreen.tsx` - primary game canvas, physics world, player, room manager, minimap, HUD, and pause flow.
- `src/components/ThreeDEditor.tsx` - editor surface.
- `src/pages/RoomBuilderPage.tsx` - room builder workflow.
- `src/components/TexturePainter.tsx` and related launchers - texture authoring tools.
- `src/components/primitives/` - reusable 3D elements, objects, demo rooms, and game-room biomes.
- `src/store/` - Zustand state stores.
- `src/utils/` - room, texture, camera, event, connectivity, and generation helpers.
- `electron/` - desktop app shell.

## Run Locally

```bash
yarn install
yarn dev
```

Useful scripts:

```bash
yarn build
yarn lint
yarn electron
yarn electron-dev
yarn electron-pack
yarn electron-dist
yarn generate-assets
yarn generate-textures
```

## Desktop Packaging

The project is configured for Electron Builder with `ThreeJS Gem Game` as the desktop product name and `dist-electron` as the package output directory.

## Status

Archived/active portfolio project. The repository contains both runtime game code and editor/tooling experiments, so it is intentionally broad. The current README focuses on the project identity and implementation surface for GitHub/LinkedIn presentation.

## Cloudflare Pages

- Pages project name: `threejs-gem-dungeon-editor-git`
- GitHub repository: `BorisThoris/threejs-gem-dungeon-editor-live`
- Production branch: `main`
- Root directory: `.`
- Build command: `npm run build`
- Build output directory: `dist`
- Environment variable: `NODE_VERSION=22.16.0`
- Public URL target: `https://threejs-gem-dungeon-editor-git.pages.dev/`

Do not enable Cloudflare Access for the demo deployment. Leave frame-blocking headers unset so the portfolio can iframe the public build.
