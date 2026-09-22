# Block lighting

Gameplay uses a nearest-filtered light texture over one-metre floor cells, updated
at 10 Hz. Very large rooms increase cell size to cap the grid at 128 × 128.
Light floods cardinal neighbours within its reach; concave room walls and ring
cores block propagation. One boundary cell lights the wall face. Height is stepped
in metre bands. This is stylised lighting: furniture does not cast shadows and
light can spill around a corner along the walkable floor.

Existing point-light objects are animated source handles, moved to reserved layer
31 during gameplay so they add no GPU point-light loops or shadow passes. The
camera must leave layer 31 disabled. Standard/physical materials sample one shared
texture; emissive materials remain visible. Existing material shader hooks are
composed. The editor retains its conventional preview lighting.

40% of seeded normal and treasure rooms are unlit, including rooms furnished from
templates. Start, exit, shops and trials retain their fixtures. Unlit chambers have no automatic
braziers or passage lamps, almost no ambient fill, and no invisible overhead lamp.
The lantern follows its existing five bands, colour modifiers, and oil rules;
lowering it or exhausting oil produces zero light. Small ecological glows and
treasure glints are landmarks, not room-wide substitutes for the lantern.

## Creature and environment memos

- Glow beetles: retain their tiny amber abdomen and short local spill; hiding
  extinguishes the spill. Do not brighten the whole insect or its habitat.
- Rats and bats: consider paired, small eye highlights that appear only when
  facing nearby lantern light. They should reflect light, not emit a room light.
- Warden / sentry: preserve the readable eye tell in darkness. A future alert
  colour must correspond to an actual behaviour state; avoid a permanent halo.
- Wisp / wickling / kiln newt: distinguish luminous bodies, an exposed wick,
  and warm cracks. Give only true emitters a short-range field source.
- Shardbacks: keep plates mostly dark until the existing warning; use local
  emission to communicate that warning without washing out the chamber.
- Torches, braziers and hanging lamps: warm islands of light, with restrained
  flicker. Keep enough dark distance between islands to make carrying light useful.
- Future extinguishable fixtures: drive the source intensity, visible flame,
  and gameplay firelight cure from the same state. Never leave an invisible light.
- Future authoring: expose explicit lit/unlit overrides after adding them to
  template validation, serialization and preview. The current profile is derived
  from room kind and seed without rewriting template assets.

Check dark and lit chambers, all lantern bands, empty oil, coloured relics,
concave rooms, instanced props, moving emitters and repeated room transitions.
Developer probe: `window.__blockLighting` reports the active room/grid/source count.
