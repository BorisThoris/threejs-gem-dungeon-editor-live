import { useFrame, useThree } from "@react-three/fiber";

/**
 * What the last frame cost, for the performance check. Development only.
 *
 * Frame time is not worth measuring on this project's test machine - it
 * renders through a software rasteriser, where a millisecond means nothing
 * about a Steam Deck. Draw calls, triangles and how fast the heap grows are
 * a different matter: they are counted on the CPU side by three and by the
 * engine, they do not depend on the GPU at all, and they are exactly what
 * goes wrong when a cycle quietly adds a mesh per prop or an allocation per
 * frame. Both of those have happened here before.
 *
 * `renderer.info` is reset every frame by three, so it has to be read
 * inside the loop rather than asked for afterwards.
 */
export function Perf() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  useFrame(() => {
    if (!import.meta.env.DEV) return;
    const w = window as unknown as { __perf?: Record<string, number>; __scene?: object };
    // The scene itself, so a check can ask not just how many draw calls a
    // room costs but which parts of the room are spending them. A number
    // with no breakdown behind it is a number you can only stare at.
    w.__scene = scene;
    const p = (w.__perf ??= { calls: 0, triangles: 0, geometries: 0, textures: 0, programs: 0, frames: 0 });
    p.calls = gl.info.render.calls;
    p.triangles = gl.info.render.triangles;
    p.geometries = gl.info.memory.geometries;
    p.textures = gl.info.memory.textures;
    p.programs = gl.info.programs?.length ?? 0;
    p.frames += 1;
  });
  return null;
}
