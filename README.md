# Gem Dungeon

A first-person dungeon run built on React Three Fiber, Rapier and Zustand,
packaged for the desktop with Electron.

Three floors down. Each floor is a fresh dungeon holding about eight gems,
and the door out charges a toll that rises as you descend: three, then five,
then seven. Whatever you are still carrying when you climb out is what you
got away with.

The catch is that every gem you take wakes the thing that walks the floor.
The Warden cannot be fought and cannot be blocked - it drifts through
barrels and pillars - but it is slower than you are, so the question is
never whether you can escape it. It is whether one more room is worth
having it between you and the door.

Gems also buy relics at the shop, which change a run's rules: a lantern
that shows you where the Warden is, boots that make you quicker, a charm
that eats a hit, a ledger that makes every exit cheaper. Every gem spent
there is a gem you do not carry out.

The arena is the one room that fights back. Its gem sits on a plinth in the
middle, and lifting it bars the doors and sets three arms of spikes turning
across the whole floor. There is no corner to wait in: the only safe ground
is the moving gap between two arms, and holding it means walking a circle
for fourteen seconds. The inner line is a stroll; the outer wall needs a
dash to keep up. The Warden does not stop for any of this.

From the second floor down, some plain rooms have a watcher on a post,
turning a beam slowly around the room. It never takes a life. Being held in
its light rouses the floor and tells the Warden where you are, which is
worse, and which you pay for later. The Warden makes you leave a floor; the
Sentry makes you time your crossing of a room.

One room on every floor is locked, and its iron key lies in another. The
generator will only put the lock on a room the floor can be walked without,
and never on the way to the exit, so a vault is a detour worth taking
rather than a wall across the run - you can always leave without it, and
you will always wonder what was in it.

Chests hold potions and scrolls, and which look means which item is
shuffled at the start of every run. A cloudy potion is a different thing
each game, and the only way to learn is to drink one. Most of them help;
two of them wake the floor. You carry four at a time and use them with the
number keys, which means the real question is whether now - with something
walking towards you - is the moment to find out what you picked up.

Every dungeon is a seed, and the summary shows it. A run worth telling
someone about is a run they can walk themselves, and the one you just lost
is usually the one you want another go at, so the summary offers the same
dungeon again and the main menu takes a seed you type in. What a machine
remembers between runs is a best haul, a deepest floor, a fastest escape
and a count of how runs ended - a record, not a progression system.

**[ARCHITECTURE.md](ARCHITECTURE.md)** explains how the code is laid out and
the rule it follows. **[STEAM_DEMO_PLAN.md](STEAM_DEMO_PLAN.md)** is the
history: what was wrong, what was done about it, and what still stands
between here and a Steam demo.

## Controls

| Input | Action |
| --- | --- |
| `W A S D` / arrows, or left stick | Move |
| Mouse (click the game to take it, Esc gives it back), or right stick | Look |
| `E`, or `A` on a pad | Use what you are standing at: a door, a chest, the shop counter, a lectern, an idol |
| `1` to `4`, or X and Y on a pad | Drink or read that satchel slot |
| `Shift`, or L3 | Run. The Warden is slower than you are. |
| `Esc`, or Start on a pad | Pause, and the two settings: head bob and sound |

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

## Keeping the frame time steady

Three things were found to allocate on a timer, which is what an
intermittent stutter usually is, and all three are fixed. Rapier's
interpolation snapshotted a position and rotation object for every body on
every physics step, and a fixed timestep runs several steps on a late frame,
so the frames that were already slow allocated the most - interpolation is
off, and nothing here needs it. A room's fifteen props were fifteen rigid
bodies that never move; they are one static body now. Every noise-based
sound effect built and filled its own buffer, so the Warden knocking on a
wall was a synchronous stall every few seconds; there is one shared buffer.
Surface textures are cached per tiling rather than cloned and disposed on
every walk through a doorway.

If you are chasing a new one, measure allocation rather than frame time -
frame time on a software renderer tells you nothing:

```js
// In the console, with a run going.
const h = () => performance.memory.usedJSHeapSize;
let a = h(); setTimeout(() => console.log((h() - a) / 1024, "KB/s"), 1000);
```

## Testing

`yarn test:smoke` starts a browser against a dev server on port 5199 and
plays: menu, start, stand on the floor, explore by pressing E, collect gems,
walk to the exit's neighbour, be refused without the toll and admitted with
it, descend a floor, win from the last one, restart, die, then check the
economy and the Warden - the toll rising per floor, a relic changing a rule,
a charm eating a hit, the Warden walking into the room. It fails on any
uncaught page error.

`yarn test:layout` needs no browser: it checks the room geometry over every
room size and 500 seeds - anchors clear of the door lanes and of each other,
spikes in every trap room, the gem reachable, the generator connected.

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
