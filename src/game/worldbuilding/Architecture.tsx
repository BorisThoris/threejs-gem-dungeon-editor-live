import { useMemo } from "react";
import type { Room } from "../dungeon/types";
import { Blocks } from "../rooms/CorridorDetails";
import { useSurface } from "../textures/registry";
import { architectureFor } from "./structuralPattern";

/** Three batches for an entire chamber's structural rhythm. */
export function Architecture({ room }: { room: Room }) {
  const data = useMemo(() => architectureFor(room), [room]);
  const surface = useSurface(data.identity.tradition === "trellis" ? "wood" : "stone", 0.5);
  return <group>
    <Blocks blocks={data.structure} color={data.identity.structure} map={surface} />
    <Blocks blocks={data.detail} color={data.identity.detail} map={surface} />
    <Blocks blocks={data.marks} color={data.identity.accent} glow={room.biome === "fungal" || room.biome === "crystal"} />
  </group>;
}
