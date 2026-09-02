import { useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Physics } from "@react-three/rapier";

import { PROP_KINDS, type PropKind } from "../game/dungeon/types";
import { CATALOG, Prop } from "../game/props/catalog";
import { useSurface } from "../game/textures/registry";
import { colors } from "../ui/overlay";
import { field, label, panel, small } from "./styles";

/**
 * Look at one prop at a time.
 *
 * The old 3D editor was this and only this - a previewer with a sidebar -
 * dressed up as a level editor. Here it is honestly named. Pick a prop,
 * turn it, scale it, and see its footprint and whether it blocks.
 */
export function Inspector() {
  const [kind, setKind] = useState<PropKind>("chest");
  const [rotation, setRotation] = useState(0);
  const [scale, setScale] = useState(1);
  const info = CATALOG[kind];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: 16, height: "100%", minHeight: 0 }}>
      <div style={{ ...panel, overflow: "auto" }}>
        <div style={label}>PROP</div>
        {PROP_KINDS.map((k) => (
          <div
            key={k}
            onClick={() => setKind(k)}
            style={{
              padding: "7px 10px",
              marginBottom: 4,
              borderRadius: 4,
              cursor: "pointer",
              fontSize: 10,
              background: k === kind ? "rgba(127,227,255,0.12)" : "transparent",
              border: `1px solid ${k === kind ? colors.accent : "transparent"}`,
            }}
          >
            {CATALOG[k].title}
          </div>
        ))}
        <div style={{ ...label, marginTop: 14 }}>ROTATION {Math.round((rotation * 180) / Math.PI)}°</div>
        <input type="range" min={0} max={Math.PI * 2} step={Math.PI / 8} value={rotation} onChange={(e) => setRotation(Number(e.target.value))} style={{ width: "100%" }} />
        <div style={{ ...label, marginTop: 10 }}>SCALE {scale.toFixed(2)}</div>
        <input type="range" min={0.5} max={2} step={0.05} value={scale} onChange={(e) => setScale(Number(e.target.value))} style={{ width: "100%" }} />
        <div style={{ ...small, marginTop: 14 }}>
          Footprint radius {info.radius} · {info.solid ? "blocks the player" : "walk-through"}
        </div>
        <input style={{ ...field, marginTop: 10 }} readOnly value={`{ kind: "${kind}", x: 0, z: 0, rotation: ${rotation.toFixed(2)} }`} />
      </div>
      <div style={{ ...panel, padding: 6 }}>
        <Canvas shadows camera={{ fov: 45, position: [4, 3, 4] }} style={{ background: "#0a0c12", borderRadius: 6 }}>
          <ambientLight intensity={0.6} />
          <hemisphereLight args={["#9fb4d8", "#3a3126", 0.5]} />
          <directionalLight position={[3, 6, 2]} intensity={1.2} castShadow />
          <Physics paused timeStep={1 / 60}>
            <Floor />
            <Prop key={kind} kind={kind} position={[0, 0, 0]} rotation={rotation} scale={scale} />
          </Physics>
          <OrbitControls target={[0, 0.8, 0]} />
        </Canvas>
      </div>
    </div>
  );
}

function Floor() {
  const surface = useSurface("stone", 3);
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[12, 12]} />
      <meshStandardMaterial color="#a9a9b3" map={surface} />
    </mesh>
  );
}
