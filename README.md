# ThreeJS Gem Dungeon Editor

**ThreeJS Gem** is a React Three Fiber / Three.js first-person dungeon crawler
packaged with Electron, plus the editor and authoring tools used to build it.

There is a playable run: explore a procedurally generated dungeon, find one gem
per room, spend them on the locked door to the end room, avoid the traps, and
either make it out or lose your last life trying. Either way you get a summary
and can start again on a fresh dungeon.

**See [STEAM_DEMO_PLAN.md](STEAM_DEMO_PLAN.md)** for what was broken, what was
fixed, how it was verified, and what still stands between here and a Steam
demo.

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

## Controls

| Input | Action |
| --- | --- |
| `WASD` / arrows, or left stick | Move |
| Right-click and hold, or right stick | Look |
| Walk into a doorway | Travel to the next room |
| Walk into a gem | Collect it |
| `Shift` / `L3` | Sprint |
| `Esc` or `X` | Pause |
| `M` | Mute |

## Main Modes

The game is the default route.

The editor and authoring tools below are **development only**. They are gated
behind `import.meta.env.DEV`, so a production build cannot reach them by URL and
their code is tree-shaken out of the bundle entirely.

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
- `src/components/RunManager.tsx` - decides when a run is won or lost.
- `src/components/RoomDetection.tsx` - which room the player is standing in.
- `src/components/GameHUD.tsx` - lives, gems and current room.
- `src/configs/runRules.ts` - gem cost, starting lives, damage cooldown.
- `src/configs/mapGeneration.ts` - which room types the demo generates.
- `src/store/consolidatedGameStore.ts` - the game state store.
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
yarn typecheck      # report type errors
yarn check-types    # fail if the error count went UP (see scripts/typecheck-baseline.json)
yarn generate-icon  # redraw build/icon.png
yarn electron
yarn electron-dev
yarn electron-pack
yarn electron-dist
yarn generate-assets
yarn generate-textures
```

## Testing

`scripts/smoke-test.mjs` drives the real game in a browser - start, explore,
collect, die, restart - and fails on any uncaught page error. Every serious bug
fixed on this project was invisible to both the type checker and the build, so
this is the cheapest guard against them returning.

```bash
yarn dev --port 5199        # one terminal
node scripts/smoke-test.mjs # another
```

It needs `playwright-core` and a Chromium binary, which are deliberately not
project dependencies - run it before shipping a build, not on every commit.

## Desktop Packaging

Electron Builder is configured with `ThreeJS Gem Game` as the desktop product
name and `dist-electron` as the output directory. The entry point is CommonJS
(`electron/main.cjs`) because `package.json` sets `"type": "module"`.

```bash
yarn electron-dist
```

The Linux AppImage is verified to launch and to run with no network at all.
Windows and macOS targets need their own hosts and have not been built.

## Status

Active. The game has a working core loop and a desktop build that launches;
nothing Steam-side (appid, store page, capsule art, Steamworks integration)
exists yet, and it has not been playtested by a human.
See [STEAM_DEMO_PLAN.md](STEAM_DEMO_PLAN.md).

The repository contains both runtime game code and editor/tooling experiments,
so it is intentionally broad - but the tools no longer ship in the player build.

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
