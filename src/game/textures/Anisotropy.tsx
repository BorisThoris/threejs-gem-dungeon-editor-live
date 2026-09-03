import { useEffect } from "react";
import { useThree } from "@react-three/fiber";

import { setMaxAnisotropy } from "./registry";

/**
 * Tells the surface registry how much anisotropic filtering this machine
 * has. Mounted inside a Canvas, because the answer comes from the renderer
 * and there is no renderer until one exists.
 */
export function Anisotropy() {
  const gl = useThree((s) => s.gl);
  useEffect(() => setMaxAnisotropy(gl.capabilities.getMaxAnisotropy()), [gl]);
  return null;
}
