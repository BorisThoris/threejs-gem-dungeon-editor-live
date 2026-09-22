import { useEffect, useMemo } from "react";
import type { Room } from "../dungeon/types";
import { Blocks } from "../rooms/CorridorDetails";
import { useRun } from "../state/run";
import { useSurface } from "../textures/registry";
import { secretTrailPattern, secretTrailStep } from "./secretTrail";

/**
 * The old route is always part of the floor, but it becomes legible only
 * after the player has stood beneath its district landmark. Two instanced
 * batches cover every stroke in the current room.
 */
export function SecretTrailMarks({ room }: { room: Room }) {
  const dungeon = useRun(state => state.dungeon);
  const learned = useRun(state => !!state.dungeon?.secretTrail
    && state.visited.includes(state.dungeon.secretTrail.sourceId));
  const pattern = useMemo(() => dungeon ? secretTrailPattern(dungeon, room) : null, [dungeon, room]);
  const step = useMemo(() => dungeon ? secretTrailStep(dungeon, room) : null, [dungeon, room]);
  const surface = useSurface("stone", 0.45);
  const occluders = useMemo(() => pattern ? [...pattern.base, ...pattern.accents] : [], [pattern]);
  useEffect(() => {
    if (!import.meta.env.DEV || !pattern || !step) return;
    const win = window as unknown as { __secretTrail?: unknown };
    win.__secretTrail = { roomId: room.id, learned, base: pattern.base.length,
      accents: pattern.accents.length, onward: step.onward, final: step.final,
      drawCalls: learned ? 2 : 0 };
    return () => { delete win.__secretTrail; };
  }, [learned, pattern, room.id, step]);
  if (!learned || !pattern) return null;
  return <group name="learned-secret-trail">
    <Blocks blocks={pattern.base} occluders={occluders} color={pattern.colour} map={surface} />
    <Blocks blocks={pattern.accents} occluders={occluders} color={pattern.accent}
      emissive={pattern.accent} emissiveIntensity={0.14} />
  </group>;
}
