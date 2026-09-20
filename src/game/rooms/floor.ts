import { BufferAttribute, BufferGeometry, PlaneGeometry } from "three";

import { SHAPE_SIDES, floorReach, halfSize, type Room } from "../dungeon/types";

/**
 * How many rings of quads a floor is built from, middle to wall.
 *
 * A round floor used to be a `CircleGeometry`: a fan, one vertex in the
 * middle and one triangle per side, each of them long and thin and running
 * the whole radius of the room. The texture coordinates were right - the
 * same planar mapping a plane gets - but a triangle that covers eight
 * metres of floor and a sliver of width has an enormous texture derivative
 * along it and almost none across, and the sampler answers that with the
 * coarsest mip it has. Every wedge came back one flat colour: a round room
 * had no stone in it at all, just a dozen coloured bands, and nearly half
 * the rooms the generator makes are round.
 *
 * It was proved rather than argued. Painting a red-and-green checker into
 * the floor's own texture at runtime drew bands of flat red and flat
 * green, never a checker - while a square room, the same texture and the
 * same sampler settings, drew its flagstones correctly. Two big triangles
 * are fine; forty-eight thin ones are not. It is the shape of the triangle
 * that matters, not its size.
 */
export const FLOOR_RINGS = 6;

/**
 * How long a floor triangle's outer edge may get before it is split, in
 * metres. Short enough that the stone reads; long enough that a floor is
 * still a few hundred triangles rather than a few thousand.
 */
export const FLOOR_EDGE = 1.6;

/**
 * How many segments a shape's perimeter is cut into.
 *
 * Always a multiple of the shape's own side count, so every corner of the
 * polygon still lands exactly on a vertex and the outline is unchanged -
 * a hexagon stays a hexagon, it is only made of more pieces.
 */
export function floorSegments(room: Room): number {
  const sides = SHAPE_SIDES[room.shape];
  const perimeter = 2 * Math.PI * halfSize(room);
  const split = Math.max(1, Math.ceil(perimeter / sides / FLOOR_EDGE));
  return sides * split;
}

/**
 * The floor a room is drawn on, outline and texture coordinates both.
 *
 * One owner, because two things need it and they must not drift: the room
 * draws it, and the layout check measures it - a floor whose triangles go
 * long and thin again is a floor that will smear, and that is something a
 * check can see without a screen.
 *
 * Built in polar coordinates and pushed out onto the room's own outline by
 * `floorReach`, which is the one place that knows how far the floor goes
 * in any direction. So the polygon is exactly the polygon it always was.
 */
export function floorGeometry(room: Room): BufferGeometry {
  // A square's floor is its own box rather than a polygon inscribed in it,
  // and a plane already divides evenly, so let three build that one.
  if (room.shape === "square") {
    return new PlaneGeometry(room.size, room.size, FLOOR_RINGS, FLOOR_RINGS);
  }

  const segments = floorSegments(room);
  const rings = FLOOR_RINGS;
  const verts: number[] = [];
  const uvs: number[] = [];
  const index: number[] = [];

  for (let r = 0; r <= rings; r++) {
    const t = r / rings;
    for (let s = 0; s <= segments; s++) {
      const angle = (s / segments) * Math.PI * 2;
      const reach = floorReach(room, angle) * t;
      const x = Math.cos(angle) * reach;
      const y = Math.sin(angle) * reach;
      verts.push(x, y, 0);
      // Mapped flat, exactly as a plane is mapped, so the stone runs
      // across the room rather than round it.
      uvs.push(x / room.size + 0.5, y / room.size + 0.5);
    }
  }

  const row = segments + 1;
  for (let r = 0; r < rings; r++) {
    for (let s = 0; s < segments; s++) {
      const a = r * row + s;
      const b = a + 1;
      const c = a + row;
      const d = c + 1;
      // The innermost ring is a point, so its quads are already triangles.
      if (r > 0) index.push(a, c, b);
      index.push(b, c, d);
    }
  }

  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(new Float32Array(verts), 3));
  g.setAttribute("uv", new BufferAttribute(new Float32Array(uvs), 2));
  g.setIndex(index);
  g.computeVertexNormals();
  return g;
}

/**
 * The longest edge of any triangle in a floor, in metres.
 *
 * The bound that matches what was actually seen. The old fan's wedges ran
 * the room's whole radius - eight metres on a sixteen-metre floor - and
 * smeared; nothing here now reaches a quarter of the room. Aspect ratio
 * was tried first and flagged the wrong things: the innermost ring is
 * thin, but it is also tiny and sits under the player's feet, and the
 * checker drew sharply right down to the boots. It is a triangle that is
 * long AND thin that loses its texture, and bounding length bounds that.
 *
 * Said plainly: a square's two big triangles never smeared, so for squares
 * this bound is insurance rather than a diagnosis. Tessellating them costs
 * seventy triangles and removes the question.
 */
export function longestFloorEdge(room: Room): number {
  const g = floorGeometry(room);
  const pos = g.attributes.position;
  const idx = g.index;
  const count = idx ? idx.count : pos.count;
  const at = (i: number) => (idx ? idx.getX(i) : i);
  let longest = 0;
  for (let i = 0; i < count; i += 3) {
    const a = at(i), b = at(i + 1), c = at(i + 2);
    const px = [pos.getX(a), pos.getX(b), pos.getX(c)];
    const py = [pos.getY(a), pos.getY(b), pos.getY(c)];
    const side = (m: number, n: number) => Math.hypot(px[m] - px[n], py[m] - py[n]);
    longest = Math.max(longest, side(0, 1), side(1, 2), side(2, 0));
  }
  g.dispose();
  return +longest.toFixed(2);
}
