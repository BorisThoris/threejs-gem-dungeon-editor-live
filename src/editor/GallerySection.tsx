import { useMemo } from "react";
import type { Room } from "../game/dungeon/types";
import { DIR_STEP } from "../game/dungeon/types";
import { floorHeightAt, terracePoint, terracesFor } from "../game/worldbuilding/elevation";
import { wingWidthAt } from "../game/dungeon/footprint";
import { passageLampsFor } from "../game/worldbuilding/passageLighting";
import { GROUND_Y, WALL_HEIGHT } from "../game/world";
import { galleryTerminiFor } from "../game/worldbuilding/galleryTermini";
import { field, label, small } from "./styles";

/** Side elevation of the same ramp and lamps used by the physical room. */
export function GallerySection({ room, probe, onProbe }: { room: Room; probe: { x: number; z: number }; onProbe: (x: number, z: number) => void }) {
  const galleries = useMemo(() => terracesFor(room), [room]);
  const termini = useMemo(() => galleryTerminiFor(room), [room]);
  const lamps = useMemo(() => passageLampsFor(room), [room]);
  const selected = galleries.find(g => {
    const axis = DIR_STEP[g.dir], along = probe.x * axis.x + probe.z * axis.z;
    const across = (axis.x ? probe.z : probe.x) - g.offset;
    return along >= g.start && along <= g.end && Math.abs(across) <= wingWidthAt(room, g.dir, along) / 2;
  });
  const gallery = selected ?? galleries[0];
  if (!gallery) return null;
  const axis = DIR_STEP[gallery.dir];
  const length = gallery.end - gallery.start;
  const sx = (distance: number) => 25 + distance / length * 450;
  const sy = (height: number) => 145 - height * 24;
  const rampLength = gallery.rampEnd - gallery.start;
  const widths = gallery.courses.map(c => c.width);
  const distance = selected ? probe.x * axis.x + probe.z * axis.z - gallery.start : length / 2;
  const along = gallery.start + distance;
  const [centerX, , centerZ] = terracePoint(gallery, along, 0, 0);
  const x = selected ? probe.x : centerX, z = selected ? probe.z : centerZ;
  const height = floorHeightAt(room, x, z) - GROUND_Y;
  const width = wingWidthAt(room, gallery.dir, along);
  return <section style={{ marginTop: 18 }} aria-label="Gallery elevation">
    <label style={label}>GALLERY SECTION <select aria-label="Gallery direction" value={gallery.dir}
      onChange={e => {
        const next = galleries.find(g => g.dir === e.target.value);
        if (next) { const [x, , z] = terracePoint(next, (next.start + next.end) / 2, 0, 0); onProbe(x, z); }
      }} style={{ ...field, width: "auto", marginLeft: 8 }}>
      {galleries.map(g => <option key={g.dir} value={g.dir}>{g.dir}</option>)}
    </select></label>
    <svg aria-label={`${gallery.dir} gallery side elevation`} viewBox="0 0 500 180" style={{ width: "100%", background: "#0b1012", borderRadius: 8 }}>
      <path d={`M 25 ${sy(0)} L ${sx(rampLength)} ${sy(gallery.height)} L 475 ${sy(gallery.height)} L 475 153 L 25 153 Z`}
        fill="#594a32" stroke="#b39766" strokeWidth={2} />
      <line x1={25} x2={475} y1={sy(WALL_HEIGHT)} y2={sy(WALL_HEIGHT)} stroke="#8e968d" strokeWidth={3} />
      {lamps.filter(l => l.dir === gallery.dir).map((lamp, i) => {
        const along = lamp.position[0] * axis.x + lamp.position[2] * axis.z - gallery.start;
        const y = lamp.position[1] - GROUND_Y;
        return <g key={i} data-testid="gallery-section-lamp">
          <line x1={sx(along)} x2={sx(along)} y1={sy(WALL_HEIGHT)} y2={sy(y)} stroke="#9b8762" />
          <rect x={sx(along) - 4} y={sy(y) - 5} width={8} height={10} fill="#ffd38a" />
        </g>;
      })}
      <text x={25} y={169} fill="#abae9d" fontSize={11}>Mouth · 0 m</text>
      <text x={475} y={169} textAnchor="end" fill="#abae9d" fontSize={11}>{length} m · end wall</text>
      <text x={sx(rampLength) + 6} y={sy(gallery.height) - 8} fill="#dac391" fontSize={11}>+{gallery.height} m landing</text>
      {selected && <g data-testid="gallery-inspection-marker">
        <line x1={sx(distance)} x2={sx(distance)} y1={sy(WALL_HEIGHT)} y2={sy(height)} stroke="#91c7c0" strokeDasharray="3 3" />
        <circle cx={sx(distance)} cy={sy(height)} r={5} fill="#91c7c0" stroke="#0b1012" strokeWidth={2} />
      </g>}
    </svg>
    <label style={label}>INSPECT ALONG GALLERY
      <input aria-label="Distance into gallery" type="range" min={0} max={length} step={0.1} value={distance}
        onChange={e => { const [x, , z] = terracePoint(gallery, gallery.start + Number(e.target.value), 0, 0); onProbe(x, z); }} style={{ width: "100%", accentColor: "#91c7c0" }} />
    </label>
    <output aria-live="polite" data-testid="gallery-inspection-readout" style={{ ...small, display: "block" }}>
      {selected ? <>{distance.toFixed(1)} m from mouth · floor +{height.toFixed(2)} m · {width.toFixed(1)} m wide · {(WALL_HEIGHT - height).toFixed(2)} m to ceiling.
        {" "}Room position ({x.toFixed(1)}, {z.toFixed(1)}).</> : "Move the slider or select a gallery position in the blueprint to inspect it."}
    </output>
    <p style={small}><strong>{termini.definition.name}</strong> · {termini.definition.description}
      {termini.sites.length > 1 ? " This room has a paired transept." : ""}
      {termini.sites.some(site => site.secretFlank) ? " Its two sides flank the cracked-wall approach." : ""}</p>
    <p style={small}>{rampLength} m ramp · {length} m gallery · {Math.min(...widths).toFixed(1)}–{Math.max(...widths).toFixed(1)} m floor width.
      Side view shows the actual ramp, landing and hanging lamps. The blueprint above shows the changing width.</p>
  </section>;
}
