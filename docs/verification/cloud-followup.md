# Cloud verification follow-up · 28 September 2026

Continuation branch: `codex/gem-dungeon-direction`. This record follows
`docs/CLOUD_HANDOFF.md`; it does not replace the Windows transfer snapshot.
The cloud source used Node 24, Yarn 1.22.22 and Playwright Chromium headless
shell 1187 with software rendering.

## Changes

- The crowded desktop HUD's ambient divider uses 6 px spacing. Its live
  1280×800 fixture measured 460×423 px, inside the 465×425 budget, with
  threat/toll/resource order and guidance clearance intact.
- Caption display time now grows with word count, to at most 12 seconds.
  Short cues retain their 2.6-second minimum. The existing focus behavior
  still keeps a readable caption until the reader leaves it.
- The readout check stages a fresh Keeper notice and waits for actual
  overflow before testing reading focus. Earlier cloud runs had allowed
  that notice to expire before the focus step.
- The Sentry pause probe samples before resume, with a 0.05-radian
  tolerance. The cloud rerun observed zero rotation in six paused seconds,
  kept the player in the beam, and saw rotation resume afterward.

## Evidence

TypeScript and lint passed after these edits. The 1,008-check layout suite
passed in the cloud before the UI-only edits. Production web passed rendering,
movement, pause, malformed-save recovery and stripping development surfaces.
The full browser pass through audio succeeded. Focused checks passed the
real-input three-floor walk, Harrier windup, touch shove, Cutpurse loot,
key-drop input, full-count geometry, vault/plate decisions, death review,
satchel/relic/pledge planning, creature rendering, barricades, pursuit,
ambient behavior, carried signals, exploration, ecology, architecture,
scenario matrix, the 18-case dark/raised-lantern gallery, overlays, tome,
keyboard/input boundaries, focus pause, controls, restart, item feedback
and Iron Knot. The trap-contact check passed on a direct rerun after a
first-run timeout at the opened-pit Warden contact. The readout check passed
twice on focused reruns.

The 78-room performance sweep measured at worst 79 draw calls, 8,254
triangles, 88 geometries and 11 textures; repeated room laps retained no
new geometry, and the sprint retained 0.00 MB after collection. Its
frame-throughput assertion failed on this cloud software renderer: 46
frames in 11.1 seconds against a >120-frame threshold. The integration
smoke run completed with an arena walk-speed assertion at 0.73 m/s on that
renderer and one pause-probe failure caused by sampling after resume.
The corrected pause probe passed in a subsequent smoke run, which was
interrupted by the cloud execution handle before its terminal result.
Do not mark either complete smoke or performance as passed.

The Linux directory package contained the expected executable, asar,
assets and no source maps or authoring tools. Its window-launch check could
not run here: this isolated runner denies the Unix sockets required by Xvfb.
The Windows directory package passed on its own host in the transfer record.
No installer, signing, Steam upload, macOS or Linux runtime validation is
claimed. `verify:systems` was not run in this cloud continuation.

## Next pass

Use a suitable graphics/X display environment for the throughput and
Linux package gates. Keep the failed measurements visible; do not lower the
game's thresholds to make software rendering appear fast. Re-run the
complete smoke suite to a terminal result, then continue play-oriented
development from the inhabited dungeon direction. No PR or deployment was
made, and main was not changed.
