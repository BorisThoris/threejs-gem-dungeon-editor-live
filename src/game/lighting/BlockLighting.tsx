import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { DataTexture, NearestFilter, Vector3, Vector4, type Material, type Mesh, type PointLight } from "three";
import { useCurrentRoom, useRun } from "../state/run";
import { createLightField, isUnlitRoom, updateLightField, type FieldSource } from "./field";
import { publishLightField, releaseLightField } from "./perception";

/** Gameplay light transport. Existing animated PointLights are source handles on
 * a non-rendered layer; their colours, motion and intensity still have one owner.
 * Materials share a single nearest-filtered texture, independent of light count. */
export function BlockLighting() {
  const room = useCurrentRoom();
  const field = useMemo(() => room ? createLightField(room) : null, [room]);
  const texture = useMemo(() => {
    if (!field) return null;
    const t = new DataTexture(field.data, field.width, field.height);
    t.magFilter = t.minFilter = NearestFilter; t.generateMipmaps = false;
    t.needsUpdate = true;
    return t;
  }, [field]);
  const uniforms = useMemo(() => ({ blockField: { value: null as DataTexture | null }, blockBounds: { value: new Vector4() } }), []);
  uniforms.blockField.value = texture;
  if (field) uniforms.blockBounds.value.set(field.minX, field.minZ, field.width * field.cell, field.height * field.cell);
  const materials = useRef(new Map<Material, { compile: Material["onBeforeCompile"]; key: Material["customProgramCacheKey"] }>());
  const lights = useRef(new Map<PointLight, number>());
  const elapsed = useRef(1);
  const previousField = useRef(field);
  const scratch = useMemo(() => ({ sources: [] as FieldSource[], lights: new Set<PointLight>(), materials: new Set<Material>() }), []);
  const position = useMemo(() => new Vector3(), []);
  useEffect(() => () => { texture?.dispose(); if (field) releaseLightField(field); }, [texture, field]);
  useEffect(() => {
    const patched = materials.current, captured = lights.current;
    return () => {
      for (const [m, original] of patched) {
        m.onBeforeCompile = original.compile; m.customProgramCacheKey = original.key; m.needsUpdate = true;
      }
      for (const [light, mask] of captured) light.layers.mask = mask;
      patched.clear(); captured.clear();
    };
  }, []);
  useFrame(({ scene }, delta) => {
    if (!field || !texture) return;
    if (previousField.current !== field) { elapsed.current = 1; previousField.current = field; }
    elapsed.current += delta;
    const { sources, lights: seen, materials: seenMaterials } = scratch;
    sources.length = 0; seen.clear(); seenMaterials.clear();
    // Discover new room/creature materials before their first rendered frame.
    scene.traverse(object => {
      const light = object as PointLight;
      if (light.isPointLight) {
        seen.add(light);
        if (!lights.current.has(light)) lights.current.set(light, light.layers.mask);
        light.layers.set(31);
        let visible = light.visible;
        for (let parent = light.parent; visible && parent; parent = parent.parent) visible = parent.visible;
        if (elapsed.current >= 0.1 && visible && light.intensity > 0) {
          light.getWorldPosition(position);
          sources.push({ x: position.x, z: position.z, range: light.distance || 15,
            intensity: light.intensity, r: light.color.r, g: light.color.g, b: light.color.b });
        }
      }
      const mesh = object as Mesh;
      if (!mesh.material) return;
      for (const m of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
        seenMaterials.add(m);
        if (!("isMeshStandardMaterial" in m) || materials.current.has(m)) continue;
        const compile = m.onBeforeCompile, key = m.customProgramCacheKey;
        const originalKey = key.call(m);
        materials.current.set(m, { compile, key });
        m.customProgramCacheKey = () => `${originalKey}:block-light-v2`;
        m.onBeforeCompile = (shader, renderer) => {
          compile.call(m, shader, renderer);
          Object.assign(shader.uniforms, uniforms);
          shader.vertexShader = "varying vec3 blockWorld;\n" + shader.vertexShader;
          shader.vertexShader = shader.vertexShader.replace("#include <project_vertex>", `#include <project_vertex>
            vec4 blockPosition = vec4(transformed, 1.0);
            #ifdef USE_BATCHING
              blockPosition = batchingMatrix * blockPosition;
            #endif
            #ifdef USE_INSTANCING
              blockPosition = instanceMatrix * blockPosition;
            #endif
            blockWorld = (modelMatrix * blockPosition).xyz;`);
          shader.fragmentShader = "varying vec3 blockWorld; uniform sampler2D blockField; uniform vec4 blockBounds;\n" + shader.fragmentShader;
          shader.fragmentShader = shader.fragmentShader.replace("#include <lights_fragment_end>", `#include <lights_fragment_end>
            vec2 blockUV = (blockWorld.xz - blockBounds.xy) / blockBounds.zw;
            vec3 blockGlow = texture2D(blockField, blockUV).rgb;
            float blockHeight = 1.0 / (1.0 + max(0.0, floor(blockWorld.y) - 2.0) * 0.18);
            reflectedLight.indirectDiffuse += diffuseColor.rgb * blockGlow * blockHeight * 2.8;`);
        };
        m.needsUpdate = true;
      }
    });
    // Release handles belonging to rooms/creatures that have unmounted.
    for (const [light, mask] of lights.current) if (!seen.has(light)) {
      light.layers.mask = mask; lights.current.delete(light);
    }
    for (const [m, original] of materials.current) if (!seenMaterials.has(m)) {
      m.onBeforeCompile = original.compile; m.customProgramCacheKey = original.key; m.needsUpdate = true;
      materials.current.delete(m);
    }
    if (elapsed.current < 0.1) return;
    elapsed.current = 0;
    updateLightField(field, sources); texture.needsUpdate = true;
    if (room) publishLightField(room.id, field);
    if (import.meta.env.DEV) Object.assign(window, { __blockLighting: {
      roomId: room?.id, unlit: room ? isUnlitRoom(room, useRun.getState().dungeon?.seed ?? 0) : false,
      cells: field.width * field.height, cellSize: field.cell, sources: sources.length,
      shaderPointLights: 0, updatesPerSecond: 10,
    } });
  });
  return null;
}
