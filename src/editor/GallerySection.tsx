import { useMemo, useState } from "react";
import type { Dir, Room } from "../game/dungeon/types";
import { DIR_STEP } from "../game/dungeon/types";
import { terracesFor } from "../game/worldbuilding/elevation";
import { passageLampsFor } from "../game/worldbuilding/passageLighting";
import { GROUND_Y, WALL_HEIGHT } from "../game/world";
import { field, label, small } from "./styles";

/** Side elevation of the same ramp and lamps used by the physical room. */
export function GallerySection({ room }: { room: Room }) {
  const galleries = useMemo(() => terracesFor(room), [room]);
  const lamps = useMemo(() => passageLampsFor(room), [room]);
  const [direction, setDirection] = useState<Dir>("north");
  const gallery = galleries.find(g => g.dir === direction) ?? galleries[0];
  if (!gallery) return null;
  const axis = DIR_STEP[gallery.dir];
  const length = gallery.end - gallery.start;
  const sx = (distance: number) => 25 + distance / length * 450;
  const sy = (height: number) => 145 - height * 24;
  const rampLength = gallery.rampEnd - gallery.start;
  const widths = gallery.courses.map(c => c.width);
  return <section style={{ marginTop: 18 }} aria-label="Gallery elevation">
    <label style={label}>GALLERY SECTION <select aria-label="Gallery direction" value={gallery.dir}
      onChange={e => setDirection(e.target.value as Dir)} style={{ ...field, width: "auto", marginLeft: 8 }}>
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
    </svg>
    <p style={small}>{rampLength} m ramp · {length} m gallery · {Math.min(...widths).toFixed(1)}–{Math.max(...widths).toFixed(1)} m floor width.
      Side view shows the actual ramp, landing and hanging lamps. The blueprint above shows the changing width.</p>
  </section>;
}
