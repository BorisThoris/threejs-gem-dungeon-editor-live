import { useMemo, useRef, useState } from "react";

import { setSurfaceImage } from "../game/textures/registry";
import { colors } from "../ui/overlay";
import { button, field, label, panel, secondaryButton, small } from "./styles";

const GRID = 16;
const CELL_PX = 24;
const OUT = 128;
const SHAPES = ["square", "circle", "diamond", "triangle", "hexagon"] as const;
type ShapeKind = (typeof SHAPES)[number];
const PALETTE = [
  "#2a2a2e", "#8a8a92", "#c9c9d1", "#ffffff", "#5c5451", "#7a5230", "#c8a34a", "#efe6c8",
  "#8a3b3b", "#f08196", "#ff9a2e", "#ffd479", "#3b5f8a", "#7fe3ff", "#6f8a3b", "#96ceb4",
  "#44404f", "#8b84a0", "#1a191d", "#0a0c12", "#b9f6ff", "#4ecdc4", "#e0b040", "#5d4a36",
];

interface Cell {
  color: string;
  shape: ShapeKind;
}

/**
 * A 16x16 mosaic of coloured shapes, rasterised into a floor or wall surface.
 *
 * The old creator painted a 3D grid whose only output was a PNG download
 * with no reader. The idea underneath - a small grid of shapes is exactly a
 * floor inlay or wall panel - is kept; the sink is now the surface registry,
 * so a mosaic becomes a real surface the rooms tile.
 */
export function Mosaic() {
  const blank = useMemo<Cell[]>(() => Array.from({ length: GRID * GRID }, () => ({ color: "#2a2a2e", shape: "square" })), []);
  const [cells, setCells] = useState<Cell[]>(blank);
  const [color, setColor] = useState("#c8a34a");
  const [shape, setShape] = useState<ShapeKind>("square");
  const [mirror, setMirror] = useState(true);
  const [surfaceId, setSurfaceId] = useState("mosaic");
  const dragging = useRef(false);

  const paint = (index: number) => {
    setCells((prev) => {
      const next = prev.slice();
      const x = index % GRID;
      const y = Math.floor(index / GRID);
      const targets = mirror ? [[x, y], [GRID - 1 - x, y], [x, GRID - 1 - y], [GRID - 1 - x, GRID - 1 - y]] : [[x, y]];
      for (const [tx, ty] of targets) next[ty * GRID + tx] = { color, shape };
      return next;
    });
  };

  const rasterise = (): string => {
    const canvas = document.createElement("canvas");
    canvas.width = OUT;
    canvas.height = OUT;
    const g = canvas.getContext("2d")!;
    const s = OUT / GRID;
    cells.forEach((cell, i) => {
      const x = (i % GRID) * s;
      const y = Math.floor(i / GRID) * s;
      g.fillStyle = "#2a2a2e";
      g.fillRect(x, y, s, s);
      g.fillStyle = cell.color;
      const cx = x + s / 2;
      const cy = y + s / 2;
      const r = s / 2;
      g.beginPath();
      switch (cell.shape) {
        case "square":
          g.rect(x, y, s, s);
          break;
        case "circle":
          g.arc(cx, cy, r, 0, Math.PI * 2);
          break;
        case "diamond":
          g.moveTo(cx, y);
          g.lineTo(x + s, cy);
          g.lineTo(cx, y + s);
          g.lineTo(x, cy);
          break;
        case "triangle":
          g.moveTo(cx, y);
          g.lineTo(x + s, y + s);
          g.lineTo(x, y + s);
          break;
        case "hexagon":
          for (let k = 0; k < 6; k++) {
            const a = (k / 6) * Math.PI * 2;
            g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
          }
          break;
      }
      g.closePath();
      g.fill();
    });
    return canvas.toDataURL("image/png");
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "240px auto", gap: 16, minHeight: 0 }}>
      <div style={{ ...panel, overflow: "auto" }}>
        <div style={label}>COLOUR</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 8 }}>
          {PALETTE.map((c) => (
            <div key={c} onClick={() => setColor(c)} style={{ width: 22, height: 22, background: c, borderRadius: 3, cursor: "pointer", border: `2px solid ${c === color ? "#fff" : "transparent"}` }} />
          ))}
        </div>
        <div style={label}>SHAPE</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 10 }}>
          {SHAPES.map((s) => (
            <button key={s} onClick={() => setShape(s)} style={{ ...secondaryButton, width: "auto", margin: 0, padding: "6px 8px", fontSize: 9, borderColor: s === shape ? colors.accent : colors.line }}>
              {s}
            </button>
          ))}
        </div>
        <label style={{ ...small, display: "block", marginBottom: 10 }}>
          <input type="checkbox" checked={mirror} onChange={(e) => setMirror(e.target.checked)} /> mirror four ways
        </label>
        <div style={label}>SAVE AS SURFACE</div>
        <input style={field} value={surfaceId} onChange={(e) => setSurfaceId(e.target.value.trim())} />
        <button style={button} onClick={() => surfaceId && setSurfaceImage(surfaceId, rasterise())}>
          Save "{surfaceId}"
        </button>
        <button style={secondaryButton} onClick={() => setCells(blank)}>
          Clear
        </button>
        <div style={small}>A saved mosaic is a surface like any other: open the Surfaces tab to see it, or use its id in a room kind.</div>
      </div>
      <div style={{ ...panel, padding: 6 }}>
        <div
          onPointerDown={() => (dragging.current = true)}
          onPointerUp={() => (dragging.current = false)}
          onPointerLeave={() => (dragging.current = false)}
          style={{ display: "grid", gridTemplateColumns: `repeat(${GRID}, ${CELL_PX}px)`, gap: 1, background: "#14161d", padding: 1, width: GRID * (CELL_PX + 1) + 1, borderRadius: 4, touchAction: "none" }}
        >
          {cells.map((cell, i) => (
            <div
              key={i}
              onPointerDown={() => paint(i)}
              onPointerEnter={() => dragging.current && paint(i)}
              style={{ width: CELL_PX, height: CELL_PX, background: cell.color, borderRadius: cell.shape === "circle" ? "50%" : cell.shape === "square" ? 0 : 4, cursor: "crosshair" }}
              title={cell.shape}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
