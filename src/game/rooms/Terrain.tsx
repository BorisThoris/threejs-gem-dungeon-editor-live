import { mergeTerrainBeds } from "./mergeTerrainBeds";
import { useMemo, useRef, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import { Matrix4, Vector3, type InstancedMesh } from "three";
import { useLayoutEffect } from "react";
import type { Room } from "../dungeon/types";
import { runClock, useRun } from "../state/run";
import { useSurface } from "../textures/registry";
import { terrainFor, TERRAIN_COLORS, type TerrainTile } from "./terrainPattern";
import { geo } from "../props/shared";
import { TERRAIN_EFFECTS } from "./terrainMaterial";

/** Paint-depth terrain has no traversable sides. Keep the original top height
 * and UV direction while submitting only its visible, upward-facing surface. */
function Tiles({ blocks, name, children }: { blocks: TerrainTile[]; name: string; children: ReactNode }) {
  const mesh = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    if (!mesh.current) return;
    const matrix = new Matrix4(), u = new Vector3(), v = new Vector3(), normal = new Vector3();
    blocks.forEach((b, i) => {
      const [sx, sz] = b.slope ?? [0, 0];
      u.set(b.size[0], sx * b.size[0], 0); v.set(0, -sz * b.size[2], -b.size[2]);
      normal.crossVectors(u, v).normalize();
      matrix.makeBasis(u, v, normal).setPosition(b.position[0], b.position[1] + b.size[1] / 2, b.position[2]);
      mesh.current!.setMatrixAt(i, matrix);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
    mesh.current.computeBoundingSphere();
  }, [blocks]);
  if (!blocks.length) return null;
  return <instancedMesh name={name} ref={mesh} args={[geo("plane", 1, 1), undefined, blocks.length]}>{children}</instancedMesh>;
}

/** Broad, block-cut beds with a deliberately stepped water glint. Two draws. */
export function Terrain({ room }: { room: Room }) {
  const data = useMemo(() => terrainFor(room), [room]);
  const beds = useMemo(() => mergeTerrainBeds(data.deposits), [data.deposits]);
  const time = useRef({ value: runClock(useRun.getState()) });
  const wet = data.biome === "flooded";
  const effect = TERRAIN_EFFECTS[data.biome];
  const [stone, deposit] = TERRAIN_COLORS[data.biome];
  const pavingSurface = useSurface("stone", 0.5);
  const bedSurface = useSurface(data.biome === "mossy" || data.biome === "fungal" ? "moss" : data.biome === "ash" ? "dirt" : "stone", 0.5);
  useFrame(() => {
    time.current.value = runClock(useRun.getState());
  });
  return <group>
    <Tiles blocks={data.paving} name="terrain-paving"><meshStandardMaterial color={stone} map={pavingSurface} roughness={0.9} /></Tiles>
    <Tiles blocks={beds} name="terrain-deposits">
      <meshStandardMaterial color={deposit} map={wet ? null : bedSurface} roughness={wet ? 0.45 : 1}
        userData={{ terrainTime: time.current, terrainEffect: effect.name, terrainAnimated: effect.animated }}
        emissive={effect.emissive} emissiveIntensity={effect.emissiveIntensity}
        customProgramCacheKey={() => `terrain-${data.biome}-style-v3`}
        onBeforeCompile={shader => {
          shader.vertexShader = "varying vec2 terrainXZ;\n" + shader.vertexShader;
          shader.vertexShader = shader.vertexShader.replace("#include <project_vertex>",
            "#include <project_vertex>\nterrainXZ = (instanceMatrix * vec4(position, 1.0)).xz;\n#ifdef USE_MAP\nvMapUv = (mapTransform * vec3(terrainXZ.x * 0.5, -terrainXZ.y * 0.5, 1.0)).xy;\n#endif");
          // Adjacent deposit tiles share world-space marks, including ramp cuts.
          shader.uniforms.terrainTime = time.current;
          shader.fragmentShader = "uniform float terrainTime; varying vec2 terrainXZ;\n" + shader.fragmentShader;
          shader.fragmentShader = shader.fragmentShader.replace("#include <color_fragment>",
            `#include <color_fragment>\n${effect.fragment}`);
        }} />
    </Tiles>
  </group>;
}
