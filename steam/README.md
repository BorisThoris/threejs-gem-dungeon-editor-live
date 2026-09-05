# Shipping to Steam

Everything here is the mechanical side of a Steam release. It cannot be run
until the Steamworks side exists: an app ID, three depot IDs, and a partner
account with upload rights. Replace every `REPLACE_*` in the `.vdf` files
first.

## 1. What to upload

| Platform | Build command | Upload from | Launch executable |
| --- | --- | --- | --- |
| Linux (incl. Steam Deck) | `yarn build && npx electron-builder --linux dir` | `dist-electron/linux-unpacked/` | `gem-dungeon` |
| Windows | `yarn build && npx electron-builder --win dir` | `dist-electron/win-unpacked/` | `Gem Dungeon.exe` |
| macOS | `yarn build && npx electron-builder --mac dir` | `dist-electron/mac/Gem Dungeon.app` | `Gem Dungeon.app` |

Use the `dir` target, not the installer: Steam is the installer. Windows
and macOS builds must be made on their own hosts (the Windows installer
needs Wine or Windows; macOS needs Xcode's tooling for signing and
notarising). The unsigned macOS zip and the Windows zip do build on Linux
and are enough for internal testing.

## 2. Uploading

Install [steamcmd](https://developer.valvesoftware.com/wiki/SteamCMD), then
from this directory:

```
steamcmd +login <partner-account> +run_app_build "$(pwd)/app_build.vdf" +quit
```

`app_build.vdf` names the three depots; each `depot_*.vdf` says which
folder to upload. The build lands on the `internal` branch. Promote it to
`default` in the Steamworks build page once it has been tested.

## 3. Launch options (Steamworks > Installation > General)

| # | OS | Executable | Arguments |
| --- | --- | --- | --- |
| 0 | Linux | `gem-dungeon` | |
| 1 | Windows | `Gem Dungeon.exe` | |
| 2 | macOS | `Gem Dungeon.app` | |

The game starts fullscreen when packaged. `--windowed` forces a window;
F11 toggles at any time. On Steam Deck (`SteamDeck=1` in the environment)
it is always fullscreen.

## 4. Steam Deck

- Input: the game reads the standard gamepad mapping (left stick move,
  right stick look, A use, Start pause, L3 run, X and Y for the first two
  satchel slots). Set the Steam Input template to **Gamepad** so the Deck
  presents itself as one.
- Menus take the pad too: d-pad or left stick moves the focus, A presses
  it, B backs out. That was not true until it was checked - every menu was
  a column of `<button onClick>` and nothing in the UI read the pad, so a
  Deck player could not press Start on the title screen. `yarn test:pad
  --desktop` plays the packaged Linux build with a synthetic pad and is
  what holds it: menu focus, both sticks, A, B and Start.
- Still wants a keyboard: typing a seed on the title screen and answering
  the library's tome, both of which take digits. Steam's on-screen keyboard
  covers them; neither is on the path through a run.
- Text scales with the viewport and was checked at 1280x800.
- Pointer lock is not needed on Deck; the right stick looks. The "click
  the game to look around" hint is only shown when no pointer is held and
  disappears once the stick is used or the trackpad clicks.
- Suspend/resume: nothing is time-based except the damage cooldown and
  puzzle timers, which use wall-clock time and tolerate a suspend.

## 5. Achievements

The game has ten deeds and reports them to the shell the first time each
is earned. `src/game/deeds/catalog.ts` is the list, and every entry
carries the Steam API name it maps to - written down there rather than
derived from the game's own id, because the two live in different places
and renaming one must not silently rename the other.

Create these ten in **Steamworks > Stats & Achievements**, with these
exact API names:

| API name | Display name | What it is for |
| --- | --- | --- |
| `ESCAPE` | Out | Climb out of the dungeon with anything at all |
| `HAUL_FIFTEEN` | Worth the Walk | Get out with fifteen gems or more |
| `WARDEN_ROUTED` | It Bleeds | Rout the Warden on the floor's own spikes |
| `SNARE_SPRUNG` | Wire Work | Catch the Warden in a snare you set yourself |
| `THIEF_CAUGHT` | Not Today | Catch the Cutpurse with your gem still on it |
| `NEST_EMPTIED` | Reclaimed | Walk to the nest and take back what was stolen |
| `BAR_BROKEN` | Shut Out | Bar a doorway and have the Warden come through it |
| `FLOOR_UNLIT` | Dark Runner | Take a whole floor without raising the lantern |
| `NO_LIVES_LOST` | Unspent | Escape without losing a single life |
| `ALL_DELVERS` | All Five | Escape the dungeon as every delver |

Each also wants a 64x64 icon, earned and unearned.

### Wiring it up

There is exactly one place to change. `electron/preload.cjs` exposes
`window.desktop.achievement(name)`, which currently only logs when
`GEM_DUNGEON_LOG_ACHIEVEMENTS` is set. Put the real client inside it:

```
yarn add steamworks.js
```

```js
// electron/preload.cjs, at the top
let steam = null;
try {
  steam = require("steamworks.js").init(REPLACE_APP_ID);
} catch {
  // Not launched through Steam, or the module is missing. The game runs.
}

function reportAchievement(name) {
  try {
    if (typeof name !== "string" || !name) return;
    steam?.achievement.activate(name);
  } catch {}
}
```

Two things that are load-bearing and easy to lose:

- **It must never throw.** The game wraps the call as well, so a broken
  binding costs an achievement rather than a run. Keep both guards.
- **`steamworks.js` is a native module** and has to be unpacked from the
  asar. Add `"asarUnpack": ["**/*.node"]` to the `build` block in
  `package.json`, or the packaged app will fail to load it and every
  achievement will silently do nothing on exactly the builds that matter.

Nothing else in the game knows achievements exist: `src/game/deeds/watch.ts`
is the only thing that earns one, and `src/game/state/deeds.ts` the only
thing that reports it.

## 6. Store page checklist

- Capsule art: header 460x215, small 231x87, main 616x353, vertical
  374x448, library 600x900 and 3840x1240 hero. Nothing exists yet.
- Five screenshots at 1920x1080 (the `scripts/` tour can capture these
  from the dev server; use a real GPU, not the CI's software renderer).
- A 30-60 s trailer.
- Short description, about-this-game copy, system requirements (any GPU
  with WebGL 2; 4 GB RAM; 300 MB disk).
- Demo apps on Steam are separate app IDs attached to the main app.
