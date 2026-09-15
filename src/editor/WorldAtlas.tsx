import { useMemo, useState } from "react";
import { generateDungeon } from "../game/dungeon/generate";
import { DIRS, DIR_STEP } from "../game/dungeon/types";
import { doorReach } from "../game/dungeon/footprint";
import { DISTRICTS } from "../game/rooms/districts";
import { KIND_TITLE } from "../game/rooms/kinds";
import { placementsFor } from "../game/rooms/placements";
import { PROP_SPECS } from "../game/props/specs";
import { watercourseBlocks, waterStation, WATERWAY_NAMES } from "../game/worldbuilding/watercourse";
import { minimapFootprint } from "../ui/minimapGeometry";
import { colors } from "../ui/overlay";
import { button, field, label, panel, small } from "./styles";
import "../game/rooms/shipped";
import { identityFor, PLACE_IDENTITIES } from "../game/worldbuilding/identity";

const INK = { gardens: "#8ebf9b", works: "#c99867", tombs: "#a59ec5" };
const GRID = 112;

/** Inspect the generated world, including hidden routes. This is an authoring
 * view; the player's map continues to reveal only what they have discovered. */
export function WorldAtlas() {
  const [seed, setSeed] = useState(72);
  const [floor, setFloor] = useState(2);
  const [selected, setSelected] = useState("start");
  const dungeon = useMemo(() => generateDungeon({ seed, floor }), [seed, floor]);
  const room = dungeon.rooms.find(r => r.id === selected) ?? dungeon.rooms[0];
  const byId = useMemo(() => new Map(dungeon.rooms.map(r => [r.id, r])), [dungeon]);
  const extent = useMemo(() => {
    const xs = dungeon.rooms.map(r => r.grid.x), zs = dungeon.rooms.map(r => r.grid.z);
    return { x: (Math.min(...xs) - 0.6) * GRID, y: (Math.min(...zs) - 0.6) * GRID,
      width: (Math.max(...xs) - Math.min(...xs) + 1.2) * GRID,
      height: (Math.max(...zs) - Math.min(...zs) + 1.2) * GRID };
  }, [dungeon]);
  const blueprint = useMemo(() => minimapFootprint(room, 360), [room]);
  const scale = 360 / (2 * Math.max(...DIRS.map(dir => doorReach(room, dir))));
  const props = useMemo(() => placementsFor(room, room.seed, { asVault: room.id === dungeon.vaultId }), [room, dungeon.vaultId]);
  const station = useMemo(() => room.waterway && room.waterway.role !== "channel" ? waterStation(room) : null, [room]);
  const ink = INK[room.district ?? "tombs"];
  const identity = PLACE_IDENTITIES[identityFor(room)];
  const source = dungeon.rooms.find(r => r.waterway?.role === "sluice");
  const outfall = dungeon.rooms.find(r => r.waterway?.role === "outfall");
  return <div>
    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "end", gap: 16, marginBottom: 18 }}>
      <label style={label}>WORLD SEED
        <input aria-label="World seed" type="number" min={1} max={4294967295} value={seed} style={{ ...field, width: 160 }}
          onChange={e => setSeed(Math.max(1, Math.min(4294967295, Math.floor(Number(e.target.value) || 1))))} />
      </label>
      <label style={label}>DEPTH
        <select aria-label="World depth" value={floor} onChange={e => setFloor(Number(e.target.value))} style={{ ...field, width: 100 }}>
          {[1, 2, 3].map(n => <option key={n} value={n}>{n}</option>)}
        </select>
      </label>
      <button style={{ ...button, width: "auto" }} onClick={() => setSeed(s => (s + 1) >>> 0 || 1)}>Next seed</button>
      <span style={small}>{dungeon.rooms.length} rooms · {dungeon.rooms.filter(r => r.waterway).length} on the watercourse</span>
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "minmax(420px, 1.4fr) minmax(340px, 1fr)", gap: 20 }}>
      <section style={panel}>
        <div style={label}>THE CONNECTED FLOOR</div>
        <p style={small}>Select a room to inspect its true footprint. Bronze arrows follow the water downstream. Dashed branches are hidden walls.</p>
        <svg aria-label="Generated world map" role="img" viewBox={`${extent.x} ${extent.y} ${extent.width} ${extent.height}`}
          style={{ width: "100%", height: 540, background: "#0b1012", borderRadius: 8 }}>
          <defs><marker id="atlas-flow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M 0 0 L 6 3 L 0 6" fill="none" stroke="#d0b477" />
          </marker></defs>
          {dungeon.rooms.flatMap(r => Object.values(r.links).filter((id): id is string => !!id && id > r.id).map(id => {
            const next = byId.get(id)!;
            return <line key={`${r.id}:${id}`} x1={r.grid.x * GRID} y1={r.grid.z * GRID} x2={next.grid.x * GRID} y2={next.grid.z * GRID} stroke="#49514f" strokeWidth={3} />;
          }))}
          {dungeon.rooms.map(r => r.secret && <line key={`secret-${r.id}`} x1={r.grid.x * GRID} y1={r.grid.z * GRID}
            x2={byId.get(r.secret.to)!.grid.x * GRID} y2={byId.get(r.secret.to)!.grid.z * GRID} stroke="#9c79a9" strokeDasharray="4 5" />)}
          {dungeon.rooms.map(r => {
            const shape = minimapFootprint(r, 62), color = INK[r.district ?? "tombs"];
            const downstream = r.waterway?.downstream;
            return <g key={r.id} data-testid="atlas-room" data-room-id={r.id} transform={`translate(${r.grid.x * GRID} ${r.grid.z * GRID})`}
              role="button" tabIndex={0} aria-label={`${KIND_TITLE[r.kind]} ${r.id}`} onClick={() => setSelected(r.id)}
              onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelected(r.id); } }} style={{ cursor: "pointer" }}>
              <path d={shape.floor} fill={r.id === room.id ? "#34443c" : "#19231f"} />
              <path d={shape.walls} fill="none" stroke={r.id === room.id ? "#f3d087" : color} strokeWidth={r.id === room.id ? 3 : 1.5} />
              <text textAnchor="middle" y={3} fill={color} fontSize={9}>{r.waterway?.role === "sluice" ? "SLUICE" : r.waterway?.role === "outfall" ? "RELIQUARY" : KIND_TITLE[r.kind].toUpperCase()}</text>
              <text textAnchor="middle" y={43} fill="#868e86" fontSize={8}>{r.biome}</text>
              {r.id === dungeon.vaultId && <text x={25} y={-25} fill="#edc771" fontSize={10}>KEY</text>}
              {downstream && <line x1={DIR_STEP[downstream].x * 34} y1={DIR_STEP[downstream].z * 34}
                x2={DIR_STEP[downstream].x * 74} y2={DIR_STEP[downstream].z * 74} stroke="#d0b477" strokeWidth={2} markerEnd="url(#atlas-flow)" />}
            </g>;
          })}
        </svg>
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginTop: 12 }}>
          {Object.entries(DISTRICTS).map(([id, d]) => <span key={id} style={{ ...small, color: INK[id as keyof typeof INK] }}>{d.name}</span>)}
        </div>
      </section>
      <section style={panel}>
        <div style={{ ...label, color: ink }}>{room.district ? DISTRICTS[room.district].name : "UNASSIGNED"}</div>
        <h2 style={{ fontSize: 17, color: colors.ink }}>{room.waterway ? WATERWAY_NAMES[room.waterway.role] : KIND_TITLE[room.kind]}</h2>
        <p style={small}>{room.shape} · {room.size} m chamber · {room.biome} · {KIND_TITLE[room.kind]}</p>
        <p style={{ ...small, color: ink }}>{identity.title} · {identity.story}</p>
        <svg aria-label="Selected room blueprint" viewBox="-200 -200 400 400" style={{ width: "100%", maxHeight: 400, background: "#0b1012", borderRadius: 8 }}>
          <path d={blueprint.floor} fill="#1e2925" />
          <path d={blueprint.terraces} fill="#594a32" stroke="#b39766" strokeWidth={1} />
          {watercourseBlocks(room).map((b, i) => <rect key={i} x={(b.position[0] - b.size[0] / 2) * scale} y={(b.position[2] - b.size[2] / 2) * scale}
            width={b.size[0] * scale} height={b.size[2] * scale} fill="#559eac" />)}
          {props.map((p, i) => <circle key={i} cx={p.x * scale} cy={p.z * scale} r={Math.max(2, PROP_SPECS[p.kind].radius * scale)}
            fill={PROP_SPECS[p.kind].solid ? "#706b57" : "#49583e"} opacity={0.85}><title>{PROP_SPECS[p.kind].title}</title></circle>)}
          <path d={blueprint.walls} fill="none" stroke={ink} strokeWidth={2} />
          {station && <>
            <line x1={0} y1={0} x2={station.approach.x * scale} y2={station.approach.z * scale} stroke="#e0bf75" strokeDasharray="3 4" />
            <circle data-testid="atlas-station" cx={station.x * scale} cy={station.z * scale} r={5} fill="#e0bf75" />
          </>}
          <circle r={3} fill="#eee0b4" />
        </svg>
        <p style={small}>Stone outline: walls · muted circles: furnishings · blue: water · gold: mechanism and its clear approach.</p>
        {room.waterway && <p style={{ ...small, color: "#d0b477" }}>Water {room.waterway.upstream ? `arrives from the ${room.waterway.upstream}` : "begins at the sluice"}
          {room.waterway.downstream ? ` and leaves to the ${room.waterway.downstream}.` : "; the reliquary lies at its outfall."}</p>}
        {source && outfall ? <p style={small}>The sluice at {source.id} drains the channel to {outfall.id}. Both endpoints are reachable without the vault key; the circuit never enters the exit stairs.</p>
          : <p style={small}>This floor has no complete watercourse: the available rooms cannot support both safe endpoints.</p>}
      </section>
    </div>
  </div>;
}
