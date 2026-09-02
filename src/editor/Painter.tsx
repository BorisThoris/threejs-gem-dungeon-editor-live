import { useEffect, useRef, useState, type PointerEvent } from "react";

import { getSurface,
  getSurfaceOverride, hasSurfaceOverride, listSurfaces, setSurfaceImage } from "../game/textures/registry";
import { colors } from "../ui/overlay";
import { button, field, label, panel, secondaryButton, small } from "./styles";

const SIZE = 128;
const VIEW = 384;
const PALETTE = [
  "#8a8a92", "#5c5451", "#7a5230", "#4a3320", "#6e737b", "#5d4a36",
  "#a9a9b3", "#c8a34a", "#8a3b3b", "#3b5f8a", "#6f8a3b", "#efe6c8",
  "#1a191d", "#ffffff", "#7fe3ff", "#f08196",
];

/**
 * Paint a surface the rooms will actually use.
 *
 * A 128x128 tile, brushes with size and hardness, a palette, undo, and a
 * 3x3 tiled preview so seams are visible while you paint. "Save" writes the
 * tile into the surface registry under the chosen id: every floor and wall
 * that uses that surface changes on the spot, including in a running game.
 * The old painter had layers, blend modes and nine filters, and no way for
 * its output to reach a wall.
 */
export function Painter() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewRef = useRef<HTMLCanvasElement>(null);
  const [surfaceId, setSurfaceId] = useState("stone");
  const [color, setColor] = useState("#8a8a92");
  const [size, setSize] = useState(6);
  const [hardness, setHardness] = useState(0.7);
  const [opacity, setOpacity] = useState(1);
  const [snap, setSnap] = useState(0);
  const [eraser, setEraser] = useState(false);
  const painting = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const undo = useRef<ImageData[]>([]);
  const [, bump] = useState(0);

  const ctx = () => canvasRef.current!.getContext("2d")!;

  const refreshPreview = () => {
    const src = canvasRef.current;
    const dst = previewRef.current;
    if (!src || !dst) return;
    const g = dst.getContext("2d")!;
    g.imageSmoothingEnabled = false;
    for (let y = 0; y < 3; y++) for (let x = 0; x < 3; x++) g.drawImage(src, x * SIZE, y * SIZE, SIZE, SIZE);
  };

  const loadSurface = (id: string) => {
    const draw = (image: CanvasImageSource) => {
      const g = ctx();
      g.clearRect(0, 0, SIZE, SIZE);
      g.drawImage(image, 0, 0, SIZE, SIZE);
      undo.current = [];
      refreshPreview();
      bump((n) => n + 1);
    };
    // An authored surface is decoded from its stored image, not read off
    // the registry canvas, which still shows the default until that image
    // has loaded; opening on the default and saving would overwrite it.
    const url = getSurfaceOverride(id);
    if (url) {
      const image = new Image();
      image.onload = () => draw(image);
      image.src = url;
      return;
    }
    draw(getSurface(id).image as HTMLCanvasElement);
  };

  useEffect(() => {
    loadSurface(surfaceId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [surfaceId]);

  const toTile = (e: PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    let x = ((e.clientX - r.left) / r.width) * SIZE;
    let y = ((e.clientY - r.top) / r.height) * SIZE;
    if (snap > 0) {
      x = Math.floor(x / snap) * snap + snap / 2;
      y = Math.floor(y / snap) * snap + snap / 2;
    }
    return { x, y };
  };

  const dab = (x: number, y: number) => {
    const g = ctx();
    g.save();
    g.globalAlpha = opacity;
    if (eraser) g.globalCompositeOperation = "destination-out";
    if (snap > 0) {
      g.fillStyle = color;
      g.fillRect(x - snap / 2, y - snap / 2, snap, snap);
    } else {
      const grad = g.createRadialGradient(x, y, 0, x, y, size);
      grad.addColorStop(0, color);
      grad.addColorStop(hardness, color);
      grad.addColorStop(1, `${color}00`);
      g.fillStyle = grad;
      g.beginPath();
      g.arc(x, y, size, 0, Math.PI * 2);
      g.fill();
    }
    g.restore();
  };

  const onDown = (e: PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    undo.current.push(ctx().getImageData(0, 0, SIZE, SIZE));
    if (undo.current.length > 30) undo.current.shift();
    painting.current = true;
    const p = toTile(e);
    dab(p.x, p.y);
    last.current = p;
    refreshPreview();
  };
  const onMove = (e: PointerEvent<HTMLCanvasElement>) => {
    if (!painting.current) return;
    const p = toTile(e);
    const from = last.current ?? p;
    const steps = Math.max(1, Math.ceil(Math.hypot(p.x - from.x, p.y - from.y) / Math.max(1, size / 3)));
    for (let i = 1; i <= steps; i++) dab(from.x + ((p.x - from.x) * i) / steps, from.y + ((p.y - from.y) * i) / steps);
    last.current = p;
    refreshPreview();
  };
  const onUp = () => {
    painting.current = false;
    last.current = null;
  };

  const doUndo = () => {
    const prev = undo.current.pop();
    if (prev) {
      ctx().putImageData(prev, 0, 0);
      refreshPreview();
    }
  };

  const save = () => {
    setSurfaceImage(surfaceId, canvasRef.current!.toDataURL("image/png"));
    bump((n) => n + 1);
  };
  const reset = () => {
    setSurfaceImage(surfaceId, null);
    loadSurface(surfaceId);
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "240px auto 1fr", gap: 16, minHeight: 0 }}>
      <div style={{ ...panel, overflow: "auto" }}>
        <div style={label}>SURFACE</div>
        <select style={field} value={surfaceId} onChange={(e) => setSurfaceId(e.target.value)}>
          {listSurfaces().map((s) => (
            <option key={s.id} value={s.id}>
              {s.id}
              {s.custom ? " (painted)" : ""}
            </option>
          ))}
        </select>
        <input
          style={field}
          placeholder="or a new surface id…"
          onKeyDown={(e) => {
            const v = (e.target as HTMLInputElement).value.trim();
            if (e.key === "Enter" && v) setSurfaceId(v);
          }}
        />
        <div style={label}>COLOUR</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 8 }}>
          {PALETTE.map((c) => (
            <div
              key={c}
              onClick={() => {
                setColor(c);
                setEraser(false);
              }}
              style={{ width: 22, height: 22, background: c, borderRadius: 3, cursor: "pointer", border: `2px solid ${c === color && !eraser ? "#fff" : "transparent"}` }}
            />
          ))}
        </div>
        <input type="color" value={color} onChange={(e) => setColor(e.target.value)} style={{ width: "100%", height: 28, marginBottom: 8 }} />
        <div style={label}>BRUSH {size}px</div>
        <input type="range" min={1} max={24} value={size} onChange={(e) => setSize(Number(e.target.value))} style={{ width: "100%" }} />
        <div style={label}>HARDNESS {hardness.toFixed(2)}</div>
        <input type="range" min={0.05} max={1} step={0.05} value={hardness} onChange={(e) => setHardness(Number(e.target.value))} style={{ width: "100%" }} />
        <div style={label}>OPACITY {opacity.toFixed(2)}</div>
        <input type="range" min={0.05} max={1} step={0.05} value={opacity} onChange={(e) => setOpacity(Number(e.target.value))} style={{ width: "100%" }} />
        <div style={label}>PIXEL SNAP</div>
        <select style={field} value={snap} onChange={(e) => setSnap(Number(e.target.value))}>
          <option value={0}>off</option>
          <option value={4}>4 px</option>
          <option value={8}>8 px</option>
          <option value={16}>16 px</option>
        </select>
        <button style={{ ...secondaryButton, borderColor: eraser ? colors.accent : colors.line }} onClick={() => setEraser(!eraser)}>
          Eraser {eraser ? "on" : "off"}
        </button>
        <button style={secondaryButton} onClick={doUndo}>
          Undo
        </button>
        <button style={button} onClick={save}>
          Save as "{surfaceId}"
        </button>
        {hasSurfaceOverride(surfaceId) && (
          <button style={{ ...secondaryButton, color: colors.danger }} onClick={reset}>
            Reset to default
          </button>
        )}
        <div style={small}>Saving changes every floor and wall using this surface, in a running game too.</div>
      </div>
      <div style={{ ...panel, padding: 6 }}>
        <div style={label}>TILE</div>
        <canvas
          ref={canvasRef}
          width={SIZE}
          height={SIZE}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerLeave={onUp}
          style={{ width: VIEW, height: VIEW, imageRendering: "pixelated", cursor: "crosshair", touchAction: "none", borderRadius: 4 }}
        />
      </div>
      <div style={{ ...panel, padding: 6 }}>
        <div style={label}>TILED 3×3</div>
        <canvas ref={previewRef} width={SIZE * 3} height={SIZE * 3} style={{ width: VIEW, height: VIEW, imageRendering: "pixelated", borderRadius: 4 }} />
      </div>
    </div>
  );
}
