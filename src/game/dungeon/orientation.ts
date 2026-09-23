import { createRng } from "../rng";
import type { Room } from "./types";

export interface Orientation {
  turns: 0 | 1 | 2 | 3;
  mirror: boolean;
}

/** The same seeded turn for authored props and authored asymmetric floors. */
export function orientationOf(room: Pick<Room, "seed" | "id" | "grid">): Orientation {
  const rng = createRng(`orient:${room.seed}:${room.id}:${room.grid.x},${room.grid.z}`);
  return { turns: Math.floor(rng() * 4) as Orientation["turns"], mirror: rng() < 0.5 };
}

/** A room-local point, turned and mirrored with its room. */
export function orient(x: number, z: number, o: Orientation): [number, number] {
  let px = x, pz = z;
  for (let i = 0; i < o.turns; i++) {
    const nx = pz;
    pz = -px;
    px = nx;
  }
  return [o.mirror ? -px : px, pz];
}
