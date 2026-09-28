/** Imported by browser-side review callbacks through Vite. A diagnostic camera
 * may differ from the player's; its colour pipeline must remain the game's. */
export function createReviewRenderer(THREE, scene, options = {}) {
  let root;
  scene.traverse(object => { root ??= object.__r3f?.root; });
  const live = root?.getState().gl;
  if (!live) throw new Error("Review capture requires the mounted game renderer");
  const renderer = new THREE.WebGLRenderer(options);
  renderer.outputColorSpace = live.outputColorSpace;
  renderer.toneMapping = live.toneMapping;
  renderer.toneMappingExposure = live.toneMappingExposure;
  return renderer;
}
