import { useMemo, useState, type ChangeEvent } from "react";

import { inDoorLane, LANE_HALF_WIDTH } from "../game/dungeon/layout";
import {
  DIRS,
  PROP_KINDS,
  ROOM_KINDS,
  SHAPES,
  type Dir,
  type PropKind,
  type PropPlacement,
  type RoomKind,
  type RoomTemplate,
  type Shape,
} from "../game/dungeon/types";
import { CATALOG } from "../game/props/catalog";
import { KIND_TITLE } from "../game/rooms/kinds";
import { ROOM_SIZE_DEFAULT } from "../game/world";
import { colors } from "../ui/overlay";
import { download, draftStore, newDraftId, useDrafts } from "./drafts";
import { Preview } from "./Preview";
import { button, field, label, panel, secondaryButton, small } from "./styles";

const CELL_PX = 22;

/**
 * Author a room the generator can place.
 *
 * A top-down grid of the room, one cell per unit. Pick a prop, click a cell,
 * and it is placed; click a placed prop to select it, then rotate or delete
 * it. The door lanes are shaded: a solid prop inside one is drawn red and
 * the game will refuse to place it, because nothing may stand between two
 * doorways. The right-hand pane is the real Room shell, so what you see is
 * what the player gets.
 *
 * Every change is saved as a draft. An enabled draft is live in the next
 * run you start; export it to ship it.
 */
export function RoomBuilder() {
  const drafts = useDrafts();
  const [activeId, setActiveId] = useState<string | null>(drafts[0]?.template.id ?? null);
  const [tool, setTool] = useState<PropKind>("barrel");
  const [selected, setSelected] = useState<number | null>(null);
  const [doors, setDoors] = useState<Dir[]>(["north", "south"]);

  const draft = drafts.find((d) => d.template.id === activeId) ?? drafts[0];
  const template = draft?.template;

  const update = (patch: Partial<RoomTemplate>) => {
    if (!template) return;
    draftStore.put({ ...template, ...patch });
  };

  const create = (kind: RoomKind) => {
    const t: RoomTemplate = { id: newDraftId(kind), kind, size: ROOM_SIZE_DEFAULT, shape: "square", props: [] };
    draftStore.put(t, false);
    setActiveId(t.id);
    setSelected(null);
  };

  const importJson = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text()) as RoomTemplate | RoomTemplate[];
      for (const t of Array.isArray(parsed) ? parsed : [parsed]) {
        if (t && typeof t.id === "string" && Array.isArray(t.props)) draftStore.put(t, false);
      }
    } catch {
      window.alert("That file is not a room template.");
    }
    event.target.value = "";
  };

  const placeAt = (cx: number, cz: number) => {
    if (!template) return;
    const x = cx - template.size / 2 + 0.5;
    const z = cz - template.size / 2 + 0.5;
    const hit = template.props.findIndex((p) => Math.abs(p.x - x) < 0.5 && Math.abs(p.z - z) < 0.5);
    if (hit >= 0) {
      setSelected(hit);
      return;
    }
    update({ props: [...template.props, { kind: tool, x, z, rotation: 0 }] });
    setSelected(template.props.length);
  };

  const editSelected = (patch: Partial<PropPlacement>) => {
    if (!template || selected === null) return;
    update({ props: template.props.map((p, i) => (i === selected ? { ...p, ...patch } : p)) });
  };

  const removeSelected = () => {
    if (!template || selected === null) return;
    update({ props: template.props.filter((_, i) => i !== selected) });
    setSelected(null);
  };

  const gridPx = template ? template.size * CELL_PX : 0;
  const cells = useMemo(() => {
    if (!template) return [];
    const out: { cx: number; cz: number }[] = [];
    for (let cz = 0; cz < template.size; cz++) for (let cx = 0; cx < template.size; cx++) out.push({ cx, cz });
    return out;
  }, [template]);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "220px 1fr 1fr", gap: 16, height: "100%", minHeight: 0 }}>
      {/* Drafts */}
      <div style={{ ...panel, overflow: "auto" }}>
        <div style={label}>NEW ROOM</div>
        <select style={field} defaultValue="" onChange={(e) => e.target.value && create(e.target.value as RoomKind)}>
          <option value="">Pick a kind…</option>
          {ROOM_KINDS.map((k) => (
            <option key={k} value={k}>
              {KIND_TITLE[k]}
            </option>
          ))}
        </select>
        <label style={{ ...secondaryButton, display: "block", textAlign: "center", cursor: "pointer" }}>
          Import JSON
          <input type="file" accept="application/json" onChange={importJson} style={{ display: "none" }} />
        </label>
        <div style={{ ...label, marginTop: 18 }}>DRAFTS</div>
        {drafts.length === 0 && <div style={small}>None yet.</div>}
        {drafts.map((d) => (
          <div
            key={d.template.id}
            onClick={() => {
              setActiveId(d.template.id);
              setSelected(null);
            }}
            style={{
              padding: "8px 10px",
              marginBottom: 6,
              borderRadius: 4,
              cursor: "pointer",
              background: d.template.id === template?.id ? "rgba(127,227,255,0.12)" : "rgba(255,255,255,0.03)",
              border: `1px solid ${d.template.id === template?.id ? colors.accent : colors.line}`,
            }}
          >
            <div style={{ fontSize: 10 }}>{d.template.id}</div>
            <div style={small}>
              {KIND_TITLE[d.template.kind]} · {d.template.props.length} props · {d.enabled ? "live" : "off"}
            </div>
          </div>
        ))}
      </div>

      {/* Grid */}
      <div style={{ ...panel, overflow: "auto" }}>
        {!template ? (
          <div style={small}>Create a room to begin.</div>
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              <div>
                <div style={label}>KIND</div>
                <select style={field} value={template.kind} onChange={(e) => update({ kind: e.target.value as RoomKind })}>
                  {ROOM_KINDS.map((k) => (
                    <option key={k} value={k}>
                      {KIND_TITLE[k]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <div style={label}>SIZE {template.size}</div>
                <input
                  type="range"
                  min={12}
                  max={28}
                  step={2}
                  value={template.size}
                  onChange={(e) => update({ size: Number(e.target.value) })}
                  style={{ width: "100%" }}
                />
              </div>
              <div>
                <div style={label}>SHAPE</div>
                <select style={field} value={template.shape} onChange={(e) => update({ shape: e.target.value as Shape })}>
                  {SHAPES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ ...label, marginTop: 12 }}>PLACE</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 10 }}>
              {PROP_KINDS.map((k) => (
                <button
                  key={k}
                  onClick={() => setTool(k)}
                  style={{
                    ...secondaryButton,
                    width: "auto",
                    margin: 0,
                    padding: "6px 8px",
                    fontSize: 9,
                    borderColor: tool === k ? colors.accent : colors.line,
                    color: tool === k ? colors.accent : colors.ink,
                  }}
                >
                  {CATALOG[k].title}
                </button>
              ))}
            </div>

            <svg
              width={gridPx}
              height={gridPx}
              style={{ display: "block", background: "#14161d", borderRadius: 4, maxWidth: "100%", height: "auto" }}
              viewBox={`0 0 ${gridPx} ${gridPx}`}
            >
              {/* Door lanes */}
              {doors.map((d) => {
                const w = LANE_HALF_WIDTH * 2 * CELL_PX;
                const mid = gridPx / 2 - w / 2;
                const horizontal = d === "east" || d === "west";
                const props = horizontal
                  ? { x: d === "west" ? 0 : gridPx / 2, y: mid, width: gridPx / 2, height: w }
                  : { x: mid, y: d === "north" ? 0 : gridPx / 2, width: w, height: gridPx / 2 };
                return <rect key={d} {...props} fill="rgba(127,227,255,0.07)" />;
              })}
              {cells.map(({ cx, cz }) => (
                <rect
                  key={`${cx},${cz}`}
                  x={cx * CELL_PX}
                  y={cz * CELL_PX}
                  width={CELL_PX}
                  height={CELL_PX}
                  fill="transparent"
                  stroke="rgba(255,255,255,0.06)"
                  onClick={() => placeAt(cx, cz)}
                  style={{ cursor: "crosshair" }}
                />
              ))}
              {template.props.map((p, i) => {
                const info = CATALOG[p.kind];
                const bad = info.solid && inDoorLane(p.x, p.z);
                const px = (p.x + template.size / 2) * CELL_PX;
                const pz = (p.z + template.size / 2) * CELL_PX;
                return (
                  <g key={i} onClick={() => setSelected(i)} style={{ cursor: "pointer" }}>
                    <circle
                      cx={px}
                      cy={pz}
                      r={Math.max(6, info.radius * CELL_PX * (p.scale ?? 1))}
                      fill={bad ? "rgba(240,129,150,0.5)" : info.solid ? "rgba(255,212,121,0.45)" : "rgba(127,227,255,0.35)"}
                      stroke={i === selected ? "#fff" : "none"}
                      strokeWidth={2}
                    />
                    <line
                      x1={px}
                      y1={pz}
                      x2={px + Math.sin(p.rotation ?? 0) * 10}
                      y2={pz + Math.cos(p.rotation ?? 0) * 10}
                      stroke="#fff"
                      strokeWidth={1.5}
                    />
                    <text x={px} y={pz + 3} fontSize={8} textAnchor="middle" fill="#fff" style={{ pointerEvents: "none" }}>
                      {info.title[0]}
                    </text>
                  </g>
                );
              })}
            </svg>

            {selected !== null && template.props[selected] && (
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 10 }}>
                <span style={small}>
                  {CATALOG[template.props[selected].kind].title} at ({template.props[selected].x.toFixed(1)},{" "}
                  {template.props[selected].z.toFixed(1)})
                </span>
                <button style={{ ...secondaryButton, width: "auto", margin: 0 }} onClick={() => editSelected({ rotation: (template.props[selected].rotation ?? 0) + Math.PI / 4 })}>
                  Rotate
                </button>
                <button style={{ ...secondaryButton, width: "auto", margin: 0, color: colors.danger }} onClick={removeSelected}>
                  Delete
                </button>
              </div>
            )}

            <div style={{ ...label, marginTop: 14 }}>PREVIEW DOORS</div>
            <div style={{ display: "flex", gap: 10 }}>
              {DIRS.map((d) => (
                <label key={d} style={small}>
                  <input
                    type="checkbox"
                    checked={doors.includes(d)}
                    onChange={(e) => setDoors(e.target.checked ? [...doors, d] : doors.filter((x) => x !== d))}
                  />{" "}
                  {d}
                </label>
              ))}
            </div>

            <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
              <button style={{ ...button, width: "auto", margin: 0 }} onClick={() => draftStore.setEnabled(template.id, !draft?.enabled)}>
                {draft?.enabled ? "Live in runs: on" : "Live in runs: off"}
              </button>
              <button
                style={{ ...secondaryButton, width: "auto", margin: 0 }}
                onClick={() => download(`${template.id}.json`, JSON.stringify(template, null, 2))}
              >
                Export JSON
              </button>
              <button
                style={{ ...secondaryButton, width: "auto", margin: 0 }}
                onClick={() => {
                  const copy = { ...template, id: newDraftId(template.kind) };
                  draftStore.put(copy, false);
                  setActiveId(copy.id);
                }}
              >
                Duplicate
              </button>
              <button
                style={{ ...secondaryButton, width: "auto", margin: 0, color: colors.danger }}
                onClick={() => {
                  if (window.confirm(`Delete ${template.id}?`)) {
                    draftStore.remove(template.id);
                    setActiveId(null);
                  }
                }}
              >
                Delete room
              </button>
            </div>
          </>
        )}
      </div>

      {/* Live preview */}
      <div style={{ ...panel, padding: 6, minHeight: 420 }}>
        {template && <Preview template={template} doors={doors} />}
      </div>
    </div>
  );
}
