import { useEffect, useMemo } from "react";
import { CanvasTexture, NearestFilter } from "three";
import type { Room } from "../dungeon/types";
import type { DistrictId } from "../rooms/districts";
import { useRun } from "../state/run";
import { DISTRICT_LINTELS, districtThresholds } from "./districtThresholds";
import { Blocks } from "../rooms/CorridorDetails";
import type { CorridorBlock } from "../rooms/corridorPattern";
import { geo } from "../props/shared";

function Carving({ district }: { district: DistrictId }) {
  const style = DISTRICT_LINTELS[district];
  const crest = useMemo(() => [-1, 0, 1].map<CorridorBlock>((n, i) => ({
    position: [n * 0.13, 0.34 + (district === "tombs" ? (1 - Math.abs(n)) * 0.1 : 0), 0],
    size: district === "works" ? [0.1, 0.1, 0.16] : [0.07, district === "gardens" ? 0.19 + i * 0.025 : 0.1, 0.16],
  })), [district]);
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 512; canvas.height = 96;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#302d28"; ctx.fillRect(0, 0, 512, 96);
    ctx.strokeStyle = style.color; ctx.lineWidth = 4; ctx.strokeRect(6, 6, 500, 84);
    ctx.fillStyle = style.color; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.font = "bold 42px monospace"; ctx.fillText(style.title, 256, 49);
    const map = new CanvasTexture(canvas); map.magFilter = NearestFilter; map.minFilter = NearestFilter;
    return map;
  }, [style]);
  useEffect(() => () => texture.dispose(), [texture]);
  return <>
    <mesh geometry={geo("box", 2.4, 0.46, 0.12)}><meshStandardMaterial color="#514b3e" roughness={1} /></mesh>
    <mesh position={[0, 0, 0.065]} geometry={geo("plane", 2.28, 0.42)}><meshBasicMaterial map={texture} /></mesh>
    <Blocks blocks={crest} color={style.color} emissive={style.color} emissiveIntensity={0.15} />
  </>;
}

export function DistrictLintels({ room }: { room: Room }) {
  const rooms = useRun(s => s.dungeon?.rooms);
  const thresholds = useMemo(() => districtThresholds(room, rooms ?? []), [room, rooms]);
  return <group name="district-lintels">{thresholds.map(t => <group key={t.dir} name={`district-lintel-${t.dir}`}
    position={t.position} rotation={[0, t.yaw, 0]} userData={{ destination: t.destination, district: t.district }}>
    <Carving district={t.district} />
  </group>)}</group>;
}
