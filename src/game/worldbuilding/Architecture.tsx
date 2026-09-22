import { useMemo } from "react";
import type { Room } from "../dungeon/types";
import { Blocks } from "../rooms/CorridorDetails";
import { useSurface } from "../textures/registry";
import { architectureFor } from "./structuralPattern";

/** Three batches for an entire chamber's structural rhythm. */
export function Architecture({ room }: { room: Room }) {
  const data = useMemo(() => architectureFor(room), [room]);
  const occluders = useMemo(() => [...data.structure, ...data.detail, ...data.marks], [data]);
  const surface = useSurface(data.identity.tradition === "trellis" ? "wood" : "stone", 0.5);
  return <group name="room-architecture" userData={{ crown: data.crown.definition.name,
    crownBiome: data.crown.biome, galleryTerminus: data.gallery.definition.name,
    gallerySites: data.gallery.sites.length }}>
    <Blocks blocks={data.structure} occluders={occluders} color={data.identity.structure} map={surface} />
    <Blocks blocks={data.detail} occluders={occluders} color={data.identity.detail} map={surface} />
    <Blocks blocks={data.marks} occluders={occluders} color={data.identity.accent} glow={room.biome === "fungal" || room.biome === "crystal" || room.biome === "salt"} />
  </group>;
}
