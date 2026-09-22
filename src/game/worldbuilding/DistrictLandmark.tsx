import { useEffect, useMemo } from "react";
import type { Room } from "../dungeon/types";
import { Blocks } from "../rooms/CorridorDetails";
import { useSurface } from "../textures/registry";
import { landmarkPattern } from "./landmarks";

/** One landmark per district, held to two batches however many blocks compose it. */
export function DistrictLandmark({ room }: { room: Room }) {
  const data = useMemo(() => landmarkPattern(room), [room]);
  const surface = useSurface(data?.id === "rootwell" ? "wood" : "stone", 0.5);
  const occluders = useMemo(() => data ? [...data.structure, ...data.marks] : [], [data]);
  useEffect(() => {
    if (!import.meta.env.DEV || !data) return;
    const win = window as unknown as { __districtLandmark?: unknown };
    win.__districtLandmark = { roomId: room.id, id: data.id, structure: data.structure.length, marks: data.marks.length, drawCalls: 2 };
    return () => { delete win.__districtLandmark; };
  }, [data, room.id]);
  if (!data) return null;
  return <group name={`district-landmark-${data.id}`}>
    <Blocks blocks={data.structure} occluders={occluders} color={data.color} map={surface} />
    <Blocks blocks={data.marks} occluders={occluders} color={data.accent} emissive={data.accent} emissiveIntensity={0.08} />
  </group>;
}
