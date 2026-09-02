# Gem Dungeon

A first-person dungeon run built on React Three Fiber, Rapier and Zustand,
packaged for the desktop with Electron.

Each run is a fresh dungeon. Find gems - one in most rooms, more for solving
a puzzle - and hand three of them over at the exit. Traps cost lives, the
shop sells them back, and losing the last one ends the run. Either way you
get a summary and a new dungeon.

**[ARCHITECTURE.md](ARCHITECTURE.md)** explains how the code is laid out and
the rule it follows. **[STEAM_DEMO_PLAN.md](STEAM_DEMO_PLAN.md)** is the
history: what was wrong, what was done about it, and what still stands
between here and a Steam demo.

## Controls

| Input | Action |
| --- | --- |
| `W A S D` / arrows, or left stick | Move |
| Hold right mouse button, or right stick | Look |
| `E`, or `A` on a pad | Use what you are standing at: a door, the shop counter, a lectern, an idol |
| `Shift` | Run |
| `Esc`, or Start on a pad | Pause |

There is one interaction verb. Anything you can act on tells you so when
you are close enough, and E does it.

## Rooms

Ten kinds, of which the five special ones appear at most once per run:

- **Start**, **Exit** and plain **Chambers**.
- **Vault** - more loot to look at, one gem to take.
- **Trap room** - a ring of spikes between the door and the gem.
- **Shop** - a life for a gem.
- **Library** - a tome that shows you numbers and asks for them back.
- **Memory chamber** - crystals glow in an order; choose them in the same order.
- **Challenge room** - an idol on a plate. Weigh the plate down before you lift it.
- **Arena** - an open floor with cover at the edges.

## Run it

```bash
yarn install
yarn dev            # http://localhost:5173
```

```bash
yarn build          # dist/, what Cloudflare Pages and Electron ship
yarn typecheck      # must be clean; there is no error budget
yarn lint
yarn test:smoke     # drives the real game in a browser (see below)
yarn electron-dev   # the desktop shell against the dev server
yarn electron-dist  # a packaged desktop build in dist-electron/
yarn generate-icon  # redraw build/icon.png
```

## The editor

In a development build, `http://localhost:5173/?editor` opens the authoring
tools. They write into the same registries the game reads, so nothing made
in them can fail to reach a run:

- **Rooms** - lay out a room on a grid, see it in the real room shell, and
  mark it live. The generator then places it whenever it needs a room of that
  kind. Export the JSON to ship it.
- **Props** - inspect one of the fifteen props: footprint, solidity, rotation.
- **Surfaces** - paint a 128x128 tile and save it under a surface id. Every
  floor and wall using that surface changes at once, in a running game too.
- **Mosaic** - a 16x16 grid of coloured shapes, saved as a surface.

The editor is behind `import.meta.env.DEV` and a dynamic import; a
production build does not contain it.

## Testing

`yarn test:smoke` starts a browser against a dev server on port 5199 and
plays: menu, start, stand on the floor, explore by pressing E, collect gems,
walk to the exit's neighbour, be refused without the toll and admitted with
it, win, restart, die. It fails on any uncaught page error.

```bash
yarn dev --port 5199   # one terminal
yarn test:smoke        # another
```

It needs a Chromium binary; set `CHROMIUM_PATH` if it is not at the
Playwright default.

## Desktop packaging

Electron Builder produces `dist-electron/`. The entry point is CommonJS
(`electron/main.cjs`) because `package.json` sets `"type": "module"`. The
Linux AppImage is verified to launch and run with no network; Windows and
macOS targets need their own hosts.

## Cloudflare Pages

- Pages project name: `threejs-gem-dungeon-editor-git`
- GitHub repository: `BorisThoris/threejs-gem-dungeon-editor-live`
- Production branch: `main`
- Root directory: `.`
- Build command: `npm run build`
- Build output directory: `dist`
- Environment variable: `NODE_VERSION=22.16.0`
- Public URL target: `https://threejs-gem-dungeon-editor-git.pages.dev/`

Do not enable Cloudflare Access for the demo deployment. Leave frame-blocking
headers unset so the portfolio can iframe the public build.
