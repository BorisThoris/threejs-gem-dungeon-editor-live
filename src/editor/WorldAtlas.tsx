import { useMemo, useState } from "react";
import { generateDungeon } from "../game/dungeon/generate";
import { DIRS, DIR_STEP } from "../game/dungeon/types";
import { doorReach } from "../game/dungeon/footprint";
import { DISTRICTS } from "../game/rooms/districts";
import { KIND_TITLE } from "../game/rooms/kinds";
import { placementsFor } from "../game/rooms/placements";
import { PROP_SPECS } from "../game/props/specs";
import { watercourseBlocks, waterStation, waterLevel, WATERWAY_NAMES } from "../game/worldbuilding/watercourse";
import { minimapFootprint } from "../ui/minimapGeometry";
import { colors } from "../ui/overlay";
import { button, field, label, panel, small } from "./styles";
import "../game/rooms/shipped";
import { identityFor, PLACE_IDENTITIES } from "../game/worldbuilding/identity";
import { serviceTrailText } from "../game/worldbuilding/serviceTrail";
import { bellcapsFor, BELLCAP_REACH, BELLCAP_WARNING, BELLCAP_COOLDOWN } from "../game/worldbuilding/bellcaps";
import { croakersFor } from "../game/mobs/ambient";
import { croakerHabitats, croakerMigration } from "../game/mobs/croakerHabitat";
import { beetlesFor, beetlePose } from "../game/mobs/beetleHabitat";
import { passageLampsFor } from "../game/worldbuilding/passageLighting";
import { GallerySection } from "./GallerySection";
import { TerrainBlueprint } from "./TerrainBlueprint";
import { footingAt } from "../game/rooms/underfoot";
import { floorHeightAt } from "../game/worldbuilding/elevation";
import { floorRects } from "../game/dungeon/footprint";
import { GROUND_Y } from "../game/world";
import type { Room } from "../game/dungeon/types";

const INK = { gardens: "#8ebf9b", works: "#c99867", tombs: "#a59ec5" };
const GRID = 112;

/** Inspect the generated world, including hidden routes. This is an authoring
 * view; the player's map continues to reveal only what they have discovered. */
export function WorldAtlas() {
  const [seed, setSeed] = useState(72);
  const [floor, setFloor] = useState(2);
  const [selected, setSelected] = useState("start");
  const [waterPreview, setWaterPreview] = useState<"flowing" | "drained" | "timeline">("flowing");
  const [drainSeconds, setDrainSeconds] = useState(6);
  const previewOpened = waterPreview === "flowing" ? null : 0;
  const previewClock = waterPreview === "drained" ? 10 : waterPreview === "timeline" ? drainSeconds : 0;
  const level = waterLevel(previewOpened, previewClock), drained = level === 0, dormant = level <= 0.1;
  const migration = croakerMigration(previewOpened, previewClock);
  const [ecology, setEcology] = useState(true);
  const [lighting, setLighting] = useState(true);
  const [terrain, setTerrain] = useState(true);
  const [probe, setProbe] = useState<{ room: Room; x: number; z: number } | null>(null);
  const dungeon = useMemo(() => generateDungeon({ seed, floor }), [seed, floor]);
  const room = dungeon.rooms.find(r => r.id === selected) ?? dungeon.rooms[0];
  const probeX = probe?.room === room ? probe.x : 0, probeZ = probe?.room === room ? probe.z : 0;
  const probeGround = footingAt(room, probeX, probeZ, previewOpened, previewClock);
  const probeHeight = floorHeightAt(room, probeX, probeZ) - GROUND_Y;
  const moveProbe = (x: number, z: number) => {
    if (floorRects(room).some(r => Math.abs(x - r.x) <= r.width / 2 && Math.abs(z - r.z) <= r.depth / 2))
      setProbe({ room, x, z });
  };
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
  const colonies = useMemo(() => bellcapsFor(room), [room]);
  const beetles = useMemo(() => beetlesFor(room), [room]);
  const lamps = useMemo(() => passageLampsFor(room), [room]);
  const galleryRooms = useMemo(() => dungeon.rooms.filter(r => DIRS.some(dir => r.wings?.[dir] && !r.links[dir] && r.secret?.dir !== dir)), [dungeon]);
  const habitats = useMemo(() => croakerHabitats(room, croakersFor(room, room.seed)), [room]);
  const livingRooms = useMemo(() => dungeon.rooms.filter(r => bellcapsFor(r).length || croakersFor(r, r.seed).length), [dungeon]);
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
      <button style={{ ...button, width: "auto" }} disabled={!livingRooms.length} onClick={() => {
        const next = (livingRooms.findIndex(r => r.id === room.id) + 1) % livingRooms.length;
        if (livingRooms[next]) setSelected(livingRooms[next].id);
      }}>Next habitat</button>
      <button style={{ ...button, width: "auto" }} disabled={!galleryRooms.length} onClick={() => {
        const next = (galleryRooms.findIndex(r => r.id === room.id) + 1) % galleryRooms.length;
        if (galleryRooms[next]) setSelected(galleryRooms[next].id);
      }}>Next gallery</button>
      <span style={small}>{dungeon.rooms.length} rooms · {dungeon.rooms.filter(r => r.waterway).length} on the watercourse</span>
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "minmax(420px, 1.4fr) minmax(340px, 1fr)", gap: 20 }}>
      <section style={panel}>
        <div style={label}>THE CONNECTED FLOOR</div>
        <p style={small}>Select a room to inspect its true footprint. Bronze arrows follow the water downstream. Dashed branches are hidden walls. Copper dotted lines follow the maintenance rubbing.</p>
        <svg aria-label="Generated world map" role="img" viewBox={`${extent.x} ${extent.y} ${extent.width} ${extent.height}`}
          style={{ width: "100%", height: 540, background: "#0b1012", borderRadius: 8 }}>
          <defs><marker id="atlas-flow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M 0 0 L 6 3 L 0 6" fill="none" stroke="#d0b477" />
          </marker></defs>
          {dungeon.rooms.flatMap(r => Object.values(r.links).filter((id): id is string => !!id && id > r.id).map(id => {
            const next = byId.get(id)!;
            return <line key={`${r.id}:${id}`} x1={r.grid.x * GRID} y1={r.grid.z * GRID} x2={next.grid.x * GRID} y2={next.grid.z * GRID} stroke="#49514f" strokeWidth={3} />;
          }))}
          {dungeon.serviceTrail?.route.slice(1).map((id, i) => {
            const a = byId.get(dungeon.serviceTrail!.route[i])!, b = byId.get(id)!;
            return <line key={`service-${id}`} x1={a.grid.x * GRID + 6} y1={a.grid.z * GRID + 6}
              x2={b.grid.x * GRID + 6} y2={b.grid.z * GRID + 6} stroke="#cc9869" strokeWidth={3} strokeDasharray="2 6" />;
          })}
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
        {room.wingProfiles && <p style={small}>Round-ended galleries: {DIRS.filter(dir => room.wingProfiles?.[dir] === "apse").join(", ")}</p>}
        <p style={{ ...small, color: ink }}>{identity.title} · {identity.story}</p>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 16, marginBottom: 12 }}>
          <label style={small}>Water preview <select aria-label="Water preview" value={waterPreview}
            style={{ ...field, width: "auto", marginLeft: 8 }} onChange={e => setWaterPreview(e.target.value as typeof waterPreview)}>
            <option value="flowing">Flowing</option><option value="drained">Drained</option><option value="timeline">Drain timeline</option>
          </select></label>
          <label style={small}><input type="checkbox" checked={ecology} onChange={e => setEcology(e.target.checked)} /> Show habitats</label>
          <label style={small}><input type="checkbox" checked={lighting} onChange={e => setLighting(e.target.checked)} /> Show passage lamps</label>
          <label style={small}><input type="checkbox" checked={terrain} onChange={e => setTerrain(e.target.checked)} /> Show terrain</label>
        </div>
        {waterPreview === "timeline" && <label style={{ ...small, display: "block" }}>Time since opening the sluice
          <input aria-label="Drain time" type="range" min={0} max={10} step={0.1} value={drainSeconds}
            onChange={e => setDrainSeconds(Number(e.target.value))} style={{ width: "100%", accentColor: "#77b8bf" }} />
          <output aria-live="polite" data-testid="atlas-drain-time">{drainSeconds.toFixed(1)} s · water {Math.round(level * 100)}% · toad retreat {Math.round(migration * 100)}%</output>
        </label>}
        {dungeon.serviceTrail?.route.includes(room.id) && <p style={small}>{serviceTrailText(dungeon, room.id)}</p>}
        <svg aria-label="Selected room blueprint" aria-describedby="atlas-ground-probe" tabIndex={0} viewBox="-200 -200 400 400"
          onClick={e => {
            const transform = e.currentTarget.getScreenCTM(); if (!transform) return;
            const point = new DOMPoint(e.clientX, e.clientY).matrixTransform(transform.inverse());
            moveProbe(point.x / scale, point.y / scale);
            e.currentTarget.focus();
          }}
          onKeyDown={e => {
            const step = e.shiftKey ? 2 : 0.5;
            const offset: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
            if (offset[e.key]) { e.preventDefault(); moveProbe(probeX + offset[e.key][0], probeZ + offset[e.key][1]); }
            if (e.key === "Home") { e.preventDefault(); moveProbe(0, 0); }
          }}
          style={{ width: "100%", maxHeight: 400, background: "#0b1012", borderRadius: 8, cursor: "crosshair" }}>
          <defs><marker id="atlas-room-flow" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto">
            <path d="M 0 0 L 5 2.5 L 0 5" fill="none" stroke="#e7c87d" />
          </marker></defs>
          <path d={blueprint.floor} fill="#1e2925" />
          <path d={blueprint.terraces} fill="#594a32" stroke="#b39766" strokeWidth={1} />
          {terrain && <TerrainBlueprint room={room} scale={scale} />}
          {watercourseBlocks(room).map((b, i) => <rect key={i} x={(b.position[0] - b.size[0] / 2) * scale} y={(b.position[2] - b.size[2] / 2) * scale}
            width={b.size[0] * scale} height={b.size[2] * scale} fill={drained ? "#354641" : "#559eac"} opacity={drained ? 1 : 0.35 + level * 0.65} />)}
          {[room.waterway?.upstream, room.waterway?.downstream].map((dir, i) => {
            if (!dir) return null;
            const axis = DIR_STEP[dir], distance = doorReach(room, dir), sign = i === 0 ? -1 : 1;
            const mid = distance * 0.55, reach = Math.min(1, distance * 0.2);
            return <line key={`current-${i}`} data-testid="atlas-channel-direction" data-direction={dir} data-incoming={i === 0}
              x1={axis.x * (mid - sign * reach) * scale} y1={axis.z * (mid - sign * reach) * scale}
              x2={axis.x * (mid + sign * reach) * scale} y2={axis.z * (mid + sign * reach) * scale}
              stroke="#e7c87d" strokeWidth={1.5} strokeDasharray={drained ? "2 3" : undefined} markerEnd="url(#atlas-room-flow)">
              <title>{drained ? "Dry channel direction mark" : "Current direction"}: {i === 0 ? "from" : "toward"} the {dir}</title>
            </line>;
          })}
          {props.map((p, i) => <circle key={i} cx={p.x * scale} cy={p.z * scale} r={Math.max(2, PROP_SPECS[p.kind].radius * scale)}
            fill={PROP_SPECS[p.kind].solid ? "#706b57" : "#49583e"} opacity={0.85}><title>{PROP_SPECS[p.kind].title}</title></circle>)}
          {ecology && habitats.map((h, i) => {
            const at = { x: h.wet.x + (h.refuge.x - h.wet.x) * migration, z: h.wet.z + (h.refuge.z - h.wet.z) * migration };
            return <g key={`habitat-${i}`}>
              {h.followsChannel && <line x1={h.wet.x * scale} y1={h.wet.z * scale} x2={h.refuge.x * scale} y2={h.refuge.z * scale}
                stroke="#83b3ac" strokeDasharray="2 4" opacity={0.7} />}
              <circle data-testid="atlas-toad" cx={at.x * scale} cy={at.z * scale} r={4} fill="#91c2a9">
                <title>{h.followsChannel ? migration === 1 ? "Toad in its damp refuge; chorus hushed" : migration > 0 ? "Toad retreating to its damp refuge; chorus hushed" : "Toad at the live channel; dotted route leads to its refuge" : "Toad in an independent damp habitat"}{h.refugeBed ? "; refuge lies in a visible damp or mossy bed" : ""}</title>
              </circle>
            </g>;
          })}
          {ecology && colonies.map((cap, i) => <g key={`colony-${i}`} data-testid="atlas-colony" data-dormant={dormant}>
            {!dormant && <circle cx={cap.x * scale} cy={cap.z * scale} r={BELLCAP_REACH * scale} fill="none" stroke="#c4c98b" strokeDasharray="3 4" opacity={0.45} />}
            <rect x={cap.x * scale - 4} y={cap.z * scale - 4} width={8} height={8} fill={dormant ? "#776c4e" : "#d0cd83"}>
              <title>{dormant ? "Dormant bellcaps" : `Bellcaps: raised light within ${BELLCAP_REACH} m causes a ${BELLCAP_WARNING}-second swelling warning`}</title>
            </rect>
          </g>)}
          {ecology && !dormant && beetles.map((home, i) => {
            const p = beetlePose(home, 0, 0);
            return <circle key={`beetle-${i}`} cx={p.x * scale} cy={p.z * scale} r={2} fill="#f0cc62"><title>Glow beetle feeding around living bellcaps</title></circle>;
          })}
          <path d={blueprint.walls} fill="none" stroke={ink} strokeWidth={2} />
          {lighting && lamps.map((lamp, i) => <g key={`lamp-${i}`} data-testid="atlas-passage-lamp"
            transform={`translate(${lamp.position[0] * scale} ${lamp.position[2] * scale})`}>
            <path d="M 0 -5 L 4 0 L 0 5 L -4 0 Z" fill="#ffd38a" stroke="#59472b" />
            <title>Hanging passage lamp · {lamp.position[1].toFixed(1)} m above the chamber floor</title>
          </g>)}
          {station && <>
            <line x1={0} y1={0} x2={station.approach.x * scale} y2={station.approach.z * scale} stroke="#e0bf75" strokeDasharray="3 4" />
            <circle data-testid="atlas-station" cx={station.x * scale} cy={station.z * scale} r={5} fill="#e0bf75" />
          </>}
          <circle r={3} fill="#eee0b4" />
          <g data-testid="atlas-ground-marker" transform={`translate(${probeX * scale} ${probeZ * scale})`} pointerEvents="none">
            <circle r={7} fill="none" stroke="#b1e5de" strokeWidth={1.5} />
            <path d="M-11 0H-4 M4 0H11 M0-11V-4 M0 4V11" stroke="#b1e5de" strokeWidth={1.5} />
          </g>
        </svg>
        <output id="atlas-ground-probe" aria-live="polite" style={{ ...small, display: "block" }}>
          Ground probe ({probeX.toFixed(1)}, {probeZ.toFixed(1)}) · floor +{probeHeight.toFixed(2)} m · {probeGround === "soft" ? "soft growth" : probeGround} footsteps.
        </output>
        <p style={small}>Select a floor position to inspect it. Arrow keys move the probe 0.5 m; Shift moves 2 m; Home returns to the room center.</p>
        <p style={small}>Stone outline: walls · muted circles: furnishings · blue: water · gold: mechanism and its clear approach.</p>
        {terrain && <p style={small}>Terrain tiles show the same paving lanes and biome beds as the game, including raised galleries. Water routes and furnishings appear above them.</p>}
        {lighting && <p style={small}>{lamps.length} hanging passage {lamps.length === 1 ? "lamp" : "lamps"} · gold diamonds show fixtures; spacing follows passage length. Arrows follow the current; dashed arrows remain as marks after drainage.</p>}
        <GallerySection room={room} probe={{ x: probeX, z: probeZ }} onProbe={moveProbe} />
        {ecology && <p style={small}>Green dots: toads · dotted paths: clear retreat routes · pale squares: bellcaps · dashed rings: raised-lantern range; walls still block exposure. This preview changes the diagram only.</p>}
        {colonies.length > 0 && <p style={small}>{colonies.length} bellcap {colonies.length === 1 ? "colony" : "colonies"} on this channel bank. {dormant
          ? "Draining collapses the caps and prevents further spore bursts."
          : `Lower the lantern one band or retreat during the ${BELLCAP_WARNING}-second warning. Bursts carry sound through the room graph; recovery lasts ${BELLCAP_COOLDOWN} seconds.`}</p>}
        {beetles.length > 0 && <p style={small}>{beetles.length} glow beetles feed here. Their low lights reveal the bellcaps in darkness; nearby light and noise send them into cover. Dry beds keep them sheltered.</p>}
        {room.waterway && <p style={{ ...small, color: "#d0b477" }}>Water {room.waterway.upstream ? `arrives from the ${room.waterway.upstream}` : "begins at the sluice"}
          {room.waterway.downstream ? ` and leaves to the ${room.waterway.downstream}.` : "; the reliquary lies at its outfall."}</p>}
        {source && outfall ? <p style={small}>The sluice at {source.id} drains the channel to {outfall.id}. Both endpoints are reachable without the vault key; the circuit never enters the exit stairs.</p>
          : <p style={small}>This floor has no complete watercourse: the available rooms cannot support both safe endpoints.</p>}
      </section>
    </div>
  </div>;
}
