import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { PointLight } from "three";
import type { Room } from "../dungeon/types";
import { canControl, runClock, useRun } from "../state/run";
import { Blocks } from "../rooms/CorridorDetails";
import type { CorridorBlock } from "../rooms/corridorPattern";
import { passageLampsFor, passageLampPulse } from "./passageLighting";

/** Hanging oil lamps give the galleries a visible, warm source. All frames
 * share a batch, all luminous panes another; floor tessellation adds no lights. */
export function PassageLamps({ room, intensity }: { room: Room; intensity: number }) {
  const lamps = useMemo(() => passageLampsFor(room), [room]);
  const lights = useRef<(PointLight | null)[]>([]);
  const { frames, panes } = useMemo(() => {
    const frames: CorridorBlock[] = [], panes: CorridorBlock[] = [];
    for (const { position: [x, y, z] } of lamps) {
      const block = (into: CorridorBlock[], dx: number, dy: number, dz: number, w: number, h: number, d: number) =>
        into.push({ position: [x + dx, y + dy, z + dz], size: [w, h, d] });
      block(frames, 0, 0.48, 0, 0.055, 0.6, 0.055);
      block(frames, 0, 0.23, 0, 0.46, 0.08, 0.46);
      block(frames, 0, -0.23, 0, 0.4, 0.08, 0.4);
      for (const dx of [-0.17, 0.17]) for (const dz of [-0.17, 0.17])
        block(frames, dx, 0, dz, 0.045, 0.46, 0.045);
      if (room.district === "tombs") block(frames, 0, 0.32, 0, 0.3, 0.1, 0.3);
      if (room.district === "works") block(frames, 0, 0, 0, 0.43, 0.055, 0.43);
      block(panes, 0, 0, 0, 0.27, 0.34, 0.27);
    }
    return { frames, panes };
  }, [lamps, room.district]);
  useFrame(() => {
    const run = useRun.getState();
    if (!canControl(run)) return;
    const time = runClock(run);
    lamps.forEach((lamp, i) => { if (lights.current[i]) lights.current[i]!.intensity = intensity * passageLampPulse(time, lamp.phase, room.district, lamp.terminal); });
  });
  return <group name="passage-lamps">
    <Blocks blocks={frames} color={room.district === "gardens" ? "#746047" : room.district === "works" ? "#383b38" : "#8a7350"} />
    <Blocks blocks={panes} color={lamps[0]?.colour ?? "#ffd38a"} glow />
    {lamps.map((lamp, i) => <pointLight key={`${lamp.dir}-${i}`} ref={v => { lights.current[i] = v; }}
      name={lamp.terminal ? "gallery-answer-lamp" : "passage-lamp"}
      position={lamp.position} color={lamp.colour} intensity={intensity} distance={17} decay={1.5}
      userData={{ dir: lamp.dir, terminal: lamp.terminal }} />)}
  </group>;
}
