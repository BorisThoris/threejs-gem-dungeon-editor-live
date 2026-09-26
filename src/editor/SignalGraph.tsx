import { useMemo, useState } from "react";

import { generateRunFloor, runFloorSeed } from "../game/dungeon/runFloor";
import { carryRoute, aged, AUDIBLE, DOORWAY, HALF_LIFE_S } from "../game/din/carry";
import { EMISSIONS, HELD, loudnessIn, type EmissionId, type HeldId } from "../game/din/emissions";
import { answersTo, SUSCEPTIBILITY, type ReceiverId } from "../game/din/susceptibility";
import type { Tag } from "../game/din/tags";
import { CREATURES } from "../game/mobs/contract";
import type { Footing } from "../game/rooms/underfoot";
import { barKey } from "../game/warden/bars";
import { colors } from "../ui/overlay";
import { MAX_SCENARIO_SEED, scenarioSeedInput, scenarioUrl } from "./scenario";
import { field, label, panel, secondaryButton, small } from "./styles";
import { SIGNAL_FOOTINGS, SIGNAL_AGE_MAX, SIGNAL_STRENGTH_MAX, signalGraphFromSearch, signalGraphUrl, type SignalSource } from "./signalGraphState";

const RECEIVERS = Object.keys(SUSCEPTIBILITY) as ReceiverId[];
const rowHeight = 41;

const title = (id: string): string => id.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^./, (s) => s.toUpperCase());
const receiverName = (id: ReceiverId): string => id === "sentry" ? "Sentry" : CREATURES[id].name;
const number = (value: number): string => value.toFixed(2);

/** The game's actual emission, carry and receiver tables drawn as a causal graph. */
export function SignalGraph() {
  const [initial] = useState(() => signalGraphFromSearch(window.location.search));
  const [source, setSource] = useState<SignalSource>(initial.source);
  const [seed, setSeed] = useState(initial.seed);
  const [floor, setFloor] = useState(initial.floor);
  const [roomBias, setRoomBias] = useState(initial.roomBias);
  const [fromId, setFromId] = useState(initial.fromId);
  const [toId, setToId] = useState(initial.toId);
  const [barredDoor, setBarredDoor] = useState(initial.barredDoor);
  const [age, setAge] = useState(initial.age);
  const [footing, setFooting] = useState<Footing>(initial.footing);
  const [heldStrength, setHeldStrength] = useState(initial.heldStrength);
  const [selectedReceiver, setSelectedReceiver] = useState<ReceiverId>(initial.selectedReceiver);

  const dungeon = useMemo(() => generateRunFloor(seed, floor, roomBias), [seed, floor, roomBias]);
  const from = dungeon.rooms.find((room) => room.id === fromId) ?? dungeon.rooms[0];
  const to = dungeon.rooms.find((room) => room.id === toId) ?? from;
  const doors = dungeon.rooms.flatMap((room) => Object.values(room.links).filter((next): next is string => Boolean(next))
    .map((next) => ({ key: barKey(room.id, next), label: `${room.id} ↔ ${next}` })))
    .filter((door, index, all) => all.findIndex((candidate) => candidate.key === door.key) === index);
  const bars = new Set(barredDoor && doors.some((door) => door.key === barredDoor) ? [barredDoor] : []);
  const permalink = signalGraphUrl({ source, seed, floor, roomBias, fromId: from.id, toId: to.id,
    barredDoor: bars.size ? barredDoor : "", age, footing, heldStrength, selectedReceiver });
  const declaration = source.kind === "impulse" ? EMISSIONS[source.id] : HELD[source.id];
  const tags: readonly Tag[] = declaration.tags;
  const underfoot = "underfoot" in declaration && declaration.underfoot === true;
  const magnitude = source.kind === "impulse"
    ? loudnessIn(source.id, from, footing)
    : declaration.magnitude * heldStrength;
  const route = magnitude < AUDIBLE || tags.length === 0
    ? { rooms: [], strengths: [], magnitude: 0 } : carryRoute(dungeon.rooms, from.id, to.id, magnitude, bars);
  const carried = route.magnitude;
  const arriving = source.kind === "impulse" ? aged(carried, age) : carried;
  const matches = RECEIVERS.map((id) => ({
    id,
    active: tags.some((tag) => answersTo(SUSCEPTIBILITY[id], tag, arriving)),
  }));
  const activeCount = matches.filter((match) => match.active).length;
  const height = Math.max(510, RECEIVERS.length * rowHeight + 76);
  const tagY = (index: number): number => (height * (index + 1)) / (tags.length + 1);
  const receiverY = (index: number): number => 44 + index * rowHeight;
  const selected = SUSCEPTIBILITY[selectedReceiver];
  const selectedTags = tags.filter((tag) => selected.answers[tag] !== undefined);
  const activeTags = selectedTags.filter((tag) => answersTo(selected, tag, arriving));

  return <div style={{ display: "grid", gridTemplateColumns: "270px minmax(0, 1fr)", gap: 16, minHeight: "calc(100vh - 96px)" }}>
    <div style={{ ...panel, alignSelf: "start" }}>
      <div style={label}>SIGNAL GRAPH · LIVE RULES</div>
      <p style={small}>Choose a source and a route. The graph reads the game's emission tags, doorway carry and receiver thresholds.</p>
      <a data-testid="signal-permalink" href={permalink} target="_blank" rel="noreferrer"
        style={{ ...secondaryButton, display: "block", textAlign: "center", textDecoration: "none" }}>Link to this graph ↗</a>
      <p style={small}>Open or copy this link to reproduce all current settings.</p>
      <label style={label} htmlFor="signal-source">SOURCE</label>
      <select id="signal-source" data-testid="signal-source" style={field}
        value={`${source.kind}:${source.id}`} onChange={(event) => {
          const [kind, id] = event.target.value.split(":");
          setSource(kind === "held" ? { kind, id: id as HeldId } : { kind: "impulse", id: id as EmissionId });
          setAge(0);
        }}>
        <optgroup label="Events">
          {(Object.keys(EMISSIONS) as EmissionId[]).map((id) => <option key={id} value={`impulse:${id}`}>{title(id)}</option>)}
        </optgroup>
        <optgroup label="Sustained">
          {(Object.keys(HELD) as HeldId[]).map((id) => <option key={id} value={`held:${id}`}>{title(id)}</option>)}
        </optgroup>
      </select>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <div><label style={label} htmlFor="signal-seed">RUN SEED</label><input id="signal-seed" data-testid="signal-seed"
          style={field} type="number" min={1} max={MAX_SCENARIO_SEED} value={seed}
          onChange={(event) => setSeed(scenarioSeedInput(event.target.value))} /></div>
        <div><label style={label} htmlFor="signal-floor">FLOOR</label><select id="signal-floor" style={field} value={floor}
          onChange={(event) => setFloor(Number(event.target.value))}>{[1, 2, 3].map((n) => <option key={n} value={n}>{n}</option>)}</select></div>
      </div>
      <label style={{ ...small, display: "block", cursor: "pointer", marginBottom: 8 }}><input data-testid="signal-room-bias"
        type="checkbox" checked={roomBias} onChange={event => setRoomBias(event.target.checked)} /> Foreman's Tally room bias</label>
      <div data-testid="signal-floor-seed" style={{ ...small, marginBottom: 10 }}>Floor seed {runFloorSeed(seed, floor)}</div>
      <label style={label} htmlFor="signal-from">SOURCE ROOM</label>
      <select id="signal-from" style={field} value={from.id} onChange={(event) => setFromId(event.target.value)}>
        {dungeon.rooms.map((room) => <option key={room.id} value={room.id}>{room.id} · {room.kind}</option>)}
      </select>
      <label style={label} htmlFor="signal-to">LISTENER ROOM</label>
      <select id="signal-to" data-testid="signal-to" style={field} value={to.id} onChange={(event) => setToId(event.target.value)}>
        {dungeon.rooms.map((room) => <option key={room.id} value={room.id}>{room.id} · {room.kind}</option>)}
      </select>
      <div style={{ display: "flex", gap: 7, marginBottom: 10 }}>
        <a data-testid="signal-play-source" href={scenarioUrl({ seed, floor, roomId: from.id, roomBias })}
          target="_blank" rel="noreferrer" aria-label="Play source room"
          style={{ ...secondaryButton, flex: 1, textAlign: "center", textDecoration: "none" }}>
          Play source ↗
        </a>
        <a data-testid="signal-play-listener" href={scenarioUrl({ seed, floor, roomId: to.id, roomBias })}
          target="_blank" rel="noreferrer" aria-label="Play listener room"
          style={{ ...secondaryButton, flex: 1, textAlign: "center", textDecoration: "none" }}>
          Play listener ↗
        </a>
      </div>
      <label style={label} htmlFor="signal-bar">BARRED DOORWAY</label>
      <select id="signal-bar" data-testid="signal-bar" style={field} value={bars.size ? barredDoor : ""}
        onChange={(event) => setBarredDoor(event.target.value)}>
        <option value="">None</option>
        {doors.map((door) => <option key={door.key} value={door.key}>{door.label}</option>)}
      </select>
      {underfoot && <><label style={label} htmlFor="signal-footing">UNDERFOOT</label>
        <select id="signal-footing" style={field} value={footing} onChange={(event) => setFooting(event.target.value as Footing)}>
          {SIGNAL_FOOTINGS.map((name) => <option key={name} value={name}>{title(name)}</option>)}
        </select></>}
      {source.kind === "impulse" ? <><label style={label} htmlFor="signal-age">SECONDS AFTER EVENT · {age.toFixed(1)}</label>
        <input id="signal-age" data-testid="signal-age" style={{ width: "100%", marginBottom: 14 }} type="range" min={0} max={SIGNAL_AGE_MAX} step={0.5}
          value={age} onChange={(event) => setAge(Number(event.target.value))} /></>
        : <><label style={label} htmlFor="signal-strength">HELD STRENGTH · ×{heldStrength.toFixed(1)}</label>
          <input id="signal-strength" style={{ width: "100%", marginBottom: 14 }} type="range" min={0} max={SIGNAL_STRENGTH_MAX} step={0.1}
            value={heldStrength} onChange={(event) => setHeldStrength(Number(event.target.value))} /></>}
      <div style={{ ...small, borderTop: `1px solid ${colors.line}`, paddingTop: 10 }}>
        <div>Declared: {number(magnitude)} · {tags.length ? tags.join(", ") : "silent"}</div>
        <div>Doorway multiplier: ×{DOORWAY} · impulse half-life: {HALF_LIFE_S}s</div>
        <div data-testid="signal-arrival">Arriving in {to.id}: {number(arriving)}</div>
        <div data-testid="signal-active-count">{activeCount} of {RECEIVERS.length} receivers answer here</div>
      </div>
      <div style={{ borderTop: `1px solid ${colors.line}`, marginTop: 12, paddingTop: 10 }}>
        <div style={label}>INSPECT · {receiverName(selectedReceiver).toUpperCase()}</div>
        <p style={small}>{selected.tell ?? "No teaching line."}</p>
        <p style={small}>{activeTags.length ? `Answers now: ${activeTags.map((tag) => `[${tag}]`).join(" ")}`
          : selectedTags.length ? "Declared response, below threshold here." : "No response to this source's tags."}</p>
        <p style={small}>Thresholds: {Object.entries(selected.answers).map(([tag, threshold]) => `${tag} ≥ ${number(threshold)}`).join(" · ") || "none"}</p>
        {selected.deaf?.length ? <p style={small}>Deliberately deaf: {selected.deaf.join(", ")}</p> : null}
      </div>
    </div>
    <div style={{ ...panel, padding: 8, overflow: "auto" }}>
      <div style={{ ...small, padding: "5px 8px 12px" }}>
        <div style={label}>DOORWAY ROUTE · STRENGTH BEFORE TIME DECAY</div>
        <div data-testid="signal-route" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 7, marginTop: 7 }}>
          {route.rooms.length ? route.rooms.map((id, index) => <span key={id} style={{ display: "contents" }}>
            {index > 0 && <span aria-hidden="true" style={{ color: colors.dim }}>→ ×{DOORWAY}</span>}
            <span data-testid="signal-route-room" data-room-id={id} style={{ border: `1px solid ${colors.line}`, borderRadius: 4,
              padding: "5px 7px", background: index === route.rooms.length - 1 ? "#20372c" : "#1d2931" }}>
              {id} · {number(route.strengths[index])}
            </span>
          </span>) : <span>No open route carries this signal to {to.id}.</span>}
        </div>
      </div>
      <div style={{ ...label, padding: "5px 8px" }}>SOURCE → TAGS → RECEIVERS · solid lines answer at this strength · dim lines fall below threshold</div>
      <svg data-testid="signal-graph" role="img" aria-label="Signal response graph" viewBox={`0 0 1000 ${height}`}
        style={{ display: "block", width: "100%", minWidth: 760, height, background: "#0a0c12", borderRadius: 5 }}>
        {tags.map((tag, i) => <line key={`source-${tag}`} x1={230} y1={height / 2} x2={337} y2={tagY(i)} stroke={colors.accent} strokeOpacity={0.65} strokeWidth={2} />)}
        {tags.flatMap((tag, i) => RECEIVERS.flatMap((id, j) => {
          const threshold = SUSCEPTIBILITY[id].answers[tag];
          if (threshold === undefined) return [];
          const active = answersTo(SUSCEPTIBILITY[id], tag, arriving);
          return [<line key={`${tag}-${id}`} data-testid={`signal-edge-${tag}-${id}`}
            x1={480} y1={tagY(i)} x2={688} y2={receiverY(j)}
            stroke={active ? "#77e0a6" : "#73604b"} strokeOpacity={active ? 0.8 : 0.45}
            strokeWidth={active ? 2 : 1.2} strokeDasharray={active ? undefined : "4 5"}>
            <title>{tag}: {number(arriving)} arrives; {receiverName(id)} requires {number(threshold)}</title>
          </line>];
        }))}
        <rect x={22} y={height / 2 - 30} width={208} height={60} rx={5} fill="#1d2931" stroke={colors.accent} />
        <text x={38} y={height / 2 - 3} fill={colors.ink} fontSize={15}>{title(source.id)}</text>
        <text x={38} y={height / 2 + 17} fill={colors.dim} fontSize={11}>{source.kind === "held" ? "sustained" : "impulse"} · {number(magnitude)}</text>
        {tags.length === 0 && <text x={340} y={height / 2 + 5} fill={colors.dim} fontSize={16}>No signal leaves this event</text>}
        {tags.map((tag, i) => <g key={tag}>
          <rect x={337} y={tagY(i) - 18} width={143} height={36} rx={4} fill="#273039" stroke={colors.accent} />
          <text x={351} y={tagY(i) + 5} fill={colors.ink} fontSize={14}>[{tag}]</text>
        </g>)}
        {matches.map(({ id, active }, i) => <g key={id} data-testid={`signal-receiver-${id}`} role="button" tabIndex={0}
          aria-pressed={selectedReceiver === id}
          onClick={() => setSelectedReceiver(id)} onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              setSelectedReceiver(id);
            }
          }}
          style={{ cursor: "pointer" }}>
          <rect x={688} y={receiverY(i) - 16} width={290} height={33} rx={4}
            fill={selectedReceiver === id ? "#334448" : active ? "#20372c" : "#20252b"}
            stroke={active ? "#77e0a6" : selectedReceiver === id ? colors.accent : colors.line} />
          <text x={701} y={receiverY(i) + 5} fill={active ? "#d0ffe0" : colors.dim} fontSize={12}>{receiverName(id)}</text>
          <text x={959} y={receiverY(i) + 5} fill={active ? "#77e0a6" : colors.dim} textAnchor="end" fontSize={10}>
            {active ? "ANSWERS" : "QUIET"}
          </text>
        </g>)}
      </svg>
    </div>
  </div>;
}
