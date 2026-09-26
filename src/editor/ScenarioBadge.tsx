import { atlasUrl, scenarioFromSearch } from "./scenario";

/** A quiet way back to the exact Atlas selection used to launch a scenario. */
export default function ScenarioBadge() {
  const scenario = scenarioFromSearch(window.location.search);
  if (!scenario) return null;
  return <div data-testid="scenario-badge" style={{ position: "fixed", right: 12, top: 224, zIndex: 100, padding: "8px 10px",
    background: "rgba(16,20,23,0.92)", border: "1px solid #49514f", color: "#c8d4d3", fontSize: 11 }}>
    <div>DEV SCENARIO · seed {scenario.seed} · floor {scenario.floor} · {scenario.roomId}</div>
    <a href={atlasUrl(scenario)} style={{ color: "#7fe3ff" }}>Back to atlas</a>
  </div>;
}
