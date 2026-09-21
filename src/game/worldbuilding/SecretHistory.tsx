import { useEffect, useMemo } from "react";
import type { Room } from "../dungeon/types";
import { secretStoryFor } from "../dungeon/secret";
import { geo, mat } from "../props/shared";
import { secretHistoryMarks } from "./secretHistoryPattern";

export function SecretHistory({ room, seed }: { room: Room; seed: number }) {
  const story = useMemo(() => secretStoryFor(room, seed), [room, seed]);
  const marks = useMemo(() => secretHistoryMarks(room, seed), [room, seed]);
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const win = window as unknown as { __secretHistory?: unknown };
    win.__secretHistory = { roomId: room.id, ...story, marks: marks.length };
    return () => { delete win.__secretHistory; };
  }, [room.id, story, marks.length]);
  return <group name={`secret-history-${story.material}`}>
    {marks.map((mark, i) => <mesh key={i} position={mark.position} scale={mark.size}
      geometry={geo("box", 1, 1, 1)} material={mat({ color: mark.colour, roughness: 1,
        surface: mark.surface, emissive: mark.emissive ? mark.colour : undefined,
        emissiveIntensity: mark.emissive ? .8 : undefined })} />)}
  </group>;
}
