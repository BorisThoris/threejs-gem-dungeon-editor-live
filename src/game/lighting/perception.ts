import { sampleLightField, type LightField } from "./field";

// The renderer publishes its completed field; gameplay and HUD sample the same
// light without writing player movement into the React store.
let active: { roomId: string; field: LightField } | null = null;

export function publishLightField(roomId: string, field: LightField): void {
  active = { roomId, field };
}

export function releaseLightField(field: LightField): void {
  if (active?.field === field) active = null;
}

export function localLightAt(roomId: string, x: number, z: number): number | null {
  return active?.roomId === roomId ? sampleLightField(active.field, x, z) : null;
}
