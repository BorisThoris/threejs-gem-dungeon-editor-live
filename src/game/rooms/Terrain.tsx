import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Matrix4, type InstancedMesh, type MeshStandardMaterial } from "three";
import { useLayoutEffect } from "react";
import type { Room } from "../dungeon/types";
import { useRun } from "../state/run";
import { useSurface } from "../textures/registry";
import { Blocks } from "./CorridorDetails";
import { terrainFor, TERRAIN_COLORS } from "./terrainPattern";
import { geo } from "../props/shared";

/** Broad, block-cut beds with a deliberately stepped water glint. Two draws. */
export function Terrain({ room }: { room: Room }) {
  const data = useMemo(() => terrainFor(room), [room]);
  const mesh = useRef<InstancedMesh>(null);
  const material = useRef<MeshStandardMaterial>(null);
  const time = useRef({ value: 0 });
  const wet = data.biome === "flooded";
  const [stone, deposit] = TERRAIN_COLORS[data.biome];
  const pavingSurface = useSurface("stone", 0.5);
  const bedSurface = useSurface(data.biome === "mossy" || data.biome === "fungal" ? "moss" : "stone", 0.5);
  useLayoutEffect(() => {
    if (!mesh.current) return;
    const matrix = new Matrix4();
    data.deposits.forEach((b, i) => mesh.current!.setMatrixAt(i, matrix.makeScale(...b.size).setPosition(...b.position)));
    mesh.current.instanceMatrix.needsUpdate = true;
    mesh.current.computeBoundingSphere();
  }, [data]);
  useFrame((_, dt) => {
    if (!useRun.getState().paused) time.current.value += Math.min(dt, 0.1);
  });
  return <group>
    <Blocks blocks={data.paving} color={stone} map={pavingSurface} />
    {data.deposits.length > 0 && <instancedMesh name="terrain-deposits" ref={mesh} args={[geo("box", 1, 1, 1), undefined, data.deposits.length]}>
      <meshStandardMaterial ref={material} color={deposit} map={wet ? null : bedSurface} roughness={wet ? 0.45 : 1}
        emissive={wet ? "#233d42" : "#000000"} emissiveIntensity={0.15}
        customProgramCacheKey={() => wet ? "block-water-v1" : "terrain-v1"}
        onBeforeCompile={shader => {
          if (!wet) return;
          shader.uniforms.terrainTime = time.current;
          shader.vertexShader = "varying vec2 terrainXZ;\n" + shader.vertexShader;
          shader.vertexShader = shader.vertexShader.replace("#include <project_vertex>",
            "#include <project_vertex>\nterrainXZ = (instanceMatrix * vec4(position, 1.0)).xz;");
          shader.fragmentShader = "uniform float terrainTime; varying vec2 terrainXZ;\n" + shader.fragmentShader;
          shader.fragmentShader = shader.fragmentShader.replace("#include <color_fragment>",
            "#include <color_fragment>\nfloat ripple = floor((sin(terrainXZ.x * 3.0 + terrainXZ.y * 2.0 + terrainTime * 1.2) * 0.5 + 0.5) * 3.0) / 3.0; diffuseColor.rgb *= 0.88 + ripple * 0.24;");
        }} />
    </instancedMesh>}
  </group>;
}
