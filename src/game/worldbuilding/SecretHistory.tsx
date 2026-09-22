import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { Object3D, type InstancedMesh } from "three";
import type { Room } from "../dungeon/types";
import { secretEntranceDirection, secretStoryFor } from "../dungeon/secret";
import { geo, mat } from "../props/shared";
import { useRun } from "../state/run";
import { secretHistoryMarks, type SecretHistoryMark } from "./secretHistoryPattern";

function MarkBatch({ marks }: { marks: SecretHistoryMark[] }) {
  const mesh = useRef<InstancedMesh>(null);
  const first = marks[0];
  useLayoutEffect(() => {
    if (!mesh.current) return;
    const pose = new Object3D();
    marks.forEach((mark, i) => {
      pose.position.set(...mark.position);
      pose.scale.set(...mark.size);
      pose.updateMatrix();
      mesh.current!.setMatrixAt(i, pose.matrix);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
    mesh.current.computeBoundingSphere();
  }, [marks]);
  return <instancedMesh name="secret-history-marks" ref={mesh}
    args={[geo("box", 1, 1, 1), mat({ color: first.colour, roughness: 1,
      surface: first.surface, emissive: first.emissive ? first.colour : undefined,
      emissiveIntensity: first.emissive ? .8 : undefined }), marks.length]} />;
}

export function SecretHistory({ room, seed }: { room: Room; seed: number }) {
  const dungeon = useRun(state => state.dungeon);
  const entrance = dungeon ? secretEntranceDirection(dungeon, room.id) : null;
  const story = useMemo(() => secretStoryFor(room, seed), [room, seed]);
  const marks = useMemo(() => secretHistoryMarks(room, seed, entrance), [room, seed, entrance]);
  const batches = useMemo(() => {
    const grouped = new Map<string, SecretHistoryMark[]>();
    for (const mark of marks) {
      const key = `${mark.colour}|${mark.surface ?? ""}|${mark.emissive ? 1 : 0}`;
      const batch = grouped.get(key);
      if (batch) batch.push(mark);
      else grouped.set(key, [mark]);
    }
    return [...grouped.values()];
  }, [marks]);
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const win = window as unknown as { __secretHistory?: unknown };
    win.__secretHistory = { roomId: room.id, ...story, marks: marks.length, entrance };
    return () => { delete win.__secretHistory; };
  }, [room.id, story, marks.length, entrance]);
  return <group name={`secret-history-${story.material}`}>
    {batches.map((batch, i) => <MarkBatch key={i} marks={batch} />)}
  </group>;
}
