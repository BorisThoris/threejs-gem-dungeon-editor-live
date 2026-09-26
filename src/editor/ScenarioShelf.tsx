import { useMemo, useState } from "react";
import { ROOM_KINDS, SHAPES } from "../game/dungeon/types";
import { colors } from "../ui/overlay";
import { atlasUrl, scenarioUrl } from "./scenario";
import { scenarioCoverageCases } from "./scenarioCases";
import { field, label, panel, secondaryButton, small } from "./styles";

/** Generated, playable fixtures for visual and interaction reviews. */
export function ScenarioShelf() {
  const cases = useMemo(() => scenarioCoverageCases(), []);
  const [filter, setFilter] = useState("");
  const term = filter.trim().toLowerCase();
  const visible = cases.filter(test => !term ||
    [test.kind, test.shape, test.district, test.roomId, String(test.seed), String(test.floor)]
      .some(value => value.toLowerCase().includes(term)));
  const kinds = new Set(cases.map(test => test.kind));
  const shapes = new Set(cases.map(test => test.shape));
  return <div>
    <div style={{ ...panel, marginBottom: 16 }}>
      <div style={label}>PLAYABLE SCENARIO SHELF</div>
      <p style={{ ...small, maxWidth: 850 }}>
        Deterministic generated rooms for inspecting art, interaction and geometry in the real game.
        Each case adds a room kind or footprint to the review set. Inspect it in the World atlas,
        or launch it as a fresh playable run.
      </p>
      <div data-testid="scenario-coverage" style={{ color: colors.accent, marginBottom: 12 }}>
        {kinds.size}/{ROOM_KINDS.length} room kinds · {shapes.size}/{SHAPES.length} footprints · {cases.length} cases
      </div>
      <input aria-label="Filter scenarios" value={filter} onChange={event => setFilter(event.target.value)}
        placeholder="Filter by kind, shape, district, seed or room" style={{ ...field, maxWidth: 420, marginBottom: 0 }} />
      <span style={{ ...small, marginLeft: 12 }}>{visible.length} shown</span>
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
      {visible.map(test => <div key={`${test.seed}:${test.floor}:${test.roomId}`} data-testid="scenario-case"
        data-kind={test.kind} data-shape={test.shape} data-seed={test.seed} data-floor={test.floor} data-room={test.roomId}
        style={panel}>
        <div style={{ color: colors.accent, fontSize: 13, marginBottom: 7 }}>
          {test.kind.toUpperCase()} · {test.shape}
        </div>
        <div style={small}>{test.district} · run seed {test.seed} · floor {test.floor} · {test.roomId}</div>
        <div style={{ ...small, color: "#91cba2" }}>
          {test.coversKind && "new kind"}{test.coversKind && test.coversShape && " · "}{test.coversShape && "new footprint"}
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <a href={atlasUrl(test)} data-testid="case-inspect"
            style={{ ...secondaryButton, flex: 1, textAlign: "center", textDecoration: "none" }}>Inspect</a>
          <a href={scenarioUrl(test)} data-testid="case-play"
            style={{ ...secondaryButton, flex: 1, textAlign: "center", textDecoration: "none" }}>Play room →</a>
        </div>
      </div>)}
    </div>
  </div>;
}
