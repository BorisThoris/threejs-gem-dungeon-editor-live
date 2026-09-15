import { doorReach, floorRects, wallEdges } from "../game/dungeon/footprint";
import { DIRS, type Room } from "../game/dungeon/types";
import { terracesFor, terracePoint } from "../game/worldbuilding/elevation";

/** Fit the real floor inside a graph cell, keeping the chamber at its centre. */
export function minimapFootprint(room: Room, cell: number) {
  const scale = cell / (2 * Math.max(...DIRS.map((dir) => doorReach(room, dir))));
  const point = (x: number, z: number) => `${x * scale} ${z * scale}`;
  // One fill with no internal strokes: adjoining floor slabs stay a single
  // room on the map. The walls supply the concave outer outline separately.
  const floor = floorRects(room).map((r) => {
    const left = r.x - r.width / 2, right = r.x + r.width / 2;
    const top = r.z - r.depth / 2, bottom = r.z + r.depth / 2;
    return `M ${point(left, top)} L ${point(right, top)} L ${point(right, bottom)} L ${point(left, bottom)} Z`;
  }).join(" ");
  const walls = wallEdges(room).map((e) => {
    const dx = e.along === "x" ? e.length / 2 : 0;
    const dz = e.along === "z" ? e.length / 2 : 0;
    return `M ${point(e.x - dx, e.z - dz)} L ${point(e.x + dx, e.z + dz)}`;
  }).join(" ");
  const doors = Object.fromEntries(DIRS.map((dir) => [dir, doorReach(room, dir) * scale]));
  const terraces = terracesFor(room).map(t => {
    const corners = [[t.rampEnd, -t.width / 2], [t.end, -t.width / 2], [t.end, t.width / 2], [t.rampEnd, t.width / 2]];
    return corners.map(([along, across], i) => {
      const [x, , z] = terracePoint(t, along, across, 0);
      return `${i ? "L" : "M"} ${point(x, z)}`;
    }).join(" ") + " Z";
  }).join(" ");
  return { floor, walls, doors, terraces };
}
