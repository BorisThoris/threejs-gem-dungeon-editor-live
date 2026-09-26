import { useEffect, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Line, OrbitControls } from "@react-three/drei";
import { Physics, useRapier } from "@react-three/rapier";
import { DoubleSide, type Scene } from "three";

import { PROP_KINDS, type PropKind, type PropPlacement } from "../game/dungeon/types";
import { CATALOG, Prop, PropColliders } from "../game/props/catalog";
import { colliderFootprintRadius } from "../game/props/specs";
import { PLAYER_CAPSULE_HALF_HEIGHT, PLAYER_CAPSULE_RADIUS, PLAYER_REST_Y } from "../game/world";
import { useSurface } from "../game/textures/registry";
import { colors } from "../ui/overlay";
import { panel, label, small, secondaryButton } from "./styles";

const columns = 5;
const spacing = 6;
const hallPosition = (index: number): [number, number, number] => [
  (index % columns - 2) * spacing,
  0,
  (Math.floor(index / columns) - 1.5) * spacing,
];

type SweepResult = { kind: PropKind; axis: "X" | "Z"; mode: "ray" | "player" | "clearance"; expected: "blocked" | "clear"; actual: "blocked" | "clear"; distance: number | null; pass: boolean;
  origin: [number, number, number]; direction: [number, number, number]; length: number };

/** All catalog props on one level datum, using the same renderers as play. */
export function TestHall() {
  const [focused, setFocused] = useState<PropKind | null>(null);
  const [showFootprints, setShowFootprints] = useState(false);
  const [showColliders, setShowColliders] = useState(false);
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [chestOpen, setChestOpen] = useState(false);
  const [sweepRequest, setSweepRequest] = useState(0);
  const [sweepResults, setSweepResults] = useState<SweepResult[] | null>(null);
  const [selectedLane, setSelectedLane] = useState(0);
  const transformable = focused ? CATALOG[focused].transformable !== false : true;
  const index = focused ? PROP_KINDS.indexOf(focused) : -1;
  const target = index >= 0 ? hallPosition(index) : [0, 0, 0] as [number, number, number];
  const camera: [number, number, number] = focused
    ? [target[0] + 3.5, 3, target[2] + 3.5]
    : [25, 28, 30];
  const placements: PropPlacement[] = PROP_KINDS.flatMap((kind, i) => {
    if (focused && kind !== focused) return [];
    const [x, , z] = hallPosition(i);
    return [{ kind, x, z, scale: focused ? scale : 1, rotation: focused ? rotation * Math.PI / 180 : 0 }];
  });
  const choose = (kind: PropKind | null) => {
    setFocused(kind);
    setScale(1);
    setRotation(0);
    setChestOpen(false);
    setSweepRequest(0);
    setSweepResults(null);
  };

  return <div style={{ display: "grid", gridTemplateColumns: "245px minmax(0, 1fr)", gap: 16, height: "calc(100vh - 96px)", minHeight: 440 }}>
    <div style={{ ...panel, overflow: "auto" }}>
      <div style={label}>PROP TEST HALL · {PROP_KINDS.length} STATIONS</div>
      <p style={small}>A flat, lit space for comparing every prop. Select a station to inspect its geometry, placement boundary and collider. Drag to orbit; scroll to zoom.</p>
      <button style={{ ...secondaryButton, marginBottom: 12 }} onClick={() => choose(null)}>View all stations</button>
      <div style={{ borderTop: `1px solid ${colors.line}`, paddingTop: 10, marginBottom: 12 }}>
        <label style={{ ...small, display: "block", cursor: "pointer" }}><input data-testid="hall-footprints" type="checkbox"
          checked={showFootprints} onChange={(event) => setShowFootprints(event.target.checked)} /> Placement guides</label>
        <label style={{ ...small, display: "block", cursor: "pointer" }}><input data-testid="hall-colliders" type="checkbox"
          checked={showColliders} onChange={(event) => setShowColliders(event.target.checked)} /> Collider outlines</label>
        <p style={{ ...small, margin: "5px 0 0" }}>Amber = placement guide · cyan = physical collider · grid = 1 metre</p>
      </div>
      <div style={{ borderBottom: `1px solid ${colors.line}`, paddingBottom: 12, marginBottom: 12 }}>
        <button data-testid="hall-sweep" style={{ ...secondaryButton, marginBottom: 6 }} onClick={() => {
          setSweepResults(null);
          setSelectedLane(0);
          setSweepRequest(request => request + 1);
        }}>Sweep collision lanes</button>
        <p style={{ ...small, margin: "0 0 6px" }}>Sweep rays and the real player capsule through each station, then walk the capsule beside its footprint. Solid props should block the centre; every side lane should clear.</p>
        {sweepResults && <div data-testid="hall-sweep-results" aria-live="polite" style={small}>
          <strong>{sweepResults.filter(result => result.pass).length}/{sweepResults.length} lanes match the catalog</strong>
          <p style={small}>Select a lane to see its path. The marker stops at the first contact, or at the end of a clear lane. Capsule outlines use the player's actual size.</p>
          {sweepResults.map((result, lane) => <button key={`${result.kind}-${result.axis}-${result.mode}`} data-testid={`${result.mode === "ray" ? "hall-sweep" : result.mode === "player" ? "hall-body" : "hall-clearance"}-${result.kind}-${result.axis.toLowerCase()}`}
            data-pass={result.pass} aria-pressed={selectedLane === lane} onClick={() => setSelectedLane(lane)}
            style={{ ...secondaryButton, width: "100%", textAlign: "left", marginTop: 3, padding: "5px 6px",
              borderColor: selectedLane === lane ? colors.accent : colors.line, color: result.pass ? colors.ink : "#ff8d79" }}>
            {result.pass ? "✓" : "✕"} {CATALOG[result.kind].title} · {result.axis} {result.mode === "ray" ? "ray" : result.mode === "player" ? "player" : "side lane"}: {result.actual}
            {result.distance !== null ? ` at ${result.distance.toFixed(2)} m` : ""}
            {!result.pass ? ` (expected ${result.expected})` : ""}
          </button>)}
        </div>}
      </div>
      {focused && <div data-testid="hall-selection" style={{ borderBottom: `1px solid ${colors.line}`, paddingBottom: 10, marginBottom: 12 }}>
        <div style={label}>{CATALOG[focused].title.toUpperCase()}</div>
        <p style={small}>Placement radius {CATALOG[focused].radius} m · {CATALOG[focused].solid ? "blocks travel" : "walk-through"}
          {CATALOG[focused].collider ? ` · ${CATALOG[focused].collider.shape} collider` : " · no collider"}</p>
        {CATALOG[focused].collider && <p data-testid="hall-physical-reach" style={small}>
          Furthest collider corner {colliderFootprintRadius(CATALOG[focused].collider).toFixed(2)} m at 1× scale.
        </p>}
        {transformable ? <>
          <label style={{ ...small, display: "block" }} htmlFor="hall-scale">SCALE · {scale.toFixed(2)}×</label>
          <input id="hall-scale" data-testid="hall-scale" type="range" min={0.5} max={1.5} step={0.05} value={scale}
            onChange={(event) => { setScale(Number(event.target.value)); setSweepRequest(0); setSweepResults(null); }} style={{ width: "100%" }} />
          <label style={{ ...small, display: "block" }} htmlFor="hall-rotation">ROTATION · {rotation}°</label>
          <input id="hall-rotation" data-testid="hall-rotation" type="range" min={0} max={360} step={15} value={rotation}
            onChange={(event) => { setRotation(Number(event.target.value)); setSweepRequest(0); setSweepResults(null); }} style={{ width: "100%" }} />
        </> : <p style={small}>Fixed-size gameplay effect.</p>}
        {focused === "chest" && <label style={{ ...small, display: "block", cursor: "pointer" }}>
          <input data-testid="hall-chest-open" type="checkbox" checked={chestOpen} onChange={(event) => setChestOpen(event.target.checked)} /> Open chest
        </label>}
      </div>}
      {PROP_KINDS.map((kind, i) => <button key={kind} data-testid={`hall-station-${kind}`}
        onClick={() => choose(kind)}
        style={{ display: "flex", justifyContent: "space-between", width: "100%", padding: "7px 9px", marginBottom: 3,
          background: focused === kind ? "rgba(127,227,255,0.16)" : "transparent", color: colors.ink,
          border: `1px solid ${focused === kind ? colors.accent : colors.line}`, borderRadius: 4, cursor: "pointer" }}>
        <span>{String(i + 1).padStart(2, "0")} · {CATALOG[kind].title}</span>
        <span style={{ color: colors.dim }}>{CATALOG[kind].solid ? "solid" : "clear"}</span>
      </button>)}
    </div>
    <div style={{ ...panel, padding: 6 }}>
      <Canvas key={focused ?? "all"} shadows dpr={[1, 1.5]}
        camera={{ fov: focused ? 50 : 55, near: 0.1, far: 150, position: camera }}
        onCreated={({ scene }) => { (window as unknown as { __hallScene?: Scene }).__hallScene = scene; }}
        style={{ background: "#0a0c12", borderRadius: 6 }}>
        <ambientLight intensity={0.7} />
        <hemisphereLight args={["#adc0da", "#45372a", 0.6]} />
        <directionalLight position={[10, 22, 8]} intensity={1.5} castShadow shadow-mapSize={[2048, 2048]} />
        <Physics timeStep={1 / 60}>
          <HallFloor />
          <gridHelper args={[36, 36, "#586473", "#333e4c"]} position={[0, 0.025, 0]} />
          {PROP_KINDS.map((kind, i) => {
            if (focused && kind !== focused) return null;
            const position = hallPosition(i);
            const stationScale = focused ? scale : 1;
            const stationRotation = focused ? rotation * Math.PI / 180 : 0;
            return <group key={kind}>
              <Prop kind={kind} position={position} scale={stationScale} rotation={stationRotation}
                open={focused === "chest" && chestOpen} />
              {showFootprints && <HallFootprint position={position} radius={CATALOG[kind].radius * stationScale} />}
              {showColliders && CATALOG[kind].collider && <HallCollider position={position}
                kind={kind} scale={stationScale} rotation={stationRotation} />}
            </group>;
          })}
          <PropColliders placements={placements} />
          <HallPhysicsProbe />
          <HallCollisionSweep request={sweepRequest} placements={placements} onReport={setSweepResults} />
          {sweepResults?.[selectedLane] && <HallSweepView result={sweepResults[selectedLane]} />}
        </Physics>
        <OrbitControls target={[target[0], 0.8, target[2]]} maxPolarAngle={Math.PI / 2.05} />
      </Canvas>
    </div>
  </div>;
}

/** Query Rapier itself after the mounted colliders have entered its world. */
function HallCollisionSweep({ request, placements, onReport }: {
  request: number; placements: PropPlacement[]; onReport: (results: SweepResult[]) => void;
}) {
  const { world, rapier } = useRapier();
  const pending = useRef(0);
  useEffect(() => { pending.current = request > 0 ? 2 : 0; }, [request]);
  useFrame(() => {
    if (pending.current === 0) return;
    if (--pending.current > 0) return;
    const player = new rapier.Capsule(PLAYER_CAPSULE_HALF_HEIGHT, PLAYER_CAPSULE_RADIUS);
    onReport(placements.flatMap((placement) => (["X", "Z"] as const).flatMap((axis) => {
      const spec = CATALOG[placement.kind];
      const expected = spec.solid ? "blocked" : "clear";
      const x = placement.x - (axis === "X" ? 2.4 : 0);
      const z = placement.z - (axis === "Z" ? 2.4 : 0);
      const direction = { x: axis === "X" ? 1 : 0, y: 0, z: axis === "Z" ? 1 : 0 };
      const length = 4.8;
      const rayOrigin = { x, y: (spec.collider?.y ?? 0.6) * (placement.scale ?? 1), z };
      const ray = new rapier.Ray(
        rayOrigin, direction,
      );
      const hit = world.castRay(ray, length, true);
      const at = hit?.collider.translation();
      const actual = hit && at && Math.abs(at.x - placement.x) < 0.01 && Math.abs(at.z - placement.z) < 0.01
        ? "blocked" : "clear";
      const bodyOrigin = { x, y: PLAYER_REST_Y, z };
      const bodyHit = world.castShape(bodyOrigin, { x: 0, y: 0, z: 0, w: 1 },
        direction, player, 0, length, true);
      const bodyAt = bodyHit?.collider.translation();
      const bodyActual = bodyHit && bodyAt && Math.abs(bodyAt.x - placement.x) < 0.01 && Math.abs(bodyAt.z - placement.z) < 0.01
        ? "blocked" : "clear";
      const scale = placement.scale ?? 1;
      const reach = Math.max(spec.radius, spec.collider ? colliderFootprintRadius(spec.collider) : 0) * scale;
      const side = reach + PLAYER_CAPSULE_RADIUS + 0.15;
      const clearOrigin = { x: x + (axis === "Z" ? side : 0), y: PLAYER_REST_Y, z: z + (axis === "X" ? side : 0) };
      const clearHit = world.castShape(clearOrigin, { x: 0, y: 0, z: 0, w: 1 },
      direction, player, 0, length, true);
      const clearActual = clearHit ? "blocked" : "clear";
      const trace = (origin: { x: number; y: number; z: number }) => ({
        origin: [origin.x, origin.y, origin.z] as [number, number, number],
        direction: [direction.x, direction.y, direction.z] as [number, number, number], length,
      });
      return [
        { ...trace(rayOrigin), kind: placement.kind, axis, mode: "ray" as const, expected, actual, distance: hit?.timeOfImpact ?? null, pass: actual === expected },
        { ...trace(bodyOrigin), kind: placement.kind, axis, mode: "player" as const, expected, actual: bodyActual, distance: bodyHit?.time_of_impact ?? null, pass: bodyActual === expected },
        { ...trace(clearOrigin), kind: placement.kind, axis, mode: "clearance" as const, expected: "clear" as const, actual: clearActual,
          distance: clearHit?.time_of_impact ?? null, pass: clearActual === "clear" },
      ];
    })));
  });
  return null;
}

/** Draw the query that actually ran, including Rapier's measured contact distance. */
function HallSweepView({ result }: { result: SweepResult }) {
  const pointAt = (distance: number): [number, number, number] => result.origin.map((value, axis) =>
    value + result.direction[axis] * distance) as [number, number, number];
  const contact = pointAt(result.distance ?? result.length);
  const color = result.pass ? "#7fe3ff" : "#ff8d79";
  return <group name="hall-sweep-view" userData={{ ...result }}>
    <Line points={[result.origin, pointAt(result.length)]} color="#919ba8" lineWidth={1} transparent opacity={0.4} depthTest={false} />
    <Line points={[result.origin, contact]} color={color} lineWidth={3} depthTest={false} />
    <mesh name="hall-sweep-origin" position={result.origin}>
      <sphereGeometry args={[0.07, 8, 6]} /><meshBasicMaterial color="#ffffff" depthTest={false} />
    </mesh>
    <mesh name="hall-sweep-contact" position={contact}>
      {result.mode === "ray" ? <sphereGeometry args={[0.1, 12, 8]} />
        : <capsuleGeometry args={[PLAYER_CAPSULE_RADIUS, PLAYER_CAPSULE_HALF_HEIGHT * 2, 6, 12]} />}
      <meshBasicMaterial color={color} wireframe={result.mode !== "ray"} transparent opacity={0.8} depthTest={false} />
    </mesh>
  </group>;
}

/** Test scripts inspect the same Rapier colliders used by room dressing. */
function HallPhysicsProbe() {
  const { world } = useRapier();
  useEffect(() => {
    const host = window as unknown as { __hallPhysicsWorld?: typeof world };
    host.__hallPhysicsWorld = world;
    return () => { if (host.__hallPhysicsWorld === world) delete host.__hallPhysicsWorld; };
  }, [world]);
  return null;
}

function HallFootprint({ position, radius }: { position: [number, number, number]; radius: number }) {
  return <mesh name="hall-footprint" position={[position[0], 0.04, position[2]]} rotation={[-Math.PI / 2, 0, 0]}>
    <ringGeometry args={[Math.max(0, radius - 0.035), radius, 48]} />
    <meshBasicMaterial color="#ffbd6a" side={DoubleSide} depthTest={false} />
  </mesh>;
}

function HallCollider({ position, kind, scale, rotation }: {
  position: [number, number, number]; kind: PropKind; scale: number; rotation: number;
}) {
  const collider = CATALOG[kind].collider;
  if (!collider) return null;
  return <group name="hall-collider-group" userData={{ kind }} position={position} rotation={[0, rotation, 0]} scale={scale}>
    <mesh name="hall-collider" position={[0, collider.y, 0]}>
      {collider.shape === "cuboid"
        ? <boxGeometry args={[collider.args[0] * 2, collider.args[1] * 2, collider.args[2] * 2]} />
        : <cylinderGeometry args={[collider.args[1], collider.args[1], collider.args[0] * 2, 16]} />}
      <meshBasicMaterial color="#6ce4e8" wireframe transparent opacity={0.9} depthTest={false} />
    </mesh>
  </group>;
}

function HallFloor() {
  const surface = useSurface("stone", 4);
  return <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
    <planeGeometry args={[36, 30]} />
    <meshStandardMaterial color="#8e909a" map={surface} />
  </mesh>;
}
